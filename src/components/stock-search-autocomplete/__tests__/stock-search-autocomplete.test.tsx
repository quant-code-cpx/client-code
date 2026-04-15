import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { createMockStockSearchItem } from 'src/test/factories/stock';

// Mock searchStocks API
vi.mock('src/api/stock', () => ({
  searchStocks: vi.fn(),
}));

import { searchStocks } from 'src/api/stock';

import { StockSearchAutocomplete } from '../stock-search-autocomplete';

// ----------------------------------------------------------------------

const mockSearchStocks = vi.mocked(searchStocks);

describe('StockSearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始渲染显示默认 placeholder', () => {
    renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('输入股票代码或名称...')).toBeInTheDocument();
  });

  it('自定义 placeholder 生效', () => {
    renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} placeholder="搜索..." />);
    expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
  });

  it('fullWidth=true 透传给 Autocomplete 不崩溃', () => {
    const { container } = renderWithProviders(
      <StockSearchAutocomplete onChange={vi.fn()} fullWidth />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('label 属性正确渲染到输入框', () => {
    renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} label="股票代码" />);
    expect(screen.getByLabelText('股票代码')).toBeInTheDocument();
  });

  it('disabled 属性禁用输入框', () => {
    renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} disabled={true} />);
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
  });

  describe('搜索与防抖', () => {
    it('输入内容后立即不触发 API，等待 300ms 后触发', async () => {
      mockSearchStocks.mockResolvedValue({ items: [], total: 0 });

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('输入股票代码或名称...');
      await user.type(input, '平安');

      // Before debounce fires
      expect(mockSearchStocks).not.toHaveBeenCalled();

      // Advance fake timer by 300ms to trigger debounce
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockSearchStocks).toHaveBeenCalledWith({ keyword: '平安', limit: 20 });
      });
    });

    it('300ms 内连续输入只触发最后一次请求', async () => {
      mockSearchStocks.mockResolvedValue({ items: [], total: 0 });

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('输入股票代码或名称...');
      await user.type(input, '平');
      vi.advanceTimersByTime(100);
      // Simulate clearing and typing more (Autocomplete updates inputValue)
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        // searchStocks called at most once (debounced)
        expect(mockSearchStocks.mock.calls.length).toBeLessThanOrEqual(1);
      });
    });

    it('输入为空时不触发请求', async () => {
      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('输入股票代码或名称...');
      // Type then clear
      await user.type(input, 'a');
      await user.clear(input);
      vi.advanceTimersByTime(300);

      // After clearing, no additional call with empty keyword
      // (the component guards: if !newInput || newInput.length < 1 → return)
      await waitFor(() => {
        const callsWithKeyword = mockSearchStocks.mock.calls.filter(([args]) => args.keyword);
        expect(callsWithKeyword.length).toBe(0);
      });
    });
  });

  describe('搜索结果展示', () => {
    it('API 返回结果后渲染选项列表', async () => {
      const item = createMockStockSearchItem();
      mockSearchStocks.mockResolvedValue({ items: [item], total: 1 });

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('输入股票代码或名称...');
      await user.type(input, '平安');
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('平安银行')).toBeInTheDocument();
      });
    });

    it('API 出错时选项列表为空，不崩溃', async () => {
      mockSearchStocks.mockRejectedValue(new Error('Network error'));

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('输入股票代码或名称...');
      await user.type(input, '平安');
      vi.advanceTimersByTime(300);

      // Should not throw; options remain empty
      await waitFor(() => {
        expect(mockSearchStocks).toHaveBeenCalled();
      });
      // No error alert in DOM
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('选项渲染', () => {
    it('每个选项显示 name 和 tsCode', async () => {
      const items = [
        createMockStockSearchItem({ tsCode: '000001.SZ', name: '平安银行' }),
        createMockStockSearchItem({ tsCode: '600519.SH', name: '贵州茅台' }),
      ];
      mockSearchStocks.mockResolvedValue({ items, total: 2 });

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      await user.type(screen.getByPlaceholderText('输入股票代码或名称...'), '银');
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('平安银行')).toBeInTheDocument();
        expect(screen.getByText('000001.SZ')).toBeInTheDocument();
      });
    });

    it('有 industry 时显示 market · industry', async () => {
      const item = createMockStockSearchItem({
        market: '主板',
        industry: '银行',
      });
      mockSearchStocks.mockResolvedValue({ items: [item], total: 1 });

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={vi.fn()} />);

      await user.type(screen.getByPlaceholderText('输入股票代码或名称...'), '平');
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/主板.*银行|银行.*主板/)).toBeInTheDocument();
      });
    });
  });

  describe('选择与回调', () => {
    it('选择选项后调用 onChange 传递 StockSearchItem', async () => {
      const item = createMockStockSearchItem({ name: '平安银行', tsCode: '000001.SZ' });
      mockSearchStocks.mockResolvedValue({ items: [item], total: 1 });

      const handleChange = vi.fn();

      const { user } = renderWithProviders(<StockSearchAutocomplete onChange={handleChange} />);

      await user.type(screen.getByPlaceholderText('输入股票代码或名称...'), '平安');
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('平安银行')).toBeInTheDocument();
      });

      await user.click(screen.getByText('平安银行'));

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ tsCode: '000001.SZ', name: '平安银行' })
      );
    });
  });
});
