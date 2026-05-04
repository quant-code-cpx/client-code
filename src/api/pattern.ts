import { apiClient } from './client';

// ----------------------------------------------------------------------
// 形态模板
// ----------------------------------------------------------------------

/** 后端 templates/list 仅返回 id/name/description/length；type/series/expectedSignal 由前端 meta 补全 */
export type PatternTemplateRaw = {
  id: string;
  name: string;
  description: string;
  length: number;
};

export type PatternTemplateType =
  | 'reversal_top'
  | 'reversal_bottom'
  | 'continuation'
  | 'bilateral';

export type PatternExpectedSignal = 'bullish' | 'bearish' | 'neutral';

/** 前端使用的完整模板（合并后端原始 + 本地 meta） */
export type PatternTemplate = PatternTemplateRaw & {
  type: PatternTemplateType;
  expectedSignal: PatternExpectedSignal;
  series: number[];
};

export const getPatternTemplatesRaw = (): Promise<PatternTemplateRaw[]> =>
  apiClient.post<PatternTemplateRaw[]>('/api/pattern/templates/list', {});

// ----------------------------------------------------------------------
// 搜索（按股票区间）
// 后端语义：用 tsCode + 区间 提取查询样板，向 candidates（ALL/INDEX）找相似
// ----------------------------------------------------------------------

export type PatternAlgorithm = 'NED' | 'DTW';
export type PatternScope = 'ALL' | 'INDEX';

export type PatternSearchParams = {
  tsCode: string;
  startDate: string; // YYYYMMDD
  endDate: string; // YYYYMMDD
  algorithm?: PatternAlgorithm;
  topK?: number;
  scope?: PatternScope;
  indexCode?: string;
  lookbackYears?: number;
  excludeSelf?: boolean;
};

// ----------------------------------------------------------------------
// 搜索（按自定义序列）
// ----------------------------------------------------------------------

export type SearchBySeriesParams = {
  series: number[];
  algorithm?: PatternAlgorithm;
  topK?: number;
  scope?: PatternScope;
  indexCode?: string;
  lookbackYears?: number;
};

// ----------------------------------------------------------------------
// 响应（与后端 PatternMatchDto / PatternSearchResultDto 对齐）
// ----------------------------------------------------------------------

export type PatternMatch = {
  tsCode: string;
  /** 后端字段名是 name；可能为 null */
  name: string | null;
  /** 匹配片段起始日期 YYYYMMDD */
  startDate: string;
  /** 匹配片段截止日期 YYYYMMDD */
  endDate: string;
  /** 距离（越小越相似），保留 6 位 */
  distance: number;
  /** 相似度百分比 0–100（已 ×100） */
  similarity: number;
  /** 匹配片段结束后第 5/10/20 交易日累计涨跌幅（百分比，可能少于 3 个） */
  futureReturns: number[];
  /** 0–1 标准化序列 */
  normalizedSeries: number[];
};

export type PatternSearchResult = {
  patternLength: number;
  algorithm: string;
  candidateCount: number;
  elapsedMs: number;
  querySeries: number[];
  matches: PatternMatch[];
};

export const searchPatterns = (
  params: PatternSearchParams,
  signal?: AbortSignal
): Promise<PatternSearchResult> =>
  apiClient.post<PatternSearchResult>('/api/pattern/search', params, signal);

export const searchBySeries = (
  params: SearchBySeriesParams,
  signal?: AbortSignal
): Promise<PatternSearchResult> =>
  apiClient.post<PatternSearchResult>('/api/pattern/search-by-series', params, signal);
