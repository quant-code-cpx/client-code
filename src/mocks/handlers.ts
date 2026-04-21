/**
 * MSW request handlers — per-controller mock data with auth simulation.
 *
 * Each controller's data is loaded from src/mocks/data/<controller>.json.
 * Auth endpoints get special treatment to simulate login/logout/refresh flows.
 */
import type { JsonBodyType } from 'msw';

import { http, delay, HttpResponse } from 'msw';

import authData from './data/auth.json';
// ---------------------------------------------------------------------------
// Import all per-controller data files
// ---------------------------------------------------------------------------
import alertData from './data/alert.json';
import stockData from './data/stock.json';
import factorData from './data/factor.json';
import marketData from './data/market.json';
import reportData from './data/report.json';
import signalData from './data/signal.json';
import heatmapData from './data/heatmap.json';
import patternData from './data/pattern.json';
import backtestData from './data/backtest.json';
import calendarData from './data/calendar.json';
import screenerData from './data/screener.json';
import strategyData from './data/strategy.json';
import portfolioData from './data/portfolio.json';
import watchlistData from './data/watchlist.json';
import eventStudyData from './data/event-study.json';
import userManageData from './data/user-manage.json';
import indexDetailData from './data/index-detail.json';
import tushareSyncData from './data/tushare-sync.json';
import notificationData from './data/notification.json';
import researchNoteData from './data/research-note.json';
import strategyDraftData from './data/strategy-draft.json';
import screenerSubData from './data/screener-subscription.json';
import industryRotationData from './data/industry-rotation.json';

// ---------------------------------------------------------------------------
// URL → response mapping
// ---------------------------------------------------------------------------

type D = Record<string, any>;

const r = (d: D, k: string) => d[k] ?? { code: 0, data: null, message: '' };
const ok = (data: unknown = null) => ({ code: 0, data, message: '' });

const routeMap: Record<string, unknown> = {
  // ── Auth ──
  '/api/auth/captcha': r(authData, 'captcha'),

  // ── Calendar ──
  '/api/calendar/upcoming': r(calendarData, 'upcoming'),
  '/api/calendar/range': r(calendarData, 'range'),

  // ── Notification ──
  '/api/notification/list': r(notificationData, 'list'),
  '/api/notification/unread-count': r(notificationData, 'unreadCount'),
  '/api/notification/preferences': r(notificationData, 'preferences'),
  '/api/notification/mark-read': ok({ success: true }),
  '/api/notification/mark-all-read': ok({ success: true }),
  '/api/notification/delete': ok({ success: true }),
  '/api/notification/preferences/update': ok({ success: true }),

  // ── Stock ──
  '/api/stock/list': r(stockData, 'list'),
  '/api/stock/search': r(stockData, 'search'),
  '/api/stock/detail': r(stockData, 'detail'),
  '/api/stock/detail/overview': r(stockData, 'detail_overview'),
  '/api/stock/detail/chart': r(stockData, 'detail_chart'),
  '/api/stock/detail/money-flow': r(stockData, 'detail_moneyFlow'),
  '/api/stock/detail/today-flow': r(stockData, 'detail_todayFlow'),
  '/api/stock/detail/financials': r(stockData, 'detail_financials'),
  '/api/stock/detail/shareholders': r(stockData, 'detail_shareholders'),
  '/api/stock/detail/financing': r(stockData, 'detail_financing'),
  '/api/stock/detail/financial-statements': r(stockData, 'detail_financialStatements'),
  '/api/stock/detail/analysis/technical': r(stockData, 'detail_technicalIndicators'),
  '/api/stock/detail/analysis/timing-signals': r(stockData, 'detail_timingSignals'),
  '/api/stock/detail/analysis/chip-distribution': r(stockData, 'detail_chipDistribution'),
  '/api/stock/detail/analysis/margin': r(stockData, 'detail_margin'),
  '/api/stock/detail/analysis/relative-strength': r(stockData, 'detail_relativeStrength'),
  '/api/stock/detail/main-money-flow': r(stockData, 'detail_mainMoneyFlow'),
  '/api/stock/detail/share-capital': r(stockData, 'detail_shareCapital'),
  '/api/stock/detail/concepts': r(stockData, 'detail_concepts'),
  '/api/stock/detail/analysis/factors': r(stockData, 'detail_factors'),
  '/api/stock/detail/analysis/factors/latest': r(stockData, 'detail_factorsLatest'),

  '/api/stock/detail/dividend-financing': ok({ tsCode: '', dividends: [], allotments: [] }),
  '/api/stock/minute-kline': ok([]),

  // ── Screener ──
  '/api/stock/screener': r(screenerData, 'screener'),
  '/api/stock/screener/presets': r(screenerData, 'presets'),
  '/api/stock/industries': r(screenerData, 'industries'),
  '/api/stock/areas': r(screenerData, 'areas'),
  '/api/stock/screener/strategies/list': r(screenerData, 'strategies_list'),
  '/api/stock/screener/strategies': ok({ id: 'mock-1' }),
  '/api/stock/screener/strategies/update': ok({ success: true }),
  '/api/stock/screener/strategies/delete': ok({ success: true }),

  // ── Market ──
  '/api/market/index-quote': r(marketData, 'indexQuote'),
  '/api/market/index-trend': r(marketData, 'indexTrend'),
  '/api/market/sentiment': r(marketData, 'sentiment'),
  '/api/market/change-distribution': r(marketData, 'changeDistribution'),
  '/api/market/sentiment-trend': r(marketData, 'sentimentTrend'),
  '/api/market/sector-ranking': r(marketData, 'sectorRanking'),
  '/api/market/sector-top-bottom': r(marketData, 'sectorTopBottom'),
  '/api/market/volume-overview': r(marketData, 'volumeOverview'),
  '/api/market/market-breadth': r(marketData, 'marketBreadth'),
  '/api/market/index-quote-with-sparkline': r(marketData, 'indexQuoteWithSparkline'),
  '/api/market/valuation': r(marketData, 'valuation'),
  '/api/market/valuation-trend': r(marketData, 'valuationTrend'),
  '/api/market/money-flow': r(marketData, 'moneyFlow'),
  '/api/market/money-flow-trend': r(marketData, 'moneyFlowTrend'),
  '/api/market/sector-flow-ranking': r(marketData, 'sectorFlowRanking'),
  '/api/market/sector-flow-trend': r(marketData, 'sectorFlowTrend'),
  '/api/market/hsgt-flow': r(marketData, 'hsgtFlow'),
  '/api/market/hsgt-trend': r(marketData, 'hsgtTrend'),
  '/api/market/main-flow-ranking': r(marketData, 'mainFlowRanking'),
  '/api/market/stock-flow-detail': r(marketData, 'stockFlowDetail'),
  '/api/market/sector-flow': r(marketData, 'sectorFlow'),
  '/api/market/concept/list': r(marketData, 'conceptList'),
  '/api/market/concept/members': r(marketData, 'conceptMembers'),
  '/api/market/daily-info': ok(null),
  '/api/market/sector-daily': ok([]),

  // ── Industry Rotation ──
  '/api/industry-rotation/overview': r(industryRotationData, 'overview'),
  '/api/industry-rotation/heatmap': r(industryRotationData, 'heatmap'),
  '/api/industry-rotation/momentum-ranking': r(industryRotationData, 'momentumRanking'),
  '/api/industry-rotation/return-comparison': r(industryRotationData, 'returnComparison'),
  '/api/industry-rotation/flow-analysis': r(industryRotationData, 'flowAnalysis'),
  '/api/industry-rotation/valuation': r(industryRotationData, 'valuation'),
  '/api/industry-rotation/detail': r(industryRotationData, 'detail'),

  // ── Heatmap ──
  '/api/heatmap/data': r(heatmapData, 'data'),
  '/api/heatmap/snapshot/history': r(heatmapData, 'snapshotHistory'),
  '/api/heatmap/snapshot/trigger': ok({ success: true }),

  // ── Index Detail ──
  '/api/index/list': r(indexDetailData, 'list'),
  '/api/index/daily': r(indexDetailData, 'daily'),
  '/api/index/constituents': r(indexDetailData, 'constituents'),

  // ── Factor ──
  '/api/factor/library': r(factorData, 'library'),
  '/api/factor/detail': r(factorData, 'detail'),
  '/api/factor/values': r(factorData, 'values'),
  '/api/factor/analysis/ic': r(factorData, 'ic'),
  '/api/factor/analysis/quantile': r(factorData, 'quantile'),
  '/api/factor/analysis/decay': r(factorData, 'decay'),
  '/api/factor/analysis/distribution': r(factorData, 'distribution'),
  '/api/factor/analysis/correlation': r(factorData, 'correlation'),
  '/api/factor/screening': r(factorData, 'screening'),
  '/api/factor/analysis/fama-macbeth': ok(null),
  '/api/factor/analysis/orthogonalize': ok(null),
  '/api/factor/backtest/submit': ok({ runId: 'mock-run-1' }),
  '/api/factor/backtest/attribution': ok(null),
  '/api/factor/backtest/save-as-strategy': ok({ id: 'mock-1' }),
  '/api/factor/optimization': ok(null),
  '/api/factor/custom/create': ok({ id: 'mock-factor-1' }),
  '/api/factor/custom/update': ok({ success: true }),
  '/api/factor/custom/delete': ok({ success: true }),
  '/api/factor/custom/test': ok(null),
  '/api/factor/custom/precompute': ok({ success: true }),
  '/api/factor/admin/backfill': ok({ success: true }),
  '/api/factor/admin/precompute': ok({ success: true }),
  '/api/factor/admin/precompute/status': ok({ status: 'idle' }),

  // ── Backtest ──
  '/api/backtests/strategy-templates': r(backtestData, 'strategyTemplates'),
  '/api/backtests/runs/list': r(backtestData, 'runsList'),
  '/api/backtests/runs/detail': r(backtestData, 'runDetail'),
  '/api/backtests/runs/equity': r(backtestData, 'runEquity'),
  '/api/backtests/runs/trades': r(backtestData, 'runTrades'),
  '/api/backtests/runs/positions': r(backtestData, 'runPositions'),
  '/api/backtests/runs/attribution': r(backtestData, 'runAttribution'),
  '/api/backtests/runs/monte-carlo': r(backtestData, 'runMonteCarlo'),
  '/api/backtests/runs/cost-sensitivity': r(backtestData, 'runCostSensitivity'),
  '/api/backtests/runs/param-sensitivity': r(backtestData, 'runParamSensitivity'),
  '/api/backtests/runs/param-sensitivity/result': r(backtestData, 'runParamSensitivityResult'),
  '/api/backtests/runs/validate': ok({ valid: true }),
  '/api/backtests/runs': ok({ runId: 'mock-run-1' }),
  '/api/backtests/runs/cancel': ok({ success: true }),
  '/api/backtests/walk-forward/runs/list': r(backtestData, 'walkForwardList'),
  '/api/backtests/walk-forward/runs': ok({ runId: 'mock-wf-1' }),
  '/api/backtests/walk-forward/runs/detail': r(backtestData, 'walkForwardDetail'),
  '/api/backtests/walk-forward/runs/equity': r(backtestData, 'walkForwardEquity'),
  '/api/backtests/rolling/runs': ok({ runId: 'mock-rolling-1' }),
  '/api/backtests/comparisons': ok(null),
  '/api/backtests/comparisons/detail': ok(null),
  '/api/backtests/comparisons/equity': ok(null),
  '/api/backtests/runs/rebalance-logs': ok({ items: [], total: 0 }),

  // ── Portfolio ──
  '/api/portfolio/list': r(portfolioData, 'list'),
  '/api/portfolio/detail': r(portfolioData, 'detail'),
  '/api/portfolio/create': ok({ id: 'mock-portfolio-1' }),
  '/api/portfolio/update': ok({ success: true }),
  '/api/portfolio/delete': ok({ success: true }),
  '/api/portfolio/holding/add': ok({ success: true }),
  '/api/portfolio/holding/update': ok({ success: true }),
  '/api/portfolio/holding/remove': ok({ success: true }),
  '/api/portfolio/pnl/today': r(portfolioData, 'pnlToday'),
  '/api/portfolio/pnl/history': r(portfolioData, 'pnlHistory'),
  '/api/portfolio/risk/industry': r(portfolioData, 'riskIndustry'),
  '/api/portfolio/risk/position': r(portfolioData, 'riskPosition'),
  '/api/portfolio/risk/market-cap': r(portfolioData, 'riskMarketCap'),
  '/api/portfolio/risk/beta': r(portfolioData, 'riskBeta'),
  '/api/portfolio/risk/check': ok({ violations: [], isCompliant: true }),
  '/api/portfolio/risk/violations': ok({ items: [], total: 0 }),
  '/api/portfolio/rule/list': r(portfolioData, 'riskRules'),
  '/api/portfolio/rule/upsert': ok({ id: 'mock-rule-1' }),
  '/api/portfolio/rule/update': ok({ success: true }),
  '/api/portfolio/rule/delete': ok({ success: true }),
  '/api/portfolio/rebalance-plan': ok({
    portfolioId: '',
    totalValue: 0,
    priceDate: '',
    actions: [],
    estimatedCost: 0,
    summary: { added: 0, updated: 0, removed: 0, unchanged: 0, totalHoldings: 0 },
  }),
  '/api/portfolio/performance': ok({
    portfolioId: '',
    startDate: '',
    endDate: '',
    benchmarkTsCode: '',
    series: [],
    metrics: {},
  }),
  '/api/portfolio/trade-log': ok({ items: [], total: 0, page: 1, pageSize: 20 }),
  '/api/portfolio/trade-log/summary': ok(null),
  '/api/portfolio/drift-detection': r(portfolioData, 'driftDetection'),
  '/api/portfolio/apply-backtest': ok({ success: true }),

  // ── Strategy ──
  '/api/strategies/list': r(strategyData, 'list'),
  '/api/strategies/schemas': r(strategyData, 'schemas'),
  '/api/strategies/detail': r(strategyData, 'detail'),
  '/api/strategies/versions': r(strategyData, 'versions'),
  '/api/strategies/create': ok({ id: 'mock-strategy-1' }),
  '/api/strategies/update': ok({ success: true }),
  '/api/strategies/delete': ok({ success: true }),
  '/api/strategies/clone': ok({ id: 'mock-strategy-clone-1' }),
  '/api/strategies/run': ok({ runId: 'mock-run-1' }),
  '/api/strategies/compare-versions': ok(null),

  // ── Strategy Draft ──
  '/api/strategy-draft/list': r(strategyDraftData, 'list'),
  '/api/strategy-draft/create': ok({ id: 'mock-draft-1' }),
  '/api/strategy-draft/detail': ok(null),
  '/api/strategy-draft/update': ok({ success: true }),
  '/api/strategy-draft/delete': ok({ success: true }),
  '/api/strategy-draft/submit': ok({ success: true }),

  // ── Screener Subscription ──
  '/api/screener-subscription/list': r(screenerSubData, 'list'),
  '/api/screener-subscription/detail': r(screenerSubData, 'detail'),
  '/api/screener-subscription/logs': r(screenerSubData, 'logs'),
  '/api/screener-subscription/create': ok({ id: 1 }),
  '/api/screener-subscription/update': ok({ success: true }),
  '/api/screener-subscription/delete': ok({ success: true }),
  '/api/screener-subscription/pause': ok({ success: true }),
  '/api/screener-subscription/resume': ok({ success: true }),
  '/api/screener-subscription/run': ok({ success: true }),

  // ── Watchlist ──
  '/api/watchlist/list': r(watchlistData, 'list'),
  '/api/watchlist/overview': r(watchlistData, 'overview'),
  '/api/watchlist/summary': r(watchlistData, 'summary'),
  '/api/watchlist/create': ok({ id: 'mock-wl-1' }),
  '/api/watchlist/update': ok({ success: true }),
  '/api/watchlist/delete': ok({ success: true }),
  '/api/watchlist/reorder': ok({ success: true }),
  '/api/watchlist/stocks': ok({ success: true }),
  '/api/watchlist/stocks/list': r(watchlistData, 'stocks'),
  '/api/watchlist/stocks/batch': ok({ success: true }),
  '/api/watchlist/stocks/batch/delete': ok({ success: true }),
  '/api/watchlist/stocks/delete': ok({ success: true }),
  '/api/watchlist/stocks/reorder': ok({ success: true }),
  '/api/watchlist/stocks/update': ok({ success: true }),

  // ── Alert ──
  '/api/alert/calendar/list': r(alertData, 'calendar'),
  '/api/alert/price-rules/list': r(alertData, 'priceRules'),
  '/api/alert/anomalies/list': r(alertData, 'anomalies'),
  '/api/alert/anomalies/scan': ok({ success: true }),
  '/api/alert/price-rules': ok({ id: 'mock-rule-1' }),
  '/api/alert/price-rules/update': ok({ success: true }),
  '/api/alert/price-rules/delete': ok({ success: true }),
  '/api/alert/price-rules/scan': ok({ success: true }),
  '/api/alert/limit-list': ok({ items: [], total: 0 }),

  // ── Signal ──
  '/api/signal/strategies/list': r(signalData, 'activations'),
  '/api/signal/latest': r(signalData, 'latest'),
  '/api/signal/history': r(signalData, 'history'),
  '/api/signal/strategies/activate': ok({ success: true }),
  '/api/signal/strategies/deactivate': ok({ success: true }),

  // ── Event Study ──
  '/api/event-study/event-types/list': r(eventStudyData, 'eventTypes'),
  '/api/event-study/signal-rules/list': r(eventStudyData, 'signalRules'),
  '/api/event-study/events': ok([]),
  '/api/event-study/signals': ok([]),
  '/api/event-study/analyze': ok(null),
  '/api/event-study/signal-rules': ok({ id: 'mock-rule-1' }),
  '/api/event-study/signal-rules/update': ok({ success: true }),
  '/api/event-study/signal-rules/delete': ok({ success: true }),
  '/api/event-study/signal-rules/scan': ok({ success: true }),

  // ── Report ──
  '/api/report/list': r(reportData, 'list'),
  '/api/report/backtest': ok({ id: 'mock-report-1', status: 'PENDING' }),
  '/api/report/stock': ok({ id: 'mock-report-2', status: 'PENDING' }),
  '/api/report/portfolio': ok({ id: 'mock-report-3', status: 'PENDING' }),
  '/api/report/strategy-research': ok({ id: 'mock-report-4', status: 'PENDING' }),
  '/api/report/detail': ok(null),
  '/api/report/delete': ok({ success: true }),
  '/api/report/schedules/list': ok({ schedules: [] }),
  '/api/report/schedules': ok({ id: 'mock-sched-1' }),
  '/api/report/schedules/update': ok({ success: true }),
  '/api/report/schedules/delete': ok({ success: true }),
  '/api/report/schedules/run-now': ok({ success: true }),

  // ── Research Note ──
  '/api/research-note/list': r(researchNoteData, 'list'),
  '/api/research-note/tags': r(researchNoteData, 'tags'),
  '/api/research-note/detail': r(researchNoteData, 'detail'),
  '/api/research-note/stock': r(researchNoteData, 'stockNotes'),
  '/api/research-note/create': ok({ id: 1 }),
  '/api/research-note/update': ok({ success: true }),
  '/api/research-note/delete': ok({ success: true }),

  // ── Pattern ──
  '/api/pattern/templates/list': r(patternData, 'templates'),
  '/api/pattern/search': ok({ matches: [] }),
  '/api/pattern/search-by-series': ok({ matches: [] }),

  // ── User Management ──
  '/api/user/list': r(userManageData, 'list'),
  '/api/user/detail': r(userManageData, 'detail'),
  '/api/user/audit-log/list': r(userManageData, 'auditLogs'),
  '/api/user/create': ok({ id: 2 }),
  '/api/user/update': ok({ success: true }),
  '/api/user/delete': ok({ success: true }),
  '/api/user/update-status': ok({ success: true }),
  '/api/user/reset-password': ok({ success: true }),
  '/api/user/profile/update': ok({ success: true }),
  '/api/user/profile/change-password': ok({ success: true }),

  // ── Tushare Sync (admin) ──
  '/api/tushare/admin/plans': r(tushareSyncData, 'plans'),
  '/api/tushare/admin/cache/stats': r(tushareSyncData, 'cacheStats'),
  '/api/tushare/admin/quality/report': r(tushareSyncData, 'qualityReport'),
  '/api/tushare/admin/quality/summary': r(tushareSyncData, 'qualitySummary'),
  '/api/tushare/admin/quality/health': r(tushareSyncData, 'qualityHealth'),
  '/api/tushare/admin/sync-logs': r(tushareSyncData, 'syncLogs'),
  '/api/tushare/admin/sync-logs/summary': r(tushareSyncData, 'syncLogsSummary'),
  '/api/tushare/admin/retry-queue': r(tushareSyncData, 'retryQueue'),
  '/api/tushare/admin/sync-status-overview': r(tushareSyncData, 'syncStatusOverview'),
  '/api/tushare/admin/quality/gaps': r(tushareSyncData, 'dataGaps'),
  '/api/tushare/admin/validation-logs': r(tushareSyncData, 'validationLogs'),
  '/api/tushare/admin/quality/repair-status': r(tushareSyncData, 'repairQueueStatus'),
  '/api/tushare/admin/sync': ok({ success: true }),
  '/api/tushare/admin/quality/check': ok({ success: true }),
  '/api/tushare/admin/quality/cross-check': ok(null),
  '/api/tushare/admin/quality/repair': ok({ success: true }),
  '/api/tushare/admin/retry-queue/reset': ok({ success: true }),

  // ── Export ──
  '/api/export/backtest-trades': ok(null),
  '/api/export/factor-values': ok(null),
  '/api/export/portfolio-holdings': ok(null),

  // ── Fund (backend not implemented, stubs only) ──
  '/api/fund/holdings': ok([]),
  '/api/fund/institutional-summary': ok([]),
  '/api/fund/etf-flow': ok([]),
};

// ---------------------------------------------------------------------------
// Auth simulation handlers
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 1,
  account: 'demo',
  nickname: 'Demo用户',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
};

const MOCK_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiYWNjb3VudCI6ImRlbW8iLCJyb2xlIjoiU1VQRVJfQURNSU4ifQ.demo';

const authHandlers = [
  http.post('*/api/auth/login', async () => {
    await delay(300);
    return HttpResponse.json(
      { code: 0, data: { accessToken: MOCK_ACCESS_TOKEN }, message: '' } as JsonBodyType,
      {
        headers: {
          'Set-Cookie': 'refresh_token=mock-refresh-token; Path=/; HttpOnly; SameSite=Lax',
        },
      }
    );
  }),

  http.post('*/api/auth/refresh', async () => {
    await delay(100);
    return HttpResponse.json({
      code: 0,
      data: { accessToken: MOCK_ACCESS_TOKEN },
      message: '',
    } as JsonBodyType);
  }),

  http.post('*/api/auth/logout', async () => {
    await delay(100);
    return HttpResponse.json({ code: 0, data: null, message: '' } as JsonBodyType);
  }),

  http.post('*/api/user/profile/detail', async () => {
    await delay(100);
    return HttpResponse.json({ code: 0, data: MOCK_USER, message: '' } as JsonBodyType);
  }),
];

// ---------------------------------------------------------------------------
// Generic data handlers
// ---------------------------------------------------------------------------

const skipAuth = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/user/profile/detail',
]);

const dataHandlers = Object.entries(routeMap)
  .filter(([url]) => !skipAuth.has(url))
  .map(([url, response]) =>
    http.post(`*${url}`, async () => {
      await delay(80 + Math.random() * 120);
      return HttpResponse.json((response ?? { code: 0, data: null, message: '' }) as JsonBodyType);
    })
  );

// Auth handlers first (higher priority in MSW)
export const handlers = [...authHandlers, ...dataHandlers];
