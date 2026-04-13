/**
 * Module C — WatchlistAddStockDialog 添加股票
 *
 * C-1: 股票代码格式校验（前端）
 * C-2: 目标价负数校验
 * C-3: 重复添加同一股票（API 报错时对话框行为）
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import { addStock } from 'src/api/watchlist';
import { theme } from 'src/test/test-utils';

import { WatchlistAddStockDialog } from '../watchlist-add-stock-dialog';

// ─── Mock API ────────────────────────────────────────────────────────────────

vi.mock('src/api/watchlist', () => ({
  addStock: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog(props: { onClose?: () => void; onSuccess?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn();
  const onSuccess = props.onSuccess ?? vi.fn();
  return {
    user: userEvent.setup(),
    onClose,
    onSuccess,
    ...render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistAddStockDialog
            open={true}
            watchlistId={1}
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

// ─── Module C-1: 股票代码格式校验 ─────────────────────────────────────────────

describe('C-1: 股票代码格式校验', () => {
  /**
   * ⚠️ P1 BUG（缺失功能）: 当前代码只检查非空（!tsCode.trim()），
   * 无格式校验，"600519" 这样的纯数字代码会直接被发送给后端。
   *
   * 业务规格：A 股代码必须形如 XXXXXX.SH 或 XXXXXX.SZ。
   *
   * 注：MUI TextField required 字段的 label 带 aria-hidden 星号，需使用 findByRole 查询。
   *
   * 预期结果：此测试当前应当失败（API 被调用，错误未被拦截）。
   */
  it('C-1-a [BUG]: 纯数字代码"600519"（无市场后缀）应显示格式错误，不调用 API', async () => {
    const { user } = renderDialog();

    // 等待 MUI Dialog Portal 渲染，使用 accessible name 避免 required 星号干扰
    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });

    await user.type(tscodeInput, '600519');
    await user.click(screen.getByRole('button', { name: '添加' }));

    // 期望：显示格式错误提示
    expect(
      screen.getByText(/格式.*不.*正确|无效.*代码|请输入.*格式|XXXXXX\.S[HZ]/i)
    ).toBeInTheDocument();
    // 期望：API 未被调用
    expect(vi.mocked(addStock)).not.toHaveBeenCalled();
  });

  it('C-1-b: 格式正确 "600519.SH" 正常提交，API 收到大写代码', async () => {
    vi.mocked(addStock).mockResolvedValue({
      id: 1, tsCode: '600519.SH', notes: null, tags: [], targetPrice: null,
      sortOrder: 1, addedAt: '', updatedAt: '', quote: null,
    });
    const { user } = renderDialog();

    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });

    await user.type(tscodeInput, '600519.sh'); // 小写输入
    await user.click(screen.getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(vi.mocked(addStock)).toHaveBeenCalledWith(
        expect.objectContaining({ tsCode: '600519.SH' }) // toUpperCase
      );
    });
  });

  it('C-1-c: 含前后空格 "  600519.SH  " 经 trim 后合法，正常提交', async () => {
    vi.mocked(addStock).mockResolvedValue({
      id: 1, tsCode: '600519.SH', notes: null, tags: [], targetPrice: null,
      sortOrder: 1, addedAt: '', updatedAt: '', quote: null,
    });
    const { user } = renderDialog();

    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });

    await user.type(tscodeInput, '  600519.SH  ');
    await user.click(screen.getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(vi.mocked(addStock)).toHaveBeenCalledWith(
        expect.objectContaining({ tsCode: '600519.SH' })
      );
    });
  });
});

// ─── Module C-2: 目标价负数校验 ───────────────────────────────────────────────

describe('C-2: 目标价负数校验', () => {
  /**
   * ⚠️ P1 BUG（缺失功能）: 当前代码只检查 isNaN，负数 parseFloat(-10) = -10，
   * !isNaN(-10) = true，所以 -10 会被作为 targetPrice 发送。
   *
   * 业务规格：目标价必须为非负数。
   *
   * 预期结果：此测试当前应当失败（API 收到了 -10）。
   */
  it('C-2-a [BUG]: 目标价 = -10 应显示校验错误，不调用 API', async () => {
    const { user } = renderDialog();

    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });
    await user.type(tscodeInput, '600519.SH');
    await user.type(screen.getByRole('spinbutton', { name: '目标价' }), '-10');
    await user.click(screen.getByRole('button', { name: '添加' }));

    // 期望：显示负数校验错误
    expect(
      screen.getByText(/目标价.*不.*为负|价格.*大于.*0|请输入.*正数/i)
    ).toBeInTheDocument();
    // 期望：API 未被调用
    expect(vi.mocked(addStock)).not.toHaveBeenCalled();
  });

  it('C-2-b: 目标价 = 0 时（0 是有效值）正常提交', async () => {
    vi.mocked(addStock).mockResolvedValue({
      id: 1, tsCode: '600519.SH', notes: null, tags: [], targetPrice: 0,
      sortOrder: 1, addedAt: '', updatedAt: '', quote: null,
    });
    const { user } = renderDialog();

    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });
    await user.type(tscodeInput, '600519.SH');
    await user.type(screen.getByRole('spinbutton', { name: '目标价' }), '0');
    await user.click(screen.getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(vi.mocked(addStock)).toHaveBeenCalledWith(
        expect.objectContaining({ targetPrice: 0 })
      );
    });
  });

  it('C-2-c: 目标价留空时，API 收到 targetPrice=undefined（不传）', async () => {
    vi.mocked(addStock).mockResolvedValue({
      id: 1, tsCode: '600519.SH', notes: null, tags: [], targetPrice: null,
      sortOrder: 1, addedAt: '', updatedAt: '', quote: null,
    });
    const { user } = renderDialog();

    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });
    await user.type(tscodeInput, '600519.SH');
    // 不填目标价
    await user.click(screen.getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(vi.mocked(addStock)).toHaveBeenCalledWith(
        expect.objectContaining({ targetPrice: undefined })
      );
    });
  });
});

// ─── Module C-3: 重复添加同一股票（API 报错时对话框行为）─────────────────────

describe('C-3: API 报错时对话框不关闭', () => {
  it('C-3-a: API 返回"股票已存在"错误时，对话框保持打开并显示错误', async () => {
    vi.mocked(addStock).mockRejectedValue(new Error('股票已存在'));
    const onSuccess = vi.fn();

    const { user } = renderDialog({ onSuccess });

    const tscodeInput = await screen.findByRole('textbox', { name: '股票代码' });
    await user.type(tscodeInput, '600519.SH');
    await user.click(screen.getByRole('button', { name: '添加' }));

    // 期望：对话框保持打开，显示错误信息
    await waitFor(() => expect(screen.getByText('股票已存在')).toBeInTheDocument());

    // 期望：onSuccess 未被调用（对话框未关闭）
    expect(onSuccess).not.toHaveBeenCalled();

    // 期望：股票代码输入框仍然存在（对话框未关闭）
    expect(screen.getByRole('textbox', { name: '股票代码' })).toBeInTheDocument();
  });
});
