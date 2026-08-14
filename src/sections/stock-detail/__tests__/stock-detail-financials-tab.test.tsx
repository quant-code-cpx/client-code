import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailFinancialsTab } from '../stock-detail-financials-tab';

const apiMocks = vi.hoisted(() => ({
  financials: vi.fn(),
  financialStatements: vi.fn(),
}));

vi.mock('src/api/stock', () => ({ stockDetailApi: apiMocks }));

const financialsFixture = {
  tsCode: '600519.SH',
  history: [
    {
      endDate: '20260630',
      eps: 1.2345,
      grossprofit_margin: 25,
      revenueYoy: 10,
      netprofitYoy: -5,
      ocfToNetprofit: 0.8,
    },
  ],
  recentExpress: [
    {
      endDate: '20260331',
      revenue: 1_200_000_000,
      nIncome: null,
      dilutedEps: null,
      dilutedRoe: 12,
    },
  ],
};

const statementsFixture = {
  tsCode: '600519.SH',
  income: [
    {
      endDate: '20260630',
      totalRevenue: 20_000_000_000,
      totalRevenueYoy: 8.5,
      basicEps: 2.34567,
    },
  ],
  balanceSheet: [{ endDate: '20260630', totalAssets: 30_000_000_000, totalLiab: null }],
  cashflow: [{ endDate: '20260630', nCashflowAct: -150_000_000, nCashflowActYoy: -2 }],
};

describe('StockDetailFinancialsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.financials.mockResolvedValue(financialsFixture);
    apiMocks.financialStatements.mockResolvedValue(statementsFixture);
  });

  it('并行请求 8 期数据，格式化日期/元单位并保留 null 占位', async () => {
    const { user } = renderWithProviders(<StockDetailFinancialsTab tsCode="600519.SH" />);

    expect(await screen.findByText('最新业绩快报')).toBeInTheDocument();
    expect(apiMocks.financials).toHaveBeenCalledWith('600519.SH', 8);
    expect(apiMocks.financialStatements).toHaveBeenCalledWith('600519.SH', 8);
    expect(screen.getByText('2026-03-31')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
    expect(screen.queryByText('20260630')).not.toBeInTheDocument();
    expect(screen.getByText('12.00亿')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '利润表' }));
    expect(screen.getByText('200.00亿')).toBeInTheDocument();
    expect(screen.getByText('2.3457')).toBeInTheDocument();
    expect(screen.getByText('同比 +8.50%')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '资产负债表' }));
    const liabilitiesRow = screen.getByText('负债合计').closest('tr')!;
    expect(liabilitiesRow).toHaveTextContent('-');

    await user.click(screen.getByRole('tab', { name: '现金流量表' }));
    expect(screen.getByText('-1.50亿')).toBeInTheDocument();
    expect(screen.getByText('同比 -2.00%')).toBeInTheDocument();
  });

  it('财务历史与报表都为空时分别展示明确空态', async () => {
    apiMocks.financials.mockResolvedValue({ tsCode: '600519.SH', history: [], recentExpress: [] });
    apiMocks.financialStatements.mockResolvedValue({
      tsCode: '600519.SH',
      income: [],
      balanceSheet: [],
      cashflow: [],
    });
    const { user } = renderWithProviders(<StockDetailFinancialsTab tsCode="600519.SH" />);

    expect(await screen.findByText('暂无财务数据')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '利润表' }));
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('任一并行请求失败时展示原因，重试后整体恢复', async () => {
    apiMocks.financials
      .mockRejectedValueOnce(new Error('财务指标服务不可用'))
      .mockResolvedValueOnce(financialsFixture);
    const { user } = renderWithProviders(<StockDetailFinancialsTab tsCode="600519.SH" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('财务指标服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('最新业绩快报')).toBeInTheDocument();
    await waitFor(() => expect(apiMocks.financials).toHaveBeenCalledTimes(2));
    expect(apiMocks.financialStatements).toHaveBeenCalledTimes(2);
  });
});
