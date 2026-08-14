import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MarketHeatmapView } from '../view/market-heatmap-view';

const apiMock = vi.hoisted(() => ({
  fetchHeatmapData: vi.fn(),
  fetchSectorFlow: vi.fn(),
  fetchMainFlowRanking: vi.fn(),
}));

vi.mock('src/api/heatmap', () => ({
  fetchHeatmapData: apiMock.fetchHeatmapData,
}));

vi.mock('src/api/market', () => ({
  fetchSectorFlow: apiMock.fetchSectorFlow,
  fetchMainFlowRanking: apiMock.fetchMainFlowRanking,
}));

vi.mock('../heatmap-scatter-chart', () => ({
  HeatmapScatterChart: ({
    sectors,
    onSectorClick,
  }: {
    sectors: SectorFlowItem[];
    onSectorClick: (sector: SectorFlowItem) => void;
  }) => (
    <button type="button" onClick={() => onSectorClick(sectors[0])}>
      打开行业详情
    </button>
  ),
}));

vi.mock('../heatmap-sector-detail-dialog', () => ({
  HeatmapSectorDetailDialog: ({
    open,
    stocks,
    loading,
    error,
  }: {
    open: boolean;
    stocks: HeatmapItem[];
    loading: boolean;
    error: string;
  }) =>
    open ? (
      <div data-testid="sector-detail">
        {loading ? '加载中' : `个股数 ${stocks.length}`}
        {error}
      </div>
    ) : null,
}));

vi.mock('../heatmap-treemap-chart', () => ({ HeatmapTreemapChart: () => null }));
vi.mock('../heatmap-sector-bar-chart', () => ({ HeatmapSectorBarChart: () => null }));
vi.mock('../heatmap-distribution-chart', () => ({ HeatmapDistributionChart: () => null }));
vi.mock('../heatmap-snapshot-panel', () => ({ HeatmapSnapshotPanel: () => null }));

describe('MarketHeatmapView scatter detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.fetchSectorFlow.mockResolvedValue({
      industry: [
        {
          tsCode: 'BK0475.DC',
          tradeDate: '20260808',
          contentType: 'INDUSTRY',
          name: '银行',
          pctChange: 1,
          close: null,
          netAmount: 200,
          netAmountRate: 1,
          buyElgAmount: null,
          buyElgAmountRate: null,
          buyLgAmount: null,
          buyLgAmountRate: null,
          buyMdAmount: null,
          buyMdAmountRate: null,
          buySmAmount: null,
          buySmAmountRate: null,
          buySmAmountStock: null,
          rank: 1,
        },
      ],
      concept: [],
      region: [],
    });
    apiMock.fetchMainFlowRanking.mockResolvedValue({ data: [] });
    apiMock.fetchHeatmapData.mockResolvedValue([
      {
        tsCode: '000001.SZ',
        name: '平安银行',
        groupName: '银行',
        industry: '银行',
        pctChg: 1.2,
        totalMv: 100,
        amount: 10,
        swCode: '801780.SI',
      },
    ]);
  });

  it('首次停留散点点击行业时按需补全个股与映射数据', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MarketHeatmapView embedded tradeDate="20260808" />);

    await user.click(await screen.findByRole('button', { name: '打开行业详情' }));
    await waitFor(() => expect(screen.getByTestId('sector-detail')).toHaveTextContent('个股数 1'));
    expect(apiMock.fetchHeatmapData).toHaveBeenCalledWith({
      trade_date: '20260808',
      group_by: 'industry',
      industry_source: 'sw_l1',
      include_mapping: true,
    });
  });
});
import type { HeatmapItem } from 'src/api/heatmap';
import type { SectorFlowItem } from 'src/api/market';
