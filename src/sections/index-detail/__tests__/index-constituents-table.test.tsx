import type { IndexConstituentItem, IndexConstituentResult } from 'src/api/index-detail';

import { act, screen, within, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { IndexConstituentsTable } from '../index-constituents-table';

const fetchIndexConstituents = vi.hoisted(() => vi.fn());

vi.mock('src/api/index-detail', () => ({ fetchIndexConstituents }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function constituent(overrides: Partial<IndexConstituentItem> = {}): IndexConstituentItem {
  return {
    tsCode: '600519.SH',
    name: '贵州茅台',
    industry: '白酒',
    weight: 5.25,
    close: 1420.5,
    pctChg: 1.2,
    totalMv: 178000000,
    circMv: 178000000,
    ...overrides,
  };
}

function result(items: IndexConstituentItem[]): IndexConstituentResult {
  return {
    tsCode: '000300.SH',
    name: '沪深300',
    tradeDate: '20260812',
    totalCount: items.length,
    constituents: items,
  };
}

describe('IndexConstituentsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => vi.useRealTimers());

  it('按 Body 查询、格式化交易日与空值，并回传完整成分股', async () => {
    const items = [
      constituent(),
      constituent({
        tsCode: '000001.SZ',
        name: '平安银行',
        industry: '',
        weight: null,
        close: null,
        pctChg: null,
        totalMv: null,
        circMv: null,
      }),
    ];
    const onDataLoaded = vi.fn();
    fetchIndexConstituents.mockResolvedValue(result(items));

    renderWithProviders(
      <IndexConstituentsTable tsCode="000300.SH" onDataLoaded={onDataLoaded} />
    );

    expect(fetchIndexConstituents).toHaveBeenCalledWith({ index_code: '000300.SH' });
    expect(await screen.findByText('贵州茅台')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-12/)).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '600519.SH' })).toHaveAttribute(
      'href',
      '/stock/detail?code=600519.SH'
    );
    expect(within(screen.getByText('平安银行').closest('tr')!).getAllByText('-')).toHaveLength(6);
    expect(onDataLoaded).toHaveBeenNthCalledWith(1, []);
    expect(onDataLoaded).toHaveBeenLastCalledWith(items);
  });

  it('搜索防抖、行业筛选和权重排序共同作用，并支持空结果', async () => {
    vi.useFakeTimers();
    fetchIndexConstituents.mockResolvedValue(
      result([
        constituent({ tsCode: '000001.SZ', name: '平安银行', industry: '银行', weight: 2 }),
        constituent({ tsCode: '600036.SH', name: '招商银行', industry: '银行', weight: 4 }),
        constituent({ tsCode: '600519.SH', name: '贵州茅台', industry: '白酒', weight: 8 }),
      ])
    );
    renderWithProviders(<IndexConstituentsTable tsCode="000300.SH" />);

    await act(async () => Promise.resolve());
    expect(screen.getByText('贵州茅台')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('搜索代码/名称'), {
      target: { value: '银行' },
    });
    expect(screen.getByText('贵州茅台')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('贵州茅台')).not.toBeInTheDocument();
    expect(screen.getByText('平安银行')).toBeInTheDocument();
    expect(screen.getByText('招商银行')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('搜索代码/名称'), { target: { value: '不存在' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText('暂无数据')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('搜索代码/名称'), { target: { value: '' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByText('权重（%）'));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(rows[1]).getByText('平安银行')).toBeInTheDocument();
  });

  it('失败时清空旧数据并允许重试恢复', async () => {
    fetchIndexConstituents
      .mockRejectedValueOnce(new Error('成分股服务不可用'))
      .mockResolvedValueOnce(result([constituent()]));
    const onDataLoaded = vi.fn();
    const { user } = renderWithProviders(
      <IndexConstituentsTable tsCode="000300.SH" onDataLoaded={onDataLoaded} />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('成分股服务不可用');
    expect(onDataLoaded).toHaveBeenCalledWith([]);
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('贵州茅台')).toBeInTheDocument();
    expect(fetchIndexConstituents).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onDataLoaded).toHaveBeenLastCalledWith([constituent()]));
  });
});
