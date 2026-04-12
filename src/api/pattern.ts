import { apiClient } from './client';

// ----------------------------------------------------------------------

// ---- 形态模板 ----

export type PatternTemplate = {
  id: string;
  name: string;
  type: 'reversal_top' | 'reversal_bottom' | 'continuation' | 'bilateral';
  description: string;
  series: number[]; // 标准化价格序列 (0-1)
};

export function getPatternTemplates(): Promise<PatternTemplate[]> {
  return apiClient.post<PatternTemplate[]>('/api/pattern/templates/list', {});
}

// ---- 按股票区间搜索 ----

export type PatternSearchParams = {
  tsCode: string;
  startDate: string; // YYYYMMDD
  endDate: string; // YYYYMMDD
  algorithm?: 'NED' | 'DTW';
  topK?: number;
  scope?: 'ALL' | 'INDEX';
  indexCode?: string;
  lookbackYears?: number;
  excludeSelf?: boolean;
};

export type PatternMatch = {
  tsCode: string;
  stockName: string;
  patternId: string;
  patternName: string;
  matchStartDate: string; // YYYYMMDD
  matchEndDate: string; // YYYYMMDD
  similarity: number; // 0-1
  series: number[]; // 匹配到的标准化价格序列
};

export type PatternSearchResult = {
  matches: PatternMatch[];
  total: number;
};

export function searchPatterns(params: PatternSearchParams): Promise<PatternSearchResult> {
  return apiClient.post<PatternSearchResult>('/api/pattern/search', params);
}

// ---- 按自定义序列搜索 ----

export type SearchBySeriesParams = {
  series: number[]; // 用户输入的标准化价格序列（至少 5 个点）
  algorithm?: 'NED' | 'DTW';
  topK?: number;
  scope?: 'ALL' | 'INDEX';
  indexCode?: string;
  lookbackYears?: number;
};

export function searchBySeries(params: SearchBySeriesParams): Promise<PatternSearchResult> {
  return apiClient.post<PatternSearchResult>('/api/pattern/search-by-series', params);
}
