import { it, vi, expect, describe, beforeEach } from 'vitest';

import { apiClient } from '../client';
import { factorApi } from '../factor';
import {
  runSubscription,
  pauseSubscription,
  resumeSubscription,
  deleteSubscription,
  parseRunCooldownSeconds,
} from '../screener-subscription';
import {
  listReports,
  deleteReport,
  createStockReport,
  createBacktestReport,
  createPortfolioReport,
  createStrategyResearchReport,
} from '../report';
import {
  checkRisk,
  getRiskBeta,
  getPnlToday,
  getViolations,
  getPnlHistory,
  listRiskRules,
  listPortfolios,
  deleteRiskRule,
  deletePortfolio,
  getRiskIndustry,
  getRiskPosition,
  getRiskMarketCap,
  getPortfolioDetail,
} from '../portfolio';

vi.mock('../client', () => ({ apiClient: { post: vi.fn() } }));

type RouteContract = {
  name: string;
  invoke: () => unknown;
  expectedArgs: unknown[];
};

function verifyRouteContracts(contracts: RouteContract[]) {
  it.each(contracts)('$name', async ({ invoke, expectedArgs }) => {
    await invoke();

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(...expectedArgs);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.post).mockResolvedValue({});
});

describe('factor analysis POST contracts', () => {
  verifyRouteContracts([
    {
      name: 'loads the factor library with an explicit empty body',
      invoke: () => factorApi.library(),
      expectedArgs: ['/api/factor/library', {}],
    },
    {
      name: 'loads paged factor values for an eight-digit trade date',
      invoke: () =>
        factorApi.values({
          factorName: 'momentum_20d',
          tradeDate: '20260810',
          page: 2,
          pageSize: 50,
          sortOrder: 'desc',
        }),
      expectedArgs: [
        '/api/factor/values',
        {
          factorName: 'momentum_20d',
          tradeDate: '20260810',
          page: 2,
          pageSize: 50,
          sortOrder: 'desc',
        },
      ],
    },
    {
      name: 'requests rank IC analysis with the selected forward horizon',
      invoke: () =>
        factorApi.ic({
          factorName: 'roe_ttm',
          startDate: '20260101',
          endDate: '20260810',
          forwardDays: 10,
          icMethod: 'rank',
        }),
      expectedArgs: [
        '/api/factor/analysis/ic',
        {
          factorName: 'roe_ttm',
          startDate: '20260101',
          endDate: '20260810',
          forwardDays: 10,
          icMethod: 'rank',
        },
      ],
    },
    {
      name: 'requests a five-group quantile backtest',
      invoke: () =>
        factorApi.quantile({
          factorName: 'roe_ttm',
          startDate: '20260101',
          endDate: '20260810',
          quantiles: 5,
          rebalanceDays: 20,
        }),
      expectedArgs: [
        '/api/factor/analysis/quantile',
        {
          factorName: 'roe_ttm',
          startDate: '20260101',
          endDate: '20260810',
          quantiles: 5,
          rebalanceDays: 20,
        },
      ],
    },
    {
      name: 'requests factor decay periods without rewriting them',
      invoke: () =>
        factorApi.decay({
          factorName: 'momentum_20d',
          startDate: '20260101',
          endDate: '20260810',
          periods: [1, 5, 20],
        }),
      expectedArgs: [
        '/api/factor/analysis/decay',
        {
          factorName: 'momentum_20d',
          startDate: '20260101',
          endDate: '20260810',
          periods: [1, 5, 20],
        },
      ],
    },
    {
      name: 'requests the configured factor histogram bins',
      invoke: () =>
        factorApi.distribution({
          factorName: 'market_cap',
          tradeDate: '20260810',
          bins: 20,
        }),
      expectedArgs: [
        '/api/factor/analysis/distribution',
        { factorName: 'market_cap', tradeDate: '20260810', bins: 20 },
      ],
    },
    {
      name: 'requests the selected correlation method and factor set',
      invoke: () =>
        factorApi.correlation({
          factorNames: ['roe_ttm', 'momentum_20d'],
          tradeDate: '20260810',
          method: 'spearman',
        }),
      expectedArgs: [
        '/api/factor/analysis/correlation',
        {
          factorNames: ['roe_ttm', 'momentum_20d'],
          tradeDate: '20260810',
          method: 'spearman',
        },
      ],
    },
    {
      name: 'keeps screening conditions and result evidence flags in the body',
      invoke: () =>
        factorApi.screening({
          conditions: [{ factorName: 'roe_ttm', operator: 'gte', value: 12 }],
          tradeDate: '20260810',
          page: 1,
          pageSize: 20,
          withSummary: true,
          withDiagnostics: true,
        }),
      expectedArgs: [
        '/api/factor/screening',
        {
          conditions: [{ factorName: 'roe_ttm', operator: 'gte', value: 12 }],
          tradeDate: '20260810',
          page: 1,
          pageSize: 20,
          withSummary: true,
          withDiagnostics: true,
        },
      ],
    },
  ]);
});

describe('portfolio query POST contracts', () => {
  const portfolioId = 'portfolio-1';

  verifyRouteContracts([
    {
      name: 'lists portfolios with an explicit empty body',
      invoke: () => listPortfolios(),
      expectedArgs: ['/api/portfolio/list', {}],
    },
    {
      name: 'loads portfolio detail by body ID',
      invoke: () => getPortfolioDetail({ portfolioId }),
      expectedArgs: ['/api/portfolio/detail', { portfolioId }],
    },
    {
      name: 'deletes a portfolio by body ID',
      invoke: () => deletePortfolio({ portfolioId }),
      expectedArgs: ['/api/portfolio/delete', { portfolioId }],
    },
    {
      name: 'loads today PnL without placing the ID in the URL',
      invoke: () => getPnlToday({ portfolioId }),
      expectedArgs: ['/api/portfolio/pnl/today', { portfolioId }],
    },
    {
      name: 'loads PnL history with eight-digit date bounds',
      invoke: () => getPnlHistory({ portfolioId, startDate: '20260801', endDate: '20260810' }),
      expectedArgs: [
        '/api/portfolio/pnl/history',
        { portfolioId, startDate: '20260801', endDate: '20260810' },
      ],
    },
    {
      name: 'loads industry risk by portfolio ID',
      invoke: () => getRiskIndustry({ portfolioId }),
      expectedArgs: ['/api/portfolio/risk/industry', { portfolioId }],
    },
    {
      name: 'loads position concentration by portfolio ID',
      invoke: () => getRiskPosition({ portfolioId }),
      expectedArgs: ['/api/portfolio/risk/position', { portfolioId }],
    },
    {
      name: 'loads market-cap distribution by portfolio ID',
      invoke: () => getRiskMarketCap({ portfolioId }),
      expectedArgs: ['/api/portfolio/risk/market-cap', { portfolioId }],
    },
    {
      name: 'loads beta analysis by portfolio ID',
      invoke: () => getRiskBeta({ portfolioId }),
      expectedArgs: ['/api/portfolio/risk/beta', { portfolioId }],
    },
    {
      name: 'lists risk rules by portfolio ID',
      invoke: () => listRiskRules({ portfolioId }),
      expectedArgs: ['/api/portfolio/rule/list', { portfolioId }],
    },
    {
      name: 'deletes a risk rule by body ID',
      invoke: () => deleteRiskRule({ ruleId: 'rule-1' }),
      expectedArgs: ['/api/portfolio/rule/delete', { ruleId: 'rule-1' }],
    },
    {
      name: 'runs a portfolio risk check by body ID',
      invoke: () => checkRisk({ portfolioId }),
      expectedArgs: ['/api/portfolio/risk/check', { portfolioId }],
    },
    {
      name: 'loads the requested number of risk violations',
      invoke: () => getViolations({ portfolioId, limit: 25 }),
      expectedArgs: ['/api/portfolio/risk/violations', { portfolioId, limit: 25 }],
    },
  ]);
});

describe('report command POST contracts', () => {
  verifyRouteContracts([
    {
      name: 'creates a backtest report from the run ID',
      invoke: () => createBacktestReport({ runId: 'run-1', format: 'PDF' }),
      expectedArgs: ['/api/report/backtest', { runId: 'run-1', format: 'PDF' }],
    },
    {
      name: 'creates a stock report from the stock code',
      invoke: () => createStockReport({ tsCode: '000001.SZ', format: 'JSON' }),
      expectedArgs: ['/api/report/stock', { tsCode: '000001.SZ', format: 'JSON' }],
    },
    {
      name: 'creates a portfolio report from the portfolio ID',
      invoke: () => createPortfolioReport({ portfolioId: 'portfolio-1' }),
      expectedArgs: ['/api/report/portfolio', { portfolioId: 'portfolio-1' }],
    },
    {
      name: 'creates a strategy research report with selected sections',
      invoke: () =>
        createStrategyResearchReport({
          backtestRunId: 'run-1',
          strategyId: 'strategy-1',
          sections: { performance: true, riskAssessment: true },
        }),
      expectedArgs: [
        '/api/report/strategy-research',
        {
          backtestRunId: 'run-1',
          strategyId: 'strategy-1',
          sections: { performance: true, riskAssessment: true },
        },
      ],
    },
    {
      name: 'lists completed reports with pagination in the body',
      invoke: () => listReports({ page: 2, pageSize: 20, statuses: ['COMPLETED'] }),
      expectedArgs: ['/api/report/list', { page: 2, pageSize: 20, statuses: ['COMPLETED'] }],
    },
    {
      name: 'deletes a report by body ID',
      invoke: () => deleteReport({ reportId: 'report-1' }),
      expectedArgs: ['/api/report/delete', { reportId: 'report-1' }],
    },
  ]);
});

describe('subscription command contracts', () => {
  verifyRouteContracts([
    {
      name: 'deletes a subscription by body ID',
      invoke: () => deleteSubscription(7),
      expectedArgs: ['/api/screener-subscription/delete', { id: 7 }],
    },
    {
      name: 'pauses a subscription by body ID',
      invoke: () => pauseSubscription(7),
      expectedArgs: ['/api/screener-subscription/pause', { id: 7 }],
    },
    {
      name: 'resumes a subscription by body ID',
      invoke: () => resumeSubscription(7),
      expectedArgs: ['/api/screener-subscription/resume', { id: 7 }],
    },
    {
      name: 'manually runs a subscription by body ID',
      invoke: () => runSubscription(7),
      expectedArgs: ['/api/screener-subscription/run', { id: 7 }],
    },
  ]);

  it('parses a positive cooldown and rejects absent or zero-second cooldowns', () => {
    expect(parseRunCooldownSeconds('操作频繁，请在 12 秒后重试')).toBe(12);
    expect(parseRunCooldownSeconds('操作频繁，请稍后重试')).toBeNull();
    expect(parseRunCooldownSeconds('请在 0 秒后重试')).toBeNull();
  });
});
