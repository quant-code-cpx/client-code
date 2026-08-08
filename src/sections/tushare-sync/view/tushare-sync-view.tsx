import type { SyncLogQuery } from 'src/api/tushare-sync';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { usePermission } from 'src/permission';
import { DashboardContent } from 'src/layouts/dashboard';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { Iconify } from 'src/components/iconify';

import { OpsTab } from '../ops-tab';
import { SyncLogTab } from '../sync-log-tab';
import { SyncPlanTab } from '../sync-plan-tab';
import { DataQualityTab } from '../data-quality-tab';
import { SyncStatusOverviewPanel } from '../sync-status-overview';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'overview', label: '运行概览', icon: 'solar:chart-2-bold' },
  { value: 'plan', label: '任务调度', icon: 'solar:restart-bold' },
  { value: 'logs', label: '同步日志', icon: 'solar:document-text-bold' },
  { value: 'quality', label: '数据质量', icon: 'solar:shield-check-bold' },
  { value: 'ops', label: '运维工具', icon: 'solar:layers-bold' },
] as const;

type WorkspaceTab = (typeof TABS)[number]['value'];

const SOCKET_STATUS_META = {
  connected: { label: '实时在线', color: 'success' as const },
  reconnecting: { label: '重连中', color: 'warning' as const },
  disconnected: { label: '实时断线', color: 'error' as const },
};

const ACTIVE_TAB_STORAGE_KEY = 'tushare-sync:active-tab:v1';
const DEFAULT_WORKSPACE_TAB: WorkspaceTab = 'overview';

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return TABS.some((tab) => tab.value === value);
}

function getInitialWorkspaceTab(): WorkspaceTab {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_TAB;

  try {
    const savedTab = window.sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return isWorkspaceTab(savedTab) ? savedTab : DEFAULT_WORKSPACE_TAB;
  } catch {
    return DEFAULT_WORKSPACE_TAB;
  }
}

function saveWorkspaceTab(tab: WorkspaceTab) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

// ----------------------------------------------------------------------

export function TushareSyncView() {
  const { hasMinRole } = usePermission();
  const isAdmin = hasMinRole('ADMIN');
  const isSuperAdmin = hasMinRole('SUPER_ADMIN');
  const isReadOnly = !isSuperAdmin;
  const { socketStatus, reconnect } = useSyncNotification();

  const [currentTab, setCurrentTab] = useState<WorkspaceTab>(getInitialWorkspaceTab);
  const [visitedTabs, setVisitedTabs] = useState<WorkspaceTab[]>(() => [currentTab]);
  const [refreshKeys, setRefreshKeys] = useState<Record<WorkspaceTab, number>>({
    overview: 0,
    plan: 0,
    logs: 0,
    quality: 0,
    ops: 0,
  });
  const [auditOpen, setAuditOpen] = useState(false);
  const [qualityFocusRequest, setQualityFocusRequest] = useState(0);
  const [logFilters, setLogFilters] = useState<
    Pick<SyncLogQuery, 'task' | 'status' | 'startDate' | 'endDate'> | undefined
  >();

  const setWorkspaceTab = (tab: WorkspaceTab, persist = false) => {
    setCurrentTab(tab);
    setVisitedTabs((tabs) => (tabs.includes(tab) ? tabs : [...tabs, tab]));
    if (persist) saveWorkspaceTab(tab);
  };

  const handleGoLogs = (
    filters?: Pick<SyncLogQuery, 'task' | 'status' | 'startDate' | 'endDate'>
  ) => {
    if (filters) setLogFilters(filters);
    setWorkspaceTab('logs');
  };

  const handleGoQuality = () => {
    setQualityFocusRequest((value) => value + 1);
    setWorkspaceTab('quality');
  };

  const handleRefreshCurrentTab = () => {
    setRefreshKeys((keys) => ({ ...keys, [currentTab]: keys[currentTab] + 1 }));
  };

  // ── permission guard ─────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <DashboardContent maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            gap: 2,
          }}
        >
          <Iconify
            icon="solar:shield-keyhole-bold-duotone"
            sx={{ fontSize: 64, color: 'text.disabled' }}
          />
          <Typography variant="h6" color="text.secondary">
            权限不足
          </Typography>
          <Typography variant="body2" color="text.disabled">
            仅管理员及以上角色可访问数据同步功能
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  // ── render ───────────────────────────────────────────────────────────
  const statusMeta = SOCKET_STATUS_META[socketStatus];

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          gap: 1.5,
          minHeight: 56,
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ mb: 0.25 }}>
            数据运维
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tushare 数据同步与质量治理
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          <Chip
            size="small"
            color={isReadOnly ? 'info' : 'success'}
            label={isReadOnly ? '管理员（只读）' : '超级管理员'}
            variant="outlined"
          />
          <Chip
            size="small"
            color={statusMeta.color}
            label={statusMeta.label}
            icon={<Iconify icon="solar:restart-bold" />}
            variant="outlined"
          />
          {socketStatus !== 'connected' && (
            <Button size="small" variant="outlined" onClick={reconnect}>
              重连
            </Button>
          )}
          <Tooltip title="等待后端告警订阅接口启用">
            <span>
              <Button size="small" variant="outlined" disabled>
                告警订阅
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setAuditOpen(true)}
          >
            审计
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleRefreshCurrentTab}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            刷新当前工作区
          </Button>
        </Stack>
      </Box>

      {/* Workspace tabs */}
      <Tabs
        value={currentTab}
        onChange={(_, value) => {
          if (isWorkspaceTab(value)) setWorkspaceTab(value, true);
        }}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="数据运维工作区"
        sx={{
          top: 0,
          zIndex: 5,
          position: 'sticky',
          minHeight: 48,
          borderRadius: 1,
          bgcolor: 'background.paper',
          borderBottom: (theme) => `1px solid ${theme.vars.palette.divider}`,
          '& .MuiTab-root': { minHeight: 48 },
        }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            id={`tushare-sync-${tab.value}-tab`}
            aria-controls={`tushare-sync-${tab.value}-panel`}
            label={tab.label}
            icon={<Iconify icon={tab.icon} />}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {isReadOnly && (
        <Alert severity="info" sx={{ mt: 2 }}>
          当前账号为只读模式，可查看同步状态与日志；触发同步、质量检查、补数、重试等操作需
          超级管理员权限。
        </Alert>
      )}

      {visitedTabs.includes('overview') && (
        <Box
          role="tabpanel"
          id="tushare-sync-overview-panel"
          aria-labelledby="tushare-sync-overview-tab"
          hidden={currentTab !== 'overview'}
        >
          <SyncStatusOverviewPanel
            refreshKey={refreshKeys.overview}
            onGoLogs={handleGoLogs}
            onGoQuality={handleGoQuality}
          />
        </Box>
      )}

      {visitedTabs.includes('plan') && (
        <Box
          role="tabpanel"
          id="tushare-sync-plan-panel"
          aria-labelledby="tushare-sync-plan-tab"
          hidden={currentTab !== 'plan'}
        >
          <SyncPlanTab isReadOnly={isReadOnly} refreshKey={refreshKeys.plan} />
        </Box>
      )}

      {visitedTabs.includes('logs') && (
        <Box
          role="tabpanel"
          id="tushare-sync-logs-panel"
          aria-labelledby="tushare-sync-logs-tab"
          hidden={currentTab !== 'logs'}
        >
          <SyncLogTab refreshKey={refreshKeys.logs} initialFilters={logFilters} />
        </Box>
      )}

      {visitedTabs.includes('quality') && (
        <Box
          role="tabpanel"
          id="tushare-sync-quality-panel"
          aria-labelledby="tushare-sync-quality-tab"
          hidden={currentTab !== 'quality'}
        >
          <DataQualityTab
            isReadOnly={isReadOnly}
            refreshKey={refreshKeys.quality}
            focusPanel={qualityFocusRequest > 0 ? 'tools' : undefined}
            focusRequest={qualityFocusRequest}
          />
        </Box>
      )}

      {visitedTabs.includes('ops') && (
        <Box
          role="tabpanel"
          id="tushare-sync-ops-panel"
          aria-labelledby="tushare-sync-ops-tab"
          hidden={currentTab !== 'ops'}
        >
          <OpsTab isReadOnly={isReadOnly} refreshKey={refreshKeys.ops} />
        </Box>
      )}

      <Drawer anchor="right" open={auditOpen} onClose={() => setAuditOpen(false)}>
        <Box sx={{ width: 360, p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">操作审计流水</Typography>
            <Tooltip title="关闭审计抽屉">
              <IconButton onClick={() => setAuditOpen(false)} aria-label="关闭审计抽屉">
                <Iconify icon="solar:close-circle-bold" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="info">
            后端审计接口启用前，这里作为数据同步操作流水入口占位；后续会接入
            <code>category=&quot;tushare-sync&quot;</code> 的真实审计记录。
          </Alert>
        </Box>
      </Drawer>
    </DashboardContent>
  );
}
