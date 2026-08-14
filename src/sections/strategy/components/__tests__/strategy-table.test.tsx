import type { ReactNode } from 'react';
import type { Strategy } from 'src/api/strategy';

import { screen, within } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

vi.mock('src/routes/components', () => ({ RouterLink: 'a' }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { StrategyTable } from '../strategy-table';

function strategy(
  id: string,
  name: string,
  patch: Partial<Strategy> = {}
): Strategy {
  return {
    id,
    userId: 1,
    name,
    description: null,
    strategyType: 'MA_CROSS_SINGLE',
    strategyConfig: {},
    backtestDefaults: null,
    tags: [],
    version: 1,
    isPublic: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...patch,
  };
}

const alpha = strategy('alpha', 'Alpha', {
  version: 3,
  hasActiveSignal: true,
  updatedAt: '2026-08-12T00:00:00.000Z',
  lastRunSummary: {
    runId: 'run-alpha',
    runAt: '2026-08-12T00:00:00.000Z',
    totalReturn: 0.12,
    sharpeRatio: 1.5,
    maxDrawdown: -0.08,
    status: 'COMPLETED',
  },
});
const beta = strategy('beta', 'Beta', {
  strategyType: 'FUTURE_TYPE',
  version: 2,
  updatedAt: '2026-08-11T00:00:00.000Z',
  lastRunSummary: {
    runId: 'run-beta',
    runAt: '2026-08-11T00:00:00.000Z',
    totalReturn: -0.04,
    sharpeRatio: null,
    maxDrawdown: null,
    status: 'COMPLETED',
  },
});
const gamma = strategy('gamma', 'Gamma', {
  version: 1,
  updatedAt: '2026-08-09T00:00:00.000Z',
});

function rowNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent);
}

describe('StrategyTable', () => {
  it('默认按更新时间降序，null 指标保留占位并透传未知类型', () => {
    renderWithProviders(
      <StrategyTable strategies={[gamma, alpha, beta]} onView={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} />
    );

    expect(rowNames()).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(screen.getByText('FUTURE_TYPE')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    const betaRow = screen.getByText('Beta').closest('tr');
    expect(betaRow).not.toBeNull();
    expect(within(betaRow as HTMLElement).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('名称列首次降序、再次升序；收益降序时 null 始终在有值之后', async () => {
    const { user } = renderWithProviders(
      <StrategyTable strategies={[gamma, alpha, beta]} onView={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /名称/ }));
    expect(rowNames()).toEqual(['Gamma', 'Beta', 'Alpha']);
    await user.click(screen.getByRole('button', { name: /名称/ }));
    expect(rowNames()).toEqual(['Alpha', 'Beta', 'Gamma']);

    await user.click(screen.getByRole('button', { name: /近一次收益/ }));
    expect(rowNames()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('名称链接和三个操作按钮传递准确策略对象/ID', async () => {
    const onView = vi.fn();
    const onClone = vi.fn();
    const onDelete = vi.fn();
    const { user } = renderWithProviders(
      <StrategyTable strategies={[alpha]} onView={onView} onClone={onClone} onDelete={onDelete} />
    );
    const row = screen.getByText('Alpha').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByRole('link', { name: 'Alpha' })).toHaveAttribute(
      'href',
      '/strategy/alpha'
    );

    await user.click(within(row as HTMLElement).getByRole('button', { name: '查看策略' }));
    await user.click(within(row as HTMLElement).getByRole('button', { name: '克隆策略' }));
    await user.click(within(row as HTMLElement).getByRole('button', { name: '删除策略' }));
    expect(onView).toHaveBeenCalledWith('alpha');
    expect(onClone).toHaveBeenCalledWith(alpha);
    expect(onDelete).toHaveBeenCalledWith(alpha);
  });
});
