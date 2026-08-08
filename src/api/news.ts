import { apiClient } from './client';

import type { components } from './generated/news-api';

type NewsSchemas = components['schemas'];
type GeneratedListRequest = NewsSchemas['NewsArticleListRequestDto'];

export type NewsArticleListRequest = Omit<GeneratedListRequest, 'includeUnknownPublishedTime'> & {
  includeUnknownPublishedTime?: boolean;
};

export type NewsArticleListItem = NewsSchemas['NewsArticleListItemDto'];
export type NewsArticleListResponse = NewsSchemas['NewsArticleListResponseDto'];
export type NewsArticleDetailResponse = NewsSchemas['NewsArticleDetailResponseDto'];
export type NewsCoverageResponse = NewsSchemas['NewsCoverageResponseDto'];
export type NewsCoverageWarning = NewsSchemas['NewsCoverageWarningDto'];
export type NewsFeedCoverage = NewsSchemas['NewsFeedCoverageDto'];

export type NewsHighlightsRequest = {
  scope: 'ALL';
  limit: number;
};

export type NewsImpactReasonCode =
  | 'AUTHORITATIVE_SOURCE'
  | 'BREAKING_EVENT'
  | 'CORROBORATED'
  | 'FRESHNESS'
  | 'MARKET_WIDE'
  | 'SECURITY_RELEVANCE';

export type NewsHighlightItem = NewsArticleListItem & {
  impactLevel: 'CRITICAL' | 'MAJOR' | 'RECENT';
  impactScore: number;
  reasonCodes: NewsImpactReasonCode[];
  corroboratingSourceCount: number;
  relatedArticleCount: number;
};

export type NewsHighlightsResponse = {
  generatedAt: string;
  dataThrough: string | null;
  partial: boolean;
  warnings: NewsCoverageWarning[];
  rankingVersion: 'impact-v1';
  rankingStatus: 'READY' | 'STALE' | 'RECENT_FALLBACK';
  displayMode: 'HIGHLIGHTS' | 'RECENT';
  items: NewsHighlightItem[];
};

export const NEWS_ERROR_CODE = {
  ARTICLE_NOT_FOUND: 7001,
  CURSOR_INVALID: 7002,
  CURSOR_EXPIRED: 7003,
  CURSOR_FILTER_MISMATCH: 7004,
  MODULE_DISABLED: 7014,
} as const;

export class NewsContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsContractError';
  }
}

function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return signal ? apiClient.post<T>(path, body, signal) : apiClient.post<T>(path, body);
}

function compactListRequest(body: NewsArticleListRequest): NewsArticleListRequest {
  const compact: NewsArticleListRequest = {
    scope: body.scope,
    limit: body.limit,
  };

  if (body.cursor) compact.cursor = body.cursor;
  if (body.securityCodes?.length) compact.securityCodes = body.securityCodes;
  if (body.keyword?.trim()) compact.keyword = body.keyword.trim();
  if (body.contentTypes?.length) compact.contentTypes = body.contentTypes;
  if (body.sourceTypes?.length) compact.sourceTypes = body.sourceTypes;
  if (body.publishedAfter) compact.publishedAfter = body.publishedAfter;
  if (body.publishedBefore) compact.publishedBefore = body.publishedBefore;
  if (body.includeUnknownPublishedTime === true) compact.includeUnknownPublishedTime = true;

  return compact;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NewsContractError(`${label} 响应不是对象`);
  }
  return value as Record<string, unknown>;
}

function assertListResponse(value: unknown): asserts value is NewsArticleListResponse {
  const response = requireObject(value, '新闻列表');
  if (!Array.isArray(response.items)) throw new NewsContractError('新闻列表缺少 items');
  if (typeof response.partial !== 'boolean') throw new NewsContractError('新闻列表缺少 partial');
  if (!Array.isArray(response.warnings)) throw new NewsContractError('新闻列表缺少 warnings');
}

function assertDetailResponse(value: unknown): asserts value is NewsArticleDetailResponse {
  const response = requireObject(value, '新闻详情');
  if (typeof response.articleId !== 'string') throw new NewsContractError('新闻详情缺少 articleId');
  if (!response.sources || !response.revisions || !response.coverage) {
    throw new NewsContractError('新闻详情缺少来源、修订或覆盖信息');
  }
}

function assertCoverageResponse(value: unknown): asserts value is NewsCoverageResponse {
  const response = requireObject(value, '新闻覆盖');
  if (typeof response.generatedAt !== 'string')
    throw new NewsContractError('新闻覆盖缺少 generatedAt');
  if (typeof response.partial !== 'boolean') throw new NewsContractError('新闻覆盖缺少 partial');
  if (!Array.isArray(response.warnings) || !Array.isArray(response.feeds)) {
    throw new NewsContractError('新闻覆盖缺少 warnings 或 feeds');
  }
}

function assertHighlightsResponse(value: unknown): asserts value is NewsHighlightsResponse {
  const response = requireObject(value, '首页新闻');
  if (typeof response.generatedAt !== 'string')
    throw new NewsContractError('首页新闻缺少 generatedAt');
  if (!Array.isArray(response.items)) throw new NewsContractError('首页新闻缺少 items');
  if (typeof response.partial !== 'boolean') throw new NewsContractError('首页新闻缺少 partial');
  if (!Array.isArray(response.warnings)) throw new NewsContractError('首页新闻缺少 warnings');
  if (response.rankingVersion !== 'impact-v1')
    throw new NewsContractError('首页新闻 rankingVersion 无效');
  if (!['READY', 'STALE', 'RECENT_FALLBACK'].includes(String(response.rankingStatus)))
    throw new NewsContractError('首页新闻 rankingStatus 无效');
  if (!['HIGHLIGHTS', 'RECENT'].includes(String(response.displayMode)))
    throw new NewsContractError('首页新闻 displayMode 无效');
}

export const newsApi = {
  async getHighlights(
    body: NewsHighlightsRequest,
    signal?: AbortSignal
  ): Promise<NewsHighlightsResponse> {
    const response = await post<NewsHighlightsResponse>(
      '/api/news/articles/highlights',
      { scope: body.scope, limit: body.limit },
      signal
    );
    assertHighlightsResponse(response);
    return response;
  },

  async listArticles(
    body: NewsArticleListRequest,
    signal?: AbortSignal
  ): Promise<NewsArticleListResponse> {
    const response = await post<NewsArticleListResponse>(
      '/api/news/articles/list',
      compactListRequest(body),
      signal
    );
    assertListResponse(response);
    return response;
  },

  async getArticleDetail(
    body: { articleId: string },
    signal?: AbortSignal
  ): Promise<NewsArticleDetailResponse> {
    const response = await post<NewsArticleDetailResponse>(
      '/api/news/articles/detail',
      { articleId: body.articleId },
      signal
    );
    assertDetailResponse(response);
    return response;
  },

  async getCoverage(
    body: Record<string, never> = {},
    signal?: AbortSignal
  ): Promise<NewsCoverageResponse> {
    const response = await post<NewsCoverageResponse>('/api/news/coverage', body, signal);
    assertCoverageResponse(response);
    return response;
  },
};
