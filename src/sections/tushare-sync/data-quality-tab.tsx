import type { SyntheticEvent } from 'react';
import type {
  RepairSummary,
  ValidationLogItem,
  RepairQueueStatus,
  QualityCheckSummary,
  QualityHealthStatus,
  DataQualityCheckItem,
} from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButton from '@mui/material/ToggleButton';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { Iconify } from 'src/components/iconify';

import { DataGapsPanel } from './data-gaps-panel';
import { AutoRepairPanel } from './auto-repair-panel';
import { ValidationLogTable } from './validation-log-table';
import { QualityHealthBanner } from './quality-health-banner';
import { QualitySummaryCards } from './quality-summary-cards';
import { CrossTableCheckPanel } from './cross-table-check-panel';
import { DataQualityReportTable } from './data-quality-report-table';

// ----------------------------------------------------------------------

type Props = {
  isReadOnly?: boolean;
  refreshKey?: number;
};

type QualityPanel = 'health' | 'tools' | 'results';

const READ_ONLY_TOOLTIP = '仅超级管理员可执行';
const QUALITY_PANEL_STORAGE_KEY = 'tushare-sync:quality-panel:v2';

function getInitialPanel(): QualityPanel {
  try {
    const saved = sessionStorage.getItem(QUALITY_PANEL_STORAGE_KEY);
    if (saved === 'tools' || saved === 'results') return saved;
  } catch {
    // ignore storage unavailable
  }
  return 'health';
}

export function DataQualityTab({ isReadOnly = false, refreshKey = 0 }: Props) {
  // ── 原有状态 ──
  const [qualityDays, setQualityDays] = useState(7);
  const [qualityReport, setQualityReport] = useState<DataQualityCheckItem[]>([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [checkTriggering, setCheckTriggering] = useState(false);

  const [validationLogs, setValidationLogs] = useState<ValidationLogItem[]>([]);
  const [validationLoading, setValidationLoading] = useState(true);

  // ── Phase 4 状态 ──
  const [healthStatus, setHealthStatus] = useState<QualityHealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [qualitySummary, setQualitySummary] = useState<QualityCheckSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ── Phase 3 状态 ──
  const [crossCheckMode, setCrossCheckMode] = useState<'recent' | 'full'>('recent');
  const [crossCheckTriggering, setCrossCheckTriggering] = useState(false);

  // ── Phase 4 补数状态 ──
  const [repairSummary, setRepairSummary] = useState<RepairSummary | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairStatus, setRepairStatus] = useState<RepairQueueStatus | null>(null);
  const [repairStatusLoading, setRepairStatusLoading] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<QualityPanel>(getInitialPanel);

  // ── Toast ──
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'info' });
  const showSnackbar = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => setSnackbar({ open: true, message, severity });

  // ── WebSocket context ──
  const { lastQualitySummary } = useSyncNotification();

  const handlePanelChange = (panel: QualityPanel) => (_: SyntheticEvent, expanded: boolean) => {
    if (!expanded) return;
    setExpandedPanel(panel);
    try {
      sessionStorage.setItem(QUALITY_PANEL_STORAGE_KEY, panel);
    } catch {
      // ignore storage unavailable
    }
  };

  // ── Data fetchers ──

  const fetchHealthStatus = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await tushareSyncApi.getQualityHealth();
      setHealthStatus(data);
    } catch {
      // ignore
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchQualitySummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await tushareSyncApi.getQualitySummary();
      setQualitySummary(data);
    } catch {
      // ignore
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchQualityReport = useCallback(async (days: number) => {
    setReportLoading(true);
    try {
      const data = await tushareSyncApi.getQualityReport(days);
      setQualityReport(data);
    } catch {
      // ignore
    } finally {
      setReportLoading(false);
    }
  }, []);

  const fetchValidationLogs = useCallback(async () => {
    setValidationLoading(true);
    try {
      const data = await tushareSyncApi.getValidationLogs(undefined, 100);
      setValidationLogs(data);
    } catch {
      // ignore
    } finally {
      setValidationLoading(false);
    }
  }, []);

  const fetchRepairStatus = useCallback(async () => {
    setRepairStatusLoading(true);
    try {
      const data = await tushareSyncApi.getRepairQueueStatus();
      setRepairStatus(data);
    } catch {
      // ignore
    } finally {
      setRepairStatusLoading(false);
    }
  }, []);

  // ── 初始化加载 ──
  useEffect(() => {
    fetchHealthStatus();
    fetchQualitySummary();
    fetchQualityReport(qualityDays);
    fetchValidationLogs();
    fetchRepairStatus();
  }, [
    fetchHealthStatus,
    fetchQualityReport,
    fetchQualitySummary,
    fetchRepairStatus,
    fetchValidationLogs,
    qualityDays,
    refreshKey,
  ]);

  // ── WebSocket 推送的摘要实时更新 ──
  useEffect(() => {
    if (!lastQualitySummary) return;
    setQualitySummary(lastQualitySummary);
    fetchHealthStatus();
    fetchQualityReport(qualityDays);
    fetchRepairStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastQualitySummary]);

  // ── 操作处理器 ──

  const handleTriggerCheck = async () => {
    if (isReadOnly) return;
    setCheckTriggering(true);
    try {
      const res = await tushareSyncApi.triggerQualityCheck();
      showSnackbar(res.message || '检查已提交，结果稍后更新', 'info');
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : '提交失败，请重试', 'error');
    } finally {
      setCheckTriggering(false);
    }
  };

  const handleRunCrossCheck = async () => {
    if (isReadOnly) return;
    setCrossCheckTriggering(true);
    try {
      const result = await tushareSyncApi.runCrossTableCheck(crossCheckMode);
      setQualityReport((prev) => [...prev.filter((r) => r.checkType !== 'cross-table'), ...result]);
      showSnackbar(`跨表对账完成（${crossCheckMode} 模式）`, 'success');
    } catch {
      showSnackbar('跨表对账执行失败', 'error');
    } finally {
      setCrossCheckTriggering(false);
    }
  };

  const handleTriggerRepair = async () => {
    if (isReadOnly) return;
    if (
      !window.confirm(
        '将根据最近一轮质量检查结果，对 fail 状态的数据集自动生成补数任务并入队，是否继续？'
      )
    )
      return;

    setRepairLoading(true);
    try {
      const result = await tushareSyncApi.triggerAutoRepair();
      setRepairSummary(result);
      await fetchRepairStatus();
      showSnackbar(`补数任务已入队 ${result.executed} 个`, 'info');
    } catch {
      showSnackbar('触发补数失败', 'error');
    } finally {
      setRepairLoading(false);
    }
  };

  const crossTableRows = qualityReport.filter((r) => r.checkType === 'cross-table');
  const nonCrossRows = qualityReport.filter((r) => r.checkType !== 'cross-table');

  return (
    <Box sx={{ mt: 3 }}>
      <Accordion
        expanded={expandedPanel === 'health'}
        onChange={handlePanelChange('health')}
        slotProps={{ transition: { unmountOnExit: true } }}
      >
        <AccordionSummary
          expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}
          aria-controls="quality-health-content"
          id="quality-health-header"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            健康总览
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <QualityHealthBanner health={healthStatus} loading={healthLoading} />
          <QualitySummaryCards summary={qualitySummary} loading={summaryLoading} />
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expandedPanel === 'tools'}
        onChange={handlePanelChange('tools')}
        slotProps={{ transition: { unmountOnExit: true } }}
      >
        <AccordionSummary
          expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}
          aria-controls="quality-tools-content"
          id="quality-tools-header"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            主动检查工具
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {isReadOnly && (
            <Alert severity="info" sx={{ mb: 2 }}>
              当前为只读模式，可查看检查工具配置；执行检查和补数需超级管理员权限。
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : ''}>
              <span>
                <LoadingButton
                  loading={checkTriggering}
                  variant="outlined"
                  size="small"
                  disabled={isReadOnly}
                  startIcon={<Iconify icon="solar:shield-check-bold" />}
                  onClick={handleTriggerCheck}
                >
                  触发质量检查
                </LoadingButton>
              </span>
            </Tooltip>

            <ToggleButtonGroup
              value={qualityDays}
              exclusive
              onChange={(_, v) => v && setQualityDays(v)}
              size="small"
            >
              <ToggleButton value={7}>7天</ToggleButton>
              <ToggleButton value={14}>14天</ToggleButton>
              <ToggleButton value={30}>30天</ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem />

            <Tooltip title="刷新补数队列状态">
              <IconButton onClick={fetchRepairStatus} size="small" aria-label="刷新补数队列状态">
                {repairStatusLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <Iconify icon="solar:refresh-bold" />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          <Card sx={{ mb: 3, px: 3, py: 2 }}>
            <CrossTableCheckPanel
              rows={crossTableRows}
              loading={reportLoading}
              triggering={crossCheckTriggering}
              mode={crossCheckMode}
              disabled={isReadOnly}
              disabledReason={READ_ONLY_TOOLTIP}
              onModeChange={setCrossCheckMode}
              onRunCheck={handleRunCrossCheck}
            />
          </Card>

          <Card sx={{ mb: 3, px: 3, py: 2 }}>
            <AutoRepairPanel
              summary={repairSummary}
              queueStatus={repairStatus}
              queueLoading={repairStatusLoading}
              repairing={repairLoading}
              disabled={isReadOnly}
              disabledReason={READ_ONLY_TOOLTIP}
              onTriggerRepair={handleTriggerRepair}
            />
          </Card>

          <Card>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                数据缺口查询
              </Typography>
              <DataGapsPanel />
            </Box>
          </Card>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expandedPanel === 'results'}
        onChange={handlePanelChange('results')}
        slotProps={{ transition: { unmountOnExit: true } }}
      >
        <AccordionSummary
          expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}
          aria-controls="quality-results-content"
          id="quality-results-header"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            检查结果与异常
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Card sx={{ mb: 3 }}>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                质量检查报告
              </Typography>
            </Box>
            <DataQualityReportTable
              rows={nonCrossRows}
              loading={reportLoading}
              days={qualityDays}
            />
          </Card>

          <Card>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                校验异常日志（最近 100 条）
              </Typography>
            </Box>
            <Divider />
            <ValidationLogTable rows={validationLogs} loading={validationLoading} />
          </Card>
        </AccordionDetails>
      </Accordion>

      {/* Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
