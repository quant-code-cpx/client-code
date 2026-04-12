import type { EventType, CalendarEvent } from 'src/api/alert';
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
  type: EventType;
  label: string;
  icon: IconifyName;
  color: 'info' | 'warning' | 'success' | 'error';
};

const STAT_CONFIG: StatConfig[] = [
  { type: 'DISCLOSURE', label: '财报披露', icon: 'solar:document-text-bold', color: 'info' },
  { type: 'FLOAT', label: '限售解禁', icon: 'solar:lock-bold', color: 'warning' },
  { type: 'DIVIDEND', label: '除权除息', icon: 'solar:wallet-bold', color: 'success' },
  { type: 'FORECAST', label: '业绩预告', icon: 'solar:chart-bold', color: 'error' },
];

type Props = {
  events: CalendarEvent[];
  loading: boolean;
};

export function AlertCalendarStats({ events, loading }: Props) {
  const theme = useTheme();

  const countByType = (type: EventType) => events.filter((e) => e.type === type).length;

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 6, md: 3 }}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {STAT_CONFIG.map(({ type, label, icon, color }) => (
        <Grid key={type} size={{ xs: 6, md: 3 }}>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
