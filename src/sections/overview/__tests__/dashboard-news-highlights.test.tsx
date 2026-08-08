import type { NewsHighlightItem, NewsHighlightsResponse } from 'src/api/news';

import { useState } from 'react';
import { useLocation } from 'react-router';
import { act, screen, waitFor } from '@testing-library/react';

import { newsApi } from 'src/api/news';
import { renderWithProviders } from 'src/test/test-utils';

import { DashboardNewsHighlights } from '../dashboard-news-highlights';

vi.mock('src/api/news', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/news')>();
  return {
    ...actual,
    newsApi: {
      ...actual.newsApi,
      getHighlights: vi.fn(),
    },
  };
});

const firstItem = item('aaaaaaaaaaaaaaaaaaaa', '第一条重磅新闻');
const secondItem = item('bbbbbbbbbbbbbbbbbbbb', '第二条重磅新闻', {
  impactLevel: 'MAJOR',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardNewsHighlights', () => {
  it('loading 使用卡内 Skeleton，且固定请求 ALL/5', () => {
    vi.mocked(newsApi.getHighlights).mockReturnValue(new Promise(() => {}));

    renderHighlights();

    expect(screen.getByLabelText('首页新闻加载中')).toBeInTheDocument();
    expect(newsApi.getHighlights).toHaveBeenCalledWith(
      { scope: 'ALL', limit: 5 },
      expect.any(AbortSignal)
    );
  });

  it('HIGHLIGHTS 显示“重磅新闻”，保持服务端顺序并映射来源、时间和原因', async () => {
    vi.mocked(newsApi.getHighlights).mockResolvedValue(
      response({ items: [secondItem, firstItem] })
    );

    renderHighlights();

    expect(await screen.findByRole('heading', { name: '重磅新闻' })).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /查看新闻：/ });
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining('第二条重磅新闻'),
      expect.stringContaining('第一条重磅新闻'),
    ]);
    expect(screen.getAllByText('测试媒体')).toHaveLength(2);
    expect(screen.getAllByText(/权威来源/)).toHaveLength(2);
  });

  it('empty 显示轻量空态，不伪造新闻', async () => {
    vi.mocked(newsApi.getHighlights).mockResolvedValue(response({ items: [] }));

    renderHighlights();

    expect(await screen.findByText('暂无可展示的新闻')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /查看新闻：/ })).not.toBeInTheDocument();
  });

  it('首次请求 error 只降级新闻卡，并支持局部重试', async () => {
    vi.mocked(newsApi.getHighlights)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(response({ items: [firstItem] }));
    const { user } = renderHighlights();

    expect(await screen.findByRole('alert')).toHaveTextContent('首页新闻暂不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('第一条重磅新闻')).toBeInTheDocument();
    expect(newsApi.getHighlights).toHaveBeenCalledTimes(2);
  });

  it('partial、STALE 与 RECENT fallback 均显示明确且不同的状态文案', async () => {
    const scenarios = [
      {
        value: response({ partial: true }),
        expected: '部分新闻源覆盖受限，结果可能不完整。',
        heading: '重磅新闻',
      },
      {
        value: response({ rankingStatus: 'STALE', partial: true }),
        expected: '实时排名暂不可用，当前展示缓存新闻。',
        heading: '重磅新闻',
      },
      {
        value: response({
          displayMode: 'RECENT',
          rankingStatus: 'RECENT_FALLBACK',
          partial: true,
          items: [item('recentrecentrecent01', '最新新闻', { impactLevel: 'RECENT' })],
        }),
        expected: '当前没有达到重磅阈值的新闻，展示最新动态。',
        heading: '最新动态',
      },
    ] as const;

    for (const scenario of scenarios) {
      vi.mocked(newsApi.getHighlights).mockResolvedValueOnce(scenario.value);
      const rendered = renderHighlights();
      expect(await screen.findByRole('heading', { name: scenario.heading })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(scenario.expected);
      rendered.unmount();
    }
  });

  it('refreshKey 刷新时保留旧内容；失败后仍可阅读旧新闻', async () => {
    const pending = deferred<NewsHighlightsResponse>();
    vi.mocked(newsApi.getHighlights)
      .mockResolvedValueOnce(response({ items: [firstItem] }))
      .mockReturnValueOnce(pending.promise);
    const { user } = renderHighlights(<RefreshHarness />);
    expect(await screen.findByText('第一条重磅新闻')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '触发首页刷新' }));

    expect(screen.getByText('第一条重磅新闻')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('更新中');
    await act(() => {
      pending.reject(new Error('refresh unavailable'));
      return pending.promise.catch(() => undefined);
    });
    expect(await screen.findByText('更新失败，已保留当前新闻。')).toBeInTheDocument();
    expect(screen.getByText('第一条重磅新闻')).toBeInTheDocument();
  });

  it('新闻条目可键盘聚焦并进入既有 article 深链', async () => {
    vi.mocked(newsApi.getHighlights).mockResolvedValue(response({ items: [firstItem] }));
    const { user } = renderHighlights(
      <>
        <DashboardNewsHighlights />
        <LocationProbe />
      </>
    );
    const link = await screen.findByRole('link', { name: '查看新闻：第一条重磅新闻' });

    link.focus();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/market/news?article=aaaaaaaaaaaaaaaaaaaa'
      )
    );
  });
});

function RefreshHarness() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
        触发首页刷新
      </button>
      <DashboardNewsHighlights refreshKey={refreshKey} />
    </>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderHighlights(ui = <DashboardNewsHighlights />) {
  return renderWithProviders(ui, { initialEntries: ['/'] });
}

function response(overrides: Partial<NewsHighlightsResponse> = {}): NewsHighlightsResponse {
  return {
    generatedAt: '2026-08-08T04:00:00.000Z',
    dataThrough: '2026-08-08T03:59:00.000Z',
    partial: false,
    warnings: [],
    rankingVersion: 'impact-v1',
    rankingStatus: 'READY',
    displayMode: 'HIGHLIGHTS',
    items: [firstItem],
    ...overrides,
  };
}

function item(
  articleId: string,
  title: string,
  overrides: Partial<NewsHighlightItem> = {}
): NewsHighlightItem {
  return {
    articleId,
    revision: 1,
    contentType: 'NEWS',
    sourceType: 'REGULATOR',
    title,
    excerpt: '测试摘要',
    publisher: '测试媒体',
    canonicalUrl: 'https://example.test/news',
    publishedAt: '2026-08-08T03:30:00.000Z',
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: '2026-08-08T03:31:00.000Z',
    securityCodes: ['600000.SH'],
    providerKeys: ['provider-a'],
    qualityFlags: [],
    impactLevel: 'CRITICAL',
    impactScore: 96,
    reasonCodes: ['AUTHORITATIVE_SOURCE', 'FRESHNESS'],
    corroboratingSourceCount: 1,
    relatedArticleCount: 0,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
