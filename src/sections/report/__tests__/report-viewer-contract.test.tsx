import type { ReactNode } from 'react';
import type {
  StockReportData,
  BacktestReportData,
  PortfolioReportData,
  StrategyResearchReportData,
} from 'src/api/report';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockReportViewer } from '../report-stock-viewer';
import { BacktestReportViewer } from '../report-backtest-viewer';
import { StrategyReportViewer } from '../report-strategy-viewer';
import { PortfolioReportViewer } from '../report-portfolio-viewer';

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: () => <div data-testid="report-chart" />,
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('report viewers backend contract', () => {
  it('回测报告对后端未提供的盈亏比和期末成本字段显示占位', () => {
    const data: BacktestReportData = {
      strategy: { name: '双均线', description: null, params: {} },
      metrics: {
        totalReturn: 0.2,
        annualReturn: 0.12,
        sharpe: 1.3,
        maxDrawdown: -0.1,
        winRate: 0.55,
        profitLossRatio: null,
        tradeCount: 8,
        calmarRatio: null,
        sortinoRatio: null,
      },
      navCurve: [],
      drawdownCurve: [],
      monthlyReturns: [],
      trades: [],
      endPositions: [
        {
          tsCode: '000001.SZ',
          name: null,
          quantity: 100,
          avgCost: null,
          marketValue: null,
          weight: 0.5,
        },
      ],
    };

    renderWithProviders(<BacktestReportViewer data={data} />);

    expect(screen.getByText('双均线')).toBeInTheDocument();
    expect(screen.getByText('+20%')).toBeInTheDocument();
    expect(screen.getByText('000001.SZ')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('组合报告把后端元金额按元/万/亿展示且不重复放大', () => {
    const data: PortfolioReportData = {
      overview: {
        name: '研究组合',
        description: null,
        initialCash: null,
        totalMarketValue: 120000,
        totalCost: 100000,
        unrealizedPnl: 20000,
        holdingCount: 1,
        createdAt: '2026-01-01',
      },
      holdings: [
        {
          tsCode: '000001.SZ',
          name: '平安银行',
          quantity: 100,
          avgCost: 10,
          currentPrice: 12,
          marketValue: 1200,
          pnlPct: 0.2,
          weight: 1,
          industry: null,
        },
      ],
      industryDistribution: [
        { industry: '银行', stockCount: 1, totalMarketValue: null, weight: 1 },
      ],
    };

    renderWithProviders(<PortfolioReportViewer data={data} />);

    expect(screen.getByText('研究组合')).toBeInTheDocument();
    expect(screen.getByText('银行')).toBeInTheDocument();
    expect(screen.getByText('12.00万')).toBeInTheDocument();
    expect(screen.getByText('10.00万')).toBeInTheDocument();
    expect(screen.getByText('+2.00万')).toBeInTheDocument();
    expect(screen.getByText('1200.00元')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('个股报告按后端真实字段渲染，并安全展示 null', () => {
    const data: StockReportData = {
      overview: {
        tsCode: '000001.SZ',
        name: null,
        industry: '银行',
        listDate: '1991-04-03',
        area: null,
      },
      priceHistory: [{ date: '2026-01-02', open: 10, high: 11, low: 9, close: null, volume: 1000 }],
      financialSummary: [
        {
          period: '2025-12-31',
          roe: 12.5,
          netProfitMargin: null,
          revenueYoyGrowth: 8.2,
        },
      ],
      top10Holders: [{ holderName: null, holdAmount: null, holdRatio: 9.99 }],
      dividends: [{ endDate: null, divProc: '实施', cashDivTax: null, stkDiv: 0.1 }],
    };

    renderWithProviders(<StockReportViewer data={data} />);

    expect(screen.getAllByText('000001.SZ').length).toBeGreaterThan(0);
    expect(screen.getByText('销售净利率 (%)')).toBeInTheDocument();
    expect(screen.getByText('营收同比 (%)')).toBeInTheDocument();
    expect(screen.getByText('8.20%')).toBeInTheDocument();
    expect(screen.getByText('实施')).toBeInTheDocument();
    expect(screen.getByText('暂无行情数据')).toBeInTheDocument();
  });

  it('策略研究报告按后端真实百分点、Top 持仓和操作日志结构渲染', () => {
    const data: StrategyResearchReportData = {
      title: '策略研究报告 - 动量策略',
      generatedAt: '2026-08-10 10:30',
      sections: {
        overview: {
          strategyName: '动量策略',
          strategyType: 'MOMENTUM',
          description: '回测区间：2025-01-01 ~ 2025-12-31',
          backtestRunId: 'run-1',
          portfolioId: 'portfolio-1',
          createdAt: '2026-08-10 10:00',
        },
        backtestPerformance: {
          totalReturn: 20,
          annualReturn: 12,
          sharpe: 1.25,
          maxDrawdown: -8,
          informationRatio: null,
          winRate: 55,
          volatility: null,
          benchmarkTsCode: '000300.SH',
          benchmarkComparison: { annualReturn: 6, volatility: null, excessReturn: 6 },
        },
        holdingsAnalysis: {
          topHoldings: [{ tsCode: '000001.SZ', stockName: '平安银行', weight: 35 }],
          industryDistribution: [{ industry: '银行', weight: 35 }],
          snapshotDate: '2025-12-31',
        },
        riskAssessment: {
          maxDrawdown: -8,
          volatility: null,
          beta: null,
          var95: null,
          concentrationHHI: null,
          violations: [],
        },
        tradeLogs: {
          recentLogs: [
            {
              tsCode: '000001.SZ',
              stockName: null,
              action: 'ADD',
              quantity: 100,
              price: null,
              reason: 'MANUAL',
              createdAt: '2026-08-10 09:30',
            },
          ],
          summary: [],
        },
      },
    };

    renderWithProviders(<StrategyReportViewer data={data} />);

    expect(screen.getByText('+20%')).toBeInTheDocument();
    expect(screen.getByText('平安银行')).toBeInTheDocument();
    expect(screen.getByText('新增')).toBeInTheDocument();
    expect(screen.getByText('后端策略研究报告暂未提供净值和回撤曲线。')).toBeInTheDocument();
  });
});
