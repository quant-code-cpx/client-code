import type { PriceAlertRule } from 'src/api/alert';
import type { IconifyName } from 'src/components/iconify/register-icons';

import dayjs from 'dayjs';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  rules: PriceAlertRule[];
  loading: boolean;
};

export function AlertPriceRuleStats({ rules, loading }: Props) {
  const theme = useTheme();

  const activeCount = rules.filter((r) => r.status === 'ACTIVE').length;
  const pausedCount = rules.filter((r) => r.status === 'PAUSED').length;
  const todayCount = rules.filter((r) => {
    if (!r.lastTriggeredAt) return false;
    return dayjs(r.lastTriggeredAt).isSame(dayjs(), 'day');
  }).length;

  const stats: {
    label: string;
    value: number;
    icon: IconifyName;
    color: 'info' | 'warning' | 'error';
  }[] = [
    {
      label: '活跃规则',
      value: activeCount,
      icon: 'solar:play-bold',
      color: 'info' as const,
    },
    {
      label: '已暂停',
      value: pausedCount,
      icon: 'solar:pause-bold',
      color: 'warning' as const,
    },
    {
      label: '今日触发',
      value: todayCount,
      icon: 'solar:bell-bing-bold-duotone',
      color: 'error' as const,
    },
  ];

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0, 1, 2].map((i) => (
          <Grid key={i} size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map(({ label, value, icon, color }) => (
        <Grid key={label} size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.08),
              border: `1px solid ${varAlpha(theme.vars.palette[color].mainChannel, 0.16)}`,
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.16),
                  color: `${color}.main`,
                  flexShrink: 0,
                }}
              >
                <Iconify icon={icon} width={24} />
              </Box>
              <Box>
                <Typography variant="h4" color={`${color}.main`}>
                  {value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
