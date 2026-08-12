/** @vitest-environment jsdom */

import type { PropsWithChildren } from 'react';
import type { WalkForwardRunSummary } from 'src/api/backtest';

import { useLocation } from 'react-router';
import { screen } from '@testing-library/react';
import { it, vi, expect, describe } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';

import { WalkForwardListTable } from '../walk-forward-list-table';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const run: WalkForwardRunSummary = {
  wfRunId: 'wf-run-1',
  name: '滚动窗口验证',
  baseStrategyType: 'FACTOR_RANKING',
  windowMode: 'ROLLING',
  status: 'COMPLETED',
  fullStartDate: '20250101',
  fullEndDate: '20251231',
  oosSharpeRatio: 1.2,
  oosAnnualizedReturn: 0.12,
  oosMaxDrawdown: -0.08,
  wfe: 0.7,
  robustnessLevel: 'GREEN',
  progress: 100,
  createdAt: '2026-08-01T00:00:00Z',
  completedAt: '2026-08-01T00:05:00Z',
};

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

describe('WalkForwardListTable accessibility', () => {
  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('opens a run from the keyboard with %s', async (_, key) => {
    const { user } = renderWithProviders(
      <>
        <WalkForwardListTable rows={[run]} loading={false} />
        <LocationProbe />
      </>,
      { initialEntries: ['/backtest/walk-forward'] }
    );

    const rowLink = screen.getByRole('link', {
      name: '查看 Walk-Forward 任务：滚动窗口验证',
    });
    await user.tab();

    expect(rowLink).toHaveFocus();
    await user.keyboard(key);

    expect(screen.getByTestId('location')).toHaveTextContent('/backtest/walk-forward/wf-run-1');
  });

  it('keeps the row action keyboard-operable without opening the run', async () => {
    const { user } = renderWithProviders(
      <>
        <WalkForwardListTable rows={[run]} loading={false} />
        <LocationProbe />
      </>,
      { initialEntries: ['/backtest/walk-forward'] }
    );

    const moreButton = screen.getByRole('button', { name: '更多操作：滚动窗口验证' });
    await user.tab();
    await user.tab();

    expect(moreButton).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/backtest/walk-forward');
    expect(screen.getByRole('menuitem', { name: '复制任务 ID' })).toBeVisible();
  });
});
