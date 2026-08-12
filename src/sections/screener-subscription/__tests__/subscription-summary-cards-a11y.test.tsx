import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SubscriptionSummaryCards } from '../subscription-summary-cards';

// ----------------------------------------------------------------------

describe('SubscriptionSummaryCards accessibility', () => {
  it('changes the status filter from the keyboard', () => {
    const onStatusFilterChange = vi.fn();

    renderWithProviders(
      <SubscriptionSummaryCards
        subscriptions={[]}
        loading={false}
        statusFilter="ALL"
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    const activeCard = screen.getByRole('button', { name: '活跃订阅：0' });
    expect(activeCard).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(activeCard, { key: ' ' });

    expect(onStatusFilterChange).toHaveBeenCalledWith('ACTIVE');
  });
});
