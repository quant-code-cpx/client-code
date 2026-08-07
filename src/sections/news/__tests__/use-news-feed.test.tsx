import type { components } from 'src/api/generated/news-api';

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { act, waitFor, renderHook } from '@testing-library/react';

type Schemas = components['schemas'];
type GeneratedListRequest = Schemas['NewsArticleListRequestDto'];
type NewsArticleListRequest = Omit<GeneratedListRequest, 'includeUnknownPublishedTime'> & {
  includeUnknownPublishedTime?: boolean;
};
type NewsArticleListItem = Schemas['NewsArticleListItemDto'];
type NewsArticleListResponse = Schemas['NewsArticleListResponseDto'];

type NewsFeedStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

type UseNewsFeedResult = {
  items: NewsArticleListItem[];
  status: NewsFeedStatus;
  error: unknown | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: unknown | null;
  refreshing: boolean;
  refreshError: unknown | null;
  hasNewItems: boolean;
  loadMore: () => void | Promise<void>;
  refresh: () => void | Promise<void>;
};

type UseNewsFeedModule = {
  useNewsFeed?: (request: NewsArticleListRequest) => UseNewsFeedResult;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

const mocks = vi.hoisted(() => ({
  listArticles: vi.fn(),
}));

vi.mock('src/api/news', () => ({
  newsApi: {
    listArticles: mocks.listArticles,
  },
}));

const targetFile = resolve(process.cwd(), 'src/sections/news/hooks/use-news-feed.ts');
const targetExists = existsSync(targetFile);
const baseRequest: NewsArticleListRequest = { scope: 'ALL', limit: 30 };

let loadedModule: UseNewsFeedModule | undefined;

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function article(
  articleId: string,
  revision: number,
  title = `${articleId}-v${revision}`
): NewsArticleListItem {
  return {
    articleId,
    revision,
    contentType: 'NEWS',
    sourceType: 'MEDIA',
    title,
    excerpt: null,
    publisher: '测试媒体',
    canonicalUrl: `https://example.test/${articleId}`,
    publishedAt: '2026-08-05T14:30:45.000Z',
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: '2026-08-05T14:31:00.000Z',
    securityCodes: ['600000.SH'],
    providerKeys: ['fixture-provider'],
    qualityFlags: [],
  };
}

function page(
  items: NewsArticleListItem[],
  nextCursor: string | null,
  overrides: Partial<NewsArticleListResponse> = {}
): NewsArticleListResponse {
  return {
    items,
    nextCursor,
    dataThrough: '2026-08-05T15:00:00.000Z',
    partial: false,
    warnings: [],
    ...overrides,
  };
}

function getUseNewsFeed() {
  if (!loadedModule?.useNewsFeed) throw new Error('use-news-feed.ts 必须导出 useNewsFeed');
  return loadedModule.useNewsFeed;
}

function renderNewsFeed(request: NewsArticleListRequest = baseRequest) {
  return renderHook(({ currentRequest }) => getUseNewsFeed()(currentRequest), {
    initialProps: { currentRequest: request },
  });
}

async function resolveDeferred<T>(pending: Deferred<T>, value: T) {
  await act(async () => {
    pending.resolve(value);
    await pending.promise;
  });
}

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<UseNewsFeedModule>('../hooks/use-news-feed');
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('新闻列表 hook RED 门禁', () => {
  it('NEWS-FE-STATE-RED-001：提供独立 useNewsFeed 状态机 seam', () => {
    expect(
      targetExists,
      '缺少计划中的 src/sections/news/hooks/use-news-feed.ts，RED-4 状态机尚未实现'
    ).toBe(true);
  });
});

describe.runIf(targetExists)('useNewsFeed P0 状态与竞态契约', () => {
  it('首次请求成功后提交列表、ready 状态和 nextCursor', async () => {
    const pending = deferred<NewsArticleListResponse>();
    const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1);
    mocks.listArticles.mockReturnValueOnce(pending.promise);

    const hook = renderNewsFeed();

    expect(hook.result.current.status).toBe('loading');
    expect(mocks.listArticles).toHaveBeenCalledWith(baseRequest, expect.any(AbortSignal));

    await resolveDeferred(pending, page([firstItem], 'cursor-1'));

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.items).toEqual([firstItem]);
    expect(hook.result.current.hasMore).toBe(true);
  });

  it('NEWS-FE-STATE-003：首次失败进入 error，不伪装为空态', async () => {
    const error = new Error('首次列表失败');
    mocks.listArticles.mockRejectedValueOnce(error);

    const hook = renderNewsFeed();

    await waitFor(() => expect(hook.result.current.status).toBe('error'));
    expect(hook.result.current.items).toEqual([]);
    expect(hook.result.current.error).toBe(error);
  });

  it('NEWS-FE-STATE-010：成功空数组进入真实 empty，且没有错误', async () => {
    mocks.listArticles.mockResolvedValueOnce(page([], null));

    const hook = renderNewsFeed();

    await waitFor(() => expect(hook.result.current.status).toBe('empty'));
    expect(hook.result.current.items).toEqual([]);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.hasMore).toBe(false);
  });

  it('NEWS-FE-STATE-004：request key 改变会 abort A，晚到的 A 不得覆盖 B', async () => {
    const requestA = { ...baseRequest, keyword: '半导体' };
    const requestB = { ...baseRequest, keyword: '银行' };
    const pendingA = deferred<NewsArticleListResponse>();
    const pendingB = deferred<NewsArticleListResponse>();
    const itemA = article('aaaaaaaaaaaaaaaaaaaa', 1, 'A 条件结果');
    const itemB = article('bbbbbbbbbbbbbbbbbbbb', 1, 'B 条件结果');
    mocks.listArticles.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);

    const hook = renderNewsFeed(requestA);
    await waitFor(() => expect(mocks.listArticles).toHaveBeenCalledTimes(1));
    const signalA = mocks.listArticles.mock.calls[0][1] as AbortSignal;

    hook.rerender({ currentRequest: requestB });

    await waitFor(() => expect(mocks.listArticles).toHaveBeenCalledTimes(2));
    expect(signalA.aborted).toBe(true);

    await resolveDeferred(pendingB, page([itemB], null));
    await waitFor(() => expect(hook.result.current.items).toEqual([itemB]));
    await resolveDeferred(pendingA, page([itemA], null));

    expect(hook.result.current.items).toEqual([itemB]);
  });

  it('NEWS-FE-STATE-006/007：翻页稳定追加；nextCursor=null 后不再请求', async () => {
    const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1);
    const secondItem = article('bbbbbbbbbbbbbbbbbbbb', 1);
    mocks.listArticles
      .mockResolvedValueOnce(page([firstItem], 'cursor-1'))
      .mockResolvedValueOnce(page([secondItem], null));
    const hook = renderNewsFeed();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(mocks.listArticles).toHaveBeenNthCalledWith(
      2,
      { ...baseRequest, cursor: 'cursor-1' },
      expect.any(AbortSignal)
    );
    expect(hook.result.current.items).toEqual([firstItem, secondItem]);
    expect(hook.result.current.hasMore).toBe(false);

    await act(async () => {
      await hook.result.current.loadMore();
    });
    expect(mocks.listArticles).toHaveBeenCalledTimes(2);
  });

  it('NEWS-FE-STATE-008：翻页失败保留旧项，重试仍使用同一 cursor', async () => {
    const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1);
    const secondItem = article('bbbbbbbbbbbbbbbbbbbb', 1);
    const error = new Error('翻页失败');
    mocks.listArticles
      .mockResolvedValueOnce(page([firstItem], 'cursor-1'))
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(page([secondItem], null));
    const hook = renderNewsFeed();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(hook.result.current.items).toEqual([firstItem]);
    expect(hook.result.current.loadMoreError).toBe(error);
    expect(hook.result.current.hasMore).toBe(true);

    await act(async () => {
      await hook.result.current.loadMore();
    });
    expect(mocks.listArticles.mock.calls[1][0]).toMatchObject({ cursor: 'cursor-1' });
    expect(mocks.listArticles.mock.calls[2][0]).toMatchObject({ cursor: 'cursor-1' });
    expect(hook.result.current.items).toEqual([firstItem, secondItem]);
  });

  it('NEWS-FE-STATE-017：翻页 pending 时连调 loadMore 只产生一个请求', async () => {
    const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1);
    const pendingMore = deferred<NewsArticleListResponse>();
    mocks.listArticles
      .mockResolvedValueOnce(page([firstItem], 'cursor-1'))
      .mockReturnValueOnce(pendingMore.promise);
    const hook = renderNewsFeed();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    act(() => {
      void hook.result.current.loadMore();
      void hook.result.current.loadMore();
    });

    await waitFor(() => expect(hook.result.current.loadingMore).toBe(true));
    expect(mocks.listArticles).toHaveBeenCalledTimes(2);

    await resolveDeferred(pendingMore, page([], null));
  });

  it('NEWS-FE-STATE-012/013：articleId 去重并在原位置保留最高 revision', async () => {
    const revisionOne = article('aaaaaaaaaaaaaaaaaaaa', 1, '旧版本');
    const revisionTwo = article('aaaaaaaaaaaaaaaaaaaa', 2, '新版本');
    const secondItem = article('bbbbbbbbbbbbbbbbbbbb', 1);
    mocks.listArticles
      .mockResolvedValueOnce(page([revisionOne], 'cursor-1'))
      .mockResolvedValueOnce(page([revisionTwo, revisionOne, secondItem], null));
    const hook = renderNewsFeed();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(hook.result.current.items).toEqual([revisionTwo, secondItem]);
  });

  it('NEWS-FE-STATE-018：服务端返回已使用 cursor 时停止翻页并暴露契约错误', async () => {
    const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1);
    const secondItem = article('bbbbbbbbbbbbbbbbbbbb', 1);
    const thirdItem = article('cccccccccccccccccccc', 1);
    mocks.listArticles
      .mockResolvedValueOnce(page([firstItem], 'cursor-1'))
      .mockResolvedValueOnce(page([secondItem], 'cursor-2'))
      .mockResolvedValueOnce(page([thirdItem], 'cursor-1'));
    const hook = renderNewsFeed();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    await act(async () => {
      await hook.result.current.loadMore();
      await hook.result.current.loadMore();
    });

    expect(mocks.listArticles.mock.calls.map(([body]) => body)).toEqual([
      baseRequest,
      { ...baseRequest, cursor: 'cursor-1' },
      { ...baseRequest, cursor: 'cursor-2' },
    ]);
    expect(hook.result.current.items).toEqual([firstItem, secondItem, thirdItem]);
    expect(hook.result.current.hasMore).toBe(false);
    expect(hook.result.current.loadMoreError).toMatchObject({
      name: 'NewsCursorContractError',
      message: expect.stringContaining('重复'),
    });

    await act(async () => {
      await hook.result.current.loadMore();
      await Promise.resolve();
    });
    expect(mocks.listArticles).toHaveBeenCalledTimes(3);
  });

  it.each([
    { code: 7002, recoverySucceeds: true },
    { code: 7003, recoverySucceeds: false },
    { code: 7004, recoverySucceeds: false },
  ])(
    'NEWS-FE-STATE-021：cursor $code 只自动取无 cursor 首页一次，失败也不循环',
    async ({ code, recoverySucceeds }) => {
      const staleItem = article('aaaaaaaaaaaaaaaaaaaa', 1, '旧页');
      const recoveredItem = article('bbbbbbbbbbbbbbbbbbbb', 1, '恢复首页');
      const cursorError = Object.assign(new Error('文案不可用于分支'), {
        name: 'ApiError',
        code,
        status: 400,
        requestId: `req-${code}`,
      });
      const recoveryError = Object.assign(new Error('自动首页恢复仍失败'), {
        name: 'ApiError',
        code,
        status: 400,
        requestId: `req-${code}-again`,
      });
      mocks.listArticles
        .mockResolvedValueOnce(page([staleItem], 'cursor-stale'))
        .mockRejectedValueOnce(cursorError);
      if (recoverySucceeds) {
        mocks.listArticles.mockResolvedValueOnce(page([recoveredItem], null));
      } else {
        mocks.listArticles.mockRejectedValueOnce(recoveryError);
      }
      const hook = renderNewsFeed();
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));

      await act(async () => {
        await hook.result.current.loadMore();
      });

      await waitFor(() => expect(mocks.listArticles).toHaveBeenCalledTimes(3));
      expect(mocks.listArticles.mock.calls[1][0]).toMatchObject({ cursor: 'cursor-stale' });
      expect(mocks.listArticles.mock.calls[2][0]).toEqual(baseRequest);
      expect(hook.result.current.hasMore).toBe(false);

      if (recoverySucceeds) {
        expect(hook.result.current.items).toEqual([recoveredItem]);
      } else {
        expect(hook.result.current.loadMoreError ?? hook.result.current.error).toBe(recoveryError);
      }

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mocks.listArticles).toHaveBeenCalledTimes(3);
    }
  );

  it('NEWS-FE-STATE-009：刷新失败保留旧列表并暴露独立刷新错误', async () => {
    const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1, '已加载新闻');
    const refreshError = new Error('刷新失败');
    mocks.listArticles
      .mockResolvedValueOnce(page([firstItem], null))
      .mockRejectedValueOnce(refreshError);
    const hook = renderNewsFeed();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    await act(async () => {
      await hook.result.current.refresh();
    });

    expect(hook.result.current.status).toBe('ready');
    expect(hook.result.current.items).toEqual([firstItem]);
    expect(hook.result.current.refreshing).toBe(false);
    expect(hook.result.current.refreshError).toBe(refreshError);
  });

  it('NEWS-FE-STATE-014/016：60 秒 probe 只提示新内容，不替换旧列表；失败静默', async () => {
    vi.useFakeTimers();
    try {
      const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1, '当前首条');
      const newFirstItem = article('bbbbbbbbbbbbbbbbbbbb', 1, '探测到的新首条');
      mocks.listArticles
        .mockResolvedValueOnce(page([firstItem], null))
        .mockResolvedValueOnce(page([newFirstItem], null))
        .mockRejectedValueOnce(new Error('probe 网络失败'));
      const hook = renderNewsFeed();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(hook.result.current.items).toEqual([firstItem]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(mocks.listArticles).toHaveBeenCalledTimes(2);
      expect(hook.result.current.hasNewItems).toBe(true);
      expect(hook.result.current.items).toEqual([firstItem]);
      expect(hook.result.current.error).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(mocks.listArticles).toHaveBeenCalledTimes(3);
      expect(hook.result.current.items).toEqual([firstItem]);
      expect(hook.result.current.refreshError).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('NEWS-FE-STATE-015：页面隐藏时暂停 probe，恢复可见后只保留一个 timer', async () => {
    vi.useFakeTimers();
    const originalVisibility = document.visibilityState;
    try {
      const firstItem = article('aaaaaaaaaaaaaaaaaaaa', 1);
      mocks.listArticles.mockResolvedValue(page([firstItem], null));
      const hook = renderNewsFeed();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(180_000);
      });
      expect(mocks.listArticles).toHaveBeenCalledTimes(1);

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(mocks.listArticles).toHaveBeenCalledTimes(2);
      hook.unmount();
    } finally {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: originalVisibility,
      });
      vi.useRealTimers();
    }
  });
});
