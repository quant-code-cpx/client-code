/** @vitest-environment jsdom */

import { useLocation } from 'react-router';
import { it, expect, describe } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { DashboardQuickNav } from '../dashboard-quick-nav';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('DashboardQuickNav', () => {
  it('exposes each quick-navigation card as a keyboard-operable link', async () => {
    const { user } = renderWithProviders(
      <>
        <DashboardQuickNav />
        <LocationProbe />
      </>
    );
    const link = screen.getByRole('link', { name: '前往自选股' });

    await user.tab();
    expect(link).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/research/watchlist');
  });
});
