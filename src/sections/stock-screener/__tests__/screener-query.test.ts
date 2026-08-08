import type { ScreenerStrategy, ScreenerPresetWithType } from 'src/api/screener';

import { SORT_OPTIONS, SCREENER_PAGE_SIZE_OPTIONS } from '../constants';
import { FILTER_GROUPS, VISIBLE_FILTER_CONTROL_COUNT } from '../screener-filter-panel';
import {
  buildScreenerRequest,
  DEFAULT_EXECUTED_QUERY,
  resolveStrategySelection,
  HISTORICAL_COMPATIBILITY_KEYS,
  preserveHistoricalCompatibilityKeys,
} from '../screener-query';

describe('选股器请求契约', () => {
  it('保存重构前默认 Body 快照，重构后保持完全一致', () => {
    expect(buildScreenerRequest(DEFAULT_EXECUTED_QUERY)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });
  });

  it('保持筛选平铺、服务端 1 基页和指定分页排序', () => {
    expect(
      buildScreenerRequest({
        filters: { minPeTtm: 5, maxPeTtm: 15, northboundOnly: true },
        page: 2,
        rowsPerPage: 50,
        sortBy: 'dvTtm',
        sortOrder: 'asc',
      })
    ).toEqual({
      minPeTtm: 5,
      maxPeTtm: 15,
      northboundOnly: true,
      page: 3,
      pageSize: 50,
      sortBy: 'dvTtm',
      sortOrder: 'asc',
    });
  });

  it('读取内置预设声明排序并从筛选 Body 移除兼容排序键', () => {
    const preset: ScreenerPresetWithType = {
      id: 'dividend',
      name: '高股息',
      description: '',
      type: 'builtin',
      filters: { minDvTtm: 3, maxPeTtm: 20, sortBy: 'dvTtm', sortOrder: 'desc' },
    };

    expect(resolveStrategySelection(preset)).toEqual({
      filters: { minDvTtm: 3, maxPeTtm: 20 },
      sortBy: 'dvTtm',
      sortOrder: 'desc',
    });
  });

  it('用户策略保留自身排序，缺失排序才回退 totalMv desc', () => {
    const strategy: ScreenerStrategy = {
      id: 1,
      name: '稳健价值',
      description: null,
      filters: { minRoe: 10 },
      sortBy: 'roe',
      sortOrder: 'asc',
      type: 'user',
      createdAt: '2026-08-08',
      updatedAt: '2026-08-08',
    };

    expect(resolveStrategySelection(strategy)).toEqual({
      filters: { minRoe: 10 },
      sortBy: 'roe',
      sortOrder: 'asc',
    });
    expect(resolveStrategySelection({ ...strategy, sortBy: null, sortOrder: null })).toEqual({
      filters: { minRoe: 10 },
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });
  });
});

describe('选股器功能门禁', () => {
  it('固定保留 10 组、41 个可见条件、9 个历史兼容键和 16 种排序', () => {
    expect(FILTER_GROUPS).toHaveLength(10);
    expect(VISIBLE_FILTER_CONTROL_COUNT).toBe(41);
    expect(HISTORICAL_COMPATIBILITY_KEYS).toHaveLength(9);
    expect(SORT_OPTIONS).toHaveLength(16);
    expect(SCREENER_PAGE_SIZE_OPTIONS).toEqual([10, 20, 50]);
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
      'totalMv',
      'peTtm',
      'pb',
      'psTtm',
      'dvTtm',
      'pctChg',
      'close',
      'turnoverRate',
      'roe',
      'revenueYoy',
      'netprofitYoy',
      'mainNetInflow5d',
      'buySignalCount',
      'grossMargin',
      'netMargin',
      'debtToAssets',
    ]);
  });

  it('覆盖更新时保留目标策略中未被当前草稿触碰的历史兼容键', () => {
    expect(
      preserveHistoricalCompatibilityKeys(
        { industry: '银行', minCircMv: 100000, maxGrossMargin: 60 },
        { minPeTtm: 5 }
      )
    ).toEqual({
      industry: '银行',
      minCircMv: 100000,
      maxGrossMargin: 60,
      minPeTtm: 5,
    });
  });
});
