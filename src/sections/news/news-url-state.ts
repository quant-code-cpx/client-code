import type { NewsArticleListRequest } from 'src/api/news';

export type NewsScope = NewsArticleListRequest['scope'];
export type NewsContentType = NonNullable<NewsArticleListRequest['contentTypes']>[number];
export type NewsSourceType = NonNullable<NewsArticleListRequest['sourceTypes']>[number];

export type NewsUrlState = {
  scope: NewsScope;
  securityCodes: string[];
  keyword: string;
  contentTypes: NewsContentType[];
  sourceTypes: NewsSourceType[];
  from: string | null;
  to: string | null;
  includeUnknownPublishedTime: boolean;
  articleId: string | null;
};

export type NewsFilterErrors = Partial<Record<'keyword' | 'securityCodes' | 'dateRange', string>>;

export type BuildNewsListRequestResult =
  | { ok: true; body: NewsArticleListRequest }
  | { ok: false; errors: NewsFilterErrors };

const VALID_SCOPES = new Set<NewsScope>(['ALL', 'WATCHLIST', 'PORTFOLIO', 'SECURITIES']);
const VALID_CONTENT_TYPES = new Set<NewsContentType>(['NOTICE', 'NEWS', 'FLASH']);
const VALID_SOURCE_TYPES = new Set<NewsSourceType>([
  'REGULATOR',
  'EXCHANGE',
  'COMPANY',
  'MEDIA',
  'INSTITUTION',
  'AGGREGATOR',
  'OTHER',
]);
const SECURITY_CODE_PATTERN = /^\d{6}\.(SH|SZ|BJ)$/;
const ARTICLE_ID_PATTERN = /^[a-z0-9]{20,32}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function uniqueValid<T extends string>(values: string[], allowed: Set<T>): T[] {
  return [...new Set(values.filter((value): value is T => allowed.has(value as T)))];
}

function parseList<T extends string>(raw: string | null, allowed: Set<T>): T[] {
  return raw ? uniqueValid(raw.split(',').filter(Boolean), allowed) : [];
}

function parseSecurityCodes(raw: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').filter((code) => SECURITY_CODE_PATTERN.test(code)))];
}

function toUtcDate(value: string | null): Date | null {
  const match = value?.match(DATE_PATTERN);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

function addUtcDays(date: Date, days: number): string {
  const next = new Date(date.getTime() + days * 86_400_000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate()
  ).padStart(2, '0')}`;
}

export function parseNewsUrlState(params: URLSearchParams): NewsUrlState {
  const rawScope = params.get('scope');
  const rawFrom = params.get('from');
  const rawTo = params.get('to');
  const validRange = rawFrom !== null && rawTo !== null && toUtcDate(rawFrom) && toUtcDate(rawTo);
  const rawArticleId = params.get('article');

  return {
    scope: rawScope && VALID_SCOPES.has(rawScope as NewsScope) ? (rawScope as NewsScope) : 'ALL',
    securityCodes: parseSecurityCodes(params.get('codes')),
    keyword: (params.get('q') ?? '').trim(),
    contentTypes: parseList(params.get('types'), VALID_CONTENT_TYPES),
    sourceTypes: parseList(params.get('sources'), VALID_SOURCE_TYPES),
    from: validRange ? rawFrom : null,
    to: validRange ? rawTo : null,
    includeUnknownPublishedTime: params.get('unknown') === '1',
    articleId: rawArticleId && ARTICLE_ID_PATTERN.test(rawArticleId) ? rawArticleId : null,
  };
}

export function serializeNewsUrlState(state: NewsUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.scope !== 'ALL') params.set('scope', state.scope);
  if (state.securityCodes.length) params.set('codes', state.securityCodes.join(','));
  if (state.keyword.trim()) params.set('q', state.keyword.trim());
  if (state.contentTypes.length) params.set('types', state.contentTypes.join(','));
  if (state.sourceTypes.length) params.set('sources', state.sourceTypes.join(','));
  if (state.from && state.to) {
    params.set('from', state.from);
    params.set('to', state.to);
  }
  if (state.includeUnknownPublishedTime) params.set('unknown', '1');
  if (state.articleId && ARTICLE_ID_PATTERN.test(state.articleId)) {
    params.set('article', state.articleId);
  }
  return params;
}

export function buildNewsListRequest(
  state: NewsUrlState,
  cursor?: string
): BuildNewsListRequestResult {
  const errors: NewsFilterErrors = {};
  const keyword = state.keyword.trim();
  const keywordLength = Array.from(keyword).length;
  if (keyword && (keywordLength < 2 || keywordLength > 64)) {
    errors.keyword = '关键字长度必须为 2～64 个字符';
  }

  const securityCodes = [...new Set(state.securityCodes)];
  if (
    securityCodes.some((code) => !SECURITY_CODE_PATTERN.test(code)) ||
    securityCodes.length > 20 ||
    (state.scope === 'SECURITIES' && securityCodes.length === 0)
  ) {
    errors.securityCodes = '指定证券必须为 1～20 个合法且唯一的 A 股代码';
  }

  let publishedAfter: string | undefined;
  let publishedBefore: string | undefined;
  if (state.from !== null || state.to !== null) {
    const from = toUtcDate(state.from);
    const to = toUtcDate(state.to);
    const inclusiveDays =
      from && to ? Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1 : 0;
    if (!from || !to || inclusiveDays < 1 || inclusiveDays > 90) {
      errors.dateRange = '日期范围必须完整、有效且不超过 90 日';
    } else {
      publishedAfter = `${state.from}T00:00:00.000+08:00`;
      publishedBefore = `${addUtcDays(to, 1)}T00:00:00.000+08:00`;
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const body: NewsArticleListRequest = { scope: state.scope, limit: 30 };
  if (cursor) body.cursor = cursor;
  if (state.scope === 'SECURITIES') body.securityCodes = securityCodes;
  if (keyword) body.keyword = keyword;
  const contentTypes = uniqueValid(state.contentTypes, VALID_CONTENT_TYPES);
  const sourceTypes = uniqueValid(state.sourceTypes, VALID_SOURCE_TYPES);
  if (contentTypes.length) body.contentTypes = contentTypes;
  if (sourceTypes.length) body.sourceTypes = sourceTypes;
  if (publishedAfter && publishedBefore) {
    body.publishedAfter = publishedAfter;
    body.publishedBefore = publishedBefore;
  }
  if (state.includeUnknownPublishedTime) body.includeUnknownPublishedTime = true;

  return { ok: true, body };
}
