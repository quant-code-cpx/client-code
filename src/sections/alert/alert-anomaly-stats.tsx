import type { AnomalyType, AnomalyListResponse } from 'src/api/alert';
import type { IconifyName } from 'src/components/iconify/register-icons';

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

type StatConfig = {
  type: AnomalyType;
  label: string;
  icon: IconifyName;
  desc: string;
  color: 'warning' | 'error' | 'info';
};

const STAT_CONFIG: StatConfig[] = [
  {
    type: 'VOLUME_SURGE',
    label: '放量突破',
    icon: 'solar:graph-up-bold',
    desc: 'vol ≥ 3x',
    color: 'warning',
  },
  {
    type: 'CONSECUTIVE_LIMIT_UP',
    label: '连续涨停',
    icon: 'solar:shield-warning-bold',
    desc: '≥ 2 天',
    color: 'error',
  },
  {
    type: 'LARGE_NET_INFLOW',
    label: '大额净流入',
    icon: 'solar:wallet-bold',
    desc: '≥ 15%',
    color: 'info',
  },
];

type Props = {
  data: AnomalyListResponse | null;
  loading: boolean;
};

export function AlertAnomalyStats({ data, loading }: Props) {
  const theme = useTheme();

  const countByType = (type: AnomalyType) =>
    data?.items.filter((item) => item.anomalyType === type).length ?? 0;

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
      {STAT_CONFIG.map(({ type, label, icon, desc, color }) => (
        <Grid key={type} size={{ xs: 12, md: 4 }}>
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
                  {countByType(type)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {desc}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
