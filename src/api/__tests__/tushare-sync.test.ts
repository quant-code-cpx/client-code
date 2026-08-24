import { tushareSyncApi, TUSHARE_SYNC_LOG_MAX_PAGE_SIZE } from '../tushare-sync';

const authEpochs = vi.hoisted(() => ({ token: 1, session: 1 }));

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  tokenStorage: {
    getEpoch: vi.fn(() => authEpochs.token),
    getSessionEpoch: vi.fn(() => authEpochs.session),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);
type Overview = Awaited<ReturnType<typeof tushareSyncApi.getOperationsOverview>>;

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

describe('tushareSyncApi operations overview single-flight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authEpochs.token = 1;
    authEpochs.session = 1;
  });

  it('[REG] StrictMode 并发重放时只发送一个 operations overview POST', async () => {
    let resolveRequest!: (value: Overview) => void;
    const pending = new Promise<Overview>((resolve) => {
      resolveRequest = resolve;
    });
    mockPost().mockReturnValueOnce(pending);

    const first = tushareSyncApi.getOperationsOverview();
    const replayed = tushareSyncApi.getOperationsOverview();

    expect(replayed).toBe(first);
    expect(mockPost()).toHaveBeenCalledTimes(1);
    expect(mockPost()).toHaveBeenCalledWith('/api/tushare/admin/operations-overview', {});

    resolveRequest({} as Overview);
    await Promise.all([first, replayed]);
  });

  it('请求结算后允许显式刷新 operations overview', async () => {
    mockPost().mockResolvedValue({} as Overview);

    await tushareSyncApi.getOperationsOverview();
    await tushareSyncApi.getOperationsOverview();

    expect(mockPost()).toHaveBeenCalledTimes(2);
  });

  it('失败后清理在途请求，允许重试', async () => {
    mockPost()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({} as Overview);

    await expect(tushareSyncApi.getOperationsOverview()).rejects.toThrow('network');
    await expect(tushareSyncApi.getOperationsOverview()).resolves.toEqual({});

    expect(mockPost()).toHaveBeenCalledTimes(2);
  });

  it('认证会话切换后不复用旧 Bearer 请求，并取消旧会话结果', async () => {
    let resolveOldRequest!: (value: Overview) => void;
    const oldPending = new Promise<Overview>((resolve) => {
      resolveOldRequest = resolve;
    });
    mockPost()
      .mockReturnValueOnce(oldPending)
      .mockResolvedValueOnce({ session: 'new' } as unknown as Overview);

    const first = tushareSyncApi.getOperationsOverview();
    const firstOutcome = first.then(
      () => 'resolved',
      (error: Error) => error.name
    );
    authEpochs.token += 1;
    authEpochs.session += 1;
    const second = tushareSyncApi.getOperationsOverview();
    resolveOldRequest({ session: 'old' } as unknown as Overview);

    await expect(second).resolves.toEqual({ session: 'new' });
    expect(await firstOutcome).toBe('AbortError');
    expect(second).not.toBe(first);
    expect(mockPost()).toHaveBeenCalledTimes(2);
  });
});

describe('tushareSyncApi overview and retry contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the operations overview and recoverable runtime with POST bodies', async () => {
    mockPost().mockResolvedValue({});

    await tushareSyncApi.getOperationsOverview();
    await tushareSyncApi.getSyncRuntimeStatus();

    expect(mockPost()).toHaveBeenNthCalledWith(1, '/api/tushare/admin/operations-overview', {});
    expect(mockPost()).toHaveBeenNthCalledWith(2, '/api/tushare/admin/sync/runtime-status', {});
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
