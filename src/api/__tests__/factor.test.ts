import { it, vi, expect, describe, beforeEach } from 'vitest';

import { factorApi } from '../factor';

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
