import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { Outlet, Navigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { CONFIG } from 'src/config-global';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import { paths } from './paths';
import { AuthGuard } from './components';

import type { RouteMetadata } from './components';

// ----------------------------------------------------------------------

export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const UserManagePage = lazy(() => import('src/pages/user-manage'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const StockPage = lazy(() => import('src/pages/stock'));
export const StockDetailPage = lazy(() => import('src/pages/stock-detail'));
export const MarketOverviewPage = lazy(() => import('src/pages/market-overview'));
export const NewsPage = lazy(() => import('src/pages/news'));
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
export const ScreenerSubscriptionBuilderPage = lazy(
  () => import('src/pages/screener-subscription-builder')
);
export const ScreenerSubscriptionEditPage = lazy(
  () => import('src/pages/screener-subscription-edit')
);
export const StrategyListPage = lazy(() => import('src/pages/strategy'));
export const StrategyDetailPage = lazy(() => import('src/pages/strategy-detail'));
export const ProfilePage = lazy(() => import('src/pages/profile'));
export const WalkForwardListPage = lazy(() => import('src/pages/backtest-walk-forward'));
export const WalkForwardCreatePage = lazy(() => import('src/pages/backtest-walk-forward-create'));
export const WalkForwardDetailPage = lazy(() => import('src/pages/backtest-walk-forward-detail'));
export const ComparisonListPage = lazy(() => import('src/pages/backtest-comparison-list'));
export const ComparisonCreatePage = lazy(() => import('src/pages/backtest-comparison-create'));
export const ComparisonDetailPage = lazy(() => import('src/pages/backtest-comparison-detail'));
export const PortfolioPage = lazy(() => import('src/pages/portfolio'));
export const PortfolioDetailPage = lazy(() => import('src/pages/portfolio-detail'));
export const AlertCalendarPage = lazy(() => import('src/pages/alert-calendar'));
export const AlertPriceRulesPage = lazy(() => import('src/pages/alert-price-rules'));
export const AlertAnomaliesPage = lazy(() => import('src/pages/alert-anomalies'));
export const AlertLimitListPage = lazy(() => import('src/pages/alert-limit-list'));
export const SignalLatestPage = lazy(() => import('src/pages/signal-latest'));
export const SignalHistoryPage = lazy(() => import('src/pages/signal-history'));
export const SignalHistoryComparePage = lazy(() => import('src/pages/signal-history-compare'));
export const EventStudyPage = lazy(() => import('src/pages/event-study'));
export const IndustryRotationPage = lazy(() => import('src/pages/industry-rotation'));
export const MarketHeatmapPage = lazy(() => import('src/pages/market-heatmap'));
export const IndustryAnalysisPage = lazy(() => import('src/pages/industry-analysis'));
export const ReportListPage = lazy(() => import('src/pages/report'));
export const ReportDetailPage = lazy(() => import('src/pages/report-detail'));
export const IndexDetailPage = lazy(() => import('src/pages/index-detail'));
export const PatternPage = lazy(() => import('src/pages/pattern'));
export const FactorAdvancedAnalysisPage = lazy(() => import('src/pages/factor-advanced-analysis'));
export const FactorAdminPage = lazy(() => import('src/pages/factor-admin'));
export const AgentPage = lazy(() => import('src/pages/agent'));
export const ModelProvidersPage = lazy(() => import('src/pages/model-providers'));

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

const pageMetadata = {
  dashboard: {
    title: `市场快报 - ${CONFIG.appName}`,
    description: '量化研究平台首页仪表盘：指数行情、市场情绪、资金流向、主力动态一览',
    keywords: '量化,A股,行情,资金流向,市场情绪,回测,仪表盘',
  },
  stock: { title: `股票 - ${CONFIG.appName}` },
  stockDetail: { title: `股票详情 - ${CONFIG.appName}` },
  marketOverview: { title: `市场概览 - ${CONFIG.appName}` },
  news: { title: `新闻时事 - ${CONFIG.appName}` },
  marketMoneyFlow: { title: `资金动态 - ${CONFIG.appName}` },
  industryRotation: { title: `行业轮动分析 - ${CONFIG.appName}` },
  industryAnalysis: { title: `行业分析 - ${CONFIG.appName}` },
  indexDetail: { title: `指数详情 - ${CONFIG.appName}` },
  tushareSync: { title: `数据同步 - ${CONFIG.appName}` },
  factorLibrary: { title: `因子库 - ${CONFIG.appName}` },
  factorDetail: { title: `因子详情 - ${CONFIG.appName}` },
  factorCorrelation: { title: `因子相关性 - ${CONFIG.appName}` },
  factorScreening: { title: `因子选股 - ${CONFIG.appName}` },
  factorAdvancedAnalysis: { title: `因子高级分析 - ${CONFIG.appName}` },
  factorAdmin: { title: `因子管理 - ${CONFIG.appName}` },
  backtestWorkbench: { title: `回测工作台 - ${CONFIG.appName}` },
  backtestRuns: { title: `回测历史 - ${CONFIG.appName}` },
  backtestRunDetail: { title: `回测详情 - ${CONFIG.appName}` },
  walkForward: { title: `Walk-Forward 验证 - ${CONFIG.appName}` },
  walkForwardCreate: { title: `新建 WF 任务 - ${CONFIG.appName}` },
  walkForwardDetail: { title: `WF 任务详情 - ${CONFIG.appName}` },
  comparisonList: { title: `多策略对比历史 - ${CONFIG.appName}` },
  comparisonCreate: { title: `多策略对比 - ${CONFIG.appName}` },
  comparisonDetail: { title: `策略对比详情 - ${CONFIG.appName}` },
  watchlist: { title: `自选股 - ${CONFIG.appName}` },
  researchNotes: { title: `研究笔记 - ${CONFIG.appName}` },
  researchNoteDetail: { title: `笔记详情 - ${CONFIG.appName}` },
  screenerSubscription: { title: `条件订阅 - ${CONFIG.appName}` },
  screenerSubscriptionBuilder: { title: `新建条件订阅 - ${CONFIG.appName}` },
  screenerSubscriptionEdit: { title: `编辑条件订阅 - ${CONFIG.appName}` },
  screenerSubscriptionDetail: { title: `订阅详情 - ${CONFIG.appName}` },
  strategy: { title: `策略管理 - ${CONFIG.appName}` },
  strategyDetail: { title: `策略详情 - ${CONFIG.appName}` },
  portfolio: { title: `我的组合 - ${CONFIG.appName}` },
  portfolioDetail: { title: `组合详情 - ${CONFIG.appName}` },
  alertCalendar: { title: `事件日历 - ${CONFIG.appName}` },
  alertPriceRules: { title: `价格预警 - ${CONFIG.appName}` },
  alertAnomalies: { title: `异动监控 - ${CONFIG.appName}` },
  alertLimitList: { title: `涨跌停明细 - ${CONFIG.appName}` },
  signalLatest: { title: `策略信号 - ${CONFIG.appName}` },
  signalHistory: { title: `信号历史 - ${CONFIG.appName}` },
  signalHistoryCompare: { title: `信号历史对比 - ${CONFIG.appName}` },
  eventStudy: { title: `事件驱动研究 - ${CONFIG.appName}` },
  report: { title: `量化报告 - ${CONFIG.appName}` },
  reportDetail: { title: `报告详情 - ${CONFIG.appName}` },
  pattern: { title: `形态匹配 - ${CONFIG.appName}` },
  agent: { title: `智能研究 - ${CONFIG.appName}` },
  profile: { title: `个人资料 - ${CONFIG.appName}` },
  userManage: { title: `用户管理 - ${CONFIG.appName}` },
  modelProviders: { title: `模型供应商 - ${CONFIG.appName}` },
  signIn: { title: `Sign in - ${CONFIG.appName}` },
  notFound: { title: `404 page not found! | Error - ${CONFIG.appName}` },
} satisfies Record<string, RouteMetadata>;

export function createAgentRoutes(enabled = CONFIG.agentEnabled): RouteObject[] {
  return enabled
    ? [
        { path: 'agent', element: <AgentPage />, handle: pageMetadata.agent },
        {
          path: 'agent/:conversationId',
          element: <AgentPage />,
          handle: pageMetadata.agent,
        },
      ]
    : [];
}

export function legacyReportDetailPath(id: string | undefined): string {
  return id ? paths.research.report.detail(id) : paths.research.report.list;
}

export function LegacyReportDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={legacyReportDetailPath(id)} replace />;
}

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
      { index: true, element: <DashboardPage />, handle: pageMetadata.dashboard },
      ...createAgentRoutes(),
      { path: 'stock', element: <StockPage />, handle: pageMetadata.stock },
      { path: 'stock/detail', element: <StockDetailPage />, handle: pageMetadata.stockDetail },
      { path: 'stock/screener', element: <Navigate to="/stock" replace /> },
      { path: 'market/overview', element: <MarketOverviewPage />, handle: pageMetadata.marketOverview },
      { path: 'market/news', element: <NewsPage />, handle: pageMetadata.news },
      {
        path: 'market/money-flow',
        element: <MarketMoneyFlowPage />,
        handle: pageMetadata.marketMoneyFlow,
      },
      {
        path: 'market/industry',
        element: <IndustryAnalysisPage />,
        handle: pageMetadata.industryAnalysis,
      },
      { path: 'market/index', element: <IndexDetailPage />, handle: pageMetadata.indexDetail },
      // ─── backward-compat: old market routes redirect to new combined page ───
      {
        path: 'market/industry-rotation',
        element: <Navigate to="/market/industry?tab=1" replace />,
        handle: pageMetadata.industryRotation,
      },
      { path: 'market/heatmap', element: <Navigate to="/market/industry?tab=0" replace /> },
      { path: 'tushare-sync', element: <TushareSyncPage />, handle: pageMetadata.tushareSync },
      { path: 'factor/library', element: <FactorLibraryPage />, handle: pageMetadata.factorLibrary },
      { path: 'factor/detail/:name', element: <FactorDetailPage />, handle: pageMetadata.factorDetail },
      {
        path: 'factor/correlation',
        element: <FactorCorrelationPage />,
        handle: pageMetadata.factorCorrelation,
      },
      { path: 'factor/screening', element: <FactorScreeningPage />, handle: pageMetadata.factorScreening },
      {
        path: 'factor/advanced-analysis',
        element: <FactorAdvancedAnalysisPage />,
        handle: pageMetadata.factorAdvancedAnalysis,
      },
      { path: 'factor/admin', element: <FactorAdminPage />, handle: pageMetadata.factorAdmin },
      { path: 'strategy', element: <StrategyListPage />, handle: pageMetadata.strategy },
      { path: 'strategy/:id', element: <StrategyDetailPage />, handle: pageMetadata.strategyDetail },
      { path: 'backtest', element: <BacktestWorkbenchPage />, handle: pageMetadata.backtestWorkbench },
      { path: 'backtest/runs', element: <BacktestRunListPage />, handle: pageMetadata.backtestRuns },
      {
        path: 'backtest/runs/:runId',
        element: <BacktestRunDetailPage />,
        handle: pageMetadata.backtestRunDetail,
      },
      { path: 'backtest/walk-forward', element: <WalkForwardListPage />, handle: pageMetadata.walkForward },
      {
        path: 'backtest/walk-forward/create',
        element: <WalkForwardCreatePage />,
        handle: pageMetadata.walkForwardCreate,
      },
      {
        path: 'backtest/walk-forward/:wfRunId',
        element: <WalkForwardDetailPage />,
        handle: pageMetadata.walkForwardDetail,
      },
      {
        path: 'backtest/comparison',
        element: <ComparisonListPage />,
        handle: pageMetadata.comparisonList,
      },
      {
        path: 'backtest/comparison/create',
        element: <ComparisonCreatePage />,
        handle: pageMetadata.comparisonCreate,
      },
      {
        path: 'backtest/comparison/:groupId',
        element: <ComparisonDetailPage />,
        handle: pageMetadata.comparisonDetail,
      },
      { path: 'research/watchlist', element: <WatchlistPage />, handle: pageMetadata.watchlist },
      { path: 'research/notes', element: <ResearchNotesPage />, handle: pageMetadata.researchNotes },
      {
        path: 'research/notes/:noteId',
        element: <ResearchNoteDetailPage />,
        handle: pageMetadata.researchNoteDetail,
      },
      {
        path: 'stock/subscription',
        element: <ScreenerSubscriptionPage />,
        handle: pageMetadata.screenerSubscription,
      },
      {
        path: 'stock/subscription/new',
        element: <ScreenerSubscriptionBuilderPage />,
        handle: pageMetadata.screenerSubscriptionBuilder,
      },
      {
        path: 'stock/subscription/:id/edit',
        element: <ScreenerSubscriptionEditPage />,
        handle: pageMetadata.screenerSubscriptionEdit,
      },
      {
        path: 'stock/subscription/:id',
        element: <ScreenerSubscriptionDetailPage />,
        handle: pageMetadata.screenerSubscriptionDetail,
      },
      { path: 'profile', element: <ProfilePage />, handle: pageMetadata.profile },
      { path: 'portfolio', element: <PortfolioPage />, handle: pageMetadata.portfolio },
      { path: 'portfolio/:id', element: <PortfolioDetailPage />, handle: pageMetadata.portfolioDetail },
      { path: 'alert', element: <AlertCalendarPage />, handle: pageMetadata.alertCalendar },
      {
        path: 'alert/price-rules',
        element: <AlertPriceRulesPage />,
        handle: pageMetadata.alertPriceRules,
      },
      { path: 'alert/anomalies', element: <AlertAnomaliesPage />, handle: pageMetadata.alertAnomalies },
      { path: 'alert/limit-list', element: <AlertLimitListPage />, handle: pageMetadata.alertLimitList },
      { path: 'strategy/signal', element: <SignalLatestPage />, handle: pageMetadata.signalLatest },
      {
        path: 'strategy/signal/history',
        element: <SignalHistoryPage />,
        handle: pageMetadata.signalHistory,
      },
      {
        path: 'strategy/signal/history/compare',
        element: <SignalHistoryComparePage />,
        handle: pageMetadata.signalHistoryCompare,
      },
      { path: 'research/event-study', element: <EventStudyPage />, handle: pageMetadata.eventStudy },
      { path: 'research/report', element: <ReportListPage />, handle: pageMetadata.report },
      { path: 'research/report/:id', element: <ReportDetailPage />, handle: pageMetadata.reportDetail },
      { path: 'stock/pattern', element: <PatternPage />, handle: pageMetadata.pattern },
      { path: 'admin/user-manage', element: <UserManagePage />, handle: pageMetadata.userManage },
      {
        path: 'admin/model-providers',
        element: <ModelProvidersPage />,
        handle: pageMetadata.modelProviders,
      },
      { path: 'admin/tushare-sync', element: <Navigate to="/tushare-sync" replace /> },
      // ─── backward-compat redirects ───────────────────────
      { path: 'signal', element: <Navigate to="/strategy/signal" replace /> },
      { path: 'signal/history', element: <Navigate to="/strategy/signal/history" replace /> },
      {
        path: 'signal/history/compare',
        element: <Navigate to="/strategy/signal/history/compare" replace />,
      },
      { path: 'event-study', element: <Navigate to="/research/event-study" replace /> },
      { path: 'report', element: <Navigate to="/research/report" replace /> },
      { path: 'report/:id', element: <LegacyReportDetailRedirect /> },
      { path: 'reports/:id', element: <LegacyReportDetailRedirect /> },
      { path: 'pattern', element: <Navigate to="/stock/pattern" replace /> },
      { path: 'user-manage', element: <Navigate to="/admin/user-manage" replace /> },
    ],
  },
  {
    path: 'sign-in',
    handle: pageMetadata.signIn,
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: '404',
    element: <Page404 />,
    handle: pageMetadata.notFound,
  },
  { path: '*', element: <Page404 />, handle: pageMetadata.notFound },
];
