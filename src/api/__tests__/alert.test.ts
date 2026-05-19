import { alertApi } from '../alert';
import { apiClient } from '../client';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('alertApi.getPriceRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts items from backend paginated price rule response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 100,
      items: [
        {
          id: 1,
          userId: 100,
          tsCode: '000001.SZ',
          stockName: '平安银行',
          watchlistId: null,
          portfolioId: null,
          sourceName: null,
          ruleType: 'PRICE_ABOVE',
          threshold: 12.3,
          memo: null,
          status: 'ACTIVE',
          triggerCount: 0,
          lastTriggeredAt: null,
          createdAt: '2026-05-17T00:00:00.000Z',
          updatedAt: '2026-05-17T00:00:00.000Z',
        },
      ],
    });

    const result = await alertApi.getPriceRules();

    expect(apiClient.post).toHaveBeenCalledWith('/api/alert/price-rules/list', {
      page: 1,
      pageSize: 100,
    });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ACTIVE');
  });

  it('keeps compatibility with legacy array response used by local mocks', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce([]);

    await expect(alertApi.getPriceRules()).resolves.toEqual([]);
  });
});
