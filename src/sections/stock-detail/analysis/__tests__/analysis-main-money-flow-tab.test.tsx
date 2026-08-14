import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AnalysisMainMoneyFlowTab } from '../analysis-main-money-flow-tab';

const mainMoneyFlow = vi.hoisted(() => vi.fn());

vi.mock('src/api/stock', () => ({ stockDetailApiExtra: { mainMoneyFlow } }));
vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({ options }: { options: { xaxis?: { categories?: string[] } } }) => (
    <div data-testid="money-flow-chart">
      {(options.xaxis?.categories ?? []).join('|')}
    </div>
  ),
}));

const fixture = {
  tsCode: '600519.SH',
  summary: {
    mainNetInflow5d: 12000,
    mainNetInflow10d: -8000,
    mainNetInflow20d: null,
    controlDegree: '中度控盘',
    trend: null,
  },
  history: [
    {
      tradeDate: '20260811',
      close: null,
      pctChg: null,
      mainNetInflow: 0,
      superLargeNetInflow: null,
      largeNetInflow: null,
      mainNetInflowRate: null,
    },
    {
      tradeDate: '20260812',
      close: 1420.5,
      pctChg: 1.25,
      mainNetInflow: 15000,
      superLargeNetInflow: 8000,
      largeNetInflow: 7000,
      mainNetInflowRate: 3.5,
    },
  ],
};

describe('AnalysisMainMoneyFlowTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mainMoneyFlow.mockResolvedValue(fixture);
  });

  it('请求 60 日数据，图表和表格都格式化 YYYYMMDD，null 保持占位', async () => {
    renderWithProviders(<AnalysisMainMoneyFlowTab tsCode="600519.SH" />);

    expect(await screen.findByText('主力资金流向趋势')).toBeInTheDocument();
    expect(mainMoneyFlow).toHaveBeenCalledWith('600519.SH', 60);
    expect(screen.getByTestId('money-flow-chart')).toHaveTextContent(
      '2026-08-11|2026-08-12'
    );
    expect(screen.queryByText('20260811')).not.toBeInTheDocument();
    expect(screen.getByText('+1.25%')).toBeInTheDocument();
    const missingRow = screen.getByText('2026-08-11').closest('tr')!;
    expect(missingRow).toHaveTextContent('-');
  });

  it('A 股涨红跌绿且零值使用中性色，不把零归为下跌', async () => {
    renderWithProviders(<AnalysisMainMoneyFlowTab tsCode="600519.SH" />);

    const zero = await screen.findByText('0.00万');
    const positive = screen.getByText('1.50亿');
    expect(zero).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(positive).toHaveStyle({ color: 'var(--palette-error-main)' });
  });

  it('失败时展示原因并支持局部重试', async () => {
    mainMoneyFlow
      .mockRejectedValueOnce(new Error('资金流服务不可用'))
      .mockResolvedValueOnce(fixture);
    const { user } = renderWithProviders(<AnalysisMainMoneyFlowTab tsCode="600519.SH" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('资金流服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('历史明细')).toBeInTheDocument();
    await waitFor(() => expect(mainMoneyFlow).toHaveBeenCalledTimes(2));
  });
});
