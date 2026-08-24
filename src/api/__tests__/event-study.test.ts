import { getEventCalendar } from '../event-study';

const authEpochs = vi.hoisted(() => ({ token: 1, session: 1 }));

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  tokenStorage: {
    getEpoch: vi.fn(() => authEpochs.token),
    getSessionEpoch: vi.fn(() => authEpochs.session),
  },
}));

import { apiClient } from '../client';

const mockPost = vi.mocked(apiClient.post);

beforeEach(() => {
  vi.clearAllMocks();
  authEpochs.token = 1;
  authEpochs.session = 1;
});

describe('event calendar single-flight', () => {
  it('[REG] StrictMode 并发重放相同日期范围时只发送一个 POST', async () => {
    type CalendarResult = Awaited<ReturnType<typeof getEventCalendar>>;
    let resolveRequest!: (value: CalendarResult) => void;
    const pending = new Promise<CalendarResult>((resolve) => {
      resolveRequest = resolve;
    });
    mockPost.mockReturnValueOnce(pending);
    const params = { startDate: '20260621', endDate: '20260820' };

    const first = getEventCalendar(params);
    const replayed = getEventCalendar({ ...params });

    expect(replayed).toBe(first);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/api/event-study/events/calendar', params);

    resolveRequest({ cells: [] });
    await Promise.all([first, replayed]);
  });

  it('不同日期范围保持为独立请求', async () => {
    mockPost.mockResolvedValue({ cells: [] });

    await Promise.all([
      getEventCalendar({ startDate: '20260621', endDate: '20260820' }),
      getEventCalendar({ startDate: '20260622', endDate: '20260820' }),
    ]);

    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('失败后清理在途请求，允许重试', async () => {
    mockPost.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ cells: [] });
    const params = { startDate: '20260621', endDate: '20260820' };

    await expect(getEventCalendar(params)).rejects.toThrow('network');
    await expect(getEventCalendar(params)).resolves.toEqual({ cells: [] });

    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('认证会话切换后相同日历参数也使用新请求，并取消旧会话结果', async () => {
    type CalendarResult = Awaited<ReturnType<typeof getEventCalendar>>;
    let resolveOldRequest!: (value: CalendarResult) => void;
    const oldPending = new Promise<CalendarResult>((resolve) => {
      resolveOldRequest = resolve;
    });
    mockPost
      .mockReturnValueOnce(oldPending)
      .mockResolvedValueOnce({ cells: [{ session: 'new' }] });
    const params = { startDate: '20260621', endDate: '20260820' };

    const first = getEventCalendar(params);
    const firstOutcome = first.then(
      () => 'resolved',
      (error: Error) => error.name
    );
    authEpochs.token += 1;
    authEpochs.session += 1;
    const second = getEventCalendar({ ...params });
    resolveOldRequest({ cells: [{ session: 'old' }] } as unknown as CalendarResult);

    await expect(second).resolves.toEqual({ cells: [{ session: 'new' }] });
    expect(await firstOutcome).toBe('AbortError');
    expect(second).not.toBe(first);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});
