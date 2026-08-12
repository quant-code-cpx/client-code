import { it, vi, expect, describe, beforeEach } from 'vitest';

import { factorApi, getFactorAttribution, precomputeCustomFactor } from '../factor';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

describe('factorApi.detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards AbortSignal so route changes can cancel the request', async () => {
    const controller = new AbortController();
    mockPost().mockResolvedValueOnce({});

    await factorApi.detail('momentum_20d', controller.signal);

    expect(mockPost()).toHaveBeenCalledWith(
      '/api/factor/detail',
      { factorName: 'momentum_20d' },
      controller.signal
    );
  });
});

describe('factor analysis API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the required tradeDate when precomputing a custom factor', async () => {
    mockPost().mockResolvedValueOnce({});

    await precomputeCustomFactor({ name: 'custom_momentum', tradeDate: '20260810' });

    expect(mockPost()).toHaveBeenCalledWith('/api/factor/custom/precompute', {
      name: 'custom_momentum',
      tradeDate: '20260810',
    });
  });

  it('maps the attribution run identifier to the backend id field', async () => {
    mockPost().mockResolvedValueOnce({});

    await getFactorAttribution({ id: 'run-1' });

    expect(mockPost()).toHaveBeenCalledWith('/api/factor/backtest/attribution', { id: 'run-1' });
  });
});
