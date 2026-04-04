import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { usePermission } from 'src/permission';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { SyncLogTab } from '../sync-log-tab';
import { SyncPlanTab } from '../sync-plan-tab';
import { CacheStatsTab } from '../cache-stats-tab';
import { RetryQueueTab } from '../retry-queue-tab';
import { DataQualityTab } from '../data-quality-tab';

// ----------------------------------------------------------------------

const TABS = [
  { label: '同步计划', icon: 'solar:restart-bold' },
  { label: '同步日志', icon: 'solar:document-text-bold' },
  { label: '数据质量', icon: 'solar:shield-check-bold' },
  { label: '缓存统计', icon: 'solar:server-bold' },
  { label: '重试队列', icon: 'solar:refresh-circle-bold' },
];

// ----------------------------------------------------------------------

export function TushareSyncView() {
  const { hasMinRole } = usePermission();
  const isSuperAdmin = hasMinRole('SUPER_ADMIN');

  const [currentTab, setCurrentTab] = useState(0);

  // ── permission guard ─────────────────────────────────────────────────
  if (!isSuperAdmin) {
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
            仅超级管理员可访问数据同步功能
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  // ── render ───────────────────────────────────────────────────────────
  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          数据同步
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(_, v) => setCurrentTab(v)}
        variant="scrollable"
        scrollButtons="auto"
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

      {currentTab === 0 && <SyncPlanTab />}
      {currentTab === 1 && <SyncLogTab />}
      {currentTab === 2 && <DataQualityTab />}
      {currentTab === 3 && <CacheStatsTab />}
      {currentTab === 4 && <RetryQueueTab />}
    </DashboardContent>
  );
}
