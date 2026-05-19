import type { PrecomputeStatusItem } from 'src/api/factor';

import { useSearchParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { usePollingFetch } from 'src/hooks/use-polling-fetch';

import { DashboardContent } from 'src/layouts/dashboard';
import { adminPrecompute, adminToggleFactor, adminPrecomputeStatus } from 'src/api/factor';

import { Iconify } from 'src/components/iconify';

import { FactorAdminKpiRow } from '../admin/factor-admin-kpi-row';
import { FactorAdminJobsTable } from '../admin/factor-admin-jobs-table';
import { FactorAdminAuditTable } from '../admin/factor-admin-audit-table';
import { FactorAdminStatusTable } from '../admin/factor-admin-status-table';
import { FactorAdminBackfillForm } from '../admin/factor-admin-backfill-form';
import { FactorAdminSchedulePanel } from '../admin/factor-admin-schedule-panel';
import { FactorAdminBulkActionBar } from '../admin/factor-admin-bulk-action-bar';
import { FactorAdminFilterBar, DEFAULT_ADMIN_FILTERS } from '../admin/factor-admin-filter-bar';

import type { AdminStatusFilters } from '../admin/factor-admin-filter-bar';

// ─── Tab definitions ──────────────────────────────────────────

const TABS = [
  { value: 'status', label: '状态总览' },
  { value: 'jobs', label: '任务历史' },
  { value: 'backfill', label: '历史回补' },
  { value: 'schedule', label: '调度配置' },
  { value: 'audit', label: '审计日志' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

// ─── View ─────────────────────────────────────────────────────

export function FactorAdminView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'status';
  const activeTab: TabValue = TABS.some((t) => t.value === rawTab)
    ? (rawTab as TabValue)
    : 'status';

  // Status data
  const [statusItems, setStatusItems] = useState<PrecomputeStatusItem[]>([]);
  const [statusError, setStatusError] = useState('');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Selected rows (bridged to backfill tab)
  const [selected, setSelected] = useState<PrecomputeStatusItem[]>([]);
  const [injectedForBackfill, setInjectedForBackfill] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState<AdminStatusFilters>(DEFAULT_ADMIN_FILTERS);

  // Job highlights (after backfill submit)
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);

  // Action feedback
  const [actionMsg, setActionMsg] = useState('');
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAction = (msg: string) => {
    setActionMsg(msg);
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    actionTimerRef.current = setTimeout(() => setActionMsg(''), 4000);
  };

  // ── Fetch status ──────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    setStatusError('');
    try {
      const res = await adminPrecomputeStatus();
      setStatusItems(Array.isArray(res?.items) ? res.items : []);
      setLastRefreshTime(new Date());
    } catch {
      setStatusError('加载因子状态失败');
    }
  }, []);

  // Determine if fast poll needed (active jobs)
  const statusHasRunning = useCallback(
    () => statusItems.some((it) => it.status === 'RUNNING'),
    [statusItems]
  );

  usePollingFetch(fetchStatus, {
    interval: 30000,
    fastInterval: 5000,
    fastWhen: statusHasRunning,
    pauseWhenHidden: true,
    enabled: activeTab === 'status',
  });

  // Also fetch once when tab changes to status
  useEffect(() => {
    if (activeTab === 'status') fetchStatus();
  }, [activeTab, fetchStatus]);

  // ── KPI filtering ─────────────────────────────────────────

  const handleKpiClick = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [status],
    }));
  };

  // ── Precompute ────────────────────────────────────────────

  const handlePrecompute = useCallback(
    async (names: string[]) => {
      try {
        const today = new Date();
        const tradeDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        await adminPrecompute({ factorNames: names, tradeDate });
        showAction(`预计算已触发（${names.length} 个因子）`);
        fetchStatus();
      } catch {
        showAction('预计算触发失败');
      }
    },
    [fetchStatus]
  );

  // ── Toggle enable ─────────────────────────────────────────

  const handleToggleEnable = useCallback(
    async (factorNameOrNames: string | string[], enable: boolean) => {
      const names = Array.isArray(factorNameOrNames) ? factorNameOrNames : [factorNameOrNames];
      try {
        await adminToggleFactor({ factorNames: names, isEnabled: enable });
        showAction(`已${enable ? '启用' : '禁用'} ${names.length} 个因子`);
        fetchStatus();
      } catch {
        showAction('操作失败');
      }
    },
    [fetchStatus]
  );

  // ── Bulk backfill injection ───────────────────────────────

  const handleBulkBackfill = (names: string[]) => {
    setInjectedForBackfill(names);
    setSearchParams((prev) => {
      prev.set('tab', 'backfill');
      return prev;
    });
  };

  // ── Tab change ────────────────────────────────────────────

  const handleTabChange = (_: React.SyntheticEvent, val: TabValue) => {
    setSearchParams((prev) => {
      prev.set('tab', val);
      return prev;
    });
  };

  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">因子管理</Typography>
          {lastRefreshTime && (
            <Typography variant="caption" color="text.secondary">
              最后刷新：{lastRefreshTime.toLocaleTimeString('zh-CN')}
            </Typography>
          )}
        </Box>
        <Tooltip title="立即刷新状态数据">
          <Button
            variant="outlined"
            size="small"
            onClick={fetchStatus}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            刷新
          </Button>
        </Tooltip>
      </Stack>

      {/* KPI row */}
      <FactorAdminKpiRow items={statusItems} onFilterStatus={handleKpiClick} />

      {/* Action message */}
      {actionMsg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setActionMsg('')}>
          {actionMsg}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        {TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {/* ── Tab: 状态总览 ── */}
      {activeTab === 'status' && (
        <Box>
          <FactorAdminFilterBar filters={filters} onChange={setFilters} />
          <FactorAdminBulkActionBar
            selected={selected}
            onPrecompute={handlePrecompute}
            onBackfill={handleBulkBackfill}
            onToggleEnable={(names, enable) => handleToggleEnable(names, enable)}
            onCopyNames={() => {}}
            onClearSelection={() => setSelected([])}
          />
          <FactorAdminStatusTable
            items={statusItems}
            loading={false}
            error={statusError}
            filters={filters}
            selected={selected}
            onSelectedChange={setSelected}
            onToggleEnable={(name, enable) => handleToggleEnable(name, enable)}
            onPrecomputeOne={(name) => handlePrecompute([name])}
            onRefetch={fetchStatus}
          />
        </Box>
      )}

      {/* ── Tab: 任务历史 ── */}
      {activeTab === 'jobs' && <FactorAdminJobsTable highlightJobId={highlightJobId} />}

      {/* ── Tab: 历史回补 ── */}
      {activeTab === 'backfill' && (
        <FactorAdminBackfillForm
          statusItems={statusItems}
          injectedFactorNames={injectedForBackfill}
          onSubmitted={(jobId) => {
            setHighlightJobId(jobId);
            setSearchParams((prev) => {
              prev.set('tab', 'jobs');
              return prev;
            });
          }}
        />
      )}

      {/* ── Tab: 调度配置 ── */}
      {activeTab === 'schedule' && <FactorAdminSchedulePanel />}

      {/* ── Tab: 审计日志 ── */}
      {activeTab === 'audit' && <FactorAdminAuditTable />}
    </DashboardContent>
  );
}
