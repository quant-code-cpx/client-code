import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { useAuth } from 'src/auth';
import { DashboardContent } from 'src/layouts/dashboard';
import { usePermission } from 'src/permission/use-permission';

import { Iconify } from 'src/components/iconify';

import { DashboardHsgtFlow } from '../dashboard-hsgt-flow';
import { DashboardMoneyFlow } from '../dashboard-money-flow';
import { DashboardIndexCards } from '../dashboard-index-cards';
import { DashboardHotSectors } from '../dashboard-hot-sectors';
import { DashboardSystemStatus } from '../dashboard-system-status';
import { DashboardSentimentCard } from '../dashboard-sentiment-card';
import { DashboardRecentBacktests } from '../dashboard-recent-backtests';
import { DashboardMainFlowRanking } from '../dashboard-main-flow-ranking';
import { DashboardChangeDistribution } from '../dashboard-change-distribution';

// ----------------------------------------------------------------------

const QUICK_ACTIONS = [
  { label: '自选股', path: '/research/watchlist', icon: 'solar:star-bold' as const },
  { label: '回测工作台', path: '/backtest', icon: 'solar:playback-speed-bold' as const },
  { label: '策略管理', path: '/strategy', icon: 'solar:layers-bold' as const },
  { label: '市场热力图', path: '/market/heatmap', icon: 'solar:widget-bold' as const },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

// ----------------------------------------------------------------------

export function OverviewDashboardView() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { hasMinRole } = usePermission();
  const isAdmin = hasMinRole('ADMIN');

  // refreshKey 变化会强制所有子组件重新挂载，从而重新拉取数据
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const displayName = userProfile?.nickname || userProfile?.account || '';

  return (
    <DashboardContent maxWidth="xl">
      {/* ── 欢迎 + 刷新 + 快捷入口 ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: { xs: 3, md: 4 },
        }}
      >
        <Box>
          <Typography variant="h4">
            {getGreeting()}
            {displayName ? `，${displayName}` : ''} 👋
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            市场快报 · 一站式查看今日行情、资金与策略动态
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map((action) => (
            <Chip
              key={action.path}
              label={action.label}
              icon={<Iconify icon={action.icon} width={16} />}
              size="small"
              variant="outlined"
              clickable
              onClick={() => router.push(action.path)}
              sx={{ fontWeight: 'fontWeightMedium' }}
            />
          ))}
          <Tooltip title="刷新数据">
            <IconButton size="small" onClick={handleRefresh} sx={{ ml: 0.5 }}>
              <Iconify icon="solar:refresh-bold" width={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Grid container spacing={3} key={refreshKey}>
        {/* A: 指数概览 */}
        <DashboardIndexCards />

        {/* B: 市场情绪 + 涨跌分布 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <DashboardSentimentCard />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <DashboardChangeDistribution />
        </Grid>

        {/* C: 资金流向 + 北向资金 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardMoneyFlow />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardHsgtFlow />
        </Grid>

        {/* D: 主力排行 + 热门板块 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <DashboardMainFlowRanking />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <DashboardHotSectors />
        </Grid>

        {/* E: 近期回测 */}
        <Grid size={{ xs: 12 }}>
          <DashboardRecentBacktests />
        </Grid>

        {/* F: 系统状态（管理员可见） */}
        {isAdmin && (
          <Grid size={{ xs: 12 }}>
            <DashboardSystemStatus />
          </Grid>
        )}
      </Grid>
    </DashboardContent>
  );
}
