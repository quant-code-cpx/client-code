import type { CreateStrategyRequest } from 'src/api/strategy';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CardActionArea from '@mui/material/CardActionArea';
import FormControlLabel from '@mui/material/FormControlLabel';

import { BacktestStrategyConfigPanel } from 'src/sections/backtest/backtest-strategy-config-panel';

import { STRATEGY_TYPE_LABEL, STRATEGY_TYPE_DESCRIPTION } from './constants';

import type { BacktestRunForm } from '../backtest/types';

// ----------------------------------------------------------------------

const STRATEGY_TYPES = [
  'MA_CROSS_SINGLE',
  'SCREENING_ROTATION',
  'FACTOR_RANKING',
  'CUSTOM_POOL_REBALANCE',
  'FACTOR_SCREENING_ROTATION',
] as const;

const DEFAULT_STRATEGY_CONFIG: Record<string, Record<string, unknown>> = {
  MA_CROSS_SINGLE: { tsCode: '', shortWindow: 5, longWindow: 20, allowFlat: false },
  SCREENING_ROTATION: { rankBy: 'totalMv', rankOrder: 'desc', topN: 20, minDaysListed: 60 },
  FACTOR_RANKING: { factorName: '', rankOrder: 'desc', topN: 20, minDaysListed: 60 },
  CUSTOM_POOL_REBALANCE: { tsCodes: [], weightMode: 'EQUAL', customWeights: [] },
  FACTOR_SCREENING_ROTATION: {
    conditions: [],
    sortOrder: 'desc',
    topN: 20,
    weightMethod: 'equal_weight',
  },
};

const DEFAULT_BACKTEST_FORM: BacktestRunForm = {
  name: '',
  startDate: '2020-01-01',
  endDate: '2024-12-31',
  initialCapital: 1000000,
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  customUniverseTsCodes: [],
  rebalanceFrequency: 'MONTHLY',
  priceMode: 'NEXT_OPEN',
  enableTradeConstraints: true,
  commissionRate: 0.0003,
  stampDutyRate: 0.0005,
  minCommission: 5,
  slippageBps: 5,
  maxPositions: 50,
  maxWeightPerStock: 0.1,
  minDaysListed: 60,
  strategyConfig: {},
};

// ----------------------------------------------------------------------

interface StrategyCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreateStrategyRequest) => Promise<void>;
  submitting: boolean;
}

export function StrategyCreateDialog({
  open,
  onClose,
  onConfirm,
  submitting,
}: StrategyCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [strategyType, setStrategyType] = useState('');
  const [backtestForm, setBacktestForm] = useState<BacktestRunForm>({ ...DEFAULT_BACKTEST_FORM });
  const [error, setError] = useState('');

  // When dialog opens, reset form
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTags([]);
      setIsPublic(false);
      setStrategyType('');
      setBacktestForm({ ...DEFAULT_BACKTEST_FORM });
      setError('');
    }
  }, [open]);

  // When strategy type changes, reset strategyConfig to defaults
  const handleTypeSelect = (type: string) => {
    setStrategyType(type);
    setBacktestForm((prev) => ({
      ...prev,
      strategyConfig: { ...(DEFAULT_STRATEGY_CONFIG[type] ?? {}) },
    }));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入策略名称');
      return;
    }
    if (!strategyType) {
      setError('请选择策略类型');
      return;
    }

    setError('');
    await onConfirm({
      name: name.trim(),
      description: description.trim() || undefined,
      strategyType,
      strategyConfig: backtestForm.strategyConfig,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={!submitting ? onClose : undefined}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>新建策略</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* ── A. 基本信息 ─────────────────────────────── */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          基本信息
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="策略名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputProps={{ maxLength: 100 }}
              helperText={`${name.length}/100`}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="策略描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${description.length}/500`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={tags}
              onChange={(_, newVal) => {
                if (newVal.length <= 10) setTags(newVal as string[]);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option} size="small" {...tagProps} />;
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="标签（最多 10 个，回车确认）"
                  placeholder={tags.length === 0 ? '输入标签后回车' : ''}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              }
              label="公开策略"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* ── B. 策略类型选择 ──────────────────────────── */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          策略类型
        </Typography>

        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {STRATEGY_TYPES.map((type) => {
            const selected = strategyType === type;
            return (
              <Grid key={type} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    border: (theme) =>
                      selected
                        ? `2px solid ${theme.palette.primary.main}`
                        : '2px solid transparent',
                    boxShadow: selected ? 4 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <CardActionArea onClick={() => handleTypeSelect(type)} sx={{ p: 1.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: selected ? 'primary.main' : 'text.primary', mb: 0.5 }}
                    >
                      {STRATEGY_TYPE_LABEL[type]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {STRATEGY_TYPE_DESCRIPTION[type]}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* ── C. 策略配置 ──────────────────────────────── */}
        {strategyType && strategyType !== 'FACTOR_SCREENING_ROTATION' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              策略配置
            </Typography>
            <Box
              sx={{
                '& .MuiCard-root': {
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: 'divider',
                },
              }}
            >
              <BacktestStrategyConfigPanel
                selectedTemplateId={strategyType}
                form={backtestForm}
                onChange={(updates) => setBacktestForm((prev) => ({ ...prev, ...updates }))}
              />
            </Box>
          </>
        )}

        {strategyType === 'FACTOR_SCREENING_ROTATION' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              策略配置（因子选股轮动）
            </Typography>
            <Alert severity="info">因子选股轮动配置面板正在开发中，暂时使用 JSON 形式预览。</Alert>
            <Box
              component="pre"
              sx={{
                mt: 1,
                p: 2,
                bgcolor: 'background.neutral',
                borderRadius: 1,
                fontSize: 12,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(backtestForm.strategyConfig, null, 2)}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !strategyType}
          loading={submitting}
        >
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
}
