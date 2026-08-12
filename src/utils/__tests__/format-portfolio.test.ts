import { it, expect, describe } from 'vitest';

import { getPortfolioValueTone } from '../format-portfolio';

describe('getPortfolioValueTone', () => {
  it('uses A-share red-up green-down semantics', () => {
    expect(getPortfolioValueTone(0.01)).toBe('error.main');
    expect(getPortfolioValueTone(-0.01)).toBe('success.main');
  });

  it('uses neutral tone for zero and missing values', () => {
    expect(getPortfolioValueTone(0)).toBe('text.secondary');
    expect(getPortfolioValueTone(null)).toBe('text.secondary');
    expect(getPortfolioValueTone(undefined)).toBe('text.secondary');
    expect(getPortfolioValueTone(NaN)).toBe('text.secondary');
  });
});
