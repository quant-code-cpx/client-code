import { tushareSyncApi, TUSHARE_SYNC_LOG_MAX_PAGE_SIZE } from '../tushare-sync';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

// ----------------------------------------------------------------------

describe('tushareSyncApi.getSyncLogs', () => {
  it('clamps pageSize to backend maximum before POST', async () => {
    mockPost().mockResolvedValueOnce({
      total: 0,
      page: 1,
      items: [],
      pageSize: TUSHARE_SYNC_LOG_MAX_PAGE_SIZE,
    });

    await tushareSyncApi.getSyncLogs({ page: 1, pageSize: 200 });

    expect(mockPost()).toHaveBeenCalledWith('/api/tushare/admin/sync-logs', {
      page: 1,
      pageSize: TUSHARE_SYNC_LOG_MAX_PAGE_SIZE,
    });
  });
});
