import type { PrecomputeStatusItem, AdminBackfillResponse } from 'src/api/factor';

import { useSearchParams } from 'react-router';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { usePollingFetch } from 'src/hooks/use-polling-fetch';

import { fmtTradeDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { adminPrecompute, adminPrecomputeStatus } from 'src/api/factor';

import { Iconify } from 'src/components/iconify';

import { FactorAdminKpiRow } from '../admin/factor-admin-kpi-row';
import { FactorAdminJobsTable } from '../admin/factor-admin-jobs-table';
import { FactorAdminAuditTable } from '../admin/factor-admin-audit-table';
import { FactorAdminStatusTable } from '../admin/factor-admin-status-table';
import { FactorAdminSchedulePanel } from '../admin/factor-admin-schedule-panel';
import { FactorAdminBulkActionBar } from '../admin/factor-admin-bulk-action-bar';
import { FactorAdminFilterBar, DEFAULT_ADMIN_FILTERS } from '../admin/factor-admin-filter-bar';
import {
  formatBackfillSuccess,
  FactorAdminBackfillForm,
} from '../admin/factor-admin-backfill-form';

import type { AdminStatusFilters } from '../admin/factor-admin-filter-bar';

const TABS = [
  { value: 'status', label: '状态总览' },
  { value: 'jobs', label: '任务历史' },
  { value: 'backfill', label: '历史回补' },
  { value: 'schedule', label: '调度配置' },
  { value: 'audit', label: '审计日志' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

export function formatPrecomputeSuccess(response: {
  tradeDate: string;
  factorsProcessed: number;
  factorsFailed: number;
  totalRows: number;
}) {
  return `预计算完成（${fmtTradeDate(response.tradeDate)}）：成功 ${response.factorsProcessed}，失败 ${response.factorsFailed}，写入 ${response.totalRows.toLocaleString()} 行`;
}

export function FactorAdminView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'status';
  const activeTab: TabValue = TABS.some((tab) => tab.value === rawTab)
    ? (rawTab as TabValue)
    : 'status';

  const [statusItems, setStatusItems] = useState<PrecomputeStatusItem[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [targetTradeDate, setTargetTradeDate] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const hasLoadedStatusRef = useRef(false);

  const [selected, setSelected] = useState<PrecomputeStatusItem[]>([]);
  const [injectedForBackfill, setInjectedForBackfill] = useState<string[]>([]);
  const [filters, setFilters] = useState<AdminStatusFilters>(DEFAULT_ADMIN_FILTERS);

  const [actionMsg, setActionMsg] = useState('');
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAction = useCallback((message: string) => {
    setActionMsg(message);
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    actionTimerRef.current = setTimeout(() => setActionMsg(''), 6000);
  }, []);

  useEffect(
    () => () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    },
    []
  );

  const fetchStatus = useCallback(async () => {
    if (!hasLoadedStatusRef.current) setStatusLoading(true);
    setStatusError('');
    try {
      const response = await adminPrecomputeStatus();
      setStatusItems(Array.isArray(response.items) ? response.items : []);
      setTargetTradeDate(response.targetTradeDate);
      setLastRefreshTime(new Date());
      hasLoadedStatusRef.current = true;
    } catch (error) {
      setStatusError('加载因子状态失败');
      throw error;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const statusHasRunning = useCallback(
    () => statusItems.some((item) => item.status === 'RUNNING'),
    [statusItems]
  );

  usePollingFetch(fetchStatus, {
    interval: 30000,
    fastInterval: 5000,
    fastWhen: statusHasRunning,
    pauseWhenHidden: true,
    enabled: activeTab === 'status',
  });

  const handleKpiClick = (status: string) => {
    setFilters((previous) => ({
      ...previous,
      statuses: previous.statuses.includes(status)
        ? previous.statuses.filter((item) => item !== status)
        : [status],
    }));
  };

  const handlePrecompute = useCallback(
    async (factorNames: string[]) => {
      if (!targetTradeDate) {
        showAction('无法确定最近有效交易日，未发送预计算请求');
        return;
      }
      try {
        const response = await adminPrecompute({ factorNames, tradeDate: targetTradeDate });
        showAction(formatPrecomputeSuccess(response));
        await fetchStatus();
      } catch {
        showAction('预计算失败');
      }
    },
    [fetchStatus, showAction, targetTradeDate]
  );

  const handleBulkBackfill = (factorNames: string[]) => {
    setInjectedForBackfill(factorNames);
    setSearchParams((previous) => {
      previous.set('tab', 'backfill');
      return previous;
    });
  };

  const handleBackfillSubmitted = (response: AdminBackfillResponse) => {
    showAction(formatBackfillSuccess(response));
  };

  const handleTabChange = (_: React.SyntheticEvent, value: TabValue) => {
    setSearchParams((previous) => {
      previous.set('tab', value);
      return previous;
    });
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h4">因子管理</Typography>
          <Typography variant="caption" color="text.secondary">
            {lastRefreshTime
              ? `最后刷新：${lastRefreshTime.toLocaleTimeString('zh-CN')}`
              : '正在加载最新状态'}
          </Typography>
        </Box>
        <Tooltip title="立即刷新状态数据">
          <Button
            variant="outlined"
            size="small"
            onClick={() => void fetchStatus().catch(() => {})}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            刷新
          </Button>
        </Tooltip>
      </Stack>

      <FactorAdminKpiRow items={statusItems} onFilterStatus={handleKpiClick} />

      {actionMsg ? (
        <Alert severity="info" sx={{ mt: 2 }} onClose={() => setActionMsg('')}>
          {actionMsg}
        </Alert>
      ) : null}

      <Card sx={{ mt: 2.5, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        {activeTab === 'status' ? (
          <Box>
            <Box sx={{ p: 2 }}>
              <FactorAdminFilterBar filters={filters} onChange={setFilters} />
            </Box>
            <FactorAdminBulkActionBar
              selected={selected}
              onPrecompute={handlePrecompute}
              onBackfill={handleBulkBackfill}
              onCopyNames={(factorNames) => showAction(`已复制 ${factorNames.length} 个因子标识`)}
              onClearSelection={() => setSelected([])}
            />
            <FactorAdminStatusTable
              items={statusItems}
              loading={statusLoading}
              error={statusError}
              filters={filters}
              selected={selected}
              onSelectedChange={setSelected}
              onPrecomputeOne={(factorName) => void handlePrecompute([factorName])}
              onRefetch={() => void fetchStatus().catch(() => {})}
            />
          </Box>
        ) : null}

        {activeTab === 'jobs' ? (
          <Box sx={{ p: 2 }}>
            <FactorAdminJobsTable />
          </Box>
        ) : null}

        {activeTab === 'backfill' ? (
          <Box sx={{ p: 2 }}>
            <FactorAdminBackfillForm
              statusItems={statusItems}
              injectedFactorNames={injectedForBackfill}
              onSubmitted={handleBackfillSubmitted}
            />
          </Box>
        ) : null}

        {activeTab === 'schedule' ? (
          <Box sx={{ p: 2 }}>
            <FactorAdminSchedulePanel />
          </Box>
        ) : null}

        {activeTab === 'audit' ? (
          <Box sx={{ p: 2 }}>
            <FactorAdminAuditTable />
          </Box>
        ) : null}
      </Card>
    </DashboardContent>
  );
}
