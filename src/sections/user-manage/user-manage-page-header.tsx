import type { UserStatusFilter } from 'src/api/user-manage';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { HasPermission } from 'src/permission';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { KpiSummary } from './kpi-summary';

// ----------------------------------------------------------------------

type Props = {
  currentTab: number;
  kpiRefreshKey: number;
  onCreate: () => void;
  onApplyStatus: (status: UserStatusFilter | '') => void;
  onTabChange: (tab: number) => void;
};

export function UserManageAccessDenied() {
  return (
    <DashboardContent>
      <Box
        sx={{
          gap: 2,
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
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
          需要管理员及以上权限才能访问用户管理
        </Typography>
      </Box>
    </DashboardContent>
  );
}

export function UserManagePageHeader({
  currentTab,
  kpiRefreshKey,
  onCreate,
  onApplyStatus,
  onTabChange,
}: Props) {
  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ sm: 'center' }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">用户管理</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理账号生命周期、配额与角色，并追溯所有关键变更
          </Typography>
        </Box>

        {currentTab === 0 && (
          <HasPermission minRole="ADMIN">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={onCreate}
            >
              新增用户
            </Button>
          </HasPermission>
        )}
      </Stack>

      {CONFIG.userManageFeatures.stats && (
        <KpiSummary onApplyStatus={onApplyStatus} refreshKey={kpiRefreshKey} />
      )}

      <Tabs value={currentTab} onChange={(_, value) => onTabChange(value)} sx={{ mb: 3 }}>
        <Tab
          icon={<Iconify icon="solar:users-group-rounded-bold" />}
          label="用户列表"
          iconPosition="start"
        />
        <Tab
          icon={<Iconify icon="solar:document-text-bold" />}
          label="审计日志"
          iconPosition="start"
        />
      </Tabs>
    </>
  );
}
