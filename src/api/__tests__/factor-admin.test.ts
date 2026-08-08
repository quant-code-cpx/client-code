import {
  adminJobList,
  adminJobDetail,
  adminPrecomputeStatus,
} from '../factor';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

describe('factor admin API contract', () => {
  beforeEach(() => {
    mockPost().mockReset();
  });

  it('F-BUG-01/F-BUG-06: maps totalDates to rowCount and keeps old computed factors STALE', async () => {
    mockPost().mockResolvedValueOnce({
      latestTradeDate: '20260807',
      byFactor: [
        { factorName: 'old_factor', latestDate: '20260601', totalDates: 88, staleDays: 45 },
        { factorName: 'never_factor', latestDate: null, totalDates: 0, staleDays: null },
      ],
    });

    const response = await adminPrecomputeStatus();

    expect(response.items[0]).toEqual(
      expect.objectContaining({ rowCount: 88, staleDays: 45, status: 'STALE' })
    );
    expect(response.items[1]).toEqual(
      expect.objectContaining({ staleDays: null, status: 'NEVER' })
    );
  });

  it('F-BUG-07: exposes the server-resolved effective trade date for precompute', async () => {
    mockPost().mockResolvedValueOnce({ latestTradeDate: '20260807', byFactor: [] });

    const response = await adminPrecomputeStatus();

    expect(response.targetTradeDate).toBe('20260807');
  });

  it('F-BUG-08: job list sends only the fields accepted by the server DTO', async () => {
    mockPost().mockResolvedValueOnce({ items: [], total: 0, page: 2, pageSize: 20 });

    await adminJobList({ page: 2, pageSize: 20 });

    expect(mockPost()).toHaveBeenCalledWith('/api/factor/admin/jobs', {
      page: 2,
      pageSize: 20,
    });
  });

  it('F-BUG-09: batch detail is addressed by tradeDate', async () => {
    mockPost().mockResolvedValueOnce({ tradeDate: '20260807', factorCount: 0, items: [] });

    await adminJobDetail({ tradeDate: '20260807' });

    expect(mockPost()).toHaveBeenCalledWith('/api/factor/admin/jobs/detail', {
      tradeDate: '20260807',
    });
  });
});
