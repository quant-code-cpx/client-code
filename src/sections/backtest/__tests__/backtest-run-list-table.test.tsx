/** @vitest-environment jsdom */

import type { ReactNode, ComponentProps } from 'react';
import type { BacktestRunListItem } from 'src/api/backtest';

import { vi, it, expect, describe } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { BacktestRunListTable } from '../backtest-run-list-table';

// ----------------------------------------------------------------------

const runningItem: BacktestRunListItem = {
  runId: 'run-1',
  jobId: 'job-1',
  name: '运行中任务',
  strategyType: 'MA_CROSS_SINGLE',
  status: 'RUNNING',
  startDate: '20250101',
  endDate: '20251231',
  benchmarkTsCode: '000300.SH',
  totalReturn: 0.12,
  annualizedReturn: 0.1,
  maxDrawdown: -0.08,
  sharpeRatio: 1.25,
  progress: 40,
  createdAt: '2026-08-13T00:00:00.000Z',
  completedAt: null,
};

const completedItem: BacktestRunListItem = {
  ...runningItem,
  runId: 'run-2',
  jobId: 'job-2',
  name: '已完成任务',
  status: 'COMPLETED',
  progress: 100,
  completedAt: '2026-08-13T00:01:00.000Z',
};

function renderTable(overrides: Partial<ComponentProps<typeof BacktestRunListTable>> = {}) {
  const props: ComponentProps<typeof BacktestRunListTable> = {
    items: [runningItem, completedItem],
    total: 2,
    page: 0,
    pageSize: 20,
    loading: false,
    sort: { field: 'createdAt', order: 'desc' },
    selectedRunIds: [],
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onSort: vi.fn(),
    onToggleSelect: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onView: vi.fn(),
    onCopy: vi.fn(),
    onCancel: vi.fn(),
    onUnsupportedAction: vi.fn(),
    ...overrides,
  };

  return { ...renderWithProviders(<BacktestRunListTable {...props} />), props };
}

describe('BacktestRunListTable', () => {
  it('formats compact run dates before rendering', () => {
    renderTable({ items: [runningItem], total: 1 });

    expect(document.body).toHaveTextContent('2025-01-01');
    expect(document.body).toHaveTextContent('2025-12-31');
    expect(screen.queryByText(/20250101/)).not.toBeInTheDocument();
  });

  it('preserves current-page partial selection, select-all and sorting semantics', async () => {
    const onToggleSelectAll = vi.fn();
    const onToggleSelect = vi.fn();
    const onSort = vi.fn();
    const { user } = renderTable({
      selectedRunIds: [runningItem.runId],
      onToggleSelectAll,
      onToggleSelect,
      onSort,
    });

    const selectAll = screen.getByRole('checkbox', { name: '选择当前页回测任务' });
    expect(selectAll).toHaveAttribute('data-indeterminate', 'true');

    await user.click(selectAll);
    expect(onToggleSelectAll).toHaveBeenCalledWith(['run-1', 'run-2'], true);

    await user.click(screen.getByRole('checkbox', { name: '选择 运行中任务' }));
    expect(onToggleSelect).toHaveBeenCalledWith('run-1');

    await user.click(screen.getByRole('button', { name: '总收益' }));
    expect(onSort).toHaveBeenCalledWith('totalReturn');
  });

  it('preserves view, copy and cancellation actions behind accessible row controls', async () => {
    const onView = vi.fn();
    const onCopy = vi.fn();
    const onCancel = vi.fn();
    const { user } = renderTable({ items: [runningItem], total: 1, onView, onCopy, onCancel });

    await user.click(screen.getByRole('button', { name: '查看' }));
    expect(onView).toHaveBeenCalledWith('run-1');

    const menuButton = screen.getByRole('button', { name: '打开 运行中任务 操作菜单' });
    await user.click(menuButton);
    await user.click(screen.getByRole('menuitem', { name: '复制重跑' }));
    expect(onCopy).toHaveBeenCalledWith(runningItem);

    await waitFor(() => expect(screen.queryByRole('menuitem', { name: '复制重跑' })).toBeNull());
    await user.click(menuButton);
    await user.click(screen.getByRole('menuitem', { name: '取消任务' }));
    expect(onCancel).toHaveBeenCalledWith(runningItem);
  });
});
