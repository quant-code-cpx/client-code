import type { ComponentType } from 'react';
import type {
  NewsArticleListItem,
  NewsCoverageResponse,
  NewsArticleDetailResponse,
} from 'src/api/news';

import { Fragment } from 'react';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { useLocation } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';

import { newsApi } from 'src/api/news';
import { renderWithProviders } from 'src/test/test-utils';

import type { UseNewsFeedResult } from '../hooks/use-news-feed';

type NewsFeedViewModule = {
  NewsFeedView?: ComponentType;
};

type UseNewsCoverageResult = {
  coverage: NewsCoverageResponse | null;
  status: 'loading' | 'ready' | 'error';
  loading: boolean;
  error: unknown | null;
  refresh: () => void | Promise<void>;
};

const mocks = vi.hoisted(() => ({
  useNewsFeed: vi.fn(),
  useNewsCoverage: vi.fn(),
  loadMore: vi.fn(),
  refreshFeed: vi.fn(),
  refreshCoverage: vi.fn(),
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
  }) => (
    <div>
      {data.map((item, index) => (
        <Fragment key={index}>{itemContent(index, item)}</Fragment>
      ))}
    </div>
  ),
}));

vi.mock('src/sections/news/hooks/use-news-feed', () => ({
  useNewsFeed: mocks.useNewsFeed,
}));

vi.mock('src/sections/news/hooks/use-news-coverage', () => ({
  useNewsCoverage: mocks.useNewsCoverage,
}));

const targetFile = resolve(process.cwd(), 'src/sections/news/view/news-feed-view.tsx');
const targetExists = existsSync(targetFile);

let loadedModule: NewsFeedViewModule | undefined;

const normalArticle: NewsArticleListItem = {
  articleId: 'aaaaaaaaaaaaaaaaaaaa',
  revision: 1,
  contentType: 'NEWS',
  sourceType: 'MEDIA',
  title: '虚构半导体新闻标题',
  excerpt: '仅用于页面编排测试的虚构摘要',
  publisher: '测试媒体',
  canonicalUrl: 'https://example.test/news/1',
  publishedAt: '2026-08-05T16:30:45.000Z',
  publishedDate: null,
  publishedPrecision: 'SECOND',
  firstSeenAt: '2026-08-05T16:31:00.000Z',
  securityCodes: ['600000.SH'],
  providerKeys: ['fixture-provider'],
  qualityFlags: [],
};

function coverage(): NewsCoverageResponse {
  return {
    generatedAt: '2026-08-05T17:05:00.000Z',
    overallStatus: 'READY',
    dataThrough: '2026-08-05T17:00:00.000Z',
    partial: false,
    warnings: [],
    feeds: [
      {
        providerKey: 'fixture-provider',
        providerDisplayName: '测试数据源',
        feedKey: 'fixture-feed',
        feedDisplayName: '测试新闻流',
        sourceType: 'MEDIA',
        contentTypes: ['NEWS'],
        scheduleMode: 'SCHEDULED',
        requiredForCompleteness: true,
        status: 'READY',
        lastSuccessfulAt: '2026-08-05T17:00:00.000Z',
        dataThrough: '2026-08-05T17:00:00.000Z',
        expectedIntervalSeconds: 60,
        freshnessSeconds: 30,
        consecutiveFailures: 0,
        potentiallyTruncated: false,
        reasonCode: null,
        publicReason: null,
      },
    ],
  };
}

function detail(): NewsArticleDetailResponse {
  return {
    ...normalArticle,
    title: '虚构新闻详情标题',
    alternateUrls: [],
    sources: { items: [], total: 0, truncated: false },
    revisions: { items: [], total: 0, truncated: false },
    coverage: coverage(),
  };
}

function feedResult(overrides: Partial<UseNewsFeedResult> = {}): UseNewsFeedResult {
  return {
    items: [normalArticle],
    status: 'ready',
    error: null,
    hasMore: false,
    loadingMore: false,
    loadMoreError: null,
    refreshing: false,
    refreshError: null,
    hasNewItems: false,
    partial: false,
    warnings: [],
    dataThrough: '2026-08-05T17:00:00.000Z',
    loadMore: mocks.loadMore,
    refresh: mocks.refreshFeed,
    ...overrides,
  };
}

function coverageResult(overrides: Partial<UseNewsCoverageResult> = {}): UseNewsCoverageResult {
  return {
    coverage: coverage(),
    status: 'ready',
    loading: false,
    error: null,
    refresh: mocks.refreshCoverage,
    ...overrides,
  };
}

function getNewsFeedView() {
  if (!loadedModule?.NewsFeedView) {
    throw new Error('news-feed-view.tsx 必须导出 NewsFeedView');
  }
  return loadedModule.NewsFeedView;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderView(initialEntry = '/market/news') {
  const NewsFeedView = getNewsFeedView();
  return renderWithProviders(
    <>
      <NewsFeedView />
      <LocationProbe />
    </>,
    { initialEntries: [initialEntry] }
  );
}

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<NewsFeedViewModule>('../view/news-feed-view');
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useNewsFeed.mockReturnValue(feedResult());
  mocks.useNewsCoverage.mockReturnValue(coverageResult());
  vi.spyOn(newsApi, 'getArticleDetail').mockResolvedValue(detail());
});

describe('新闻页面 View RED 门禁', () => {
  it('NEWS-FE-VIEW-RED-001：提供业务场景编排用 NewsFeedView seam', () => {
    expect(
      targetExists,
      '缺少计划中的 src/sections/news/view/news-feed-view.tsx，页面业务编排尚未实现'
    ).toBe(true);
  });
});

describe.runIf(targetExists)('NewsFeedView 业务场景', () => {
  it('正常列表与 coverage 独立展示，并使用合同默认列表 Body', () => {
    renderView();

    expect(screen.getByRole('heading', { name: '新闻时事' })).toBeInTheDocument();
    expect(screen.getByText('虚构半导体新闻标题')).toBeInTheDocument();
    expect(screen.getByText('测试新闻流')).toBeInTheDocument();
    expect(screen.getByText('数据覆盖')).toBeInTheDocument();
    expect(mocks.useNewsFeed).toHaveBeenCalledWith({ scope: 'ALL', limit: 30 });
    expect(mocks.useNewsCoverage).toHaveBeenCalled();
  });

  it('列表成功空数组显示真空态，coverage 仍然可见', () => {
    mocks.useNewsFeed.mockReturnValue(
      feedResult({ items: [], status: 'empty', hasMore: false, dataThrough: null })
    );

    renderView();

    expect(screen.getByText('当前筛选没有新闻')).toBeInTheDocument();
    expect(screen.getByText('测试新闻流')).toBeInTheDocument();
    expect(screen.queryByText(/新闻加载失败/)).not.toBeInTheDocument();
  });

  it('列表失败显示主区错误，但 coverage 侧栏仍展示真实状态', () => {
    const listError = Object.assign(new Error('列表请求失败'), {
      requestId: 'req-news-list-001',
    });
    mocks.useNewsFeed.mockReturnValue(
      feedResult({ items: [], status: 'error', error: listError, hasMore: false })
    );

    renderView();

    expect(screen.getByRole('alert')).toHaveTextContent('新闻加载失败');
    expect(screen.getByText('测试新闻流')).toBeInTheDocument();
    expect(screen.queryByText('当前筛选没有新闻')).not.toBeInTheDocument();
  });

  it('模块安全默认关闭时明确提示未启用，不泄露服务端 message', () => {
    const disabled = Object.assign(new Error('内部部署文案不可直接展示'), {
      code: 7014,
      requestId: 'req-news-disabled-001',
    });
    mocks.useNewsFeed.mockReturnValue(
      feedResult({ items: [], status: 'error', error: disabled, hasMore: false })
    );

    renderView();

    expect(screen.getByRole('alert')).toHaveTextContent('新闻模块尚未启用');
    expect(screen.queryByText('内部部署文案不可直接展示')).not.toBeInTheDocument();
  });

  it('点击卡片写入 article 参数并打开详情；关闭后移除参数', async () => {
    const { user } = renderView();

    await user.click(screen.getByRole('button', { name: '打开新闻详情：虚构半导体新闻标题' }));

    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?article=aaaaaaaaaaaaaaaaaaaa'
      )
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('虚构新闻详情标题')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭新闻详情' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });

  it('存在 nextCursor 时“加载更多”只调用 feed hook 动作', async () => {
    mocks.useNewsFeed.mockReturnValue(feedResult({ hasMore: true }));
    const { user } = renderView();

    await user.click(screen.getByRole('button', { name: '加载更多' }));

    expect(mocks.loadMore).toHaveBeenCalledTimes(1);
  });

  it('NEWS-FE-STATE-009：页头刷新调用列表 refresh 与 coverage refresh，不卸载旧列表', async () => {
    const { user } = renderView();

    await user.click(screen.getByRole('button', { name: '刷新' }));

    expect(screen.getByText('虚构半导体新闻标题')).toBeInTheDocument();
    expect(mocks.refreshFeed).toHaveBeenCalledTimes(1);
    expect(mocks.refreshCoverage).toHaveBeenCalledTimes(1);
  });

  it('NEWS-FE-STATE-014：探测到新内容只显示静态提示，由用户决定刷新', async () => {
    mocks.useNewsFeed.mockReturnValue(feedResult({ hasNewItems: true }));
    const { user } = renderView();

    expect(screen.getByText(/有新内容，不会自动改变当前位置/)).toBeInTheDocument();
    expect(screen.getByText('虚构半导体新闻标题')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看新内容' }));

    expect(mocks.refreshFeed).toHaveBeenCalledTimes(1);
  });

  it('NEWS-FE-STATE-009：刷新失败提示可见，旧列表仍可操作', () => {
    mocks.useNewsFeed.mockReturnValue(feedResult({ refreshError: new Error('刷新失败') }));

    renderView();

    expect(screen.getByRole('alert')).toHaveTextContent('刷新失败，已保留当前新闻');
    expect(screen.getByText('虚构半导体新闻标题')).toBeInTheDocument();
  });

  it('合法筛选 URL 精确恢复为列表 Body，article 不混入列表请求', async () => {
    const params = new URLSearchParams({
      scope: 'SECURITIES',
      codes: '600000.SH,000001.SZ',
      q: '半导体',
      types: 'NEWS,NOTICE',
      sources: 'MEDIA',
      from: '2026-08-01',
      to: '2026-08-06',
      unknown: '1',
      article: 'aaaaaaaaaaaaaaaaaaaa',
    });

    renderView(`/market/news?${params.toString()}`);

    expect(mocks.useNewsFeed).toHaveBeenCalledWith({
      scope: 'SECURITIES',
      limit: 30,
      securityCodes: ['600000.SH', '000001.SZ'],
      keyword: '半导体',
      contentTypes: ['NEWS', 'NOTICE'],
      sourceTypes: ['MEDIA'],
      publishedAfter: '2026-08-01T00:00:00.000+08:00',
      publishedBefore: '2026-08-07T00:00:00.000+08:00',
      includeUnknownPublishedTime: true,
    });
    expect(await screen.findByText('虚构新闻详情标题')).toBeInTheDocument();
  });
});
