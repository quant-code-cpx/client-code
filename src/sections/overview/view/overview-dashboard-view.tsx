import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { usePermission } from 'src/permission/use-permission';

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

export function OverviewDashboardView() {
  const { hasMinRole } = usePermission();
  const isAdmin = hasMinRole('ADMIN');

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        市场快报
      </Typography>

      <Grid container spacing={3}>
        {/* A: 指数概览 */}
        <DashboardIndexCards />

        {/* B: 市场情绪 + 涨跌分布 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <DashboardSentimentCard />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <DashboardChangeDistribution />
        </Grid>

        {/* C: 资金流向 + 北向资金 + 热门板块 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardMoneyFlow />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardHsgtFlow />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardHotSectors />
        </Grid>

        {/* D: 主力排行 + 近期回测 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <DashboardMainFlowRanking />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <DashboardRecentBacktests />
        </Grid>

        {/* E: 系统状态（管理员可见） */}
        {isAdmin && (
          <Grid size={{ xs: 12 }}>
            <DashboardSystemStatus />
          </Grid>
        )}
      </Grid>
    </DashboardContent>
  );
}
