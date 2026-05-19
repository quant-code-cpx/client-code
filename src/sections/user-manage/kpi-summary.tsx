import type { IconifyName } from 'src/components/iconify';
import type { UserStatusFilter } from 'src/api/user-manage';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { userManageApi } from 'src/api/user-manage';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type UserStats = Awaited<ReturnType<typeof userManageApi.stats>>;

type KpiSummaryProps = {
  onApplyStatus: (status: UserStatusFilter | '') => void;
  refreshKey?: number;
};

type KpiItem = {
  key: keyof UserStats;
  label: string;
  icon: IconifyName;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  status: UserStatusFilter | '';
};

const KPI_ITEMS: KpiItem[] = [
  {
    key: 'total',
    label: '总用户',
    icon: 'solar:users-group-rounded-bold',
    color: 'primary',
    status: '',
  },
  {
    key: 'todayNew',
    label: '今日新增',
    icon: 'solar:user-plus-rounded-bold',
    color: 'success',
    status: '',
  },
  { key: 'active30d', label: '30日活跃', icon: 'solar:bolt-bold', color: 'info', status: 'ACTIVE' },
  {
    key: 'deactivated',
    label: '已禁用',
    icon: 'solar:shield-warning-bold',
    color: 'error',
    status: 'DEACTIVATED',
  },
  {
    key: 'locked',
    label: '已锁定',
    icon: 'solar:lock-keyhole-bold',
    color: 'warning',
    status: 'LOCKED',
  },
];

export function KpiSummary({ onApplyStatus, refreshKey }: KpiSummaryProps) {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);

    userManageApi
      .stats(ctrl.signal)
      .then((result) => {
        if (!ctrl.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [refreshKey]);

  if (error) return null;

  return (
    <Box
      sx={{
        gap: 2,
        mb: 3,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
      }}
    >
      {KPI_ITEMS.map((item) => (
        <Card
          key={item.key}
          component={ButtonBase}
          onClick={() => onApplyStatus(item.status)}
          sx={(theme) => ({
            p: 2,
            width: 1,
            gap: 1.5,
            display: 'flex',
            textAlign: 'left',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'flex-start',
            borderLeft: `2px solid ${theme.palette[item.color].main}`,
            transition: theme.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
            '&:hover': {
              boxShadow: theme.customShadows?.z8,
              transform: 'translateY(-2px)',
            },
          })}
        >
          <Box
            sx={(theme) => ({
              width: 40,
              height: 40,
              display: 'grid',
              flexShrink: 0,
              borderRadius: 1.25,
              placeItems: 'center',
              color: `${item.color}.main`,
              bgcolor: varAlpha(theme.vars.palette[item.color].mainChannel, 0.08),
            })}
          >
            <Iconify icon={item.icon} width={22} />
          </Box>

          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
            {loading ? (
              <Skeleton width={56} height={32} />
            ) : (
              <Typography variant="h4">{data?.[item.key] ?? 0}</Typography>
            )}
          </Stack>
        </Card>
      ))}
    </Box>
  );
}
