#!/usr/bin/env node
/**
 * scripts/capture-mock-data.mjs
 *
 * Logs into the backend, calls every API endpoint with realistic parameters,
 * and saves the raw responses to src/mocks/data/<controller>.json
 *
 * Prerequisites:
 *   - Backend running at localhost:3000
 *   - Captcha + password validation temporarily bypassed
 *
 * Usage:
 *   node scripts/capture-mock-data.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'src/mocks/data');

const BASE = 'http://localhost:3000';
let TOKEN = '';
let COOKIES = '';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function post(url, body = {}, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    ...(COOKIES ? { Cookie: COOKIES } : {}),
  };

  try {
    const resp = await fetch(`${BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...options,
    });

    // Save cookies (for refresh token)
    const setCookies = resp.headers.getSetCookie?.() || [];
    if (setCookies.length > 0) {
      COOKIES = setCookies.map((c) => c.split(';')[0]).join('; ');
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { __error: true, status: resp.status, url, body: text };
    }

    const json = await resp.json();
    return json;
  } catch (err) {
    return { __error: true, url, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function login() {
  console.log('🔐 Logging in as superadmin...');
  const resp = await post('/api/auth/captcha');
  const captchaId = resp?.data?.captchaId || 'any';

  const loginResp = await post('/api/auth/login', {
    account: 'superadmin',
    password: 'any',
    captchaId,
    captchaCode: 'any',
  });

  if (loginResp?.data?.accessToken) {
    TOKEN = loginResp.data.accessToken;
    console.log('✅ Login successful, token acquired');
    return true;
  }
  console.error('❌ Login failed:', JSON.stringify(loginResp));
  return false;
}

// ---------------------------------------------------------------------------
// Endpoint definitions — grouped by controller
// Each entry: { name, url, body?, description }
// ---------------------------------------------------------------------------

function getEndpoints() {
  // Common params
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const yearAgo = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  })();
  const monthAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  })();

  return {
    // ── Auth ──
    auth: [
      { name: 'captcha', url: '/api/auth/captcha', body: {} },
      // login and refresh are handled specially by the auth mock
    ],

    // ── Calendar ──
    calendar: [
      { name: 'upcoming', url: '/api/calendar/upcoming', body: {} },
      { name: 'range', url: '/api/calendar/range', body: { startDate: monthAgo, endDate: today } },
    ],

    // ── Notification ──
    notification: [
      { name: 'list', url: '/api/notification/list', body: { page: 1, pageSize: 20 } },
      { name: 'unreadCount', url: '/api/notification/unread-count', body: {} },
      { name: 'preferences', url: '/api/notification/preferences', body: {} },
    ],

    // ── Stock ──
    stock: [
      { name: 'list', url: '/api/stock/list', body: { page: 1, pageSize: 20 } },
      { name: 'search', url: '/api/stock/search', body: { keyword: '平安' } },
      { name: 'detail', url: '/api/stock/detail', body: { code: '000001.SZ' } },
      {
        name: 'detail_overview',
        url: '/api/stock/detail/overview',
        body: { code: '000001.SZ' },
      },
      {
        name: 'detail_chart',
        url: '/api/stock/detail/chart',
        body: {
          tsCode: '000001.SZ',
          period: 'D',
          adjustType: 'qfq',
          startDate: yearAgo,
          endDate: today,
        },
      },
      {
        name: 'detail_moneyFlow',
        url: '/api/stock/detail/money-flow',
        body: { tsCode: '000001.SZ', startDate: monthAgo, endDate: today },
      },
      {
        name: 'detail_todayFlow',
        url: '/api/stock/detail/today-flow',
        body: { code: '000001.SZ' },
      },
      {
        name: 'detail_financials',
        url: '/api/stock/detail/financials',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_shareholders',
        url: '/api/stock/detail/shareholders',
        body: { tsCode: '000001.SZ' },
      },

      {
        name: 'detail_financing',
        url: '/api/stock/detail/financing',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_financialStatements',
        url: '/api/stock/detail/financial-statements',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_technicalIndicators',
        url: '/api/stock/detail/analysis/technical',
        body: { tsCode: '000001.SZ', startDate: monthAgo, endDate: today },
      },
      {
        name: 'detail_timingSignals',
        url: '/api/stock/detail/analysis/timing-signals',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_chipDistribution',
        url: '/api/stock/detail/analysis/chip-distribution',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_margin',
        url: '/api/stock/detail/analysis/margin',
        body: { tsCode: '000001.SZ', startDate: monthAgo, endDate: today },
      },
      {
        name: 'detail_relativeStrength',
        url: '/api/stock/detail/analysis/relative-strength',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_mainMoneyFlow',
        url: '/api/stock/detail/main-money-flow',
        body: { tsCode: '000001.SZ', startDate: monthAgo, endDate: today },
      },
      {
        name: 'detail_shareCapital',
        url: '/api/stock/detail/share-capital',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_concepts',
        url: '/api/stock/detail/concepts',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_factors',
        url: '/api/stock/detail/analysis/factors',
        body: { tsCode: '000001.SZ' },
      },
      {
        name: 'detail_factorsLatest',
        url: '/api/stock/detail/analysis/factors/latest',
        body: { tsCode: '000001.SZ' },
      },
    ],

    // ── Screener ──
    screener: [
      { name: 'screener', url: '/api/stock/screener', body: { page: 1, pageSize: 20 } },
      { name: 'presets', url: '/api/stock/screener/presets', body: {} },
      { name: 'industries', url: '/api/stock/industries', body: {} },
      { name: 'areas', url: '/api/stock/areas', body: {} },
      { name: 'strategies_list', url: '/api/stock/screener/strategies/list', body: {} },
    ],

    // ── Market ──
    market: [
      { name: 'indexQuote', url: '/api/market/index-quote', body: {} },
      {
        name: 'indexTrend',
        url: '/api/market/index-trend',
        body: { ts_code: '000001.SH', period: '3m' },
      },
      { name: 'sentiment', url: '/api/market/sentiment', body: {} },
      { name: 'changeDistribution', url: '/api/market/change-distribution', body: {} },
      { name: 'sentimentTrend', url: '/api/market/sentiment-trend', body: { days: 30 } },
      { name: 'sectorRanking', url: '/api/market/sector-ranking', body: {} },
      { name: 'volumeOverview', url: '/api/market/volume-overview', body: {} },
      { name: 'marketBreadth', url: '/api/market/market-breadth', body: {} },
      { name: 'valuation', url: '/api/market/valuation', body: {} },
      { name: 'valuationTrend', url: '/api/market/valuation-trend', body: { period: '1y' } },
      { name: 'moneyFlow', url: '/api/market/money-flow', body: {} },
      { name: 'moneyFlowTrend', url: '/api/market/money-flow-trend', body: { days: 30 } },
      { name: 'sectorFlowRanking', url: '/api/market/sector-flow-ranking', body: {} },
      {
        name: 'sectorFlowTrend',
        url: '/api/market/sector-flow-trend',
        body: { ts_code: '801780.SI', days: 30 },
      },
      { name: 'hsgtFlow', url: '/api/market/hsgt-flow', body: {} },
      { name: 'hsgtTrend', url: '/api/market/hsgt-trend', body: { period: '1m' } },
      { name: 'mainFlowRanking', url: '/api/market/main-flow-ranking', body: {} },
      {
        name: 'stockFlowDetail',
        url: '/api/market/stock-flow-detail',
        body: { ts_code: '000001.SZ' },
      },
      { name: 'sectorFlow', url: '/api/market/sector-flow', body: {} },
      { name: 'conceptList', url: '/api/market/concept/list', body: { page: 1, pageSize: 20 } },
      {
        name: 'conceptMembers',
        url: '/api/market/concept/members',
        body: { tsCode: '000001.SH', page: 1, pageSize: 20 },
      },
    ],

    // ── Industry Rotation ──
    'industry-rotation': [
      { name: 'overview', url: '/api/industry-rotation/overview', body: {} },
      { name: 'heatmap', url: '/api/industry-rotation/heatmap', body: { period: '1M' } },
      { name: 'momentumRanking', url: '/api/industry-rotation/momentum-ranking', body: {} },
      {
        name: 'returnComparison',
        url: '/api/industry-rotation/return-comparison',
        body: { industries: ['银行', '白酒', '保险'], period: '1M' },
      },
      { name: 'flowAnalysis', url: '/api/industry-rotation/flow-analysis', body: {} },
      { name: 'valuation', url: '/api/industry-rotation/valuation', body: {} },
      { name: 'detail', url: '/api/industry-rotation/detail', body: { industry: '银行' } },
    ],

    // ── Heatmap ──
    heatmap: [
      { name: 'data', url: '/api/heatmap/data', body: {} },
      {
        name: 'snapshotHistory',
        url: '/api/heatmap/snapshot/history',
        body: { trade_date: today },
      },
    ],

    // ── Index Detail ──
    'index-detail': [
      { name: 'list', url: '/api/index/list', body: {} },
      {
        name: 'daily',
        url: '/api/index/daily',
        body: { ts_code: '000001.SH', start_date: monthAgo, end_date: today },
      },
      { name: 'constituents', url: '/api/index/constituents', body: { index_code: '000300.SH' } },
    ],

    // ── Factor ──
    factor: [
      { name: 'library', url: '/api/factor/library', body: {} },
      { name: 'detail', url: '/api/factor/detail', body: { factorName: 'pe_ttm' } },
      {
        name: 'values',
        url: '/api/factor/values',
        body: { factorName: 'pe_ttm', tradeDate: today },
      },
      {
        name: 'ic',
        url: '/api/factor/analysis/ic',
        body: { factorName: 'pe_ttm', startDate: yearAgo, endDate: today },
      },
      {
        name: 'quantile',
        url: '/api/factor/analysis/quantile',
        body: { factorName: 'pe_ttm', startDate: yearAgo, endDate: today },
      },
      {
        name: 'decay',
        url: '/api/factor/analysis/decay',
        body: { factorName: 'pe_ttm', startDate: yearAgo, endDate: today },
      },
      {
        name: 'distribution',
        url: '/api/factor/analysis/distribution',
        body: { factorName: 'pe_ttm', tradeDate: today },
      },
      {
        name: 'correlation',
        url: '/api/factor/analysis/correlation',
        body: { factorNames: ['pe_ttm', 'pb'], tradeDate: today },
      },
      {
        name: 'screening',
        url: '/api/factor/screening',
        body: {
          conditions: [{ factorName: 'pe_ttm', operator: 'lt', value: 50 }],
          tradeDate: today,
          page: 1,
          pageSize: 20,
        },
      },
    ],

    // ── Backtest ──
    backtest: [
      { name: 'strategyTemplates', url: '/api/backtests/strategy-templates', body: {} },
      { name: 'runsList', url: '/api/backtests/runs/list', body: { page: 1, pageSize: 20 } },
      {
        name: 'walkForwardList',
        url: '/api/backtests/walk-forward/runs/list',
        body: { page: 1, pageSize: 20 },
      },
      // Detail endpoints need a run ID — captured dynamically below
    ],

    // ── Portfolio ──
    portfolio: [
      { name: 'list', url: '/api/portfolio/list', body: {} },
      // Detail endpoints need a portfolio ID — we'll try to get one from the list
    ],

    // ── Strategy ──
    strategy: [
      { name: 'list', url: '/api/strategies/list', body: { page: 1, pageSize: 20 } },
      { name: 'schemas', url: '/api/strategies/schemas', body: {} },
      // Detail endpoints need a strategy ID
    ],

    // ── Strategy Draft ──
    'strategy-draft': [{ name: 'list', url: '/api/strategy-draft/list', body: {} }],

    // ── Screener Subscription ──
    'screener-subscription': [
      { name: 'list', url: '/api/screener-subscription/list', body: { page: 1, pageSize: 20 } },
    ],

    // ── Watchlist ──
    watchlist: [
      { name: 'list', url: '/api/watchlist/list', body: {} },
      { name: 'summary', url: '/api/watchlist/summary', body: {} },
      { name: 'overview', url: '/api/watchlist/overview', body: {} },
      // Stocks need a watchlist ID
    ],

    // ── Alert ──
    alert: [
      {
        name: 'calendar',
        url: '/api/alert/calendar/list',
        body: { startDate: monthAgo, endDate: today },
      },
      { name: 'priceRules', url: '/api/alert/price-rules/list', body: {} },
      { name: 'anomalies', url: '/api/alert/anomalies/list', body: { page: 1, pageSize: 20 } },
    ],

    // ── Signal ──
    signal: [
      { name: 'activations', url: '/api/signal/strategies/list', body: {} },
      { name: 'latest', url: '/api/signal/latest', body: {} },
      {
        name: 'history',
        url: '/api/signal/history',
        body: { strategyId: 'any', page: 1, pageSize: 20 },
      },
    ],

    // ── Event Study ──
    'event-study': [
      { name: 'eventTypes', url: '/api/event-study/event-types/list', body: {} },
      { name: 'signalRules', url: '/api/event-study/signal-rules/list', body: {} },
    ],

    // ── Report ──
    report: [{ name: 'list', url: '/api/report/list', body: { page: 1, pageSize: 20 } }],

    // ── Research Note ──
    'research-note': [
      { name: 'list', url: '/api/research-note/list', body: { page: 1, pageSize: 20 } },
      { name: 'tags', url: '/api/research-note/tags', body: {} },
    ],

    // ── Pattern ──
    pattern: [{ name: 'templates', url: '/api/pattern/templates/list', body: {} }],

    // ── User Management ──
    'user-manage': [
      { name: 'profile', url: '/api/user/profile/detail', body: {} },
      { name: 'list', url: '/api/user/list', body: { page: 1, pageSize: 20 } },
      { name: 'auditLogs', url: '/api/user/audit-log/list', body: { page: 1, pageSize: 20 } },
    ],

    // ── Tushare Sync ──
    'tushare-sync': [
      { name: 'plans', url: '/api/tushare/admin/plans', body: {} },
      { name: 'cacheStats', url: '/api/tushare/admin/cache/stats', body: {} },
      { name: 'qualityReport', url: '/api/tushare/admin/quality/report', body: {} },
      { name: 'qualitySummary', url: '/api/tushare/admin/quality/summary', body: {} },
      { name: 'qualityHealth', url: '/api/tushare/admin/quality/health', body: {} },
      { name: 'syncLogs', url: '/api/tushare/admin/sync-logs', body: { page: 1, pageSize: 20 } },
      { name: 'syncLogsSummary', url: '/api/tushare/admin/sync-logs/summary', body: {} },
      { name: 'retryQueue', url: '/api/tushare/admin/retry-queue', body: {} },
      { name: 'syncStatusOverview', url: '/api/tushare/admin/sync-status-overview', body: {} },
      { name: 'dataGaps', url: '/api/tushare/admin/quality/gaps', body: {} },
      {
        name: 'validationLogs',
        url: '/api/tushare/admin/validation-logs',
        body: { page: 1, pageSize: 20 },
      },
      { name: 'repairQueueStatus', url: '/api/tushare/admin/quality/repair-status', body: {} },
    ],

    // ── Fund ── (endpoints not yet implemented)
    fund: [],
  };
}

// ---------------------------------------------------------------------------
// Dynamic detail capture — use IDs from list responses
// ---------------------------------------------------------------------------

async function captureDetailEndpoints(controllerData) {
  const extras = {};

  // Backtest run details
  const backtestRuns = controllerData.backtest?.runsList?.data;
  if (backtestRuns?.items?.length > 0) {
    const runId = backtestRuns.items[0].id || backtestRuns.items[0].runId;
    if (runId) {
      extras['backtest'] = extras['backtest'] || {};
      extras['backtest'].runDetail = await post('/api/backtests/runs/detail', { runId });
      extras['backtest'].runEquity = await post('/api/backtests/runs/equity', { runId });
      extras['backtest'].runTrades = await post('/api/backtests/runs/trades', {
        runId,
        page: 1,
        pageSize: 20,
      });
      extras['backtest'].runPositions = await post('/api/backtests/runs/positions', { runId });
      extras['backtest'].runAttribution = await post('/api/backtests/runs/attribution', { runId });
      extras['backtest'].runMonteCarlo = await post('/api/backtests/runs/monte-carlo', { runId });
      extras['backtest'].runCostSensitivity = await post('/api/backtests/runs/cost-sensitivity', {
        runId,
      });
      extras['backtest'].runParamSensitivity = await post('/api/backtests/runs/param-sensitivity', {
        runId,
      });
      extras['backtest'].runParamSensitivityResult = await post(
        '/api/backtests/runs/param-sensitivity/result',
        { runId }
      );
      console.log(`  📊 Captured backtest run details for runId=${runId}`);
    }
  }

  // Walk-forward details
  const wfRuns = controllerData.backtest?.walkForwardList?.data;
  if (wfRuns?.items?.length > 0) {
    const wfId = wfRuns.items[0].id || wfRuns.items[0].runId;
    if (wfId) {
      extras['backtest'] = extras['backtest'] || {};
      extras['backtest'].walkForwardDetail = await post('/api/backtests/walk-forward/runs/detail', {
        runId: wfId,
      });
      extras['backtest'].walkForwardEquity = await post('/api/backtests/walk-forward/runs/equity', {
        runId: wfId,
      });
      console.log(`  📊 Captured walk-forward details for id=${wfId}`);
    }
  }

  // Comparisons — no list endpoint, skip

  // Portfolio details
  const portfolioList = controllerData.portfolio?.list?.data;
  if (Array.isArray(portfolioList) && portfolioList.length > 0) {
    const pid = portfolioList[0].id;
    if (pid) {
      extras['portfolio'] = extras['portfolio'] || {};
      extras['portfolio'].detail = await post('/api/portfolio/detail', { id: pid });
      extras['portfolio'].pnlToday = await post('/api/portfolio/pnl/today', { portfolioId: pid });
      extras['portfolio'].pnlHistory = await post('/api/portfolio/pnl/history', {
        portfolioId: pid,
      });
      extras['portfolio'].riskIndustry = await post('/api/portfolio/risk/industry', {
        portfolioId: pid,
      });
      extras['portfolio'].riskPosition = await post('/api/portfolio/risk/position', {
        portfolioId: pid,
      });
      extras['portfolio'].riskMarketCap = await post('/api/portfolio/risk/market-cap', {
        portfolioId: pid,
      });
      extras['portfolio'].riskBeta = await post('/api/portfolio/risk/beta', { portfolioId: pid });
      extras['portfolio'].riskRules = await post('/api/portfolio/rule/list', { portfolioId: pid });
      extras['portfolio'].driftDetection = await post('/api/portfolio/drift-detection', {
        portfolioId: pid,
      });
      console.log(`  📊 Captured portfolio details for id=${pid}`);
    }
  }

  // Strategy details
  const strategyList = controllerData.strategy?.list?.data;
  const strategies = strategyList?.strategies || strategyList?.items;
  if (Array.isArray(strategies) && strategies.length > 0) {
    const sid = strategies[0].id;
    if (sid) {
      extras['strategy'] = extras['strategy'] || {};
      extras['strategy'].detail = await post('/api/strategies/detail', { id: sid });
      extras['strategy'].versions = await post('/api/strategies/versions', { id: sid });
      console.log(`  📊 Captured strategy details for id=${sid}`);
    }
  }

  // Watchlist stocks
  const watchlists = controllerData.watchlist?.list?.data;
  if (Array.isArray(watchlists) && watchlists.length > 0) {
    const wid = watchlists[0].id;
    if (wid) {
      extras['watchlist'] = extras['watchlist'] || {};
      extras['watchlist'].stocks = await post('/api/watchlist/stocks/list', { watchlistId: wid });
      console.log(`  📊 Captured watchlist stocks for id=${wid}`);
    }
  }

  // Research note detail
  const noteList = controllerData['research-note']?.list?.data;
  const notes = noteList?.notes || (Array.isArray(noteList) ? noteList : null);
  if (Array.isArray(notes) && notes.length > 0) {
    const nid = notes[0].id;
    if (nid) {
      extras['research-note'] = extras['research-note'] || {};
      extras['research-note'].detail = await post('/api/research-note/detail', { id: nid });
      extras['research-note'].stockNotes = await post('/api/research-note/stock', {
        tsCode: '000001.SZ',
      });
      console.log(`  📊 Captured research note details for id=${nid}`);
    }
  }

  // Screener subscription detail
  const subList = controllerData['screener-subscription']?.list?.data;
  const subs = subList?.subscriptions || (Array.isArray(subList) ? subList : null);
  if (Array.isArray(subs) && subs.length > 0) {
    const sid = subs[0].id;
    if (sid) {
      extras['screener-subscription'] = extras['screener-subscription'] || {};
      extras['screener-subscription'].detail = await post('/api/screener-subscription/detail', {
        id: sid,
      });
      extras['screener-subscription'].logs = await post('/api/screener-subscription/logs', {
        id: sid,
        page: 1,
        pageSize: 20,
      });
      console.log(`  📊 Captured subscription details for id=${sid}`);
    }
  }

  // User detail
  const userList = controllerData['user-manage']?.list?.data;
  const users = userList?.items || (Array.isArray(userList) ? userList : null);
  if (Array.isArray(users) && users.length > 0) {
    const uid = users[0].id;
    if (uid) {
      extras['user-manage'] = extras['user-manage'] || {};
      extras['user-manage'].detail = await post('/api/user/detail', { id: uid });
      console.log(`  📊 Captured user detail for id=${uid}`);
    }
  }

  // Report detail
  const reportList = controllerData.report?.list?.data;
  const reports = reportList?.items || (Array.isArray(reportList) ? reportList : null);
  if (Array.isArray(reports) && reports.length > 0) {
    const rid = reports[0].id;
    if (rid) {
      extras['report'] = extras['report'] || {};
      extras['report'].detail = await post('/api/report/detail', { id: rid });
      console.log(`  📊 Captured report detail for id=${rid}`);
    }
  }

  return extras;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!(await login())) {
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });

  const endpoints = getEndpoints();
  const controllerData = {};
  let totalEndpoints = 0;
  let successCount = 0;
  let errorCount = 0;

  // Phase 1: Capture all list/base endpoints
  for (const [controller, eps] of Object.entries(endpoints)) {
    console.log(`\n📁 ${controller} (${eps.length} endpoints)`);
    controllerData[controller] = {};

    for (const ep of eps) {
      totalEndpoints++;
      process.stdout.write(`  ⏳ ${ep.name}...`);
      const result = await post(ep.url, ep.body || {});

      if (result?.__error) {
        console.log(
          ` ❌ ${result.status || 'ERR'} ${result.message || result.body?.slice(0, 100) || ''}`
        );
        errorCount++;
        // Still save the error response — helps debug
        controllerData[controller][ep.name] = {
          code: -1,
          data: null,
          message: `Error: ${result.status || result.message}`,
        };
      } else {
        const dataSize = JSON.stringify(result).length;
        console.log(` ✅ (${(dataSize / 1024).toFixed(1)} KB)`);
        successCount++;
        controllerData[controller][ep.name] = result;
      }
    }
  }

  // Phase 2: Capture detail endpoints using IDs from list responses
  console.log('\n📋 Capturing detail endpoints...');
  const extras = await captureDetailEndpoints(controllerData);

  // Merge extras into controllerData
  for (const [controller, data] of Object.entries(extras)) {
    controllerData[controller] = { ...controllerData[controller], ...data };
  }

  // Phase 3: Save to files
  console.log('\n💾 Saving to files...');
  for (const [controller, data] of Object.entries(controllerData)) {
    const filePath = resolve(DATA_DIR, `${controller}.json`);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    const size = JSON.stringify(data).length;
    console.log(`  📄 ${controller}.json (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log(
    `\n✅ Done! ${successCount}/${totalEndpoints} endpoints captured, ${errorCount} errors`
  );
  console.log(`📂 Data saved to ${DATA_DIR}/`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
