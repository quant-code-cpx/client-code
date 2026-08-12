import type { MarketMoneyFlowDetail } from 'src/api/market';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { DashboardMarketPulse } from '../dashboard-market-pulse';
import { DashboardCapitalRadar } from '../dashboard-capital-radar';

const mocks = vi.hoisted(() => ({
  fetchHsgtFlow: vi.fn(),
  fetchMoneyFlow: vi.fn(),
  fetchIndexQuoteWithSparkline: vi.fn(),
}));

vi.mock('src/api/market', () => mocks);

vi.mock('src/components/chart-sparkline', () => ({
  ChartSparkline: () => <div data-testid="sparkline" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('首页市场数据缺失语义', () => {
  it('指数涨跌幅和成交额缺失时显示占位，不伪造成 0', async () => {
    mocks.fetchIndexQuoteWithSparkline.mockResolvedValue({
      tradeDate: '20260808',
      sparklinePeriod: '1m',
      indices: [
        {
          tsCode: '000001.SH',
          name: '上证指数',
          tradeDate: '20260808',
          close: 3500,
          preClose: null,
          change: null,
          pctChg: null,
          vol: null,
          amount: null,
          sparkline: [],
        },
      ],
    });

    renderWithProviders(<DashboardMarketPulse />);

    expect(await screen.findByText('上证指数')).toBeInTheDocument();
    expect(screen.getByText('成交额 —')).toBeInTheDocument();
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument();
  });

  it('资金字段缺失时不生成 0 亿或 50/50 比例', async () => {
    mocks.fetchHsgtFlow.mockResolvedValue({
      tradeDate: '20260808',
      history: [
        {
          tradeDate: '20260808',
          northMoney: null,
          southMoney: null,
          hgt: null,
          sgt: null,
          ggtSs: null,
          ggtSz: null,
        },
      ],
    });
    mocks.fetchMoneyFlow.mockResolvedValue(moneyFlowWithMissingValues());

    renderWithProviders(<DashboardCapitalRadar />);

    expect(await screen.findByText('全市场净流入')).toBeInTheDocument();
    expect(screen.queryByText('+0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('买0.0亿')).not.toBeInTheDocument();
    expect(screen.getAllByText('买—')).toHaveLength(4);
  });

  it('资金接口失败时暴露错误并提供局部重试', async () => {
    mocks.fetchHsgtFlow.mockRejectedValue(new Error('北向接口不可用'));
    mocks.fetchMoneyFlow.mockRejectedValue(new Error('资金接口不可用'));

    renderWithProviders(<DashboardCapitalRadar />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('资金接口不可用');
    expect(alert).toHaveTextContent('北向接口不可用');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });
});

function moneyFlowWithMissingValues(): MarketMoneyFlowDetail {
  const tier = {
    buyAmount: null,
    sellAmount: null,
    netAmount: null,
    buyRate: null,
    sellRate: null,
    netRate: null,
  };

  return {
    tradeDate: '20260808',
    closeSh: null,
    pctChangeSh: null,
    closeSz: null,
    pctChangeSz: null,
    totalAmount: null,
    netMfAmount: null,
    main: { ...tier },
    retail: { ...tier },
    elg: { ...tier },
    lg: { ...tier },
    md: { ...tier },
    sm: { ...tier },
  };
}
