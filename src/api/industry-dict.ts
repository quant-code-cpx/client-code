import { apiClient } from './client';

// ── Types ───────────────────────────────────────────────────────

export type IndustryDictMappingCoverage = {
  total: number;
  matched: number;
  unmatched: number;
  matchRate: number;
  listedStockCount: number;
  listedStockMappedCount: number;
  listedStockMappedRate: number;
};

export type IndustryDictMappingItem = {
  swCode: string;
  swName: string;
  dcTsCode: string | null;
  dcBoardCode: string | null;
  dcName: string | null;
  matchType: 'exact' | 'override' | 'candidate' | 'none';
  confidence: number;
};

export type IndustryDictMappingResponse = {
  source: 'sw_l1';
  target: 'dc_industry';
  version: string | null;
  tradeDate: string | null;
  coverage: IndustryDictMappingCoverage;
  items: IndustryDictMappingItem[];
};

// ── API ─────────────────────────────────────────────────────────

export function fetchIndustryDictMapping() {
  return apiClient.post<IndustryDictMappingResponse>('/api/industry/dict-mapping', {
    source: 'sw_l1',
    target: 'dc_industry',
    includeUnmatched: true,
  });
}
