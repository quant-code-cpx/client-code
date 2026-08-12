import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { QuoteText } from '../quote-text';

describe('QuoteText', () => {
  it('renders positive ratio returns as percentages', () => {
    renderWithProviders(<QuoteText value={0.2341} />);

    expect(screen.getByText('+23.4%')).toBeInTheDocument();
  });

  it('renders negative ratio returns as percentages', () => {
    renderWithProviders(<QuoteText value={-0.1523} />);

    expect(screen.getByText('-15.2%')).toBeInTheDocument();
  });
});
