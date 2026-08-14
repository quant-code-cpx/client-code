import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AnalysisMarginTab } from '../analysis-margin-tab';

const marginData = vi.hoisted(() => vi.fn());

vi.mock('src/api/stock', () => ({ stockDetailApi: { marginData } }));
vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({ series }: { series: Array<{ name: string; data: Array<{ x: string }> }> }) => (
    <div data-testid="margin-chart">
      {series.map((item) => `${item.name}:${item.data.map((point) => point.x).join(',')}`).join('|')}
    </div>
  ),
}));

const fixture = {
  tsCode: '600519.SH',
  available: true,
  summary: {
    latestRzye: 123_456_789,
    latestRqye: null,
    latestRzrqye: 130_000_000,
    rzNetBuy5d: 20_000_000,
    rzNetBuy20d: -30_000_000,
    rzye5dChgPct: 1.25,
    rzye20dChgPct: -2.5,
    trend: '持续增加',
  },
  history: [
    {
      tradeDate: '20260812',
      rzye: 123_456_789,
      rzmre: null,
      rzche: null,
      rzjmre: -5_000_000,
      rqye: null,
      rqmcl: null,
      rqchl: null,
      rzrqye: 130_000_000,
      close: 1420.5,
    },
  ],
};

describe('AnalysisMarginTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    marginData.mockResolvedValue(fixture);
  });

  it('请求两融数据，按元口径缩放并格式化图表交易日', async () => {
    renderWithProviders(<AnalysisMarginTab tsCode="600519.SH" />);

    expect(await screen.findByText('融资融券摘要')).toBeInTheDocument();
    expect(marginData).toHaveBeenCalledWith('600519.SH');
    expect(screen.getByText('1.23亿')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('+1.25%')).toBeInTheDocument();
    expect(screen.getByText('-2.50%')).toBeInTheDocument();
    for (const chart of screen.getAllByTestId('margin-chart')) {
      expect(chart).toHaveTextContent('2026-08-12');
      expect(chart).not.toHaveTextContent('20260812');
    }
  });

  it('未纳入两融标的和空历史分别提供明确空态', async () => {
    marginData.mockResolvedValueOnce({ ...fixture, available: false });
    const first = renderWithProviders(<AnalysisMarginTab tsCode="600519.SH" />);
    expect(await screen.findByText(/该股票暂无融资融券数据/)).toBeInTheDocument();
    first.unmount();

    marginData.mockResolvedValueOnce({ ...fixture, history: [] });
    renderWithProviders(<AnalysisMarginTab tsCode="600519.SH" />);
    expect(await screen.findByText('暂无融资融券历史数据')).toBeInTheDocument();
  });

  it('失败时展示原因并支持局部重试', async () => {
    marginData.mockRejectedValueOnce(new Error('两融服务不可用')).mockResolvedValueOnce(fixture);
    const { user } = renderWithProviders(<AnalysisMarginTab tsCode="600519.SH" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('两融服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('融资融券摘要')).toBeInTheDocument();
    await waitFor(() => expect(marginData).toHaveBeenCalledTimes(2));
  });
});
