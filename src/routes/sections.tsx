import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { Outlet, Navigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import { AuthGuard } from './components';

// ----------------------------------------------------------------------

export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const BlogPage = lazy(() => import('src/pages/blog'));
export const UserPage = lazy(() => import('src/pages/user'));
export const UserManagePage = lazy(() => import('src/pages/user-manage'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const StockPage = lazy(() => import('src/pages/stock'));
export const StockDetailPage = lazy(() => import('src/pages/stock-detail'));
export const MarketOverviewPage = lazy(() => import('src/pages/market-overview'));
export const MarketMoneyFlowPage = lazy(() => import('src/pages/market-money-flow'));
export const TushareSyncPage = lazy(() => import('src/pages/tushare-sync'));
export const FactorLibraryPage = lazy(() => import('src/pages/factor-library'));
export const FactorDetailPage = lazy(() => import('src/pages/factor-detail'));
export const FactorCorrelationPage = lazy(() => import('src/pages/factor-correlation'));
export const FactorScreeningPage = lazy(() => import('src/pages/factor-screening'));
export const BacktestWorkbenchPage = lazy(() => import('src/pages/backtest-workbench'));
export const BacktestRunListPage = lazy(() => import('src/pages/backtest-runs'));
export const BacktestRunDetailPage = lazy(() => import('src/pages/backtest-run-detail'));
export const WatchlistPage = lazy(() => import('src/pages/watchlist'));
export const ResearchNotesPage = lazy(() => import('src/pages/research-notes'));
export const ResearchNoteDetailPage = lazy(() => import('src/pages/research-note-detail'));
export const ScreenerSubscriptionPage = lazy(() => import('src/pages/screener-subscription'));
export const ScreenerSubscriptionDetailPage = lazy(
  () => import('src/pages/screener-subscription-detail')
);
export const StrategyListPage = lazy(() => import('src/pages/strategy'));
export const StrategyDetailPage = lazy(() => import('src/pages/strategy-detail'));
export const ProfilePage = lazy(() => import('src/pages/profile'));
export const WalkForwardListPage = lazy(() => import('src/pages/backtest-walk-forward'));
export const WalkForwardCreatePage = lazy(() => import('src/pages/backtest-walk-forward-create'));
export const WalkForwardDetailPage = lazy(() => import('src/pages/backtest-walk-forward-detail'));
export const ComparisonCreatePage = lazy(() => import('src/pages/backtest-comparison-create'));
export const ComparisonDetailPage = lazy(() => import('src/pages/backtest-comparison-detail'));
export const PortfolioPage = lazy(() => import('src/pages/portfolio'));
export const PortfolioDetailPage = lazy(() => import('src/pages/portfolio-detail'));
export const AlertCalendarPage = lazy(() => import('src/pages/alert-calendar'));
export const AlertPriceRulesPage = lazy(() => import('src/pages/alert-price-rules'));
export const AlertAnomaliesPage = lazy(() => import('src/pages/alert-anomalies'));
export const SignalLatestPage = lazy(() => import('src/pages/signal-latest'));
export const SignalHistoryPage = lazy(() => import('src/pages/signal-history'));
export const EventStudyPage = lazy(() => import('src/pages/event-study'));
export const IndustryRotationPage = lazy(() => import('src/pages/industry-rotation'));
export const MarketHeatmapPage = lazy(() => import('src/pages/market-heatmap'));
export const ReportListPage = lazy(() => import('src/pages/report'));
export const ReportDetailPage = lazy(() => import('src/pages/report-detail'));
export const IndexDetailPage = lazy(() => import('src/pages/index-detail'));
export const PatternPage = lazy(() => import('src/pages/pattern'));
export const FactorAdvancedAnalysisPage = lazy(() => import('src/pages/factor-advanced-analysis'));
export const FactorAdminPage = lazy(() => import('src/pages/factor-admin'));

const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export const routesSection: RouteObject[] = [
  {
    element: (
      <AuthGuard>
        <DashboardLayout>
          <Suspense fallback={renderFallback()}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'user', element: <UserPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'stock', element: <StockPage /> },
      { path: 'stock/detail', element: <StockDetailPage /> },
      { path: 'stock/screener', element: <Navigate to="/stock" replace /> },
      { path: 'market/overview', element: <MarketOverviewPage /> },
      { path: 'market/money-flow', element: <MarketMoneyFlowPage /> },
      { path: 'market/industry-rotation', element: <IndustryRotationPage /> },
      { path: 'market/heatmap', element: <MarketHeatmapPage /> },
      { path: 'market/index', element: <IndexDetailPage /> },
      { path: 'tushare-sync', element: <TushareSyncPage /> },
      { path: 'factor/library', element: <FactorLibraryPage /> },
      { path: 'factor/detail/:name', element: <FactorDetailPage /> },
      { path: 'factor/correlation', element: <FactorCorrelationPage /> },
      { path: 'factor/screening', element: <FactorScreeningPage /> },
      { path: 'factor/advanced-analysis', element: <FactorAdvancedAnalysisPage /> },
      { path: 'factor/admin', element: <FactorAdminPage /> },
      { path: 'strategy', element: <StrategyListPage /> },
      { path: 'strategy/:id', element: <StrategyDetailPage /> },
      { path: 'backtest', element: <BacktestWorkbenchPage /> },
      { path: 'backtest/runs', element: <BacktestRunListPage /> },
      { path: 'backtest/runs/:runId', element: <BacktestRunDetailPage /> },
      { path: 'backtest/walk-forward', element: <WalkForwardListPage /> },
      { path: 'backtest/walk-forward/create', element: <WalkForwardCreatePage /> },
      { path: 'backtest/walk-forward/:wfRunId', element: <WalkForwardDetailPage /> },
      { path: 'backtest/comparison/create', element: <ComparisonCreatePage /> },
      { path: 'backtest/comparison/:groupId', element: <ComparisonDetailPage /> },
      { path: 'research/watchlist', element: <WatchlistPage /> },
      { path: 'research/notes', element: <ResearchNotesPage /> },
      { path: 'research/notes/:noteId', element: <ResearchNoteDetailPage /> },
      { path: 'stock/subscription', element: <ScreenerSubscriptionPage /> },
      { path: 'stock/subscription/:id', element: <ScreenerSubscriptionDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'portfolio/:id', element: <PortfolioDetailPage /> },
      { path: 'alert', element: <AlertCalendarPage /> },
      { path: 'alert/price-rules', element: <AlertPriceRulesPage /> },
      { path: 'alert/anomalies', element: <AlertAnomaliesPage /> },
      { path: 'strategy/signal', element: <SignalLatestPage /> },
      { path: 'strategy/signal/history', element: <SignalHistoryPage /> },
      { path: 'research/event-study', element: <EventStudyPage /> },
      { path: 'research/report', element: <ReportListPage /> },
      { path: 'research/report/:id', element: <ReportDetailPage /> },
      { path: 'stock/pattern', element: <PatternPage /> },
      { path: 'admin/user-manage', element: <UserManagePage /> },
      { path: 'admin/tushare-sync', element: <TushareSyncPage /> },
      // ─── backward-compat redirects ───────────────────────
      { path: 'signal', element: <Navigate to="/strategy/signal" replace /> },
      { path: 'signal/history', element: <Navigate to="/strategy/signal/history" replace /> },
      { path: 'event-study', element: <Navigate to="/research/event-study" replace /> },
      { path: 'report', element: <Navigate to="/research/report" replace /> },
      { path: 'report/:id', element: <Navigate to="/research/report/:id" replace /> },
      { path: 'pattern', element: <Navigate to="/stock/pattern" replace /> },
      { path: 'tushare-sync', element: <Navigate to="/admin/tushare-sync" replace /> },
      { path: 'user-manage', element: <Navigate to="/admin/user-manage" replace /> },
    ],
  },
  {
    path: 'sign-in',
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: '404',
    element: <Page404 />,
  },
  { path: '*', element: <Page404 /> },
];
