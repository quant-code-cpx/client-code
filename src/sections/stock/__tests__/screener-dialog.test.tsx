import type { ScreenerPreset, ScreenerStrategy, StockScreenerItem } from 'src/api/screener';

import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ScreenerDialog } from '../screener-dialog';

const apiMocks = vi.hoisted(() => ({
  fetchAreas: vi.fn(),
  fetchScreener: vi.fn(),
  createStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  fetchIndustries: vi.fn(),
  fetchStrategies: vi.fn(),
  fetchScreenerPresets: vi.fn(),
  fetchScreenerConcepts: vi.fn(),
}));

vi.mock('src/api/screener', () => apiMocks);

const resultItems: StockScreenerItem[] = [
  {
    tsCode: '000001.SZ',
    name: '平安银行',
    industry: '银行',
    market: '主板',
    listDate: '1991-04-03',
    close: 12.34,
    pctChg: 1.25,
    amount: 456789,
    turnoverRate: 6.42,
    peTtm: 8.8,
    pb: 0.9,
    dvTtm: 3.2,
    totalMv: 1230000,
    circMv: 980000,
    revenueYoy: 12,
    netprofitYoy: 18,
    roe: 11,
    grossMargin: 45,
    netMargin: 25,
    debtToAssets: 55,
    currentRatio: 1.2,
    quickRatio: 1.1,
    ocfToNetprofit: 0.95,
    mainNetInflow5d: 12000,
    mainNetInflow20d: 25000,
    latestFinDate: '2026-06-30',
    psTtm: 2.1,
    buySignalCount: 2,
    buySignals: ['MACD_GOLDEN_CROSS', 'MA_BULLISH'],
    concepts: ['中特估'],
  },
  {
    tsCode: '600519.SH',
    name: '贵州茅台',
    industry: '白酒',
    market: '主板',
    listDate: '2001-08-27',
    close: 1400,
    pctChg: -0.5,
    amount: 300000,
    turnoverRate: 0.8,
    peTtm: 22,
    pb: 7,
    dvTtm: 2.8,
    totalMv: 176000000,
    circMv: 176000000,
    revenueYoy: 8,
    netprofitYoy: 9,
    roe: 25,
    grossMargin: 90,
    netMargin: 50,
    debtToAssets: 13,
    currentRatio: 6,
    quickRatio: 5,
    ocfToNetprofit: 1.1,
    mainNetInflow5d: null,
    mainNetInflow20d: null,
    latestFinDate: '2026-06-30',
    psTtm: 10,
    buySignalCount: 0,
    buySignals: [],
    concepts: ['白酒'],
  },
];

const presetNames = [
  '全市场买入信号排行',
  '低估值蓝筹',
  '高成长',
  '优质白马',
  '高股息',
  '小盘成长',
  '主力资金流入',
  '北向资金重仓',
  '技术突破',
  '超跌反弹',
  '低 PS 高成长',
];

const presets: ScreenerPreset[] = presetNames.map((name, index) => ({
  id: `preset-${index}`,
  name,
  description: name,
  filters:
    name === '高股息'
      ? { minDvTtm: 3, maxPeTtm: 20, sortBy: 'dvTtm', sortOrder: 'desc' }
      : {},
}));

const historicalStrategy: ScreenerStrategy = {
  id: 7,
  name: '历史策略',
  description: '含兼容键',
  filters: { industry: '银行', minCircMv: 100000 },
  sortBy: 'roe',
  sortOrder: 'desc',
  type: 'user',
  createdAt: '2026-08-01',
  updatedAt: '2026-08-08',
};

function ReopenHarness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        重开选股器
      </button>
      <ScreenerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.fetchScreener.mockResolvedValue({
    page: 1,
    pageSize: 20,
    total: 2,
    items: resultItems,
  });
  apiMocks.fetchScreenerPresets.mockResolvedValue({ presets });
  apiMocks.fetchStrategies.mockResolvedValue({ strategies: [historicalStrategy] });
  apiMocks.fetchIndustries.mockResolvedValue({ industries: [{ name: '银行', count: 10 }] });
  apiMocks.fetchAreas.mockResolvedValue({ areas: [{ name: '深圳', count: 10 }] });
  apiMocks.fetchScreenerConcepts.mockResolvedValue({ concepts: [] });
  apiMocks.deleteStrategy.mockResolvedValue({ message: 'ok' });
});

describe('ScreenerDialog 请求与快照', () => {
  it('首次打开只发一次默认结果请求，并按服务端顺序保留集合与详情入口', async () => {
    renderWithProviders(<ScreenerDialog open onClose={vi.fn()} />);

    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1));
    expect(apiMocks.fetchScreener).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });
    const links = await screen.findAllByRole('link', { name: '个股详情' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/stock/detail?code=000001.SZ',
      '/stock/detail?code=600519.SH',
    ]);
    expect(screen.getByText(/只股票/)).toBeInTheDocument();
  });

  it('草稿修改不自动请求，执行后重开复用同一 Body 与结果证据快照', async () => {
    const { user } = renderWithProviders(<ReopenHarness />);
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText('北向资金'));
    await user.click(screen.getByRole('switch', { name: '仅显示北向持仓股' }));
    expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1);
    expect(screen.getByText('条件已修改，结果待更新')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '开始选股' }));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(2));
    expect(apiMocks.fetchScreener).toHaveBeenLastCalledWith({
      northboundOnly: true,
      page: 1,
      pageSize: 20,
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });
    expect(await screen.findAllByText('服务端已校验')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '关闭' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '重开选股器' }));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(3));
    expect(apiMocks.fetchScreener).toHaveBeenLastCalledWith({
      northboundOnly: true,
      page: 1,
      pageSize: 20,
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });
  });

  it('显示全部 11 个预设，并使用预设声明排序且只请求一次', async () => {
    const { user } = renderWithProviders(<ScreenerDialog open onClose={vi.fn()} />);
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1));
    for (const name of presetNames) expect(await screen.findByText(name)).toBeInTheDocument();

    await user.click(screen.getByText('高股息'));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(2));
    expect(apiMocks.fetchScreener).toHaveBeenLastCalledWith({
      minDvTtm: 3,
      maxPeTtm: 20,
      page: 1,
      pageSize: 20,
      sortBy: 'dvTtm',
      sortOrder: 'desc',
    });
  });

  it('重开后保留非默认预设的排序和结果查询快照', async () => {
    const { user } = renderWithProviders(<ReopenHarness />);
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText('高股息'));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(2));
    expect(apiMocks.fetchScreener).toHaveBeenLastCalledWith({
      minDvTtm: 3,
      maxPeTtm: 20,
      page: 1,
      pageSize: 20,
      sortBy: 'dvTtm',
      sortOrder: 'desc',
    });

    await user.click(screen.getByRole('button', { name: '关闭' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '重开选股器' }));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(3));
    expect(apiMocks.fetchScreener).toHaveBeenLastCalledWith({
      minDvTtm: 3,
      maxPeTtm: 20,
      page: 1,
      pageSize: 20,
      sortBy: 'dvTtm',
      sortOrder: 'desc',
    });
  });
});

describe('ScreenerDialog 策略删除', () => {
  it('取消确认零删除请求，确认后只删除一次', async () => {
    const { user } = renderWithProviders(
      <ScreenerDialog open onClose={vi.fn()} />
    );
    await user.click(await screen.findByRole('button', { name: '管理策略 历史策略' }));
    await user.click(screen.getByRole('menuitem', { name: '删除' }));
    expect(screen.getByText('确定删除“历史策略”吗？此操作不可恢复。')).toBeInTheDocument();
    expect(apiMocks.deleteStrategy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(apiMocks.deleteStrategy).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '删除选股策略' })).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: '管理策略 历史策略' }));
    await user.click(screen.getByRole('menuitem', { name: '删除' }));
    await user.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() => expect(apiMocks.deleteStrategy).toHaveBeenCalledTimes(1));
    expect(apiMocks.deleteStrategy).toHaveBeenCalledWith(7);
  });
});
