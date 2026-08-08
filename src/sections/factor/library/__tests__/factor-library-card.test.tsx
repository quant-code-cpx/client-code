/** @vitest-environment jsdom */

import type { FactorDef } from 'src/api/factor';

import { it, vi, expect, describe } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useLocation, MemoryRouter } from 'react-router';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

import { FactorLibraryCardV2 } from '../factor-library-card';

const factor: FactorDef = {
  id: 'momentum_20d',
  name: 'momentum_20d',
  label: '20 日动量',
  category: 'MOMENTUM',
  sourceType: 'FIELD_REF',
  isBuiltin: true,
  status: 'HEALTHY',
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('FactorLibraryCardV2', () => {
  it('uses a keyboard-accessible link for main content navigation', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <FactorLibraryCardV2
            factor={factor}
            selected={false}
            onToggleSelect={vi.fn()}
            onOpenDetail={vi.fn()}
          />
          <LocationProbe />
        </MemoryRouter>
      </ThemeProvider>
    );
    const detailLink = screen.getByRole('link', { name: '查看因子 20 日动量 的详情' });

    expect(detailLink).toHaveAttribute('href', '/factor/detail/momentum_20d');
    expect(detailLink.querySelector('button')).toBeNull();
    expect(detailLink.querySelector('input')).toBeNull();

    await user.tab();
    await user.tab();
    await user.tab();

    expect(detailLink).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/factor/detail/momentum_20d');
  });

  it('keeps selection and drawer controls outside the main link', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const onOpenDetail = vi.fn();

    render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <FactorLibraryCardV2
            factor={factor}
            selected={false}
            onToggleSelect={onToggleSelect}
            onOpenDetail={onOpenDetail}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    await user.click(screen.getByRole('checkbox', { name: '选择因子 20 日动量' }));
    await user.click(screen.getByRole('button', { name: '查看详情' }));

    expect(onToggleSelect).toHaveBeenCalledWith(factor);
    expect(onOpenDetail).toHaveBeenCalledWith(factor);
  });
});
