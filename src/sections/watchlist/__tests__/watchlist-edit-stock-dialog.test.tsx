/**
 * Module F — WatchlistEditStockDialog 编辑股票
 *
 * F-1: 打开对话框时数据正确填充
 * F-2: tags 解析的边界条件
 */

import type { WatchlistStock } from 'src/api/watchlist';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import { updateStock } from 'src/api/watchlist';
import { theme } from 'src/test/test-utils';

import { WatchlistEditStockDialog } from '../watchlist-edit-stock-dialog';

// ─── Mock API ────────────────────────────────────────────────────────────────

vi.mock('src/api/watchlist', () => ({
  updateStock: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStock(overrides: Partial<WatchlistStock> = {}): WatchlistStock {
  return {
    id: 1,
    tsCode: '600519.SH',
    notes: null,
    tags: [],
    targetPrice: null,
    sortOrder: 1,
    addedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    quote: null,
    ...overrides,
  };
}

function renderDialog(stock: WatchlistStock | null, onSuccess = vi.fn()) {
  return {
    user: userEvent.setup(),
    onSuccess,
    ...render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistEditStockDialog
            open={stock !== null}
            stock={stock}
            watchlistId={1}
            onClose={vi.fn()}
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

// ─── Module F-1: 打开对话框时数据正确填充 ─────────────────────────────────────

describe('F-1: 打开对话框时数据填充', () => {
  it('F-1-a: tags 数组 ["白酒","消费"] 渲染为 "白酒, 消费"', async () => {
    const stock = makeStock({ tags: ['白酒', '消费'] });
    renderDialog(stock);

    await waitFor(() => {
      const input = screen.getByLabelText('标签（逗号分隔）') as HTMLInputElement;
      expect(input.value).toBe('白酒, 消费');
    });
  });

  it('F-1-b: targetPrice = null 时，价格输入框为空', async () => {
    const stock = makeStock({ targetPrice: null });
    renderDialog(stock);

    await waitFor(() => {
      const input = screen.getByLabelText('目标价') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  it('F-1-c: targetPrice = 0（有效值）时，输入框显示"0"，不为空', async () => {
    const stock = makeStock({ targetPrice: 0 });
    renderDialog(stock);

    await waitFor(() => {
      const input = screen.getByLabelText('目标价') as HTMLInputElement;
      expect(input.value).toBe('0');
    });
  });

  it('F-1-d: notes = null 时，备注输入框为空', async () => {
    const stock = makeStock({ notes: null });
    renderDialog(stock);

    await waitFor(() => {
      const input = screen.getByLabelText('备注') as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });
  });

  it('F-1-e: notes 有值时，备注输入框显示该值', async () => {
    const stock = makeStock({ notes: '长期持有' });
    renderDialog(stock);

    await waitFor(() => {
      const input = screen.getByLabelText('备注') as HTMLTextAreaElement;
      expect(input.value).toBe('长期持有');
    });
  });
});

// ─── Module F-2: tags 解析的边界条件 ─────────────────────────────────────────

describe('F-2: tags 解析边界条件', () => {
  beforeEach(() => {
    vi.mocked(updateStock).mockResolvedValue(makeStock());
  });

  it('F-2-a: 标签含前后空格应被 trim，API 收到干净的 tags 数组', async () => {
    const stock = makeStock({ tags: ['白酒', '消费'] });
    const { user } = renderDialog(stock);

    await waitFor(() => screen.getByLabelText('标签（逗号分隔）'));

    // 清空并重新输入含空格的标签
    await user.clear(screen.getByLabelText('标签（逗号分隔）'));
    await user.type(screen.getByLabelText('标签（逗号分隔）'), '  白酒 , 消费  ');

    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(vi.mocked(updateStock)).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['白酒', '消费'] })
      );
    });
  });

  it('F-2-b: 清空标签输入框后，API 收到 tags = []', async () => {
    const stock = makeStock({ tags: ['白酒'] });
    const { user } = renderDialog(stock);

    await waitFor(() => screen.getByLabelText('标签（逗号分隔）'));

    await user.clear(screen.getByLabelText('标签（逗号分隔）'));

    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(vi.mocked(updateStock)).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [] })
      );
    });
  });

  it('F-2-c: 只有逗号的标签输入 ",," 经 filter(Boolean) 后 API 收到 tags = []', async () => {
    const stock = makeStock();
    const { user } = renderDialog(stock);

    await waitFor(() => screen.getByLabelText('标签（逗号分隔）'));

    await user.type(screen.getByLabelText('标签（逗号分隔）'), ',,');

    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(vi.mocked(updateStock)).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [] })
      );
    });
  });
});
