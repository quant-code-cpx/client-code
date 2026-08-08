import { it, vi, expect, describe, afterEach } from 'vitest';

import { apiClient } from '../client';
import {
  addHolding,
  removeHolding,
  updateHolding,
  createHoldingMutationIdempotencyKey,
} from '../portfolio';

vi.mock('../client', () => ({ apiClient: { post: vi.fn() } }));

// ----------------------------------------------------------------------

describe('portfolio holding mutation API contract', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates a new server-valid key for each holding action', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
        .mockReturnValueOnce('22222222-2222-4222-8222-222222222222'),
    });

    const addKey = createHoldingMutationIdempotencyKey('add');
    const retryKey = createHoldingMutationIdempotencyKey('add');

    expect(addKey).toMatch(/^portfolio-holding:add:/);
    expect(addKey.length).toBeGreaterThanOrEqual(8);
    expect(addKey.length).toBeLessThanOrEqual(128);
    expect(retryKey).not.toBe(addKey);
  });

  it('sends required fresh idempotency keys with add, update, and remove bodies', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    const addKey = createHoldingMutationIdempotencyKey('add');
    await addHolding({
      portfolioId: 'portfolio-1',
      tsCode: '000001.SZ',
      quantity: 100,
      avgCost: 12.5,
      idempotencyKey: addKey,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/portfolio/holding/add', {
      portfolioId: 'portfolio-1',
      tsCode: '000001.SZ',
      quantity: 100,
      avgCost: 12.5,
      idempotencyKey: addKey,
    });

    const updateKey = createHoldingMutationIdempotencyKey('update');
    await updateHolding({ holdingId: 'holding-1', quantity: 200, avgCost: 13, idempotencyKey: updateKey });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/portfolio/holding/update', {
      holdingId: 'holding-1',
      quantity: 200,
      avgCost: 13,
      idempotencyKey: updateKey,
    });

    const removeKey = createHoldingMutationIdempotencyKey('remove');
    await removeHolding({ holdingId: 'holding-1', idempotencyKey: removeKey });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/portfolio/holding/remove', {
      holdingId: 'holding-1',
      idempotencyKey: removeKey,
    });
  });
});
