import { it, vi, expect, describe, beforeEach } from 'vitest';

import { apiClient } from '../client';
import {
  getSubscriptionHits,
  getSubscriptionMetrics,
  previewSubscriptionRule,
} from '../screener-subscription';

vi.mock('../client', () => ({ apiClient: { post: vi.fn() } }));

// ----------------------------------------------------------------------

describe('screener subscription v3 API contract', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockResolvedValue({});
  });

  it('loads metric catalog through POST body instead of a query string', () => {
    getSubscriptionMetrics(['STOCK', 'FACTOR']);

    expect(apiClient.post).toHaveBeenCalledWith('/api/screener-subscription/metrics', {
      sources: ['STOCK', 'FACTOR'],
    });
  });

  it('previews the exact v1 rule payload through POST', () => {
    const ruleSpec = {
      type: 'STOCK_SCREENING' as const,
      version: 1 as const,
      universe: {
        type: 'ALL_A' as const,
        excludeSt: true,
        excludeSuspended: true,
        excludeBse: false,
      },
      filters: { minRoe: 12 },
    };

    previewSubscriptionRule({ ruleSpec, limit: 20 });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/screener-subscription/preview',
      {
        ruleSpec,
        limit: 20,
      },
      undefined
    );
  });

  it('sends subscription and log IDs in hits request body', () => {
    getSubscriptionHits(12, 45, 2, 50, 'EVENT');

    expect(apiClient.post).toHaveBeenCalledWith('/api/screener-subscription/hits', {
      id: 12,
      logId: 45,
      page: 2,
      pageSize: 50,
      kind: 'EVENT',
    });
  });
});
