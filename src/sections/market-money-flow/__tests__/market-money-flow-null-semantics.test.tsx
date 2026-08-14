/** @vitest-environment jsdom */

import type { ReactNode } from 'react';

import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MiniTierBar } from '../mini-tier-bar';
import { SectorFlowTrendChart } from '../sector-flow-trend-chart';
import { CapitalFlowTrendChart } from '../capital-flow-trend-chart';
import { StockFlowDetailDialog } from '../stock-flow-detail-dialog';
import { SectorFlowRankingPanel } from '../sector-flow-ranking-panel';

type ChartMockProps = {
  series: Array<{ name: string; data: Array<number | null> }>;
};

const mocks = vi.hoisted(() => ({
  chart: vi.fn(),
  fetchMoneyFlowTrend: vi.fn(),
  fetchSectorFlowRanking: vi.fn(),
  fetchSectorFlowTrend: vi.fn(),
  fetchStockFlowDetail: vi.fn(),
}));

vi.mock('src/api/market', () => ({
  fetchMoneyFlowTrend: mocks.fetchMoneyFlowTrend,
  fetchSectorFlowRanking: mocks.fetchSectorFlowRanking,
  fetchSectorFlowTrend: mocks.fetchSectorFlowTrend,
  fetchStockFlowDetail: mocks.fetchStockFlowDetail,
}));

vi.mock('src/components/chart', () => ({
  Chart: (props: ChartMockProps) => {
    mocks.chart(props);
    return <div data-testid="market-money-flow-chart" />;
  },
  useChart: (options: unknown) => options,
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function latestChartProps(): ChartMockProps {
  const call = mocks.chart.mock.calls.at(-1);
  if (!call) throw new Error('图表尚未渲染');
  return call[0] as ChartMockProps;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchMoneyFlowTrend.mockResolvedValue({ data: [] });
  mocks.fetchSectorFlowRanking.mockResolvedValue({
    tradeDate: '20260808',
    contentType: 'INDUSTRY',
    topInflow: [],
    topOutflow: [],
  });
  mocks.fetchSectorFlowTrend.mockResolvedValue({
    tsCode: 'BK001',
    name: null,
    data: [],
  });
  mocks.fetchStockFlowDetail.mockResolvedValue({
    tsCode: '600000.SH',
    name: null,
    data: [],
  });
});

describe('市场资金流空值语义', () => {
  it('大盘资金图保留 null 断点，且四档不完整时不计算主力占比', async () => {
    mocks.fetchMoneyFlowTrend.mockResolvedValue({
      data: [
        {
          tradeDate: '20260807',
          netAmount: null,
          cumulativeNet: 500_000_000,
          buyElgAmount: null,
          buyLgAmount: 200_000_000,
          buyMdAmount: 300_000_000,
          buySmAmount: 400_000_000,
        },
        {
          tradeDate: '20260808',
          netAmount: 100_000_000,
          cumulativeNet: 600_000_000,
          buyElgAmount: 0,
          buyLgAmount: 0,
          buyMdAmount: 0,
          buySmAmount: 0,
        },
      ],
    });

    const { user } = renderWithProviders(<CapitalFlowTrendChart />);

    await screen.findByTestId('market-money-flow-chart');
    expect(latestChartProps().series).toEqual([
      { name: '每日净流入', type: 'column', data: [null, 1] },
      { name: '累计净流入', type: 'line', data: [5, 6] },
    ]);

    await user.click(screen.getByRole('button', { name: '资金分层' }));
    expect(latestChartProps().series[0]?.data).toEqual([null, 0]);

    await user.click(screen.getByRole('button', { name: '主力占比' }));
    expect(latestChartProps().series[0]?.data).toEqual([null, 0]);
  });

  it('板块趋势图将缺失净流入作为断点', async () => {
    mocks.fetchSectorFlowTrend.mockResolvedValue({
      tsCode: 'BK001',
      name: null,
      data: [
        {
          tradeDate: '20260808',
          pctChange: null,
          netAmount: null,
          cumulativeNet: 100_000_000,
        },
      ],
    });

    renderWithProviders(
      <SectorFlowTrendChart tsCode="BK001" sectorName="BK001" days={20} open />
    );

    await screen.findByTestId('market-money-flow-chart');
    expect(latestChartProps().series).toEqual([
      { name: '每日净流入', type: 'column', data: [null] },
      { name: '累计净流入', type: 'line', data: [1] },
    ]);
  });

  it('板块排行对缺失名称回退代码，缺失数值显示占位', async () => {
    mocks.fetchSectorFlowRanking.mockResolvedValue({
      tradeDate: '20260808',
      contentType: 'INDUSTRY',
      topInflow: [
        {
          tsCode: 'BK.NULL',
          name: null,
          pctChange: null,
          close: null,
          netAmount: null,
          netAmountRate: null,
          buyElgAmount: null,
          buyLgAmount: null,
          buyMdAmount: null,
          buySmAmount: null,
        },
      ],
      topOutflow: [],
    });

    renderWithProviders(<SectorFlowRankingPanel />);

    const row = await screen.findByRole('button', { name: '选择板块 BK.NULL' });
    expect(within(row).getByText('BK.NULL')).toBeInTheDocument();
    expect(within(row).getAllByText('—')).toHaveLength(3);
    expect(within(row).getByLabelText(/超大单: —/)).toBeEmptyDOMElement();
  });

  it('资金分层输入不完整时不生成伪造占比', () => {
    renderWithProviders(<MiniTierBar elg={null} lg={100_000_000} md={0} sm={-100_000_000} />);

    const bar = screen.getByLabelText(/超大单: —/);
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('大单: +1.00亿'));
    expect(bar).toBeEmptyDOMElement();
  });

  it('个股分档仅在买卖双方都存在时计算净值', async () => {
    mocks.fetchStockFlowDetail.mockResolvedValue({
      tsCode: '600000.SH',
      name: null,
      data: [
        {
          tradeDate: '20260808',
          mainNetInflow: 10,
          retailNetInflow: -10,
          buyElgAmount: null,
          sellElgAmount: 10,
          buyLgAmount: 20,
          sellLgAmount: null,
          buyMdAmount: 20,
          sellMdAmount: 10,
          buySmAmount: 0,
          sellSmAmount: 0,
          netMfAmount: null,
        },
      ],
    });

    renderWithProviders(
      <StockFlowDetailDialog
        open
        tsCode="600000.SH"
        stockName="浦发银行"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getAllByText('2026-08-08').length).toBeGreaterThan(0));
    const dailyRow = screen
      .getAllByText('2026-08-08')
      .map((node) => node.closest('tr'))
      .find((row): row is HTMLTableRowElement => row != null);

    expect(dailyRow).toBeDefined();
    expect(within(dailyRow as HTMLTableRowElement).getAllByText('—')).toHaveLength(3);
    expect(within(dailyRow as HTMLTableRowElement).getByText('+10.00万')).toBeInTheDocument();
    expect(within(dailyRow as HTMLTableRowElement).getByText('+0.00万')).toBeInTheDocument();
  });
});
