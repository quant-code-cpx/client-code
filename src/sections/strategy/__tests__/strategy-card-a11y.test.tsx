/** @vitest-environment jsdom */

import type { Strategy } from 'src/api/strategy';

import { vi, expect, describe } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StrategyCard } from '../strategy-card';

const strategy: Strategy = {
  id: 'strategy-1',
  userId: 1,
  name: '动量策略',
  description: '测试策略',
  strategyType: 'FACTOR_RANKING',
  strategyConfig: {},
  backtestDefaults: null,
  tags: [],
  version: 1,
  isPublic: false,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

describe('StrategyCard accessibility', () => {
  it('opens the strategy name with the keyboard and names the row action', async () => {
    const onView = vi.fn();
    const { user } = renderWithProviders(
      <StrategyCard
        strategy={strategy}
        onView={onView}
        onRun={vi.fn()}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onDelete={vi.fn()}
        menuAnchorEl={null}
        menuStrategyId={null}
        onMenuOpen={vi.fn()}
        onMenuClose={vi.fn()}
      />
    );

    const nameButton = screen.getByRole('button', { name: '查看策略：动量策略' });
    await user.tab();
    expect(nameButton).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onView).toHaveBeenCalledWith('strategy-1');
    expect(screen.getByRole('button', { name: '更多操作：动量策略' })).toBeVisible();
  });
});
