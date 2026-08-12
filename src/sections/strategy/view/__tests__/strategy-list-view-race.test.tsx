import type { ReactNode } from 'react';
import type { Strategy, ListStrategiesResponse } from 'src/api/strategy';

import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '@testing-library/react';

const { mockListStrategies } = vi.hoisted(() => ({
  mockListStrategies: vi.fn(),
}));

vi.mock('src/api/strategy', () => ({
  cloneStrategy: vi.fn(),
  createStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  listStrategies: mockListStrategies,
}));

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/sections/strategy/components/strategy-summary-bar', () => ({
  StrategySummaryBar: () => null,
}));
vi.mock('src/sections/strategy/strategy-list-toolbar', () => ({
  StrategyListToolbar: ({
    onFilterChange,
  }: {
    onFilterChange: (patch: { keyword?: string; view?: 'card' | 'table' }) => void;
  }) => (
    <>
      <button type="button" onClick={() => onFilterChange({ keyword: 'alpha' })}>
        筛选 alpha
      </button>
      <button type="button" onClick={() => onFilterChange({ view: 'table' })}>
        切换视图
      </button>
    </>
  ),
}));
vi.mock('src/sections/strategy/strategy-card', () => ({
  StrategyCard: ({ strategy }: { strategy: Strategy }) => <div>{strategy.name}</div>,
}));
vi.mock('src/sections/strategy/components/strategy-table', () => ({
  StrategyTable: ({ strategies }: { strategies: Strategy[] }) => (
    <div>{strategies.map((strategy) => strategy.name).join(',')}</div>
  ),
}));
vi.mock('src/sections/strategy/strategy-clone-dialog', () => ({
  StrategyCloneDialog: () => null,
}));
vi.mock('src/sections/strategy/strategy-create-dialog', () => ({
  StrategyCreateDialog: () => null,
}));
vi.mock('src/sections/strategy/strategy-delete-dialog', () => ({
  StrategyDeleteDialog: () => null,
}));

import { StrategyListView } from '../strategy-list-view';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function strategyFixture(id: string, name: string): Strategy {
  return {
    id,
    name,
    userId: 1,
    description: null,
    strategyType: 'multi-factor',
    strategyConfig: {},
    backtestDefaults: null,
    tags: [],
    version: 1,
    isPublic: false,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
}

function response(items: Strategy[], total = items.length, page = 1): ListStrategiesResponse {
  return { strategies: items, total, page, pageSize: 12 };
}

describe('StrategyListView request coordination', () => {
  it('首屏、分页和筛选各请求一次，并忽略较晚返回的旧页结果', async () => {
    const pageTwo = deferred<ListStrategiesResponse>();
    const filtered = deferred<ListStrategiesResponse>();
    mockListStrategies
      .mockResolvedValueOnce(response([strategyFixture('initial', '初始策略')], 25))
      .mockReturnValueOnce(pageTwo.promise)
      .mockReturnValueOnce(filtered.promise);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StrategyListView />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockListStrategies).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('初始策略')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(mockListStrategies).toHaveBeenCalledTimes(2));
    expect(mockListStrategies).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));

    await user.click(screen.getByRole('button', { name: '筛选 alpha' }));
    await waitFor(() => expect(mockListStrategies).toHaveBeenCalledTimes(3));
    expect(mockListStrategies).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: 'alpha', page: 1 })
    );

    await act(async () => {
      filtered.resolve(response([strategyFixture('latest', '最新筛选结果')]));
      await filtered.promise;
    });
    expect(await screen.findByText('最新筛选结果')).toBeInTheDocument();

    await act(async () => {
      pageTwo.resolve(response([strategyFixture('stale', '过期第二页')], 25, 2));
      await pageTwo.promise;
    });
    expect(screen.getByText('最新筛选结果')).toBeInTheDocument();
    expect(screen.queryByText('过期第二页')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '切换视图' }));
    await waitFor(() => expect(screen.getByText('最新筛选结果')).toBeInTheDocument());
    expect(mockListStrategies).toHaveBeenCalledTimes(3);
  });
});
