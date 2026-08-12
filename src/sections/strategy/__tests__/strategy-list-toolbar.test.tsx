import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StrategyListToolbar } from '../strategy-list-toolbar';

describe('StrategyListToolbar', () => {
  const emptyFilter = {
    strategyType: '',
    keyword: '',
    tags: [],
    view: 'card' as const,
    minTotalReturn: '',
    minSharpeRatio: '',
    hasActiveSignal: false,
  };

  it('gives the icon-only view buttons accessible names', () => {
    renderWithProviders(
      <StrategyListToolbar
        filter={emptyFilter}
        allTags={[]}
        isFiltered={false}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('group', { name: '策略列表视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '卡片视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '表格视图' })).toBeInTheDocument();
  });

  it('重置会同步清空输入，并取消尚未提交的关键词', () => {
    vi.useFakeTimers();
    const onFilterChange = vi.fn();
    const onReset = vi.fn();

    renderWithProviders(
      <StrategyListToolbar
        filter={emptyFilter}
        allTags={[]}
        isFiltered
        onFilterChange={onFilterChange}
        onReset={onReset}
      />
    );

    const input = screen.getByPlaceholderText('搜索策略名称或描述');
    fireEvent.change(input, { target: { value: '动量' } });
    expect(input).toHaveValue('动量');

    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(input).toHaveValue('');
    expect(onReset).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(300);
    expect(onFilterChange).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('URL 关键词变化时同步更新输入框', () => {
    const { rerender } = renderWithProviders(
      <StrategyListToolbar
        filter={emptyFilter}
        allTags={[]}
        isFiltered={false}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    rerender(
      <StrategyListToolbar
        filter={{ ...emptyFilter, keyword: '价值' }}
        allTags={[]}
        isFiltered
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText('搜索策略名称或描述')).toHaveValue('价值');
  });

  it('标签 Chip 保留索引属性与键盘删除行为', () => {
    const onFilterChange = vi.fn();

    renderWithProviders(
      <StrategyListToolbar
        filter={{ ...emptyFilter, tags: ['价值'] }}
        allTags={['价值']}
        isFiltered
        onFilterChange={onFilterChange}
        onReset={vi.fn()}
      />
    );

    const chip = screen.getByText('价值').closest<HTMLElement>('.MuiChip-root');
    expect(chip).toHaveAttribute('data-item-index', '0');

    fireEvent.focus(chip!);
    fireEvent.keyUp(chip!, { key: 'Delete' });

    expect(onFilterChange).toHaveBeenCalledWith({ tags: [] });
  });
});
