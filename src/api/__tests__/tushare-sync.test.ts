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

describe('tushareSyncApi overview and retry contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[OPS-B02] regular overview read keeps an empty body', async () => {
    mockPost().mockResolvedValueOnce({
      generatedAt: '2026-08-08T00:00:00.000Z',
      totalRows: 0,
      totalMissingDays: 0,
      categories: [],
    });

    await tushareSyncApi.getSyncStatusOverview();

    expect(mockPost()).toHaveBeenCalledWith('/api/tushare/admin/sync-status-overview', {});
  });

  it('[OPS-B02] explicit overview refresh sends refresh=true in POST body', async () => {
    mockPost().mockResolvedValueOnce({
      generatedAt: '2026-08-08T00:00:01.000Z',
      totalRows: 0,
      totalMissingDays: 0,
      categories: [],
    });

    await tushareSyncApi.getSyncStatusOverview(true);

    expect(mockPost()).toHaveBeenCalledWith('/api/tushare/admin/sync-status-overview', {
      refresh: true,
    });
  });

  it('[OPS-B03] retry task filter is sent to backend with page coordinates', async () => {
    mockPost().mockResolvedValueOnce({ total: 0, page: 2, pageSize: 20, items: [] });

    await tushareSyncApi.getRetryQueue('PENDING', 2, 20, 'DAILY');

    expect(mockPost()).toHaveBeenCalledWith('/api/tushare/admin/retry-queue', {
      status: 'PENDING',
      page: 2,
      pageSize: 20,
      task: 'DAILY',
    });
  });
});
