/**
 * Module A — WatchlistView 状态管理
 *
 * 测试原则：断言来自业务规格，不从实现复制。
 * 标注 [BUG] 的 case 在当前实现下预期失败，正是 Bug-First 测试的目的。
 */

import type { Watchlist, WatchlistOverviewItem } from 'src/api/watchlist';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import {
  addStock,
  deleteWatchlist,
  updateWatchlist,
  getWatchlistStocks,
  getWatchlistOverview,
} from 'src/api/watchlist';
import { theme } from 'src/test/test-utils';

import { WatchlistView } from '../view/watchlist-view';

// ─── Mock API ────────────────────────────────────────────────────────────────

vi.mock('src/api/watchlist', () => ({
  getWatchlistOverview: vi.fn(),
  getWatchlistStocks: vi.fn(),
  deleteWatchlist: vi.fn(),
  updateWatchlist: vi.fn(),
  addStock: vi.fn(),
  batchAddStocks: vi.fn(),
  removeStock: vi.fn(),
  batchRemoveStocks: vi.fn(),
  reorderStocks: vi.fn(),
  createWatchlist: vi.fn(),
}));

// ─── Mock layout ─────────────────────────────────────────────────────────────

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Stub sub-components with data-testid to isolate view state logic ─────────

vi.mock('../watchlist-overview-cards', () => ({
  WatchlistOverviewCards: ({ watchlists, onSelect, onEdit, onDelete, onCreate }: any) => (
    <div data-testid="overview-cards">
      {(watchlists as any[]).map((wl) => (
        <div key={wl.id} data-testid={`card-${wl.id}`}>
          <span data-testid={`card-name-${wl.id}`}>{wl.name}</span>
          {wl.isDefault && <span data-testid={`card-default-${wl.id}`}>默认</span>}
          <span data-testid={`card-count-${wl.id}`}>{wl._count.stocks} 支股票</span>
          <button data-testid={`btn-select-${wl.id}`} onClick={() => onSelect(wl.id)}>select</button>
          <button data-testid={`btn-edit-${wl.id}`} onClick={() => onEdit(wl)}>edit</button>
          <button data-testid={`btn-delete-${wl.id}`} onClick={() => onDelete(wl)}>delete</button>
        </div>
      ))}
      <button data-testid="btn-create" onClick={onCreate}>新建</button>
    </div>
  ),
}));

vi.mock('../watchlist-detail-panel', () => ({
  WatchlistDetailPanel: ({ watchlist, onAddStock }: any) => (
    <div data-testid="detail-panel">
      <span data-testid="panel-watchlist-name">{watchlist.name}</span>
      {watchlist.isDefault && <span data-testid="panel-default-badge">默认</span>}
      <button data-testid="panel-btn-add-stock" onClick={onAddStock}>添加股票</button>
    </div>
  ),
}));

vi.mock('../watchlist-create-dialog', () => ({
  WatchlistCreateDialog: ({ open, onSuccess }: any) =>
    open ? (
      <div data-testid="create-dialog">
        <button
          data-testid="create-confirm"
          onClick={() =>
            onSuccess({
              id: 99,
              name: '新建组',
              description: null,
              isDefault: false,
              sortOrder: 99,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              _count: { stocks: 0 },
            } as Watchlist)
          }
        >
          确认新建
        </button>
      </div>
    ) : null,
}));

vi.mock('../watchlist-edit-dialog', () => ({
  WatchlistEditDialog: ({ open, watchlist, onSuccess }: any) =>
    open && watchlist ? (
      <div data-testid="edit-dialog" data-watchlist-id={watchlist.id}>
        <button
          data-testid="edit-save-as-default"
          onClick={() => onSuccess({ ...watchlist, isDefault: true })}
        >
          保存为默认
        </button>
        <button
          data-testid="edit-save-no-change"
          onClick={() => onSuccess({ ...watchlist })}
        >
          保存不变
        </button>
      </div>
    ) : null,
}));

vi.mock('../watchlist-add-stock-dialog', () => ({
  WatchlistAddStockDialog: ({ open, onSuccess }: any) =>
    open ? (
      <div data-testid="add-stock-dialog">
        <button data-testid="add-stock-confirm" onClick={onSuccess}>确认添加</button>
      </div>
    ) : null,
}));

vi.mock('../watchlist-batch-import-dialog', () => ({
  WatchlistBatchImportDialog: () => null,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWatchlist(id: number, name: string, isDefault: boolean, stockCount = 0): WatchlistOverviewItem {
  return {
    id,
    name,
    description: null,
    isDefault,
    sortOrder: id,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    _count: { stocks: stockCount },
    summary: null,
  };
}

function renderView() {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistView />
        </ThemeProvider>
      </MemoryRouter>
    ),
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWatchlistStocks).mockResolvedValue({ stocks: [] });
  vi.mocked(deleteWatchlist).mockResolvedValue({ message: 'ok' });
  vi.mocked(addStock).mockResolvedValue({
    id: 10, tsCode: '600519.SH', notes: null, tags: [], targetPrice: null,
    sortOrder: 1, addedAt: '', updatedAt: '', quote: null,
  });
  vi.mocked(updateWatchlist).mockResolvedValue({
    id: 1, name: 'mock', description: null, isDefault: false,
    sortOrder: 1, createdAt: '', updatedAt: '', _count: { stocks: 0 },
  });
});

// ─── Module A-1: 初始化自动选中默认组 ─────────────────────────────────────────

describe('A-1: 初始化自动选中默认组', () => {
  it('A-1-a: 有 isDefault 组时，自动激活该组而非第一个', async () => {
    const wlA = makeWatchlist(1, 'A组', false);
    const wlB = makeWatchlist(2, 'B组', true); // isDefault
    const wlC = makeWatchlist(3, 'C组', false);
    vi.mocked(getWatchlistOverview).mockResolvedValue([wlA, wlB, wlC]);

    renderView();

    await waitFor(() => {
      // 应使用 wlB.id=2 去加载股票，而非第一个 wlA.id=1
      expect(vi.mocked(getWatchlistStocks)).toHaveBeenCalledWith(2);
    });
    expect(vi.mocked(getWatchlistStocks)).not.toHaveBeenCalledWith(1);
  });

  it('A-1-b: 无 default 组时，自动激活第一个', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([
      makeWatchlist(1, 'A组', false),
      makeWatchlist(2, 'B组', false),
    ]);

    renderView();

    await waitFor(() => {
      expect(vi.mocked(getWatchlistStocks)).toHaveBeenCalledWith(1);
    });
    expect(vi.mocked(getWatchlistStocks)).not.toHaveBeenCalledWith(2);
  });

  it('A-1-c: 列表为空时，不显示 DetailPanel，不调用 getWatchlistStocks', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([]);

    renderView();

    await waitFor(() => expect(screen.getByText('还没有自选组')).toBeInTheDocument());
    expect(vi.mocked(getWatchlistStocks)).not.toHaveBeenCalled();
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();
  });
});

// ─── Module A-2: 创建自选组后的 UI 一致性 ─────────────────────────────────────

describe('A-2: 创建自选组后的 UI 一致性', () => {
  it('A-2-a: 新建组出现在卡片列表末尾', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([makeWatchlist(1, 'A组', false)]);
    const { user } = renderView();

    await waitFor(() => expect(screen.getByTestId('card-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('btn-create'));
    await waitFor(() => screen.getByTestId('create-confirm'));
    await user.click(screen.getByTestId('create-confirm'));

    await waitFor(() => expect(screen.getByTestId('card-99')).toBeInTheDocument());
    // 原来的 A 组仍然存在
    expect(screen.getByTestId('card-1')).toBeInTheDocument();
  });

  it('A-2-b: 新建组自动被选中（DetailPanel 显示新组名称）', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([makeWatchlist(1, 'A组', false)]);
    const { user } = renderView();

    await waitFor(() => expect(screen.getByTestId('detail-panel')).toBeInTheDocument());

    await user.click(screen.getByTestId('btn-create'));
    await waitFor(() => screen.getByTestId('create-confirm'));
    await user.click(screen.getByTestId('create-confirm'));

    await waitFor(() =>
      expect(screen.getByTestId('panel-watchlist-name')).toHaveTextContent('新建组')
    );
  });

  it('A-2-c: 新建组 _count.stocks=0，卡片显示"0 支股票"不崩溃', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([]);
    const { user } = renderView();

    await waitFor(() => screen.getByText('还没有自选组'));

    await user.click(screen.getByTestId('btn-create'));
    await waitFor(() => screen.getByTestId('create-confirm'));
    await user.click(screen.getByTestId('create-confirm'));

    await waitFor(() =>
      expect(screen.getByTestId('card-count-99')).toHaveTextContent('0 支股票')
    );
  });
});

// ─── Module A-3: 删除自选组后的 UI 行为 ───────────────────────────────────────

describe('A-3: 删除自选组后的 UI 行为', () => {
  /**
   * ⚠️ P0 BUG: handleDelete 在 selectedId === deletedId 时执行 setSelectedId(null)，
   * 导致 DetailPanel 消失，用户必须手动点击另一组。
   * 正确行为应自动选中剩余第一个组。
   *
   * 预期结果：此测试当前应当失败（waitFor timeout，面板不显示）。
   */
  it('A-3-a [BUG]: 删除选中组后自动切换至剩余第一个组', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([
      makeWatchlist(1, 'A组', false),
      makeWatchlist(2, 'B组', false),
    ]);
    const { user } = renderView();

    // A 组被自动选中（首个，无默认）
    await waitFor(() =>
      expect(screen.getByTestId('panel-watchlist-name')).toHaveTextContent('A组')
    );

    // 删除当前选中的 A 组
    await user.click(screen.getByTestId('btn-delete-1'));

    // 期望：面板仍然可见，且自动切换至 B 组
    // 实际（Bug）：selectedId → null，DetailPanel 消失
    await waitFor(() => {
      expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('panel-watchlist-name')).toHaveTextContent('B组');
  });

  it('A-3-b: 删除非选中组，selectedId 不变', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([
      makeWatchlist(1, 'A组', false),
      makeWatchlist(2, 'B组', false),
    ]);
    const { user } = renderView();

    await waitFor(() =>
      expect(screen.getByTestId('panel-watchlist-name')).toHaveTextContent('A组')
    );

    // 删除未选中的 B 组
    await user.click(screen.getByTestId('btn-delete-2'));

    await waitFor(() => expect(screen.queryByTestId('card-2')).not.toBeInTheDocument());
    // A 组仍然选中，面板不变
    expect(screen.getByTestId('panel-watchlist-name')).toHaveTextContent('A组');
  });

  it('A-3-c: 删除最后一个组后显示空状态提示，不崩溃', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([makeWatchlist(1, 'A组', false)]);
    const { user } = renderView();

    await waitFor(() =>
      expect(screen.getByTestId('panel-watchlist-name')).toHaveTextContent('A组')
    );

    await user.click(screen.getByTestId('btn-delete-1'));

    await waitFor(() => expect(screen.getByText('还没有自选组')).toBeInTheDocument());
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();
  });
});

// ─── Module A-4: 编辑自选组—「设为默认」的唯一性 ──────────────────────────────

describe('A-4: 「设为默认」的唯一性', () => {
  /**
   * ⚠️ P0 BUG: handleEditSuccess 只用 spread 更新被编辑的组，
   * 其他组的 isDefault 字段不会被重置为 false，导致多组同时显示"默认"标记。
   *
   * 预期结果：此测试当前应当失败（A 的 card-default-1 仍存在）。
   */
  it('A-4-a [BUG]: 将 B 设为默认后，A 的默认标记应消失', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([
      makeWatchlist(1, 'A组', true), // A 是当前默认
      makeWatchlist(2, 'B组', false),
    ]);
    const { user } = renderView();

    // A 的卡片显示"默认"标记
    await waitFor(() => expect(screen.getByTestId('card-default-1')).toBeInTheDocument());

    // 点击 B 的编辑按钮
    await user.click(screen.getByTestId('btn-edit-2'));
    await waitFor(() => screen.getByTestId('edit-dialog'));

    // 将 B 保存为默认（mock dialog 中 "edit-save-as-default" 按钮调用 onSuccess({ ...B, isDefault: true })）
    await user.click(screen.getByTestId('edit-save-as-default'));

    // 期望：A 的默认标记消失
    // 实际（Bug）：handleEditSuccess 只更新 B，A 的 isDefault 保持 true
    await waitFor(() => {
      expect(screen.queryByTestId('card-default-1')).not.toBeInTheDocument();
    });
  });

  it('A-4-b: 编辑 B 的普通字段（isDefault 不变）不影响 A 的默认标记', async () => {
    vi.mocked(getWatchlistOverview).mockResolvedValue([
      makeWatchlist(1, 'A组', true),
      makeWatchlist(2, 'B组', false),
    ]);
    const { user } = renderView();

    await waitFor(() => expect(screen.getByTestId('card-default-1')).toBeInTheDocument());

    await user.click(screen.getByTestId('btn-edit-2'));
    await waitFor(() => screen.getByTestId('edit-dialog'));

    // 保存 B 时 isDefault 保持 false（mock 使用 "edit-save-no-change"）
    await user.click(screen.getByTestId('edit-save-no-change'));

    // A 仍然显示默认标记
    await waitFor(() => expect(screen.getByTestId('card-default-1')).toBeInTheDocument());
  });
});

// ─── Module A-5: 股票计数实时性 ───────────────────────────────────────────────

describe('A-5: 股票计数实时性', () => {
  /**
   * ⚠️ P1 BUG: handleStockRefresh 只调用 loadStocks，不重新调用 getWatchlistOverview，
   * 导致卡片上的 _count.stocks 无法随添加/删除操作而更新。
   *
   * 预期结果：此测试当前应当失败（卡片计数仍为旧值 3）。
   */
  it('A-5-a [BUG]: 添加股票后，卡片 _count.stocks 应 +1', async () => {
    // 自选组初始显示 3 支股票
    vi.mocked(getWatchlistOverview).mockResolvedValue([makeWatchlist(1, 'A组', false, 3)]);
    const { user } = renderView();

    await waitFor(() =>
      expect(screen.getByTestId('card-count-1')).toHaveTextContent('3 支股票')
    );

    // 点击「添加股票」打开对话框（通过 panel 中的按钮）
    await user.click(screen.getByTestId('panel-btn-add-stock'));
    await waitFor(() => screen.getByTestId('add-stock-dialog'));

    // 确认添加成功 → 触发 onSuccess → view 调用 handleStockRefresh → loadStocks（非 loadOverview）
    await user.click(screen.getByTestId('add-stock-confirm'));

    // 期望：卡片计数更新为 "4 支股票"
    // 实际（Bug）：getWatchlistOverview 未被重新调用，_count.stocks 不更新，仍为 "3 支股票"
    await waitFor(() =>
      expect(screen.getByTestId('card-count-1')).toHaveTextContent('4 支股票')
    );
  });
});
