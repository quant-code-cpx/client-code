import type { ComponentType } from 'react';
import type { components } from 'src/api/generated/news-api';

import { useState } from 'react';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { newsDetailCache } from '../news-detail-cache';

type Schemas = components['schemas'];
type NewsWarning = Schemas['NewsCoverageWarningDto'];
type NewsCoverage = Schemas['NewsCoverageResponseDto'];
type NewsFeedCoverage = Schemas['NewsFeedCoverageDto'];
type NewsDetail = Schemas['NewsArticleDetailResponseDto'];

type NewsCoverageAlertProps = {
  partial: boolean;
  warnings: NewsWarning[];
  dataThrough: string | null;
};

type NewsCoveragePanelProps = {
  coverage: NewsCoverage | null;
  error: unknown | null;
};

type NewsArticleDrawerProps = {
  open: boolean;
  articleId: string | null;
  revision: number;
  onClose: () => void;
};

type NewsCoverageAlertModule = {
  NewsCoverageAlert?: ComponentType<NewsCoverageAlertProps>;
};

type NewsCoveragePanelModule = {
  NewsCoveragePanel?: ComponentType<NewsCoveragePanelProps>;
};

type NewsArticleDrawerModule = {
  NewsArticleDrawer?: ComponentType<NewsArticleDrawerProps>;
};

const mocks = vi.hoisted(() => ({
  getArticleDetail: vi.fn(),
}));

vi.mock('src/api/news', () => ({
  newsApi: {
    getArticleDetail: mocks.getArticleDetail,
  },
}));

const targetFiles = [
  'src/sections/news/components/news-coverage-alert.tsx',
  'src/sections/news/components/news-coverage-panel.tsx',
  'src/sections/news/components/news-article-drawer.tsx',
].map((file) => resolve(process.cwd(), file));
const targetsExist = targetFiles.every(existsSync);

let alertModule: NewsCoverageAlertModule | undefined;
let panelModule: NewsCoveragePanelModule | undefined;
let drawerModule: NewsArticleDrawerModule | undefined;

const warning: NewsWarning = {
  warningId: 'warning-feed-stale-001',
  code: 'FEED_STALE',
  severity: 'WARNING',
  affectsCompleteness: true,
  providerKey: 'fixture-provider',
  providerDisplayName: '测试数据源',
  feedKey: 'fixture-feed',
  feedDisplayName: '测试新闻流',
  publicMessage: '测试新闻流数据暂时滞后',
  dataThrough: '2026-08-05T15:00:00.000Z',
  observedAt: '2026-08-05T15:05:00.000Z',
};

function feed(
  status: NewsFeedCoverage['status'],
  overrides: Partial<NewsFeedCoverage> = {}
): NewsFeedCoverage {
  return {
    providerKey: `provider-${status.toLowerCase()}`,
    providerDisplayName: `${status} 测试源`,
    feedKey: `feed-${status.toLowerCase()}`,
    feedDisplayName: `${status} 测试新闻流`,
    sourceType: 'MEDIA',
    contentTypes: ['NEWS'],
    scheduleMode: 'SCHEDULED',
    requiredForCompleteness: true,
    status,
    lastSuccessfulAt: status === 'DISABLED' ? null : '2026-08-05T15:00:00.000Z',
    dataThrough: status === 'DISABLED' ? null : '2026-08-05T15:00:00.000Z',
    expectedIntervalSeconds: 60,
    freshnessSeconds: status === 'READY' ? 30 : null,
    consecutiveFailures: status === 'DEGRADED' ? 2 : 0,
    potentiallyTruncated: false,
    reasonCode: status === 'DEGRADED' ? 'FEED_STALE' : null,
    publicReason: status === 'DEGRADED' ? '测试新闻流数据暂时滞后' : null,
    ...overrides,
  };
}

function coverage(
  overallStatus: NewsCoverage['overallStatus'],
  feeds: NewsFeedCoverage[],
  overrides: Partial<NewsCoverage> = {}
): NewsCoverage {
  return {
    generatedAt: '2026-08-05T15:05:00.000Z',
    overallStatus,
    dataThrough: overallStatus === 'DISABLED' ? null : '2026-08-05T15:00:00.000Z',
    partial: overallStatus === 'DEGRADED',
    warnings: overallStatus === 'DEGRADED' ? [warning] : [],
    feeds,
    ...overrides,
  };
}

function detail(): NewsDetail {
  return {
    articleId: 'aaaaaaaaaaaaaaaaaaaa',
    revision: 2,
    contentType: 'NEWS',
    sourceType: 'MEDIA',
    title: '虚构新闻详情标题',
    excerpt: '仅用于详情契约测试的虚构摘要',
    publisher: '测试媒体',
    canonicalUrl: 'https://example.test/news/1',
    publishedAt: '2026-08-05T16:30:45.000Z',
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: '2026-08-05T16:31:00.000Z',
    securityCodes: ['600000.SH'],
    providerKeys: ['fixture-provider'],
    qualityFlags: [],
    alternateUrls: [],
    sources: {
      items: [
        {
          providerKey: 'fixture-provider',
          providerDisplayName: '测试数据源',
          feedKey: 'fixture-feed',
          feedDisplayName: '测试新闻流',
          sourceType: 'MEDIA',
          sourceDiscoveredAt: '2026-08-05T16:30:50.000Z',
          firstSeenAt: '2026-08-05T16:31:00.000Z',
          lastSeenAt: '2026-08-05T17:00:00.000Z',
          retrievedAt: '2026-08-05T17:00:01.000Z',
        },
      ],
      total: 21,
      truncated: true,
    },
    revisions: {
      items: [
        {
          revision: 2,
          changedAt: '2026-08-05T16:40:00.000Z',
          changedFields: ['TITLE'],
          title: '虚构新闻详情标题',
          excerpt: '仅用于详情契约测试的虚构摘要',
          publisher: '测试媒体',
          canonicalUrl: 'https://example.test/news/1',
          publishedAt: '2026-08-05T16:30:45.000Z',
          publishedDate: null,
          publishedPrecision: 'SECOND',
        },
      ],
      total: 51,
      truncated: true,
    },
    coverage: coverage('READY', [feed('READY')]),
  };
}

function getComponents() {
  if (
    !alertModule?.NewsCoverageAlert ||
    !panelModule?.NewsCoveragePanel ||
    !drawerModule?.NewsArticleDrawer
  ) {
    throw new Error('coverage/detail 组件必须导出冻结命名 seam');
  }

  return {
    NewsCoverageAlert: alertModule.NewsCoverageAlert,
    NewsCoveragePanel: panelModule.NewsCoveragePanel,
    NewsArticleDrawer: drawerModule.NewsArticleDrawer,
  };
}

beforeAll(async () => {
  if (!targetsExist) return;
  [alertModule, panelModule, drawerModule] = await Promise.all([
    vi.importActual<NewsCoverageAlertModule>('../components/news-coverage-alert'),
    vi.importActual<NewsCoveragePanelModule>('../components/news-coverage-panel'),
    vi.importActual<NewsArticleDrawerModule>('../components/news-article-drawer'),
  ]);
});

beforeEach(() => {
  vi.clearAllMocks();
  newsDetailCache.clear();
});

describe('coverage 与详情 RED 门禁', () => {
  it('NEWS-FE-COVERAGE-RED-001：同时提供 alert、coverage panel 与 detail drawer seam', () => {
    const missingFiles = targetFiles.filter((file) => !existsSync(file));

    expect(missingFiles, 'RED-6 缺少 coverage/detail 生产 seam；测试未直接导入不存在模块').toEqual(
      []
    );
  });
});

describe.runIf(targetsExist)('新闻 coverage 与详情用户可观察契约', () => {
  it('partial 使用不会自动消失的固定状态告警，并展示公开原因和数据截止', () => {
    vi.useFakeTimers();
    try {
      const { NewsCoverageAlert } = getComponents();
      renderWithProviders(
        <NewsCoverageAlert partial warnings={[warning]} dataThrough="2026-08-05T15:00:00.000Z" />
      );

      expect(screen.getByRole('status')).toHaveTextContent('测试新闻流数据暂时滞后');
      expect(screen.getByRole('status')).toHaveTextContent('数据截止 08-05 23:00');

      act(() => vi.advanceTimersByTime(60_000));

      expect(screen.getByRole('status')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('READY/DEGRADED/DISABLED 均显示文字；截断风险明确写“本窗口可能截断”', () => {
    const { NewsCoveragePanel } = getComponents();
    renderWithProviders(
      <>
        <section aria-label="READY coverage">
          <NewsCoveragePanel coverage={coverage('READY', [feed('READY')])} error={null} />
        </section>
        <section aria-label="DEGRADED coverage">
          <NewsCoveragePanel
            coverage={coverage('DEGRADED', [feed('DEGRADED', { potentiallyTruncated: true })])}
            error={null}
          />
        </section>
        <section aria-label="DISABLED coverage">
          <NewsCoveragePanel coverage={coverage('DISABLED', [feed('DISABLED')])} error={null} />
        </section>
      </>
    );

    expect(
      within(screen.getByRole('region', { name: 'READY coverage' })).getAllByText('正常')
    ).not.toHaveLength(0);
    expect(
      within(screen.getByRole('region', { name: 'DEGRADED coverage' })).getAllByText('降级')
    ).not.toHaveLength(0);
    expect(
      within(screen.getByRole('region', { name: 'DISABLED coverage' })).getAllByText('已停用')
    ).not.toHaveLength(0);
    expect(screen.getByText('本窗口可能截断')).toBeInTheDocument();
  });

  it('coverage 独立失败只显示“状态暂不可用”，不吞掉已加载新闻', () => {
    const { NewsCoveragePanel } = getComponents();
    renderWithProviders(
      <>
        <main>新闻列表仍可阅读</main>
        <NewsCoveragePanel coverage={null} error={new Error('coverage 500')} />
      </>
    );

    expect(screen.getByText('新闻列表仍可阅读')).toBeInTheDocument();
    expect(screen.getByText('状态暂不可用')).toBeInTheDocument();
    expect(screen.queryByText('正常')).not.toBeInTheDocument();
  });

  it('详情把 sourceDiscoveredAt 标为来源发现时间，并分别提示 sources/revisions 截断', async () => {
    const { NewsArticleDrawer } = getComponents();
    mocks.getArticleDetail.mockResolvedValueOnce(detail());
    renderWithProviders(
      <NewsArticleDrawer open articleId="aaaaaaaaaaaaaaaaaaaa" revision={2} onClose={vi.fn()} />
    );

    expect(await screen.findByText('虚构新闻详情标题')).toBeInTheDocument();
    expect(screen.getByText('来源发现时间 08-06 00:30')).toBeInTheDocument();
    expect(screen.queryByText(/来源发布时间/)).not.toBeInTheDocument();
    expect(screen.getByText(/来源.*(截断|仅显示)/)).toBeInTheDocument();
    expect(screen.getByText(/修订.*(截断|仅显示)/)).toBeInTheDocument();
    expect(mocks.getArticleDetail).toHaveBeenCalledWith(
      { articleId: 'aaaaaaaaaaaaaaaaaaaa' },
      expect.any(AbortSignal)
    );
  });

  it('详情只按数字 code=7001 显示“文章不存在或已不可用”，Drawer 壳仍保留', async () => {
    const { NewsArticleDrawer } = getComponents();
    const notFound = Object.assign(new Error('服务端文案可以改变'), {
      name: 'ApiError',
      code: 7001,
      status: 404,
      requestId: 'req-detail-7001',
    });
    mocks.getArticleDetail.mockRejectedValueOnce(notFound);
    renderWithProviders(
      <NewsArticleDrawer open articleId="aaaaaaaaaaaaaaaaaaaa" revision={1} onClose={vi.fn()} />
    );

    expect(await screen.findByText('文章不存在或已不可用')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('服务端文案可以改变')).not.toBeInTheDocument();
  });

  it('NEWS-FE-UI-015：可重试错误保留 Drawer，并由用户显式重试', async () => {
    const { NewsArticleDrawer } = getComponents();
    mocks.getArticleDetail
      .mockRejectedValueOnce(new Error('暂时失败'))
      .mockResolvedValueOnce(detail());
    const { user } = renderWithProviders(
      <NewsArticleDrawer open articleId="aaaaaaaaaaaaaaaaaaaa" revision={2} onClose={vi.fn()} />
    );

    expect(await screen.findByText('新闻详情加载失败')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试加载详情' }));

    expect(await screen.findByText('虚构新闻详情标题')).toBeInTheDocument();
    expect(mocks.getArticleDetail).toHaveBeenCalledTimes(2);
  });

  it('NEWS-FE-UI-009：关闭再打开同 revision 命中详情缓存，不重复请求', async () => {
    const { NewsArticleDrawer } = getComponents();
    mocks.getArticleDetail.mockResolvedValueOnce(detail());

    function Harness() {
      const [isOpen, setIsOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            重新打开
          </button>
          <NewsArticleDrawer
            open={isOpen}
            articleId="aaaaaaaaaaaaaaaaaaaa"
            revision={2}
            onClose={() => setIsOpen(false)}
          />
        </>
      );
    }

    const { user } = renderWithProviders(<Harness />);
    expect(await screen.findByText('虚构新闻详情标题')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭新闻详情' }));
    await user.click(screen.getByRole('button', { name: '重新打开' }));
    expect(await screen.findByText('虚构新闻详情标题')).toBeInTheDocument();
    expect(mocks.getArticleDetail).toHaveBeenCalledTimes(1);
  });

  it('关闭 Drawer 会 abort 尚未完成的详情请求', async () => {
    const { NewsArticleDrawer } = getComponents();
    let open = true;
    mocks.getArticleDetail.mockReturnValueOnce(new Promise<NewsDetail>(() => {}));

    function Harness() {
      const [isOpen, setIsOpen] = useState(open);
      open = isOpen;
      return (
        <NewsArticleDrawer
          open={isOpen}
          articleId="aaaaaaaaaaaaaaaaaaaa"
          revision={1}
          onClose={() => setIsOpen(false)}
        />
      );
    }

    const { user } = renderWithProviders(<Harness />);
    await waitFor(() => expect(mocks.getArticleDetail).toHaveBeenCalledTimes(1));
    const signal = mocks.getArticleDetail.mock.calls[0][1] as AbortSignal;

    await user.click(screen.getByRole('button', { name: '关闭新闻详情' }));

    await waitFor(() => expect(open).toBe(false));
    expect(signal.aborted).toBe(true);
  });
});
