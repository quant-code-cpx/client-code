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
      { path: 'user-manage', element: <UserManagePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'stock', element: <StockPage /> },
      { path: 'stock/detail', element: <StockDetailPage /> },
      { path: 'stock/screener', element: <Navigate to="/stock" replace /> },
      { path: 'market/overview', element: <MarketOverviewPage /> },
      { path: 'market/money-flow', element: <MarketMoneyFlowPage /> },
      { path: 'tushare-sync', element: <TushareSyncPage /> },
      { path: 'factor/library', element: <FactorLibraryPage /> },
      { path: 'factor/detail/:name', element: <FactorDetailPage /> },
      { path: 'factor/correlation', element: <FactorCorrelationPage /> },
      { path: 'factor/screening', element: <FactorScreeningPage /> },
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
