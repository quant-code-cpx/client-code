import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import type { components } from '../generated/news-api';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

type Schemas = components['schemas'];
type GeneratedListRequest = Schemas['NewsArticleListRequestDto'];
type NewsArticleListRequest = Omit<GeneratedListRequest, 'includeUnknownPublishedTime'> & {
  includeUnknownPublishedTime?: boolean;
};
type NewsArticleListResponse = Schemas['NewsArticleListResponseDto'];
type NewsArticleDetailResponse = Schemas['NewsArticleDetailResponseDto'];
type NewsCoverageResponse = Schemas['NewsCoverageResponseDto'];

type NewsApiContract = {
  listArticles: (
    body: NewsArticleListRequest,
    signal?: AbortSignal
  ) => Promise<NewsArticleListResponse>;
  getArticleDetail: (
    body: { articleId: string },
    signal?: AbortSignal
  ) => Promise<NewsArticleDetailResponse>;
  getCoverage: (body: Record<string, never>, signal?: AbortSignal) => Promise<NewsCoverageResponse>;
};

type NewsApiModule = {
  newsApi?: NewsApiContract;
};

const targetFile = resolve(process.cwd(), 'src/api/news.ts');
const targetExists = existsSync(targetFile);

let loadedModule: NewsApiModule | undefined;

const warning: Schemas['NewsCoverageWarningDto'] = {
  warningId: 'warning-feed-stale-001',
  code: 'FEED_STALE',
  severity: 'WARNING',
  affectsCompleteness: true,
  providerKey: 'fixture-provider',
  providerDisplayName: '测试数据源',
  feedKey: 'fixture-feed',
  feedDisplayName: '测试新闻流',
  publicMessage: '该测试源暂时滞后',
  dataThrough: '2026-08-05T15:00:00.000Z',
  observedAt: '2026-08-05T15:05:00.000Z',
};

const listItem: Schemas['NewsArticleListItemDto'] = {
  articleId: 'abcdefghijklmnopqrst',
  revision: 1,
  contentType: 'NEWS',
  sourceType: 'MEDIA',
  title: '虚构半导体新闻标题',
  excerpt: '仅用于契约测试的虚构摘要',
  publisher: '测试媒体',
  canonicalUrl: 'https://example.test/news/1',
  publishedAt: '2026-08-05T14:30:45.000Z',
  publishedDate: null,
  publishedPrecision: 'SECOND',
  firstSeenAt: '2026-08-05T14:31:00.000Z',
  securityCodes: ['600000.SH'],
  providerKeys: ['fixture-provider'],
  qualityFlags: [],
};

const listResponse: NewsArticleListResponse = {
  items: [listItem],
  nextCursor: 'opaque.cursor+/=',
  dataThrough: '2026-08-05T15:00:00.000Z',
  partial: true,
  warnings: [warning],
};

const coverageResponse: NewsCoverageResponse = {
  generatedAt: '2026-08-05T15:05:00.000Z',
  overallStatus: 'DEGRADED',
  dataThrough: '2026-08-05T15:00:00.000Z',
  partial: true,
  warnings: [warning],
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
      status: 'DEGRADED',
      lastSuccessfulAt: '2026-08-05T15:00:00.000Z',
      dataThrough: '2026-08-05T15:00:00.000Z',
      expectedIntervalSeconds: 60,
      freshnessSeconds: 300,
      consecutiveFailures: 2,
      potentiallyTruncated: false,
      reasonCode: 'FEED_STALE',
      publicReason: '该测试源暂时滞后',
    },
  ],
};

const detailResponse: NewsArticleDetailResponse = {
  ...listItem,
  alternateUrls: ['https://example.test/news/1-copy'],
  sources: {
    items: [
      {
        providerKey: 'fixture-provider',
        providerDisplayName: '测试数据源',
        feedKey: 'fixture-feed',
        feedDisplayName: '测试新闻流',
        sourceType: 'MEDIA',
        sourceDiscoveredAt: '2026-08-05T14:30:50.000Z',
        firstSeenAt: '2026-08-05T14:31:00.000Z',
        lastSeenAt: '2026-08-05T15:00:00.000Z',
        retrievedAt: '2026-08-05T15:00:01.000Z',
      },
    ],
    total: 1,
    truncated: false,
  },
  revisions: {
    items: [
      {
        revision: 1,
        changedAt: '2026-08-05T14:31:00.000Z',
        changedFields: ['TITLE'],
        title: listItem.title,
        excerpt: listItem.excerpt,
        publisher: listItem.publisher,
        canonicalUrl: listItem.canonicalUrl,
        publishedAt: listItem.publishedAt,
        publishedDate: listItem.publishedDate,
        publishedPrecision: listItem.publishedPrecision,
      },
    ],
    total: 1,
    truncated: false,
  },
  coverage: coverageResponse,
};

function getNewsApi(): NewsApiContract {
  if (!loadedModule?.newsApi) throw new Error('news.ts 必须导出 newsApi 契约门面');
  return loadedModule.newsApi;
}

function mockPost() {
  return vi.mocked(apiClient.post);
}

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<NewsApiModule>('../news');
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('新闻 API adapter RED 门禁', () => {
  it('NEWS-FE-API-RED-001：提供独立 news adapter，而不是从测试导入不存在模块', () => {
    expect(targetExists, '缺少计划中的 src/api/news.ts，RED-2 生产 seam 尚未实现').toBe(true);
  });
});

describe.runIf(targetExists)('新闻 API adapter 契约', () => {
  it('导出统一 newsApi 门面', () => {
    expect(loadedModule?.newsApi).toMatchObject({
      listArticles: expect.any(Function),
      getArticleDetail: expect.any(Function),
      getCoverage: expect.any(Function),
    });
  });

  it('NEWS-FE-API-001：首次列表只 POST 固定路径、默认 scope 和 30 条', async () => {
    const signal = new AbortController().signal;
    mockPost().mockResolvedValueOnce(listResponse);

    const result = await getNewsApi().listArticles({ scope: 'ALL', limit: 30 }, signal);

    expect(mockPost()).toHaveBeenCalledWith(
      '/api/news/articles/list',
      { scope: 'ALL', limit: 30 },
      signal
    );
    expect(result).toBe(listResponse);
  });

  it('NEWS-FE-API-002：完整筛选精确映射，空值和 false unknown 均省略', async () => {
    mockPost().mockResolvedValue(listResponse);

    await getNewsApi().listArticles({
      scope: 'SECURITIES',
      limit: 30,
      securityCodes: ['600000.SH', '000001.SZ'],
      keyword: '半导体',
      contentTypes: ['NEWS', 'NOTICE'],
      sourceTypes: ['MEDIA', 'EXCHANGE'],
      publishedAfter: '2026-08-01T00:00:00.000+08:00',
      publishedBefore: '2026-08-07T00:00:00.000+08:00',
      includeUnknownPublishedTime: true,
    });
    await getNewsApi().listArticles({
      scope: 'ALL',
      limit: 30,
      securityCodes: [],
      keyword: '',
      contentTypes: [],
      sourceTypes: [],
      includeUnknownPublishedTime: false,
    });

    expect(mockPost()).toHaveBeenNthCalledWith(1, '/api/news/articles/list', {
      scope: 'SECURITIES',
      limit: 30,
      securityCodes: ['600000.SH', '000001.SZ'],
      keyword: '半导体',
      contentTypes: ['NEWS', 'NOTICE'],
      sourceTypes: ['MEDIA', 'EXCHANGE'],
      publishedAfter: '2026-08-01T00:00:00.000+08:00',
      publishedBefore: '2026-08-07T00:00:00.000+08:00',
      includeUnknownPublishedTime: true,
    });
    expect(mockPost()).toHaveBeenNthCalledWith(2, '/api/news/articles/list', {
      scope: 'ALL',
      limit: 30,
    });
  });

  it('NEWS-FE-API-003：翻页只增加并原样传递 opaque cursor', async () => {
    mockPost().mockResolvedValueOnce(listResponse);

    await getNewsApi().listArticles({
      scope: 'ALL',
      limit: 30,
      cursor: 'opaque.cursor+/=',
    });

    expect(mockPost()).toHaveBeenCalledWith('/api/news/articles/list', {
      scope: 'ALL',
      limit: 30,
      cursor: 'opaque.cursor+/=',
    });
  });

  it('NEWS-FE-API-004：详情 ID 只放 POST Body，不进入 path 或 query', async () => {
    mockPost().mockResolvedValueOnce(detailResponse);

    const result = await getNewsApi().getArticleDetail({
      articleId: 'abcdefghijklmnopqrst',
    });

    expect(mockPost()).toHaveBeenCalledWith('/api/news/articles/detail', {
      articleId: 'abcdefghijklmnopqrst',
    });
    expect(result).toBe(detailResponse);
  });

  it('NEWS-FE-API-005：coverage 使用固定 POST 路径和空 Body，并保留六字段包络', async () => {
    mockPost().mockResolvedValueOnce(coverageResponse);

    const result = await getNewsApi().getCoverage({});

    expect(mockPost()).toHaveBeenCalledWith('/api/news/coverage', {});
    expect(result).toEqual(coverageResponse);
    expect(Object.keys(result).sort()).toEqual(
      ['generatedAt', 'overallStatus', 'dataThrough', 'partial', 'warnings', 'feeds'].sort()
    );
  });

  it('NEWS-FE-API-006：list、detail、coverage 均原样透传各自 AbortSignal', async () => {
    const listSignal = new AbortController().signal;
    const detailSignal = new AbortController().signal;
    const coverageSignal = new AbortController().signal;
    mockPost()
      .mockResolvedValueOnce(listResponse)
      .mockResolvedValueOnce(detailResponse)
      .mockResolvedValueOnce(coverageResponse);

    await getNewsApi().listArticles({ scope: 'ALL', limit: 30 }, listSignal);
    await getNewsApi().getArticleDetail({ articleId: 'abcdefghijklmnopqrst' }, detailSignal);
    await getNewsApi().getCoverage({}, coverageSignal);

    expect(mockPost()).toHaveBeenNthCalledWith(
      1,
      '/api/news/articles/list',
      { scope: 'ALL', limit: 30 },
      listSignal
    );
    expect(mockPost()).toHaveBeenNthCalledWith(
      2,
      '/api/news/articles/detail',
      { articleId: 'abcdefghijklmnopqrst' },
      detailSignal
    );
    expect(mockPost()).toHaveBeenNthCalledWith(3, '/api/news/coverage', {}, coverageSignal);
  });

  it('NEWS-FE-API-007：partial、warning 标识和 dataThrough 不被 adapter 丢失', async () => {
    mockPost().mockResolvedValueOnce(listResponse);

    const result = await getNewsApi().listArticles({ scope: 'ALL', limit: 30 });

    expect(result).toMatchObject({
      items: listResponse.items,
      partial: true,
      dataThrough: '2026-08-05T15:00:00.000Z',
      warnings: [
        expect.objectContaining({
          warningId: 'warning-feed-stale-001',
          affectsCompleteness: true,
        }),
      ],
    });
  });

  it('NEWS-FE-API-008：把 apiClient 返回值视为已解包 DTO，不再次读取 data', async () => {
    const alreadyUnwrapped = {
      ...listResponse,
      data: { ...listResponse, items: [] },
    };
    mockPost().mockResolvedValueOnce(alreadyUnwrapped);

    const result = await getNewsApi().listArticles({ scope: 'ALL', limit: 30 });

    expect(result.items).toEqual([listItem]);
    expect(result).not.toBe(alreadyUnwrapped.data);
  });

  it('NEWS-FE-API-009：数字业务错误原样向上抛出，不依赖 message 文本', async () => {
    const cases = [
      { code: 7001, status: 404, requestId: 'req-7001' },
      { code: 7002, status: 400, requestId: 'req-7002' },
      { code: 7003, status: 410, requestId: 'req-7003' },
      { code: 7004, status: 409, requestId: 'req-7004' },
    ] as const;

    for (const item of cases) {
      const error = Object.assign(new Error('此文案可变化，调用方不得解析'), {
        name: 'ApiError',
        code: item.code,
        status: item.status,
        requestId: item.requestId,
        details: { internalProviderToken: 'sensitive-fixture' },
      });
      mockPost().mockRejectedValueOnce(error);

      const request =
        item.code === 7001
          ? getNewsApi().getArticleDetail({ articleId: 'abcdefghijklmnopqrst' })
          : getNewsApi().listArticles({ scope: 'ALL', limit: 30, cursor: 'opaque' });

      await expect(request).rejects.toBe(error);
    }
  });

  it('NEWS-FE-API-010：兼容未知响应字段，但缺少必需字段产生可观察契约错误', async () => {
    mockPost()
      .mockResolvedValueOnce({ ...listResponse, experimentalMeta: { version: 2 } })
      .mockResolvedValueOnce({
        items: listResponse.items,
        nextCursor: null,
        dataThrough: null,
        warnings: [],
      });

    await expect(getNewsApi().listArticles({ scope: 'ALL', limit: 30 })).resolves.toMatchObject(
      listResponse
    );
    await expect(getNewsApi().listArticles({ scope: 'ALL', limit: 30 })).rejects.toMatchObject({
      name: 'NewsContractError',
    });
  });
});
