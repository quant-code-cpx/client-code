import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailMarketTab } from '../stock-detail-market-tab';

const mocks = vi.hoisted(() => ({
  klineSeries: null as Record<string, unknown> | null,
  chart: vi.fn(),
  moneyFlow: vi.fn(),
  todayFlow: vi.fn(),
}));

vi.mock('src/components/chart', () => ({
  Chart: () => <div data-testid="legacy-chart" />,
  useChart: (options: unknown) => options,
}));

vi.mock('src/components/stock-kline/stock-kline', () => ({
  StockKline: ({ series }: { series: Record<string, unknown> }) => {
    mocks.klineSeries = series;
    return <div data-testid="shared-stock-kline" />;
  },
}));

vi.mock('src/api/stock', () => ({
  stockDetailApi: {
    chart: mocks.chart,
    moneyFlow: mocks.moneyFlow,
    todayFlow: mocks.todayFlow,
  },
}));

beforeEach(() => {
  mocks.klineSeries = null;
  mocks.chart.mockResolvedValue({
    tsCode: '600519.SH',
    period: 'D',
    adjustType: 'qfq',
    hasMore: false,
    items: [
      {
        tradeDate: '2026-07-17',
        open: 1498,
        high: 1520,
        low: 1490,
        close: 1512,
        vol: 920,
        amount: 1390000,
        pctChg: 0.94,
        ma5: 1490,
        ma10: 1480,
        ma20: 1470,
        ma60: 1450,
      },
    ],
  });
  mocks.moneyFlow.mockResolvedValue({
    items: [],
    summary: { netMfAmount5d: 0, netMfAmount20d: 0, netMfAmount60d: 0 },
  });
  mocks.todayFlow.mockResolvedValue(null);
});

describe('StockDetailMarketTab', () => {
  it('保留取数职责并把标准 OHLCV 交给共享 StockKline 内核', async () => {
    renderWithProviders(<StockDetailMarketTab tsCode="600519.SH" />);

    await waitFor(() => expect(screen.getByTestId('shared-stock-kline')).toBeInTheDocument());
    expect(mocks.klineSeries).toMatchObject({
      tsCode: '600519.SH',
      adjustment: 'FORWARD',
      timezone: 'Asia/Shanghai',
      bars: [
        {
          tradeDate: '2026-07-17',
          open: 1498,
          high: 1520,
          low: 1490,
          close: 1512,
          volume: 920,
          amount: 1390000,
        },
      ],
    });
  });
});
