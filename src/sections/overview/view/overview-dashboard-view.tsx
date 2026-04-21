import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { useAuth } from 'src/auth';
import { DashboardContent } from 'src/layouts/dashboard';
import { usePermission } from 'src/permission/use-permission';

import { Iconify } from 'src/components/iconify';

import { DashboardQuickNav } from '../dashboard-quick-nav';
import { DashboardSectorWind } from '../dashboard-sector-wind';
import { DashboardMarketPulse } from '../dashboard-market-pulse';
import { DashboardSystemStatus } from '../dashboard-system-status';
import { DashboardCapitalRadar } from '../dashboard-capital-radar';
import { DashboardSignalCenter } from '../dashboard-signal-center';
import { DashboardRecentBacktests } from '../dashboard-recent-backtests';
import { DashboardPortfolioGlance } from '../dashboard-portfolio-glance';
import { DashboardMainFlowRanking } from '../dashboard-main-flow-ranking';
import { DashboardMarketTemperature } from '../dashboard-market-temperature';

// ----------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  return (mins >= 555 && mins <= 690) || (mins >= 780 && mins <= 900); // 9:15-11:30 || 13:00-15:00
}

// ----------------------------------------------------------------------

export function OverviewDashboardView() {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const { hasMinRole } = usePermission();
  const isAdmin = hasMinRole('ADMIN');

  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [latestTradeDate, setLatestTradeDate] = useState<string | null>(null);

  // latestTradeDate is reported back by DashboardMarketTemperature (avoids a duplicate fetchSentiment here)
  const handleTradeDateResolved = useCallback((date: string) => {
    setLatestTradeDate(date);
  }, []);

  const displayName = userProfile?.nickname || userProfile?.account || '';
  const marketOpen = isMarketOpen();

  return (
    <DashboardContent maxWidth="xl">
      {/* ═══ Hero Header ═══ */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {getGreeting()}
            {displayName ? `，${displayName}` : ''}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            {/* Market status badge */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: marketOpen
                  ? varAlpha(theme.vars.palette.success.mainChannel, 0.12)
                  : varAlpha(theme.vars.palette.text.disabledChannel, 0.08),
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: marketOpen ? 'success.main' : 'text.disabled',
                  ...(marketOpen && {
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: `0 0 0 0 ${varAlpha(theme.vars.palette.success.mainChannel, 0.4)}`,
                      },
                      '70%': { boxShadow: '0 0 0 6px rgba(0,0,0,0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(0,0,0,0)' },
                    },
                  }),
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: 12,
                  color: marketOpen ? 'success.main' : 'text.disabled',
                }}
              >
                {marketOpen ? '交易中' : '已收盘'}
              </Typography>
            </Box>

            {latestTradeDate && (
              <>
                <Divider orientation="vertical" flexItem sx={{ height: 14, my: 'auto' }} />
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Iconify icon="solar:calendar-bold" width={12} sx={{ color: 'text.disabled' }} />
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
                    {fmtTradeDate(latestTradeDate)}
                  </Typography>
                </Stack>
              </>
            )}
          </Stack>
        </Box>

        <Tooltip title="刷新全部数据">
          <IconButton size="small" onClick={handleRefresh}>
            <Iconify icon="solar:refresh-bold" width={20} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box key={refreshKey}>
        {/* ═══ Row 0: Quick Navigation Grid ═══ */}
        <Box sx={{ mb: 3 }}>
          <DashboardQuickNav />
        </Box>

        {/* ═══ Row 1: Market Pulse — Compact Index Ticker ═══ */}
        <Box sx={{ mb: 3 }}>
          <DashboardMarketPulse />
        </Box>

        {/* ═══ Row 2: Three Intelligence Cards ═══ */}
        <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardMarketTemperature onTradeDateResolved={handleTradeDateResolved} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardCapitalRadar />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardSignalCenter />
          </Grid>
        </Grid>

        {/* ═══ Row 3: Sector Wind + Main Flow Tracker ═══ */}
        <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
          <Grid size={{ xs: 12, md: 5 }}>
            <DashboardSectorWind />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <DashboardMainFlowRanking />
          </Grid>
        </Grid>

        {/* ═══ Row 4: My Workspace — Portfolio + Backtests ═══ */}
        <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
          <Grid size={{ xs: 12, md: 5 }}>
            <DashboardPortfolioGlance />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <DashboardRecentBacktests />
          </Grid>
        </Grid>

        {/* ═══ Row 5: System Status (Admin Only) ═══ */}
        {isAdmin && (
          <Box>
            <DashboardSystemStatus />
          </Box>
        )}
      </Box>
    </DashboardContent>
  );
}
