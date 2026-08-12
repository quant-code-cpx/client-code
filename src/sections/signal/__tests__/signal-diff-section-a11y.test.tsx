/** @vitest-environment jsdom */

import type { SignalDiffFromPrev } from 'src/api/signal';

import { expect, describe } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SignalDiffSection } from '../signal-diff-section';

const diff: SignalDiffFromPrev = {
  prevTradeDate: '20260807',
  added: [
    {
      tsCode: '600000.SH',
      stockName: '浦发银行',
      action: 'BUY',
      targetWeight: 0.1,
      confidence: 0.8,
    },
  ],
  removed: [],
  rebalanced: [],
};

describe('SignalDiffSection accessibility', () => {
  it('toggles a diff group with the keyboard and exposes expanded state', async () => {
    const { user } = renderWithProviders(<SignalDiffSection diff={diff} />);

    const toggle = screen.getByRole('button', { name: '收起新进' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard(' ');

    expect(screen.getByRole('button', { name: '展开新进' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
