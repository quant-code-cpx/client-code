/**
 * Module E — WatchlistDetailPanel 详情面板
 *
 * E-1: 搜索后全选再清空搜索，选择状态跨搜索保持
 * E-2: 批量/单个删除错误处理（无 try-catch Bug）
 * E-3: 排序乐观更新与回滚
 */

import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import { removeStock, reorderStocks, batchRemoveStocks } from 'src/api/watchlist';
import { theme } from 'src/test/test-utils';

import { WatchlistDetailPanel } from '../watchlist-detail-panel';

// ─── Mock API ────────────────────────────────────────────────────────────────

vi.mock('src/api/watchlist', () => ({
  removeStock: vi.fn(),
  batchRemoveStocks: vi.fn(),
  reorderStocks: vi.fn(),
  updateStock: vi.fn(),
}));

// ─── Mock heavy DnD-based sub-components ─────────────────────────────────────

vi.mock('../watchlist-stock-table', () => ({
  WatchlistStockTable: ({ stocks, loading, selectedIds, onSelectAll, onSelect, onRemove, onReorder }: any) =>
    loading ? (
      <div data-testid="table-loading">加载中...</div>
    ) : (
      <div data-testid="stock-table">
        <input
          type="checkbox"
          data-testid="select-all"
          checked={stocks.length > 0 && selectedIds.length === stocks.length}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelectAll(e.target.checked)}
          aria-label="全选"
          readOnly={false}
        />
        {(stocks as WatchlistStock[]).map((s) => (
          <div key={s.id} data-testid={`row-${s.id}`}>
            <input
              type="checkbox"
              data-testid={`check-${s.id}`}
              checked={selectedIds.includes(s.id)}
              onChange={() => onSelect(s.id)}
              aria-label={`选择 ${s.tsCode}`}
              readOnly={false}
            />
            <span data-testid={`code-${s.id}`}>{s.tsCode}</span>
            <button data-testid={`btn-remove-${s.id}`} onClick={() => onRemove(s.id)}>删除</button>
          </div>
        ))}
        {(stocks as WatchlistStock[]).length >= 2 && (
          <button
            data-testid="btn-trigger-reorder"
            onClick={() => {
              const reversed = [...stocks].reverse() as WatchlistStock[];
              onReorder(reversed);
            }}
          >
            触发排序
          </button>
        )}
      </div>
    ),
}));

vi.mock('../watchlist-edit-stock-dialog', () => ({
  WatchlistEditStockDialog: () => null,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWatchlist(id: number): WatchlistOverviewItem {
  return {
    id,
    name: '测试自选组',
    description: null,
    isDefault: false,
    sortOrder: id,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    _count: { stocks: 0 },
    summary: null,
  };
}

function makeStock(id: number, tsCode: string): WatchlistStock {
  return {
    id,
    tsCode,
    notes: null,
    tags: [],
    targetPrice: null,
    sortOrder: id,
    addedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    quote: null,
  };
}

type PanelProps = {
  stocks?: WatchlistStock[];
  onRemoveStock?: (id: number) => void;
  onBatchRemoveStocks?: (ids: number[]) => void;
  onReorderStocks?: (reordered: WatchlistStock[]) => void;
};

function renderPanel(props: PanelProps = {}) {
  const stocks = props.stocks ?? [];
  const onRemoveStock = props.onRemoveStock ?? vi.fn();
  const onBatchRemoveStocks = props.onBatchRemoveStocks ?? vi.fn();
  const onReorderStocks = props.onReorderStocks ?? vi.fn();

  return {
    user: userEvent.setup(),
    onRemoveStock,
    onBatchRemoveStocks,
    onReorderStocks,
    ...render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistDetailPanel
            watchlist={makeWatchlist(1)}
            stocks={stocks}
            stocksLoading={false}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onAddStock={vi.fn()}
            onBatchImport={vi.fn()}
            onUpdateStock={vi.fn()}
            onRemoveStock={onRemoveStock}
            onBatchRemoveStocks={onBatchRemoveStocks}
            onReorderStocks={onReorderStocks}
          />
        </ThemeProvider>
      </MemoryRouter>
    ),
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(removeStock).mockResolvedValue({ message: 'ok' });
  vi.mocked(batchRemoveStocks).mockResolvedValue({ message: 'ok' });
  vi.mocked(reorderStocks).mockResolvedValue({ message: 'ok' });
});

// ─── Module E-1: 搜索后全选，清空搜索选择状态保持 ─────────────────────────────

describe('E-1: 搜索与全选状态', () => {
  it('E-1-a: 搜索"600"全选后清空搜索，这些股票仍显示为已选中', async () => {
    const s1 = makeStock(1, '600519.SH');
    const s2 = makeStock(2, '600036.SH');
    const s3 = makeStock(3, '000858.SZ');
    const { user } = renderPanel({ stocks: [s1, s2, s3] });

    // 在搜索框中输入 "600"（过滤后只显示 s1, s2）
    const searchInput = screen.getByPlaceholderText('搜索股票代码...');
    await user.type(searchInput, '600');

    // 全选（当前过滤结果中的 s1, s2）
    await user.click(screen.getByTestId('select-all'));

    // 清空搜索（显示所有 3 支）
    await user.clear(searchInput);

    // 期望：s1 和 s2 的 checkbox 仍为选中状态
    await waitFor(() => {
      expect(screen.getByTestId('check-1')).toBeChecked();
      expect(screen.getByTestId('check-2')).toBeChecked();
    });
    // s3 未被选中（在搜索过滤时不在视图内）
    expect(screen.getByTestId('check-3')).not.toBeChecked();
  });

  it('E-1-b: 搜索"600"全选后改搜索"000"，批量删除按钮仍显示已选数量', async () => {
    const s1 = makeStock(1, '600519.SH');
    const s2 = makeStock(2, '600036.SH');
    const s3 = makeStock(3, '000858.SZ');
    const { user } = renderPanel({ stocks: [s1, s2, s3] });

    const searchInput = screen.getByPlaceholderText('搜索股票代码...');
    await user.type(searchInput, '600');

    await user.click(screen.getByTestId('select-all'));

    // 改变搜索词
    await user.clear(searchInput);
    await user.type(searchInput, '000');

    // 期望：toolbar 仍显示已选 2 个
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /批量删除.*2/ })
      ).toBeInTheDocument();
    });
  });
});

// ─── Module E-2: 批量/单个删除错误处理 ───────────────────────────────────────

describe('E-2: 删除错误处理', () => {
  /**
   * ⚠️ P0 BUG: handleBatchRemove 无 try-catch，batchRemoveStocks 抛出时：
   * 1. onBatchRemoveStocks 不会被调用（stocks 不变，这是期望的）
   * 2. 但也没有任何错误提示给用户（这是 Bug）
   *
   * 预期结果：此测试当前应当失败（找不到错误文本，因为组件没有渲染错误信息）。
   */
  it('E-2-a [BUG]: 批量删除 API 失败时，显示错误信息，stocks 不变', async () => {
    // Suppress unhandled rejection noise from missing try-catch
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(batchRemoveStocks).mockRejectedValue(new Error('批量删除失败'));

    const s1 = makeStock(1, '600519.SH');
    const s2 = makeStock(2, '000858.SZ');
    const s3 = makeStock(3, '300750.SZ');
    const onBatchRemoveStocks = vi.fn();

    const { user } = renderPanel({ stocks: [s1, s2, s3], onBatchRemoveStocks });

    // 全选
    await user.click(screen.getByTestId('select-all'));
    await waitFor(() => expect(screen.getByRole('button', { name: /批量删除/ })).toBeInTheDocument());

    // 点击批量删除
    await user.click(screen.getByRole('button', { name: /批量删除/ }));

    // onBatchRemoveStocks 不应被调用（API 失败，不应移除数据）
    await waitFor(() => {
      expect(onBatchRemoveStocks).not.toHaveBeenCalled();
    });

    // 期望：显示错误信息
    // 实际（Bug）：组件无 try-catch，没有 error 状态，不渲染错误文本
    expect(screen.getByText('批量删除失败')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  /**
   * ⚠️ P0 BUG: handleRemoveStock 同样无 try-catch，单个删除失败时无错误提示。
   *
   * 预期结果：此测试当前应当失败（找不到错误文本）。
   */
  it('E-2-b [BUG]: 单个删除 API 失败时，显示错误信息，该行股票不消失', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(removeStock).mockRejectedValue(new Error('删除失败'));

    const s1 = makeStock(1, '600519.SH');
    const onRemoveStock = vi.fn();

    const { user } = renderPanel({ stocks: [s1], onRemoveStock });

    await user.click(screen.getByTestId('btn-remove-1'));

    // onRemoveStock 不应被调用（API 失败）
    await waitFor(() => {
      expect(onRemoveStock).not.toHaveBeenCalled();
    });

    // 期望：显示错误信息
    // 实际（Bug）：无 try-catch，无错误状态
    expect(screen.getByText('删除失败')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

// ─── Module E-3: 排序乐观更新与回滚 ───────────────────────────────────────────

describe('E-3: 排序乐观更新与回滚', () => {
  it('E-3-a: reorderStocks 成功后，新顺序通过 onReorderStocks 通知父级', async () => {
    const s1 = makeStock(1, '600519.SH');
    const s2 = makeStock(2, '000858.SZ');
    vi.mocked(reorderStocks).mockResolvedValue({ message: 'ok' });

    const onReorderStocks = vi.fn();
    const { user } = renderPanel({ stocks: [s1, s2], onReorderStocks });

    await user.click(screen.getByTestId('btn-trigger-reorder'));

    // 乐观更新立即通知父级（反转后 [s2, s1]）
    expect(onReorderStocks).toHaveBeenCalledWith([s2, s1]);

    // API 随后被调用
    await waitFor(() => {
      expect(vi.mocked(reorderStocks)).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ id: s2.id }),
          expect.objectContaining({ id: s1.id }),
        ])
      );
    });
  });

  it('E-3-b: reorderStocks API 失败时，通过 onReorderStocks 回滚至原顺序', async () => {
    const s1 = makeStock(1, '600519.SH');
    const s2 = makeStock(2, '000858.SZ');
    vi.mocked(reorderStocks).mockRejectedValue(new Error('排序保存失败'));

    const onReorderStocks = vi.fn();
    const { user } = renderPanel({ stocks: [s1, s2], onReorderStocks });

    await user.click(screen.getByTestId('btn-trigger-reorder'));

    // 第一次调用：乐观更新（反转后 [s2, s1]）
    expect(onReorderStocks).toHaveBeenNthCalledWith(1, [s2, s1]);

    // 第二次调用：回滚至原顺序 [s1, s2]
    await waitFor(() => {
      expect(onReorderStocks).toHaveBeenNthCalledWith(2, [s1, s2]);
    });
  });
});
