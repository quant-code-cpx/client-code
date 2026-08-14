import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { WatchlistDetailPanel } from '../watchlist-detail-panel';

const apiMocks = vi.hoisted(() => ({
  removeStock: vi.fn(),
  reorderStocks: vi.fn(),
  batchRemoveStocks: vi.fn(),
}));

vi.mock('src/api/watchlist', () => apiMocks);
vi.mock('src/sections/watchlist/watchlist-stock-toolbar', () => ({
  WatchlistStockToolbar: ({
    selectedCount,
    search,
    onSearchChange,
    onBatchRemove,
  }: {
    selectedCount: number;
    search: string;
    onSearchChange: (value: string) => void;
    onBatchRemove: () => void;
  }) => (
    <div>
      <input
        aria-label="搜索自选股"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <button type="button" onClick={onBatchRemove}>
        批量移除 {selectedCount}
      </button>
    </div>
  ),
}));
vi.mock('src/sections/watchlist/watchlist-stock-table', () => ({
  WatchlistStockTable: ({
    stocks,
    loading,
    dragDisabled,
    emptyText,
    onSelect,
    onEdit,
    onRemove,
    onReorder,
  }: {
    stocks: WatchlistStock[];
    loading: boolean;
    dragDisabled: boolean;
    emptyText: string;
    onSelect: (id: number) => void;
    onEdit: (targetStock: WatchlistStock) => void;
    onRemove: (targetStock: WatchlistStock) => void;
    onReorder: (stocks: WatchlistStock[]) => void;
  }) => (
    <div data-testid="stock-table">
      {loading ? 'loading' : stocks.map((item) => item.tsCode).join(',') || emptyText}
      <span>{dragDisabled ? 'drag-disabled' : 'drag-enabled'}</span>
      {stocks[0] ? (
        <>
          <button type="button" onClick={() => onSelect(stocks[0].id)}>
            选择第一行
          </button>
          <button type="button" onClick={() => onEdit(stocks[0])}>
            编辑第一行
          </button>
          <button type="button" onClick={() => onRemove(stocks[0])}>
            移除第一行
          </button>
          <button type="button" onClick={() => onReorder([...stocks].reverse())}>
            反转排序
          </button>
        </>
      ) : null}
    </div>
  ),
}));
vi.mock('src/sections/watchlist/watchlist-edit-stock-dialog', () => ({
  WatchlistEditStockDialog: ({
    open,
    stock: targetStock,
    onSuccess,
  }: {
    open: boolean;
    stock: WatchlistStock | null;
    onSuccess: (updatedStock: WatchlistStock) => void;
  }) =>
    open && targetStock ? (
      <button type="button" onClick={() => onSuccess({ ...targetStock, notes: '已更新' })}>
        保存股票修改
      </button>
    ) : null,
}));
vi.mock('src/components/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    title,
    content,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    content: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {content}
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

const watchlist: WatchlistOverviewItem = {
  id: 7,
  name: '核心持仓',
  description: '长期跟踪',
  isDefault: true,
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  summary: null,
};

function stock(overrides: Partial<WatchlistStock> = {}): WatchlistStock {
  return {
    id: 1,
    tsCode: '600519.SH',
    stockName: '贵州茅台',
    industry: '白酒',
    area: '贵州',
    notes: '消费龙头',
    tags: ['长期'],
    targetPrice: 100,
    sortOrder: 0,
    addedAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    quote: {
      close: 120,
      pctChg: 1,
      vol: null,
      amount: null,
      pe: null,
      pb: null,
      totalMv: null,
      tradeDate: '20260812',
    },
    ...overrides,
  };
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof WatchlistDetailPanel>> = {}) {
  const props: React.ComponentProps<typeof WatchlistDetailPanel> = {
    watchlist,
    stocks: [
      stock(),
      stock({
        id: 2,
        tsCode: '000001.SZ',
        stockName: '平安银行',
        notes: null,
        tags: [],
        quote: null,
      }),
    ],
    stocksLoading: false,
    statusFilter: 'all',
    onStatusFilterChange: vi.fn(),
    onAddStock: vi.fn(),
    onUpdateStock: vi.fn(),
    onRemoveStock: vi.fn(),
    onBatchRemoveStocks: vi.fn(),
    onReorderStocks: vi.fn(),
    onNotify: vi.fn(),
    ...overrides,
  };
  return { props, ...renderWithProviders(<WatchlistDetailPanel {...props} />) };
}

describe('WatchlistDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.removeStock.mockResolvedValue({ message: 'ok' });
    apiMocks.batchRemoveStocks.mockResolvedValue({ message: 'ok' });
    apiMocks.reorderStocks.mockResolvedValue({ message: 'ok' });
  });

  it('搜索覆盖代码/名称/行业/地域/备注/标签，空结果有筛选语义', () => {
    renderPanel();

    fireEvent.change(screen.getByRole('textbox', { name: '搜索自选股' }), {
      target: { value: '长期' },
    });
    expect(screen.getByTestId('stock-table')).toHaveTextContent('600519.SH');
    expect(screen.getByTestId('stock-table')).not.toHaveTextContent('000001.SZ');
    expect(screen.getByText(/已筛选 1 \/ 2/)).toBeInTheDocument();
    expect(screen.getByTestId('stock-table')).toHaveTextContent('drag-disabled');

    fireEvent.change(screen.getByRole('textbox', { name: '搜索自选股' }), {
      target: { value: '不存在' },
    });
    expect(screen.getByTestId('stock-table')).toHaveTextContent('当前筛选条件下没有股票');
  });

  it('状态筛选按目标触达、行情缺失和正常独立计算', () => {
    const hitView = renderPanel({ statusFilter: 'hit' });
    expect(screen.getByTestId('stock-table')).toHaveTextContent('600519.SH');
    expect(screen.getByTestId('stock-table')).not.toHaveTextContent('000001.SZ');

    hitView.unmount();
    renderPanel({ statusFilter: 'missing' });
    expect(screen.getByTestId('stock-table')).toHaveTextContent('000001.SZ');
    expect(screen.getByTestId('stock-table')).not.toHaveTextContent('600519.SH');
  });

  it('单只删除与编辑使用当前组/股票标识并反馈成功', async () => {
    const { props, user } = renderPanel();
    await user.click(screen.getByRole('button', { name: '移除第一行' }));
    expect(screen.getByRole('dialog', { name: '移除股票' })).toHaveTextContent(
      '从「核心持仓」移除 600519.SH'
    );
    await user.click(screen.getByRole('button', { name: '移除' }));

    await waitFor(() => expect(apiMocks.removeStock).toHaveBeenCalledWith(7, 1));
    expect(props.onRemoveStock).toHaveBeenCalledWith(1);
    expect(props.onNotify).toHaveBeenCalledWith('success', '已从「核心持仓」移除 600519.SH');

    await user.click(screen.getByRole('button', { name: '编辑第一行' }));
    await user.click(screen.getByRole('button', { name: '保存股票修改' }));
    expect(props.onUpdateStock).toHaveBeenCalledWith(expect.objectContaining({ notes: '已更新' }));
    expect(props.onNotify).toHaveBeenCalledWith('success', '股票已更新');
  });

  it('批量删除发送选中 ID；排序失败先乐观更新再完整回滚', async () => {
    const { props, user } = renderPanel();
    await user.click(screen.getByRole('button', { name: '选择第一行' }));
    await user.click(screen.getByRole('button', { name: '批量移除 1' }));
    expect(screen.getByRole('dialog', { name: '批量移除' })).toHaveTextContent('600519.SH');
    await user.click(screen.getByRole('button', { name: '移除 1 只' }));
    await waitFor(() => expect(apiMocks.batchRemoveStocks).toHaveBeenCalledWith(7, [1]));
    expect(props.onBatchRemoveStocks).toHaveBeenCalledWith([1]);

    apiMocks.reorderStocks.mockRejectedValueOnce(new Error('排序写入失败'));
    await user.click(screen.getByRole('button', { name: '反转排序' }));
    await waitFor(() => expect(apiMocks.reorderStocks).toHaveBeenCalled());
    expect(apiMocks.reorderStocks).toHaveBeenCalledWith(7, [
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ]);
    expect(props.onReorderStocks).toHaveBeenCalledTimes(2);
    expect(props.onReorderStocks).toHaveBeenLastCalledWith(props.stocks);
    expect(props.onNotify).toHaveBeenCalledWith('error', '排序写入失败');
  });
});
