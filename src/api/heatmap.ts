import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────

export type HeatmapStockItem = {
  tsCode: string;
  name: string;
  pctChg: number;
  circulationMv: number | null;
};

export type HeatmapIndustryItem = {
  industryCode: string | null;
  industryName: string;
  pctChgAvg: number;
  stockCount: number;
  risers: number;
  fallers: number;
  stocks?: HeatmapStockItem[];
};

export type HeatmapStats = {
  total: number;
  limitUp: number;
  risers: number;
  flat: number;
  fallers: number;
  limitDown: number;
};

export type HeatmapDataResult = {
  tradeDate: string;
  industries: HeatmapIndustryItem[];
  stats: HeatmapStats;
};

export type HeatmapSnapshotTriggerResult = {
  triggered: boolean;
  tradeDate: string;
};

// ── API Functions ─────────────────────────────────────────────

/** 获取市场热力图数据（涨跌幅分布） */
export function fetchHeatmapData(query?: { trade_date?: string }) {
  return apiClient.post<HeatmapDataResult>('/api/heatmap/data', query ?? {});
}

/** 手动触发热力图快照聚合（仅管理员） */
export function triggerHeatmapSnapshot(query?: { trade_date?: string }) {
  return apiClient.post<HeatmapSnapshotTriggerResult>('/api/heatmap/snapshot/trigger', query ?? {});
}

/** 查询指定日期热力图快照（缓存/实时降级） */
export function fetchHeatmapSnapshotHistory(query: { trade_date: string }) {
  return apiClient.post<HeatmapDataResult>('/api/heatmap/snapshot/history', query);
}
