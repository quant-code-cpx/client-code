import { apiClient, tokenStorage } from '../client';
import {
  addStock,
  deleteWatchlist,
  getWatchlistStocks,
  getWatchlistSummary,
  getWatchlistOverview,
} from '../watchlist';

vi.mock('../client', () => ({
  apiClient: { post: vi.fn() },
  tokenStorage: {
    getEpoch: vi.fn(() => 1),
    getSessionEpoch: vi.fn(() => 1),
    clear: vi.fn(),
  },
}));

// ----------------------------------------------------------------------

const mockPost = vi.mocked(apiClient.post);
const mockGetEpoch = vi.mocked(tokenStorage.getEpoch);
const mockGetSessionEpoch = vi.mocked(tokenStorage.getSessionEpoch);
const mockClearToken = vi.mocked(tokenStorage.clear);

let tokenEpoch = 1;
let authSessionEpoch = 1;

beforeEach(() => {
  vi.clearAllMocks();
  tokenEpoch = 1;
  authSessionEpoch = 1;
  mockGetEpoch.mockImplementation(() => tokenEpoch);
  mockGetSessionEpoch.mockImplementation(() => authSessionEpoch);
  mockClearToken.mockImplementation(() => {
    tokenEpoch += 1;
    authSessionEpoch += 1;
  });
});

describe('watchlist read request single-flight', () => {
  it('[REG] StrictMode 并发重放 overview 时只发一个 POST', async () => {
    let resolveRequest!: (value: { watchlists: never[] }) => void;
    const pending = new Promise<{ watchlists: never[] }>((resolve) => {
      resolveRequest = resolve;
    });
    mockPost.mockReturnValueOnce(pending);

    const first = getWatchlistOverview();
    const replayed = getWatchlistOverview();

    expect(replayed).toBe(first);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/api/watchlist/overview', undefined);

    resolveRequest({ watchlists: [] });
    await Promise.all([first, replayed]);
  });

  it('请求结算后允许显式刷新 overview', async () => {
    mockPost.mockResolvedValue({ watchlists: [] });

    await getWatchlistOverview();
    await getWatchlistOverview();

    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('失败结算后清理单飞状态，允许重试', async () => {
    mockPost.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ watchlists: [] });

    await expect(getWatchlistOverview()).rejects.toThrow('network');
    await expect(getWatchlistOverview()).resolves.toEqual({ watchlists: [] });

    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('认证 epoch 变化后不复用旧请求，同时不破坏在途请求的透明 token 刷新', async () => {
    let resolveOldSession!: (value: { watchlists: never[] }) => void;
    const oldSessionRequest = new Promise<{ watchlists: never[] }>((resolve) => {
      resolveOldSession = resolve;
    });
    mockPost.mockReturnValueOnce(oldSessionRequest).mockReturnValueOnce(new Promise(() => undefined));

    const oldResult = getWatchlistOverview();
    mockGetEpoch.mockReturnValue(2);
    getWatchlistOverview();
    resolveOldSession({ watchlists: [] });

    expect(mockPost).toHaveBeenCalledTimes(2);
    await expect(oldResult).resolves.toEqual({ watchlists: [] });
  });

  it('mutation 前后都失效在途读取，权威刷新不复用旧 Promise', async () => {
    let resolveOldRead!: (value: { stockCount: number }) => void;
    let resolveMutation!: (value: { id: number }) => void;
    let resolveFreshRead!: (value: { stockCount: number }) => void;
    const pendingRead = new Promise<{ stockCount: number }>((resolve) => {
      resolveOldRead = resolve;
    });
    const pendingMutation = new Promise<{ id: number }>((resolve) => {
      resolveMutation = resolve;
    });
    const pendingFreshRead = new Promise<{ stockCount: number }>((resolve) => {
      resolveFreshRead = resolve;
    });
    mockPost
      .mockReturnValueOnce(pendingRead)
      .mockReturnValueOnce(pendingMutation)
      .mockReturnValueOnce(pendingFreshRead);

    const oldRead = getWatchlistSummary(1);
    const mutation = addStock({ watchlistId: 1, tsCode: '000001.SZ' });
    resolveMutation({ id: 9 });
    await mutation;
    const authoritativeRead = getWatchlistSummary(1);
    resolveOldRead({ stockCount: 0 });
    resolveFreshRead({ stockCount: 1 });

    await expect(oldRead).resolves.toEqual({ stockCount: 1 });
    await expect(authoritativeRead).resolves.toEqual({ stockCount: 1 });
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('认证 session 变更后取消旧读取，不复用新 session 的返回', async () => {
    let resolveSessionARead!: (value: { watchlists: never[] }) => void;
    let resolveSessionBMutation!: (value: { id: number }) => void;
    let resolveSessionBRead!: (value: { watchlists: never[] }) => void;
    const sessionARead = new Promise<{ watchlists: never[] }>((resolve) => {
      resolveSessionARead = resolve;
    });
    const sessionBMutation = new Promise<{ id: number }>((resolve) => {
      resolveSessionBMutation = resolve;
    });
    const sessionBRead = new Promise<{ watchlists: never[] }>((resolve) => {
      resolveSessionBRead = resolve;
    });
    mockPost
      .mockReturnValueOnce(sessionARead)
      .mockReturnValueOnce(sessionBMutation)
      .mockReturnValueOnce(sessionBRead);

    const oldSessionRead = getWatchlistOverview();
    const oldSessionResult = oldSessionRead.then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    tokenStorage.clear();
    const mutation = addStock({ watchlistId: 1, tsCode: '000001.SZ' });
    resolveSessionBMutation({ id: 9 });
    await mutation;
    const currentSessionRead = getWatchlistOverview();

    resolveSessionARead({ watchlists: [] });
    resolveSessionBRead({ watchlists: [] });

    await expect(oldSessionResult).resolves.toMatchObject({
      status: 'rejected',
      error: { name: 'AbortError' },
    });
    await expect(currentSessionRead).resolves.toEqual({ watchlists: [] });
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('同组删除在途时等待结果，不提前重放旧 stocks 读取', async () => {
    let rejectOldRead!: (reason: Error) => void;
    let resolveDelete!: (value: { message: string }) => void;
    const pendingRead = new Promise<never>((_resolve, reject) => {
      rejectOldRead = reject;
    });
    const pendingDelete = new Promise<{ message: string }>((resolve) => {
      resolveDelete = resolve;
    });
    const unexpectedReplay = new Promise<never>(() => undefined);
    mockPost
      .mockReturnValueOnce(pendingRead)
      .mockReturnValueOnce(pendingDelete)
      .mockReturnValue(unexpectedReplay);

    const oldRead = getWatchlistStocks(7);
    let readSettled = false;
    const observedRead = oldRead.then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    void observedRead.then(() => {
      readSettled = true;
    });
    const deletion = deleteWatchlist(7);
    rejectOldRead(Object.assign(new Error('自选组不存在'), { status: 404 }));
    await Promise.resolve();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(readSettled).toBe(false);

    resolveDelete({ message: '删除成功' });
    await deletion;
    await expect(observedRead).resolves.toEqual({
      status: 'fulfilled',
      value: { stocks: [] },
    });
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('前一 session 的同 ID 删除在途不阻塞新 session 读取重放', async () => {
    let rejectSessionADelete!: (reason: Error) => void;
    let resolveSessionBOldRead!: (value: { stocks: Array<{ id: number }> }) => void;
    let resolveSessionBMutation!: (value: { id: number }) => void;
    let resolveSessionBFreshRead!: (value: { stocks: Array<{ id: number }> }) => void;
    const sessionADelete = new Promise<{ message: string }>((_resolve, reject) => {
      rejectSessionADelete = reject;
    });
    const sessionBOldRead = new Promise<{ stocks: Array<{ id: number }> }>((resolve) => {
      resolveSessionBOldRead = resolve;
    });
    const sessionBMutation = new Promise<{ id: number }>((resolve) => {
      resolveSessionBMutation = resolve;
    });
    const sessionBFreshRead = new Promise<{ stocks: Array<{ id: number }> }>((resolve) => {
      resolveSessionBFreshRead = resolve;
    });
    mockPost
      .mockReturnValueOnce(sessionADelete)
      .mockReturnValueOnce(sessionBOldRead)
      .mockReturnValueOnce(sessionBMutation)
      .mockReturnValueOnce(sessionBFreshRead);

    const deletion = deleteWatchlist(7);
    const deletionResult = deletion.catch((error: unknown) => error);
    tokenStorage.clear();
    const oldRead = getWatchlistStocks(7);
    const mutation = addStock({ watchlistId: 8, tsCode: '000001.SZ' });
    resolveSessionBMutation({ id: 9 });
    await mutation;

    resolveSessionBOldRead({ stocks: [{ id: 1 }] });
    resolveSessionBFreshRead({ stocks: [{ id: 2 }] });

    await expect(oldRead).resolves.toEqual({ stocks: [{ id: 2 }] });
    expect(mockPost).toHaveBeenCalledTimes(4);

    rejectSessionADelete(new Error('删除失败'));
    await deletionResult;
  });

  it('删除同组后不重放已删除资源的晚到 stocks 读取', async () => {
    let resolveOldRead!: (value: { stocks: Array<{ id: number }> }) => void;
    let resolveDelete!: (value: { message: string }) => void;
    const pendingRead = new Promise<{ stocks: Array<{ id: number }> }>((resolve) => {
      resolveOldRead = resolve;
    });
    const pendingDelete = new Promise<{ message: string }>((resolve) => {
      resolveDelete = resolve;
    });
    mockPost
      .mockReturnValueOnce(pendingRead)
      .mockReturnValueOnce(pendingDelete)
      .mockRejectedValue(new Error('自选组不存在'));

    const oldRead = getWatchlistStocks(7);
    const deletion = deleteWatchlist(7);
    resolveDelete({ message: '删除成功' });
    await deletion;
    resolveOldRead({ stocks: [{ id: 1 }] });

    await expect(oldRead).resolves.toEqual({ stocks: [] });
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('同组删除失败后解除等待并重放旧读取', async () => {
    let resolveOldRead!: (value: { stocks: Array<{ id: number }> }) => void;
    let rejectDelete!: (reason: Error) => void;
    let resolveFreshRead!: (value: { stocks: Array<{ id: number }> }) => void;
    const pendingRead = new Promise<{ stocks: Array<{ id: number }> }>((resolve) => {
      resolveOldRead = resolve;
    });
    const pendingDelete = new Promise<{ message: string }>((_resolve, reject) => {
      rejectDelete = reject;
    });
    const pendingFreshRead = new Promise<{ stocks: Array<{ id: number }> }>((resolve) => {
      resolveFreshRead = resolve;
    });
    mockPost
      .mockReturnValueOnce(pendingRead)
      .mockReturnValueOnce(pendingDelete)
      .mockReturnValueOnce(pendingFreshRead);

    const oldRead = getWatchlistStocks(7);
    const deletion = deleteWatchlist(7);
    const deletionResult = deletion.then(
      () => ({ status: 'fulfilled' as const }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    resolveOldRead({ stocks: [{ id: 1 }] });
    await Promise.resolve();

    expect(mockPost).toHaveBeenCalledTimes(2);

    rejectDelete(new Error('删除失败'));
    await expect(deletionResult).resolves.toMatchObject({ status: 'rejected' });
    resolveFreshRead({ stocks: [{ id: 2 }] });

    await expect(oldRead).resolves.toEqual({ stocks: [{ id: 2 }] });
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('删除一个组后仍重放其他组的晚到读取', async () => {
    let resolveOldRead!: (value: { stockCount: number }) => void;
    let resolveDelete!: (value: { message: string }) => void;
    let resolveFreshRead!: (value: { stockCount: number }) => void;
    const pendingRead = new Promise<{ stockCount: number }>((resolve) => {
      resolveOldRead = resolve;
    });
    const pendingDelete = new Promise<{ message: string }>((resolve) => {
      resolveDelete = resolve;
    });
    const pendingFreshRead = new Promise<{ stockCount: number }>((resolve) => {
      resolveFreshRead = resolve;
    });
    mockPost
      .mockReturnValueOnce(pendingRead)
      .mockReturnValueOnce(pendingDelete)
      .mockReturnValueOnce(pendingFreshRead);

    const oldRead = getWatchlistSummary(8);
    const deletion = deleteWatchlist(7);
    resolveDelete({ message: '删除成功' });
    await deletion;
    resolveOldRead({ stockCount: 1 });
    resolveFreshRead({ stockCount: 2 });

    await expect(oldRead).resolves.toEqual({ stockCount: 2 });
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('相同组的 stocks/summary 各自单飞，不合并不同组参数', async () => {
    let resolveRequests!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveRequests = resolve;
    });
    mockPost.mockReturnValue(pending);

    const stocks1 = getWatchlistStocks(1);
    const stocks1Replay = getWatchlistStocks(1);
    const stocks2 = getWatchlistStocks(2);
    const summary1 = getWatchlistSummary(1);
    const summary1Replay = getWatchlistSummary(1);

    expect(stocks1Replay).toBe(stocks1);
    expect(summary1Replay).toBe(summary1);
    expect(mockPost).toHaveBeenCalledTimes(3);

    resolveRequests({ stocks: [] });
    await Promise.all([stocks1, stocks1Replay, stocks2, summary1, summary1Replay]);
  });
});
