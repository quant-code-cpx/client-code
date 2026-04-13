/**
 * Module B — WatchlistEditDialog 编辑对话框
 *
 * B-1: 对话框关闭后脏状态清除
 * B-2: 名称空值保护
 */

import type { Watchlist } from 'src/api/watchlist';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import { updateWatchlist } from 'src/api/watchlist';
import { theme } from 'src/test/test-utils';

import { WatchlistEditDialog } from '../watchlist-edit-dialog';

// ─── Mock API ────────────────────────────────────────────────────────────────

vi.mock('src/api/watchlist', () => ({
  updateWatchlist: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWatchlist(id: number, name: string, isDefault = false): Watchlist {
  return {
    id,
    name,
    description: null,
    isDefault,
    sortOrder: id,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    _count: { stocks: 0 },
  };
}

function renderDialog(props: {
  open: boolean;
  watchlist: Watchlist | null;
  onClose?: () => void;
  onSuccess?: (updated: Watchlist) => void;
}) {
  const onClose = props.onClose ?? vi.fn();
  const onSuccess = props.onSuccess ?? vi.fn();
  return {
    user: userEvent.setup(),
    onClose,
    onSuccess,
    ...render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistEditDialog
            open={props.open}
            watchlist={props.watchlist}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </ThemeProvider>
      </MemoryRouter>
    ),
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Module B-1: 对话框关闭后脏状态清除 ───────────────────────────────────────

describe('B-1: 对话框关闭后脏状态清除', () => {
  /**
   * 当 MUI Dialog 关闭时（open: false），若使用默认 keepMounted=false，
   * 子组件会被卸载，state 被销毁。重新打开时 useEffect([watchlist]) 重跑，
   * 表单重置为原始值。此测试验证该重置机制是否有效。
   *
   * 若 keepMounted=true 或同一对象引用导致 useEffect 未重跑，则表单会保留脏状态 → 测试失败。
   *
   * 注：MUI TextField required 字段的 label 带 aria-hidden 星号，需使用 getByRole 查询。
   */
  it('B-1-a: 修改名称后关闭（不保存），再次打开应显示原始名称', async () => {
    const wlA = makeWatchlist(1, '我的股票');
    const onClose = vi.fn();

    const { user, rerender } = renderDialog({ open: true, watchlist: wlA, onClose });

    // 等待对话框渲染（MUI Dialog 使用 Portal，需等待）
    const nameInput = await screen.findByRole('textbox', { name: '名称' });
    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe('我的股票');
    });

    // 清空名称并输入脏值
    await user.clear(nameInput);
    await user.type(nameInput, 'XYZ');
    expect((nameInput as HTMLInputElement).value).toBe('XYZ');

    // 点击取消，关闭对话框
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // 模拟父组件关闭对话框（watchlist → null）
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistEditDialog
            open={false}
            watchlist={null}
            onClose={onClose}
            onSuccess={vi.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    // 模拟再次打开（使用相同 wlA 对象引用）
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistEditDialog
            open={true}
            watchlist={wlA}
            onClose={onClose}
            onSuccess={vi.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    // 期望：名称重置为原始值 "我的股票"
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: '名称' }) as HTMLInputElement).value).toBe(
        '我的股票'
      );
    });
  });

  it('B-1-b: 切换为不同 watchlist 时，表单重置为新 watchlist 的数据', async () => {
    const wlA = makeWatchlist(1, 'A组');
    const wlB = makeWatchlist(2, 'B组');

    const { rerender } = renderDialog({ open: true, watchlist: wlA });

    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: '名称' }) as HTMLInputElement).value).toBe(
        'A组'
      );
    });

    // 切换到 wlB
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistEditDialog
            open={true}
            watchlist={wlB}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    // 期望：名称变为 B 组的名称
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: '名称' }) as HTMLInputElement).value).toBe(
        'B组'
      );
    });
  });
});

// ─── Module B-2: 名称空值保护 ─────────────────────────────────────────────────

describe('B-2: 名称空值保护', () => {
  it('B-2-a: 名称为空字符串，点击保存时显示错误，不调用 API', async () => {
    const wlA = makeWatchlist(1, '我的股票');
    const { user } = renderDialog({ open: true, watchlist: wlA });

    // 等待 MUI Dialog Portal 渲染
    const nameInput = await screen.findByRole('textbox', { name: '名称' });

    // 清空名称字段
    await user.clear(nameInput);

    // 点击保存
    await user.click(screen.getByRole('button', { name: '保存' }));

    // 期望：显示错误提示
    expect(screen.getByText('请输入自选组名称')).toBeInTheDocument();
    // 期望：API 未被调用
    expect(vi.mocked(updateWatchlist)).not.toHaveBeenCalled();
  });

  it('B-2-b: 名称只有空格（trim 后为空），同样报错', async () => {
    const wlA = makeWatchlist(1, '我的股票');
    const { user } = renderDialog({ open: true, watchlist: wlA });

    // 等待 MUI Dialog Portal 渲染
    const nameInput = await screen.findByRole('textbox', { name: '名称' });

    // 将名称替换为纯空格
    await user.clear(nameInput);
    await user.type(nameInput, '   ');

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('请输入自选组名称')).toBeInTheDocument();
    expect(vi.mocked(updateWatchlist)).not.toHaveBeenCalled();
  });
});
