import type { StockMoneyFlowData, StockTodayFlowData } from 'src/api/stock';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MoneyFlowCard, TodayFlowCard } from '../market/market-flow-cards';

const chartMock = vi.hoisted(() => vi.fn());

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: (props: unknown) => {
    chartMock(props);
    return <div data-testid="money-flow-chart" />;
  },
}));

beforeEach(() => {
  chartMock.mockClear();
});

describe('股票资金流空值语义', () => {
  it('买卖额缺失时不伪造 50% 流入占比', () => {
    const category = { buyAmount: null, sellAmount: null, netAmount: null };
    const data: StockTodayFlowData = {
      tsCode: '600519.SH',
      tradeDate: '2026-08-08T00:00:00.000Z',
      superLarge: { ...category },
      large: { ...category },
      medium: { ...category },
      small: { ...category },
      mainForce: { ...category },
      netMfAmount: null,
    };

    renderWithProviders(<TodayFlowCard data={data} loading={false} error="" />);

    expect(screen.queryByText('50.0%')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
  });

  it('历史净流入和涨跌幅缺失时图表保留 null，摘要显示占位', () => {
    const data: StockMoneyFlowData = {
      tsCode: '600519.SH',
      summary: { netMfAmount5d: 0, netMfAmount20d: 0, netMfAmount60d: 0 },
      items: [
        {
          tradeDate: '20260808',
          close: 100,
          pctChg: null,
          netMfAmount: null,
          buyElgAmount: null,
          sellElgAmount: null,
          buyLgAmount: null,
          sellLgAmount: null,
          buyMdAmount: null,
          sellMdAmount: null,
          buySmAmount: null,
          sellSmAmount: null,
        },
      ],
    };

    renderWithProviders(<MoneyFlowCard tsCode="600519.SH" data={data} loading={false} error="" />);

    expect(screen.getAllByText('—')).toHaveLength(3);
    const props = chartMock.mock.calls[0][0] as {
      series: Array<{ data: Array<{ y: number | null }> }>;
    };
    expect(props.series[0].data[0].y).toBeNull();
    expect(props.series[1].data[0].y).toBeNull();
  });
});
