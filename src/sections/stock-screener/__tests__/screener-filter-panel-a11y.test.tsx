import type { ScreenerFilters } from 'src/api/screener';

import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ScreenerFilterPanel } from '../screener-filter-panel';

describe('ScreenerFilterPanel MUI slot behavior', () => {
  it('keeps Select names and keyboard removal for selected Autocomplete values', () => {
    const filters: ScreenerFilters = { industries: ['银行'] };
    const onChange = vi.fn();

    renderWithProviders(
      <ScreenerFilterPanel
        filters={filters}
        industries={[{ name: '银行', count: 12 }]}
        areas={[]}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('combobox', { name: '交易所' })).toBeInTheDocument();

    const chip = screen.getByText('银行').closest<HTMLElement>('.MuiChip-root');
    expect(chip).toHaveAttribute('data-item-index', '0');

    fireEvent.focus(chip!);
    fireEvent.keyUp(chip!, { key: 'Delete' });

    expect(onChange).toHaveBeenCalledWith({ industries: undefined });
  });
});
