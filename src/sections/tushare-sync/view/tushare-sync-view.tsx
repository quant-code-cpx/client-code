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
  { label: '任务调度', icon: 'solar:restart-bold' },
  { label: '同步日志', icon: 'solar:document-text-bold' },
  { label: '数据质量', icon: 'solar:shield-check-bold' },
  { label: '运维工具', icon: 'solar:layers-bold' },
] as const;

const SOCKET_STATUS_META = {
  connected: { label: '实时在线', color: 'success' as const },
  reconnecting: { label: '重连中', color: 'warning' as const },
  disconnected: { label: '实时断线', color: 'error' as const },
};

// ----------------------------------------------------------------------

export function TushareSyncView() {
  const { hasMinRole } = usePermission();
  const isAdmin = hasMinRole('ADMIN');
  const isSuperAdmin = hasMinRole('SUPER_ADMIN');
  const isReadOnly = !isSuperAdmin;
  const { socketStatus, reconnect } = useSyncNotification();

  const [currentTab, setCurrentTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── permission guard ─────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <DashboardContent>
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
    <DashboardContent>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="h4">数据同步</Typography>
            <Chip
              size="small"
              color={isReadOnly ? 'info' : 'success'}
              label={isReadOnly ? '管理员（只读）' : '超级管理员'}
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            独立数据运维控制台：同步计划、日志、质量、缓存与重试队列集中治理。
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
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
          <Button
            size="small"
            variant="outlined"
            onClick={() => setRefreshKey((value) => value + 1)}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            刷新
          </Button>
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
        </Stack>
      </Box>

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 3 }}>
          当前账号为只读模式，可查看同步状态与日志；触发同步、质量检查、补数、重试等操作需
          超级管理员权限。
        </Alert>
      )}

      {/* 状态总览 */}
      <SyncStatusOverviewPanel
        refreshKey={refreshKey}
        onGoLogs={() => setCurrentTab(1)}
        onGoQuality={() => setCurrentTab(2)}
      />

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(_, v) => setCurrentTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="数据同步工作区"
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.label}
            label={tab.label}
            icon={<Iconify icon={tab.icon} />}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {currentTab === 0 && <SyncPlanTab isReadOnly={isReadOnly} refreshKey={refreshKey} />}
      {currentTab === 1 && <SyncLogTab refreshKey={refreshKey} />}
      {currentTab === 2 && <DataQualityTab isReadOnly={isReadOnly} refreshKey={refreshKey} />}
      {currentTab === 3 && <OpsTab isReadOnly={isReadOnly} refreshKey={refreshKey} />}

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
