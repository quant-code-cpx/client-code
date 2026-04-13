/**
 * Module D — WatchlistBatchImportDialog 批量导入
 *
 * D-1: 解析逻辑覆盖（逗号/换行/重复/空白/Tab/大小写）
 * D-2: 计数显示准确性
 */

import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import { batchAddStocks } from 'src/api/watchlist';
import { theme } from 'src/test/test-utils';

import { WatchlistBatchImportDialog } from '../watchlist-batch-import-dialog';

// ─── Mock API ────────────────────────────────────────────────────────────────

vi.mock('src/api/watchlist', () => ({
  batchAddStocks: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog(props: { onSuccess?: (r: { added: number; skipped: number }) => void } = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <WatchlistBatchImportDialog
            open={true}
            watchlistId={1}
            onClose={vi.fn()}
            onSuccess={props.onSuccess ?? vi.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    ),
  };
}

/** 获取股票代码输入文本框 */
function getTextarea() {
  return screen.getByLabelText('股票代码') as HTMLTextAreaElement;
}

/** 通过 fireEvent.change 设置 textarea 值（支持含 Tab 等特殊字符） */
function setTextareaValue(value: string) {
  const textarea = getTextarea();
  fireEvent.change(textarea, { target: { value } });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Module D-1: 解析逻辑 ─────────────────────────────────────────────────────

describe('D-1: 解析逻辑覆盖', () => {
  it('D-1-a: 逗号分隔能正确解析为 3 个代码', () => {
    renderDialog();
    setTextareaValue('600519.SH,000858.SZ,300750.SZ');
    expect(screen.getByText('已识别 3 个股票代码')).toBeInTheDocument();
  });

  it('D-1-b: 换行分隔能正确解析为 3 个代码', () => {
    renderDialog();
    setTextareaValue('600519.SH\n000858.SZ\n300750.SZ');
    expect(screen.getByText('已识别 3 个股票代码')).toBeInTheDocument();
  });

  it('D-1-c: 混合空白行和多余逗号应被过滤，只保留有效代码', () => {
    renderDialog();
    setTextareaValue('600519.SH,,\n\n000858.SZ');
    expect(screen.getByText('已识别 2 个股票代码')).toBeInTheDocument();
  });

  it('D-1-d: 重复代码应去重，最终只保留唯一代码', () => {
    renderDialog();
    setTextareaValue('600519.SH,600519.SH,000858.SZ');
    expect(screen.getByText('已识别 2 个股票代码')).toBeInTheDocument();
  });

  /**
   * ⚠️ P1 BUG: 当前 parsedCodes 使用正则 /[,\n]/ 分割，不包含 \t，
   * 从 Excel 粘贴的 Tab 分隔内容无法正确解析。
   *
   * 预期结果：此测试当前应当失败（Tab 分隔不生效，识别为 1 个代码而非 2 个）。
   */
  it('D-1-e [BUG]: Tab 分隔（从 Excel 粘贴）应被正确分割', () => {
    renderDialog();
    setTextareaValue('600519.SH\t000858.SZ');
    // 期望：2 个代码被识别
    // 实际（Bug）：正则不包含 \t，整个字符串作为 1 个代码（含 Tab），识别为 1 个
    expect(screen.getByText('已识别 2 个股票代码')).toBeInTheDocument();
  });

  it('D-1-f: 输入大小写混合，统一转为大写再解析', () => {
    renderDialog();
    setTextareaValue('600519.sh, 000858.sz');
    // 经 toUpperCase + trim 后为 ['600519.SH', '000858.SZ']
    expect(screen.getByText('已识别 2 个股票代码')).toBeInTheDocument();
  });
});

// ─── Module D-2: 计数显示准确性 ───────────────────────────────────────────────

describe('D-2: 计数显示准确性', () => {
  it('D-2-a: 输入 3 个唯一代码，导入按钮显示"导入 3 支"', () => {
    renderDialog();
    setTextareaValue('600519.SH\n000858.SZ\n300750.SZ');
    expect(screen.getByRole('button', { name: '导入 3 支' })).toBeInTheDocument();
  });

  it('D-2-b: 输入 3 个（含 1 个重复），导入按钮显示去重后"导入 2 支"', () => {
    renderDialog();
    setTextareaValue('600519.SH,600519.SH,000858.SZ');
    expect(screen.getByRole('button', { name: '导入 2 支' })).toBeInTheDocument();
  });

  it('D-2-c: 输入为空时，导入按钮禁用', () => {
    renderDialog();
    const importBtn = screen.getByRole('button', { name: /导入/ });
    expect(importBtn).toBeDisabled();
  });

  it('D-2-d: 导入成功后调用 onSuccess 并传入 added/skipped 数量', async () => {
    vi.mocked(batchAddStocks).mockResolvedValue({ added: 2, skipped: 1 });
    const onSuccess = vi.fn();
    const { user } = renderDialog({ onSuccess });

    setTextareaValue('600519.SH,000858.SZ,300750.SZ');

    await user.click(screen.getByRole('button', { name: '导入 3 支' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ added: 2, skipped: 1 });
    });
  });
});
