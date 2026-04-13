import { http, HttpResponse } from 'msw';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { server } from 'src/test/mocks/server';
import { renderWithTheme } from 'src/test/test-utils';

import { StockSearchAutocomplete } from '../stock-search-autocomplete';

// ----------------------------------------------------------------------

describe('StockSearchAutocomplete — initial render', () => {
  it('renders the input with default placeholder', () => {
    renderWithTheme(<StockSearchAutocomplete onChange={() => {}} />);
    expect(screen.getByPlaceholderText('输入股票代码或名称...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    renderWithTheme(
      <StockSearchAutocomplete onChange={() => {}} placeholder="搜索股票" />
    );
    expect(screen.getByPlaceholderText('搜索股票')).toBeInTheDocument();
  });

  it('does not show loading spinner on initial render', () => {
    renderWithTheme(<StockSearchAutocomplete onChange={() => {}} />);
    // MUI CircularProgress has role="progressbar"
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('StockSearchAutocomplete — search debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call API when input is empty', async () => {
    let apiCallCount = 0;
    server.use(
      http.post('/api/stock/search', () => {
        apiCallCount += 1;
        return HttpResponse.json({ code: 0, data: { total: 0, items: [] } });
      })
    );

    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderWithTheme(<StockSearchAutocomplete onChange={() => {}} />);
    const input = screen.getByPlaceholderText('输入股票代码或名称...');

    await user.click(input);
    // No typing = no API call
    expect(apiCallCount).toBe(0);
  });

  it('shows search results after debounce delay', async () => {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderWithTheme(<StockSearchAutocomplete onChange={() => {}} />);
    const input = screen.getByPlaceholderText('输入股票代码或名称...');

    await user.type(input, '平安');
    act(() => vi.advanceTimersByTime(350));

    await waitFor(() => {
      expect(screen.queryByText(/平安银行/)).toBeInTheDocument();
    });
  });

  it('clears options when input is cleared', async () => {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderWithTheme(<StockSearchAutocomplete onChange={() => {}} />);
    const input = screen.getByPlaceholderText('输入股票代码或名称...');

    await user.type(input, '平安');
    act(() => vi.advanceTimersByTime(350));
    await waitFor(() => {
      expect(screen.queryByText(/平安银行/)).toBeInTheDocument();
    });

    await user.clear(input);
    act(() => vi.advanceTimersByTime(10));
    // Dropdown should close / options list cleared
    expect(screen.queryByText(/平安银行/)).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('StockSearchAutocomplete — selection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onChange when an option is selected', async () => {
    const onChangeMock = vi.fn();
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderWithTheme(<StockSearchAutocomplete onChange={onChangeMock} />);
    const input = screen.getByPlaceholderText('输入股票代码或名称...');

    await user.type(input, '平安');
    act(() => vi.advanceTimersByTime(350));

    await waitFor(() => {
      expect(screen.queryByText('平安银行')).toBeInTheDocument();
    });

    const option = screen.getByText('平安银行');
    await user.click(option);

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({ tsCode: '000001.SZ', name: '平安银行' })
    );
  });
});

// ----------------------------------------------------------------------

describe('StockSearchAutocomplete — error handling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears options gracefully on API error', async () => {
    server.use(
      http.post('/api/stock/search', () => new HttpResponse(null, { status: 500 }))
    );

    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderWithTheme(<StockSearchAutocomplete onChange={() => {}} />);
    const input = screen.getByPlaceholderText('输入股票代码或名称...');

    await user.type(input, '银行');
    act(() => vi.advanceTimersByTime(350));

    // After error, no options should show and no crash
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
});
