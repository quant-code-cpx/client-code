import type { NewsHighlightsResponse } from 'src/api/news';
import type { ValidateBacktestRunResponse } from 'src/api/backtest';
import type { IndustryDictMappingResponse } from 'src/api/industry-dict';

export const backtestValidationMock = {
  isValid: true,
  warnings: [],
  errors: [],
  dataReadiness: {
    hasDaily: true,
    hasAdjFactor: true,
    hasTradeCal: true,
    hasIndexDaily: true,
    hasStkLimit: true,
    hasSuspendD: true,
    hasIndexWeight: true,
  },
  stats: {
    tradingDays: 242,
    estimatedUniverseSize: 5200,
    earliestAvailableDate: '2020-01-02',
    latestAvailableDate: '2026-08-12',
  },
} satisfies ValidateBacktestRunResponse;

export const newsHighlightsMock = {
  generatedAt: '2026-08-12T08:00:00.000Z',
  dataThrough: '2026-08-12T07:55:00.000Z',
  partial: false,
  warnings: [],
  rankingVersion: 'impact-v1',
  rankingStatus: 'READY',
  displayMode: 'HIGHLIGHTS',
  items: [
    {
      articleId: 'demo-market-highlight-01',
      revision: 1,
      contentType: 'NEWS',
      sourceType: 'REGULATOR',
      title: '示例：盘后市场信息已完成多源校验',
      excerpt: '该内容仅用于演示首页重磅新闻的完整展示状态。',
      publisher: 'Demo 数据源',
      canonicalUrl: null,
      publishedAt: '2026-08-12T07:50:00.000Z',
      publishedDate: null,
      publishedPrecision: 'SECOND',
      firstSeenAt: '2026-08-12T07:51:00.000Z',
      securityCodes: [],
      providerKeys: ['demo-provider'],
      qualityFlags: [],
      impactLevel: 'MAJOR',
      impactScore: 88,
      reasonCodes: ['AUTHORITATIVE_SOURCE', 'MARKET_WIDE'],
      corroboratingSourceCount: 2,
      relatedArticleCount: 1,
    },
  ],
} satisfies NewsHighlightsResponse;

export const industryDictMappingMock = {
  source: 'sw_l1',
  target: 'dc_industry',
  version: 'SW2021',
  tradeDate: '20260427',
  coverage: {
    total: 3,
    matched: 2,
    unmatched: 1,
    matchRate: 2 / 3,
    listedStockCount: 5510,
    listedStockMappedCount: 5491,
    listedStockMappedRate: 0.9966,
  },
  items: [
    {
      swCode: '801120.SI',
      swName: '食品饮料',
      dcTsCode: 'BK0438.DC',
      dcBoardCode: 'BK0438',
      dcName: '食品饮料',
      matchType: 'exact',
      confidence: 1,
    },
    {
      swCode: '801780.SI',
      swName: '银行',
      dcTsCode: 'BK1283.DC',
      dcBoardCode: 'BK1283',
      dcName: '银行',
      matchType: 'exact',
      confidence: 1,
    },
    {
      swCode: '801050.SI',
      swName: '有色金属',
      dcTsCode: null,
      dcBoardCode: null,
      dcName: null,
      matchType: 'none',
      confidence: 0,
    },
  ],
} satisfies IndustryDictMappingResponse;
