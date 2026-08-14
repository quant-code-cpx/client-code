import type { StockListItem } from 'src/api/stock';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockView } from '../stock-view';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  fetchAreas: vi.fn(),
  fetchIndustries: vi.fn(),
}));

vi.mock('src/api/stock', () => ({ stockApi: { list: mocks.list } }));
vi.mock('src/api/screener', () => ({
  fetchAreas: mocks.fetchAreas,
  fetchIndustries: mocks.fetchIndustries,
}));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../screener-dialog', () => ({
  ScreenerDialog: ({ open }: { open: boolean }) => (open ? <div>选股器已打开</div> : null),
}));
vi.mock('../../stock-watchlist-batch-dialog', () => ({
  StockWatchlistBatchDialog: ({ open, tsCodes }: { open: boolean; tsCodes: string[] }) =>
    open ? <div>批量目标：{tsCodes.join(',')}</div> : null,
}));

const row: StockListItem = {
  tsCode: '600519.SH',
  symbol: '600519',
  name: '贵州茅台',
  fullname: '贵州茅台酒股份有限公司',
  exchange: 'SSE',
  currType: 'CNY',
  market: '主板',
  industry: '白酒',
  area: '贵州',
  listStatus: 'L',
  listDate: '20010827',
  latestTradeDate: '20260812',
  isHs: 'H',
  cnspell: 'gzmt',
  peTtm: 22,
  pb: 7,
  dvTtm: 3.2,
  totalMv: 178000000,
  circMv: 178000000,
  turnoverRate: 0.8,
  pctChg: 1.25,
  amount: 300000,
  close: 1420.5,
  vol: 120000,
};

describe('StockView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.list.mockResolvedValue({ page: 1, pageSize: 20, total: 45, items: [row] });
    mocks.fetchIndustries.mockResolvedValue({ industries: [{ name: '白酒', count: 10 }] });
    mocks.fetchAreas.mockResolvedValue({ areas: [{ name: '贵州', count: 10 }] });
  });

  it('首屏发送明确分页/排序 Body，展示金融数据与详情入口', async () => {
    renderWithProviders(<StockView />);

    expect(await screen.findByRole('link', { name: '贵州茅台' })).toHaveAttribute(
      'href',
      '/stock/detail?code=600519.SH'
    );
    expect(mocks.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      sortBy: 'totalMv',
      sortOrder: 'desc',
      listStatus: 'L',
      keyword: undefined,
      exchange: undefined,
      market: undefined,
      isHs: undefined,
    });
    expect(screen.getByText('+1.25%')).toBeInTheDocument();
    expect(screen.getAllByText('17800.00亿')).toHaveLength(2);
  });

  it('关键词防抖与快捷条件形成完整查询 Body，筛选变化重置到第一页', async () => {
    const { user } = renderWithProviders(<StockView />);
    await screen.findByText('贵州茅台');

    await user.type(screen.getByPlaceholderText('搜索代码 / 名称 / 拼音'), ' 茅台 ');
    await waitFor(
      () => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: '茅台' })),
      { timeout: 1500 }
    );

    await user.click(screen.getByText('高流动性'));
    await user.click(screen.getByText('百亿以上'));
    await user.click(screen.getByText('高股息'));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          minAmount: 100000,
          minTotalMv: 1000000,
          minDvTtm: 0.03,
        })
      )
    );

    await user.click(screen.getByText('清空全部'));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ minAmount: expect.anything() })
      )
    );
  });

  it('排序、翻页和跨行选择会更新查询或批量目标', async () => {
    const { user } = renderWithProviders(<StockView />);
    await screen.findByText('贵州茅台');

    await user.click(screen.getByText('总市值'));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'totalMv', sortOrder: 'asc', page: 1 })
      )
    );

    await user.click(screen.getByTitle('Go to next page'));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    );

    await user.click(screen.getByRole('checkbox', { name: '选择 贵州茅台' }));
    expect(screen.getByText('已选 1 只')).toBeInTheDocument();
    await user.click(screen.getByText('加入自选股', { selector: 'button' }));
    expect(screen.getByText('批量目标：600519.SH')).toBeInTheDocument();
  });

  it('列表失败时可重试；空结果支持清空筛选与进入选股器', async () => {
    mocks.list
      .mockRejectedValueOnce(new Error('股票列表服务不可用'))
      .mockResolvedValueOnce({ page: 1, pageSize: 20, total: 0, items: [] });
    const { user } = renderWithProviders(<StockView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('股票列表服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('未找到匹配的股票')).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: '打开选股器' }));
    expect(screen.getByText('选股器已打开')).toBeInTheDocument();
  });
});
