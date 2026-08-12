import type { TradingSignalItem } from 'src/api/signal';

import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SignalDetailPanel } from '../signal-detail-panel';

// ----------------------------------------------------------------------

const holdSignal: TradingSignalItem = {
  tsCode: '600519.SH',
  stockName: '贵州茅台',
  action: 'HOLD',
  targetWeight: null,
  confidence: null,
};

describe('signal clickable target accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('expands and collapses a signal group from the keyboard', () => {
    renderWithProviders(<SignalDetailPanel signals={[holdSignal]} hasPortfolio={false} />);

    const trigger = screen.getByRole('button', { name: '展开HOLD 信号' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: ' ' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
