import type { ScreenerResult } from 'src/api/screener';

import userEvent from '@testing-library/user-event';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockScreenerView } from '../view/stock-screener-view';

const apiMocks = vi.hoisted(() => ({
  fetchAreas: vi.fn().mockResolvedValue({ areas: [] }),
  fetchScreener: vi.fn(),
  fetchIndustries: vi.fn().mockResolvedValue({ industries: [] }),
  fetchScreenerPresets: vi.fn().mockResolvedValue({ presets: [] }),
  fetchScreenerConcepts: vi.fn().mockResolvedValue({ concepts: [] }),
}));

vi.mock('src/api/screener', () => apiMocks);

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../screener-preset-bar', () => ({ ScreenerPresetBar: () => null }));
vi.mock('../screener-result-toolbar', () => ({ ScreenerResultToolbar: () => null }));
vi.mock('../screener-filter-panel', () => ({
  ScreenerFilterPanel: ({ onSearch }: { onSearch: () => void }) => (
    <button type="button" onClick={onSearch}>
      开始选股
    </button>
  ),
}));
vi.mock('../screener-result-table', () => ({
  ScreenerResultTable: ({
    total,
    onPageChange,
  }: {
    total: number;
    onPageChange: (page: number) => void;
  }) => (
    <div>
      <span data-testid="result-total">{total}</span>
      <button type="button" onClick={() => onPageChange(1)}>
        下一页
      </button>
    </div>
  ),
}));

function result(total: number, page = 1): ScreenerResult {
  return { page, pageSize: 20, total, items: [] };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('StockScreenerView 查询并发', () => {
  beforeEach(() => {
    apiMocks.fetchScreener.mockReset();
  });

  it('旧分页请求晚返回时不会覆盖最新结果', async () => {
    const user = userEvent.setup();
    const first = deferred<ScreenerResult>();
    const second = deferred<ScreenerResult>();
    apiMocks.fetchScreener.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    renderWithProviders(<StockScreenerView />);
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(2));

    await act(async () => second.resolve(result(22, 2)));
    expect(screen.getByTestId('result-total')).toHaveTextContent('22');

    await act(async () => first.resolve(result(11)));
    expect(screen.getByTestId('result-total')).toHaveTextContent('22');
  });

  it('翻页后重新选股只发起一次新查询', async () => {
    const user = userEvent.setup();
    apiMocks.fetchScreener.mockResolvedValue(result(1));

    renderWithProviders(<StockScreenerView />);
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: '开始选股' }));
    await waitFor(() => expect(apiMocks.fetchScreener).toHaveBeenCalledTimes(3));
    expect(apiMocks.fetchScreener).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });
});
