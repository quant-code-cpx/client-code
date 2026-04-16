import { apiClient } from './client';

// ── 后端原始响应类型（与后端 HeatmapItemDto 精确对齐）────────

/** 热力图单个股票节点（对应后端 HeatmapItemDto） */
export type HeatmapItem = {
  tsCode: string;
  name: string | null;
  groupName: string | null;
  industry: string | null;
  /** 当日涨跌幅（%） */
  pctChg: number | null;
  /** 总市值（万元） */
  totalMv: number | null;
  /** 当日成交额（千元） */
  amount: number | null;
};

/** 快照历史响应（对应后端 HeatmapHistoryResponse） */
export type HeatmapSnapshotHistoryResult = {
  tradeDate: string;
  groupBy: string;
  stockCount: number;
  isFromSnapshot: boolean;
  items: HeatmapItem[];
};

/** 快照触发响应 */
export type HeatmapSnapshotTriggerResult = {
  tradeDate: string;
  totalRecords: number;
};

// ── 前端衍生类型（客户端聚合计算）──────────────────────────

/** 行业聚合摘要（由 aggregateSectors 从 HeatmapItem[] 计算） */
export type HeatmapSectorSummary = {
  groupName: string;
  avgPctChg: number;
  stockCount: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  totalAmount: number;
  totalMv: number;
};

/** 涨跌分布统计（由 computeDistribution 从 HeatmapItem[] 计算） */
export type HeatmapDistribution = {
  limitUp: number;
  limitDown: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  ranges: Array<{ range: string; count: number }>;
};

// ── API 函数 ────────────────────────────────────────────────

/** 获取市场热力图数据，后端返回扁平 HeatmapItem[] */
export function fetchHeatmapData(query?: {
  trade_date?: string;
  group_by?: 'industry' | 'index' | 'concept';
  index_code?: string;
}) {
  return apiClient.post<HeatmapItem[]>('/api/heatmap/data', query ?? {});
}

/** 手动触发热力图快照聚合（仅管理员） */
export function triggerHeatmapSnapshot(query?: { trade_date?: string }) {
  return apiClient.post<HeatmapSnapshotTriggerResult>('/api/heatmap/snapshot/trigger', query ?? {});
}

/** 查询指定日期热力图快照（优先读缓存，自动降级实时计算） */
export function fetchHeatmapSnapshotHistory(query: { trade_date: string; group_by?: string }) {
  return apiClient.post<HeatmapSnapshotHistoryResult>('/api/heatmap/snapshot/history', query);
}
