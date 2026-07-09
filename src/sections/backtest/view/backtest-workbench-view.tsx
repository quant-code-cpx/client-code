import type { StrategyTemplate } from 'src/api/backtest';
import type { Theme, SxProps } from '@mui/material/styles';
import type { StrategyDraft } from 'src/api/strategy-draft';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';

import { useRouter } from 'src/routes/hooks';

import { useAuth } from 'src/auth';
import { DashboardContent } from 'src/layouts/dashboard';
import { createRun, getStrategyTemplates } from 'src/api/backtest';
import { autoSaveDraft, getAutoSavedDraft } from 'src/api/strategy-draft';

import { Iconify } from 'src/components/iconify';

import { BacktestConfigForm } from '../backtest-config-form';
import { useAutoValidate } from '../hooks/use-auto-validate';
import { BacktestDraftDrawer } from '../backtest-draft-drawer';
import { BacktestTemplateCards } from '../backtest-template-cards';
import { BacktestValidatePanel } from '../backtest-validate-panel';
import { BacktestSubmitSummary } from '../backtest-submit-summary';
import { BacktestRunningRunsBadge } from '../backtest-running-runs-badge';
import { BacktestStrategyConfigPanel } from '../backtest-strategy-config-panel';
import {
  toApiDate,
  buildDefaultForm,
  BACKTEST_AUTOSAVE_ID,
  buildDefaultStrategyConfig,
  BACKTEST_AUTOSAVE_KEY_PREFIX,
} from '../constants';

import type { BacktestRunForm, StrategyTemplateId } from '../types';

// ----------------------------------------------------------------------

type BacktestWorkbenchState = Partial<BacktestRunForm> & {
  templateId?: string;
  strategyType?: string;
};

function buildInitialForm() {
  return {
    ...buildDefaultForm(),
    strategyConfig: buildDefaultStrategyConfig('SCREENING_ROTATION'),
  };
}

function toAutoSavedDraft(config: Record<string, unknown>, updatedAt: string): StrategyDraft {
  return {
    id: BACKTEST_AUTOSAVE_ID,
    name: '上次编辑（自动保存）',
    config,
    createdAt: updatedAt,
    updatedAt,
    isAutoSave: true,
  };
}

function readLocalAutoSavedDraft(storageKey: string) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { config?: Record<string, unknown>; updatedAt?: string };
    if (!parsed.config || !parsed.updatedAt) return null;
    return toAutoSavedDraft(parsed.config, parsed.updatedAt);
  } catch {
    return null;
  }
}

function writeLocalAutoSavedDraft(
  storageKey: string,
  config: Record<string, unknown>,
  updatedAt: string
) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ config, updatedAt }));
  } catch {
    // localStorage may be unavailable in private mode; backend auto-save is still attempted.
  }
}

function normalizeTemplateId(templateId: string | undefined): StrategyTemplateId {
  if (
    templateId === 'MA_CROSS_SINGLE' ||
    templateId === 'SCREENING_ROTATION' ||
    templateId === 'FACTOR_RANKING' ||
    templateId === 'CUSTOM_POOL_REBALANCE' ||
    templateId === 'FACTOR_SCREENING_ROTATION'
  ) {
    return templateId;
  }
  return 'SCREENING_ROTATION';
}

const HEADER_ACTION_BUTTON_SX: SxProps<Theme> = {
  height: 32,
  minHeight: 32,
  px: 1.5,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiButton-startIcon': {
    ml: 0,
    mr: 0.75,
    display: 'inline-flex',
    alignItems: 'center',
  },
};

// ----------------------------------------------------------------------

export function BacktestWorkbenchView() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<StrategyTemplateId>('SCREENING_ROTATION');
  const [form, setForm] = useState<BacktestRunForm>(buildInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);
  const [advancedAnchor, setAdvancedAnchor] = useState<HTMLElement | null>(null);
  const [autoSavedDraft, setAutoSavedDraft] = useState<StrategyDraft | null>(null);
  const [restoreSnackbarOpen, setRestoreSnackbarOpen] = useState(false);
  const [submitSnackbarOpen, setSubmitSnackbarOpen] = useState(false);
  const [submittedRunId, setSubmittedRunId] = useState('');
  const [runningRefreshToken, setRunningRefreshToken] = useState(0);

  const autoSaveStorageKey = `${BACKTEST_AUTOSAVE_KEY_PREFIX}:${userProfile?.id ?? 'anonymous'}`;

  const currentConfig = useMemo(
    () => ({ ...form, strategyType: selectedTemplateId }) as Record<string, unknown>,
    [form, selectedTemplateId]
  );

  const validateQuery = useMemo(
    () => ({
      strategyType: selectedTemplateId,
      strategyConfig:
        selectedTemplateId === 'CUSTOM_POOL_REBALANCE'
          ? { ...form.strategyConfig, tsCodes: form.customUniverseTsCodes }
          : form.strategyConfig,
      startDate: toApiDate(form.startDate),
      endDate: toApiDate(form.endDate),
      benchmarkTsCode: form.benchmarkTsCode,
      universe: form.universe,
      initialCapital: form.initialCapital,
      rebalanceFrequency: form.rebalanceFrequency,
      priceMode: form.priceMode,
      enableTradeConstraints: form.enableTradeConstraints,
      enableT1Restriction: form.enableT1Restriction,
      partialFillEnabled: form.partialFillEnabled,
    }),
    [form, selectedTemplateId]
  );

  const { validation, validating, validateNow, validationStale, resetValidation } = useAutoValidate(
    {
      query: validateQuery,
      enabled: Boolean(form.startDate && form.endDate && selectedTemplateId),
      debounceMs: 800,
      // 自动校验的后台错误静默处理（字段错误由 ValidatePanel 展示）
      // 只有显式「立即校验」和「开始回测」才弹 toast
    }
  );

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplateError('');
    try {
      const response = await getStrategyTemplates();
      const nextTemplates = response.templates ?? [];
      setTemplates(nextTemplates);
      setSelectedTemplateId((current) => {
        if (
          nextTemplates.length === 0 ||
          nextTemplates.some((template) => template.id === current)
        ) {
          return current;
        }

        const firstTemplate = nextTemplates[0];
        setForm((prev) => ({
          ...prev,
          strategyConfig: buildDefaultStrategyConfig(firstTemplate.id, firstTemplate.defaultConfig),
        }));
        return firstTemplate.id;
      });
    } catch (err) {
      setTemplates([]);
      setTemplateError(err instanceof Error ? err.message : '策略模板加载失败');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const loadDraftConfig = useCallback(
    (config: Record<string, unknown>, templateId: string) => {
      const nextTemplateId = normalizeTemplateId(templateId);
      const formFields = { ...config };
      delete formFields.strategyType;
      setSelectedTemplateId(nextTemplateId);
      setForm((prev) => ({
        ...prev,
        ...(formFields as Partial<BacktestRunForm>),
        strategyConfig:
          ((formFields as Partial<BacktestRunForm>).strategyConfig as Record<string, unknown>) ??
          buildDefaultStrategyConfig(nextTemplateId),
      }));
      resetValidation();
      setDraftDrawerOpen(false);
      setRestoreSnackbarOpen(false);
    },
    [resetValidation]
  );

  useEffect(() => {
    const state = window.history.state?.usr as BacktestWorkbenchState | undefined;
    if (state?.strategyType || state?.templateId) {
      const nextTemplateId = normalizeTemplateId(state.templateId ?? state.strategyType);
      loadDraftConfig(state as Record<string, unknown>, nextTemplateId);
    }
  }, [loadDraftConfig]);

  useEffect(() => {
    let cancelled = false;

    getAutoSavedDraft()
      .then((remoteDraft) => {
        if (cancelled || !remoteDraft?.config) return;
        const draft = toAutoSavedDraft(remoteDraft.config, remoteDraft.updatedAt);
        setAutoSavedDraft(draft);
        setRestoreSnackbarOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        const localDraft = readLocalAutoSavedDraft(autoSaveStorageKey);
        if (localDraft) {
          setAutoSavedDraft(localDraft);
          setRestoreSnackbarOpen(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [autoSaveStorageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      const draft = toAutoSavedDraft(currentConfig, updatedAt);
      autoSaveDraft({ config: currentConfig })
        .then((response) => {
          const nextUpdatedAt = response.updatedAt ?? updatedAt;
          setAutoSavedDraft(toAutoSavedDraft(currentConfig, nextUpdatedAt));
        })
        .catch(() => {
          writeLocalAutoSavedDraft(autoSaveStorageKey, currentConfig, updatedAt);
          setAutoSavedDraft(draft);
        });
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoSaveStorageKey, currentConfig]);

  const fieldErrors = useMemo(
    () =>
      Object.fromEntries(
        (validation?.fieldErrors ?? []).map((fieldError) => [fieldError.path, fieldError.message])
      ),
    [validation?.fieldErrors]
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const nextTemplateId = normalizeTemplateId(templateId);
      const template = templates.find((item) => item.id === nextTemplateId);
      setSelectedTemplateId(nextTemplateId);
      setForm((prev) => ({
        ...prev,
        strategyConfig: buildDefaultStrategyConfig(nextTemplateId, template?.defaultConfig),
      }));
      resetValidation();
    },
    [resetValidation, templates]
  );

  const handleFormChange = useCallback(
    (updates: Partial<BacktestRunForm>) => {
      setForm((prev) => {
        const next = { ...prev, ...updates };
        if (updates.customUniverseTsCodes && selectedTemplateId === 'CUSTOM_POOL_REBALANCE') {
          next.strategyConfig = { ...next.strategyConfig, tsCodes: updates.customUniverseTsCodes };
        }
        return next;
      });
    },
    [selectedTemplateId]
  );

  const handleManualValidate = useCallback(async () => {
    const result = await validateNow();
    if (result === null) {
      setError('校验请求失败，请检查网络后重试');
    }
  }, [validateNow]);

  const handleSubmit = useCallback(async () => {
    if (!validation || validation.errors.length > 0 || validationStale) return;

    setSubmitting(true);
    setError('');
    try {
      const strategyConfig =
        selectedTemplateId === 'CUSTOM_POOL_REBALANCE'
          ? { ...form.strategyConfig, tsCodes: form.customUniverseTsCodes }
          : form.strategyConfig;
      const response = await createRun({
        name: form.name || undefined,
        strategyType: selectedTemplateId,
        strategyConfig,
        startDate: toApiDate(form.startDate),
        endDate: toApiDate(form.endDate),
        benchmarkTsCode: form.benchmarkTsCode,
        universe: form.universe !== 'CUSTOM' ? form.universe : undefined,
        customUniverseTsCodes: form.universe === 'CUSTOM' ? form.customUniverseTsCodes : undefined,
        initialCapital: form.initialCapital,
        rebalanceFrequency: form.rebalanceFrequency,
        priceMode: form.priceMode,
        commissionRate: form.commissionRate,
        stampDutyRate: form.stampDutyRate,
        minCommission: form.minCommission,
        slippageBps: form.slippageBps,
        maxPositions: form.maxPositions,
        maxWeightPerStock: form.maxWeightPerStock,
        minDaysListed: form.minDaysListed,
        enableTradeConstraints: form.enableTradeConstraints,
        enableT1Restriction: form.enableT1Restriction,
        partialFillEnabled: form.partialFillEnabled,
      });
      setSubmittedRunId(response.runId);
      setSubmitSnackbarOpen(true);
      setRunningRefreshToken((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, selectedTemplateId, validation, validationStale]);

  return (
    <DashboardContent>
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">回测工作台</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            配置策略参数，自动校验数据完备性，提交后可继续调参与追踪进度
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          useFlexGap
          sx={{
            mt: { xs: 0, md: 0.5 },
            minHeight: 32,
            flexShrink: 0,
            flexWrap: 'wrap',
            rowGap: 1,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:notebook-bookmark-bold" width={18} />}
            onClick={() => setDraftDrawerOpen(true)}
            sx={HEADER_ACTION_BUTTON_SX}
          >
            草稿
          </Button>
          <BacktestRunningRunsBadge
            refreshToken={runningRefreshToken}
            onOpenRun={(runId) => router.push(`/backtest/runs/${runId}`)}
            buttonSx={HEADER_ACTION_BUTTON_SX}
          />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ alignSelf: 'center', height: 24 }}
          />
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<Iconify icon="solar:menu-dots-bold" width={18} />}
            onClick={(event) => setAdvancedAnchor(event.currentTarget)}
            sx={HEADER_ACTION_BUTTON_SX}
          >
            进阶
          </Button>
        </Stack>
        <Menu
          open={Boolean(advancedAnchor)}
          anchorEl={advancedAnchor}
          onClose={() => setAdvancedAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setAdvancedAnchor(null);
              router.push('/backtest/walk-forward');
            }}
          >
            <ListItemIcon>
              <Iconify icon="solar:shuffle-bold" width={18} />
            </ListItemIcon>
            Walk-Forward 验证
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAdvancedAnchor(null);
              router.push('/backtest/comparison/create');
            }}
          >
            <ListItemIcon>
              <Iconify icon="solar:copy-bold" width={18} />
            </ListItemIcon>
            多策略对比
          </MenuItem>
        </Menu>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          选择策略模板
        </Typography>
        {loadingTemplates ? (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rounded" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : null}

        {!loadingTemplates && templateError ? (
          <Alert severity="error" action={<Button onClick={loadTemplates}>重试</Button>}>
            {templateError}
          </Alert>
        ) : null}

        {!loadingTemplates && !templateError && templates.length === 0 ? (
          <Alert severity="warning" action={<Button onClick={loadTemplates}>重试</Button>}>
            模板服务暂不可用，请稍后再试。
          </Alert>
        ) : null}

        {!loadingTemplates && !templateError && templates.length > 0 ? (
          <BacktestTemplateCards
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelect={handleTemplateSelect}
          />
        ) : null}
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BacktestConfigForm
              form={form}
              fieldErrors={fieldErrors}
              dateBounds={validation?.stats}
              onChange={handleFormChange}
            />
            <BacktestStrategyConfigPanel
              selectedTemplateId={selectedTemplateId}
              form={form}
              onChange={handleFormChange}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={(theme) => ({
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              position: 'sticky',
              top: `calc(${theme.mixins.toolbar.minHeight}px + ${theme.spacing(2)})`,
            })}
          >
            <BacktestValidatePanel
              validation={validation}
              loading={validating}
              stale={validationStale}
              onOpenRun={(runId) => router.push(`/backtest/runs/${runId}`)}
            />
            <BacktestSubmitSummary
              form={form}
              selectedTemplateId={selectedTemplateId}
              validation={validation}
              validating={validating}
              validationStale={validationStale}
              submitting={submitting}
              onValidate={handleManualValidate}
              onSubmit={handleSubmit}
            />
          </Box>
        </Grid>
      </Grid>

      <BacktestDraftDrawer
        open={draftDrawerOpen}
        onClose={() => setDraftDrawerOpen(false)}
        currentConfig={currentConfig}
        autoSavedDraft={autoSavedDraft}
        onLoadDraft={loadDraftConfig}
      />

      <Snackbar
        open={restoreSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setRestoreSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          onClose={() => setRestoreSnackbarOpen(false)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (autoSavedDraft) {
                  const { strategyType } = autoSavedDraft.config as { strategyType?: string };
                  loadDraftConfig(autoSavedDraft.config, strategyType ?? 'SCREENING_ROTATION');
                }
              }}
            >
              恢复
            </Button>
          }
        >
          检测到上次未提交的配置，可一键恢复。
        </Alert>
      </Snackbar>

      <Snackbar
        open={submitSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSubmitSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          onClose={() => setSubmitSnackbarOpen(false)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setSubmitSnackbarOpen(false);
                router.push(`/backtest/runs/${submittedRunId}`);
              }}
            >
              查看进度
            </Button>
          }
        >
          回测任务已提交，你可以继续调整参数。
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
