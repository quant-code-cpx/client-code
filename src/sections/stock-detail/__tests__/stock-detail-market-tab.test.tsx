import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailMarketTab } from '../stock-detail-market-tab';

const mocks = vi.hoisted(() => ({
  moneyFlow: vi.fn(),
  todayFlow: vi.fn(),
}));

vi.mock('../market/market-chart-card', () => ({
  MarketChartCard: ({ tsCode }: { tsCode: string }) => (
    <div data-testid="klinechart-card">{tsCode}</div>
  ),
}));

vi.mock('../market/market-flow-cards', () => ({
  TodayFlowCard: ({ data }: { data: { tsCode?: string } | null }) => (
    <div data-testid="today-flow-card">{data?.tsCode ?? 'loading'}</div>
  ),
  MoneyFlowCard: ({ data }: { data: { tsCode?: string } | null }) => (
    <div data-testid="money-flow-card">{data?.tsCode ?? 'loading'}</div>
  ),
}));

vi.mock('src/api/stock', () => ({
  stockDetailApi: {
    moneyFlow: mocks.moneyFlow,
    todayFlow: mocks.todayFlow,
  },
}));

beforeEach(() => {
  mocks.moneyFlow.mockResolvedValue({
    tsCode: '600519.SH',
    items: [],
    summary: { netMfAmount5d: 0, netMfAmount20d: 0, netMfAmount60d: 0 },
  });
  mocks.todayFlow.mockResolvedValue({ tsCode: '600519.SH' });
});

describe('StockDetailMarketTab', () => {
  it('把行情图交给详情专用 KLineChart 卡片，并继续加载两类资金流数据', async () => {
    renderWithProviders(<StockDetailMarketTab tsCode="600519.SH" />);

    expect(screen.getByTestId('klinechart-card')).toHaveTextContent('600519.SH');
    await waitFor(() =>
      expect(screen.getByTestId('today-flow-card')).toHaveTextContent('600519.SH')
    );
    expect(screen.getByTestId('money-flow-card')).toHaveTextContent('600519.SH');
    expect(mocks.todayFlow).toHaveBeenCalledWith('600519.SH');
    expect(mocks.moneyFlow).toHaveBeenCalledWith('600519.SH', 60);
  });
});
