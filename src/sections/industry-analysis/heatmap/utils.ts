import type { SectorFlowItem } from 'src/api/market';
import type { HeatmapItem, HeatmapDistribution, HeatmapSectorSummary } from 'src/api/heatmap';

// ── Color mapping ──────────────────────────────────────────────

/** 根据涨跌幅（%）返回热力图颜色。null 视为 0（平盘灰色）。 */
export function getHeatmapColor(pctChg: number | null): string {
  const v = pctChg ?? 0;
  if (v <= -7) return '#00695C';
  if (v <= -3) return '#2E7D32';
  if (v <= -0.5) return '#66BB6A';
  if (v < 0.5) return '#757575';
  if (v < 3) return '#EF9A9A';
  if (v < 7) return '#F44336';
  return '#B71C1C';
}

// ── Client-side aggregation ────────────────────────────────────

/**
 * 从扁平 HeatmapItem[] 聚合行业摘要。
 * 按 groupName（fallback: industry → '其他'）分组，
 * 计算每组的平均涨跌幅、涨/跌/平家数、成交额/市值合计。
 * 结果按 avgPctChg 降序排列。
 */
export function aggregateSectors(items: HeatmapItem[]): HeatmapSectorSummary[] {
  const map = new Map<
    string,
    {
      pctChgSum: number;
      stockCount: number;
      upCount: number;
      downCount: number;
      flatCount: number;
      totalAmount: number;
      totalMv: number;
    }
  >();

  for (const item of items) {
    const key = item.groupName ?? item.industry ?? '其他';
    const existing = map.get(key);
    const pct = item.pctChg ?? 0;
    const isUp = pct > 0.1;
    const isDown = pct < -0.1;

    if (!existing) {
      map.set(key, {
        pctChgSum: pct,
        stockCount: 1,
        upCount: isUp ? 1 : 0,
        downCount: isDown ? 1 : 0,
        flatCount: !isUp && !isDown ? 1 : 0,
        totalAmount: item.amount ?? 0,
        totalMv: item.totalMv ?? 0,
      });
    } else {
      existing.pctChgSum += pct;
      existing.stockCount += 1;
      if (isUp) existing.upCount += 1;
      else if (isDown) existing.downCount += 1;
      else existing.flatCount += 1;
      existing.totalAmount += item.amount ?? 0;
      existing.totalMv += item.totalMv ?? 0;
    }
  }

  const result: HeatmapSectorSummary[] = [];
  map.forEach((v, groupName) => {
    result.push({
      groupName,
      avgPctChg: v.stockCount > 0 ? v.pctChgSum / v.stockCount : 0,
      stockCount: v.stockCount,
      upCount: v.upCount,
      downCount: v.downCount,
      flatCount: v.flatCount,
      totalAmount: v.totalAmount,
      totalMv: v.totalMv,
    });
  });

  result.sort((a, b) => b.avgPctChg - a.avgPctChg);
  return result;
}

// ── Scatter chart helpers ──────────────────────────────────────

/**
 * 根据行业资金净流入额返回气泡颜色。
 * 净流入 → 红色系（深浅表示量级）
 * 净流出 → 绿色系（深浅表示量级）
 * 接近零 → 灰色
 *
 * @param netAmount 净流入金额（元，来自 /api/market/sector-flow 的 SectorFlowItemDto）
 * @returns 十六进制颜色值
 */
export function getScatterColor(netAmount: number): string {
  const yi = (netAmount ?? 0) / 100_000_000;

  if (Math.abs(yi) < 0.5) return '#9E9E9E';

  if (yi > 0) {
    if (yi >= 20) return '#B71C1C';
    if (yi >= 10) return '#D32F2F';
    if (yi >= 5) return '#F44336';
    if (yi >= 2) return '#EF5350';
    return '#EF9A9A';
  }

  const absYi = Math.abs(yi);
  if (absYi >= 20) return '#1B5E20';
  if (absYi >= 10) return '#2E7D32';
  if (absYi >= 5) return '#4CAF50';
  if (absYi >= 2) return '#66BB6A';
  return '#A5D6A7';
}

/**
 * 万元转亿元，保留指定小数位
 */
export function toYi(wan: number | null | undefined, decimals = 2): number {
  return +((wan ?? 0) / 10000).toFixed(decimals);
}

/**
 * 元转亿元，保留指定小数位
 * 适用于 /api/market/sector-flow 的 netAmount 等字段（单位：元）
 */
export function yuanToYi(yuan: number | null | undefined, decimals = 2): number {
  return +((yuan ?? 0) / 100_000_000).toFixed(decimals);
}

export type ScatterInsightLists = {
  topInflow: SectorFlowItem[];
  topOutflow: SectorFlowItem[];
  topGainers: SectorFlowItem[];
  topLosers: SectorFlowItem[];
  crowded: SectorFlowItem[];
};

export function getScatterSectorKey(sector: Pick<SectorFlowItem, 'tsCode' | 'name'>): string {
  return sector.tsCode || sector.name;
}

function percentile(values: number[], ratio: number): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;

  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function getCenterDistance(sector: SectorFlowItem, pctScale: number, flowScale: number): number {
  const pctPart = Math.abs(sector.pctChange ?? 0) / Math.max(pctScale, 0.01);
  const flowPart = Math.abs(yuanToYi(sector.netAmount)) / Math.max(flowScale, 0.01);

  return Math.hypot(pctPart, flowPart);
}

function getScatterSignalScore(
  sector: SectorFlowItem,
  pctScale: number,
  flowScale: number,
  amountScale: number
): number {
  const amountYi = Math.max((sector.amount ?? 0) / 10000, 0);
  const pctPart = Math.abs(sector.pctChange ?? 0) / Math.max(pctScale, 0.01);
  const flowPart = Math.abs(yuanToYi(sector.netAmount)) / Math.max(flowScale, 0.01);
  const amountPart = Math.sqrt(amountYi / Math.max(amountScale, 0.01));

  return pctPart + flowPart * 1.2 + amountPart * 0.35;
}

export function pickCrowdedScatterSectors(
  sectors: SectorFlowItem[],
  limit = 6
): SectorFlowItem[] {
  if (!sectors.length || limit <= 0) return [];

  const absPctValues = sectors.map((sector) => Math.abs(sector.pctChange ?? 0));
  const absFlowValues = sectors.map((sector) => Math.abs(yuanToYi(sector.netAmount)));
  const pctThreshold = Math.max(percentile(absPctValues, 0.45), 0.8);
  const flowThreshold = Math.max(percentile(absFlowValues, 0.45), 1);
  const minimumUsefulCount = Math.min(limit, 3);

  const centerCandidates = sectors.filter(
    (sector) =>
      Math.abs(sector.pctChange ?? 0) <= pctThreshold &&
      Math.abs(yuanToYi(sector.netAmount)) <= flowThreshold
  );

  const source = centerCandidates.length >= minimumUsefulCount ? centerCandidates : sectors;

  return [...source]
    .sort((a, b) => {
      const amountDiff = (b.amount ?? 0) - (a.amount ?? 0);
      if (amountDiff !== 0) return amountDiff;
      return (
        getCenterDistance(a, pctThreshold, flowThreshold) -
        getCenterDistance(b, pctThreshold, flowThreshold)
      );
    })
    .slice(0, limit);
}

export function buildScatterInsightLists(
  sectors: SectorFlowItem[],
  limit = 5
): ScatterInsightLists {
  const safeLimit = Math.max(0, limit);

  return {
    topInflow: [...sectors]
      .filter((sector) => (sector.netAmount ?? 0) > 0)
      .sort((a, b) => (b.netAmount ?? 0) - (a.netAmount ?? 0))
      .slice(0, safeLimit),
    topOutflow: [...sectors]
      .filter((sector) => (sector.netAmount ?? 0) < 0)
      .sort((a, b) => (a.netAmount ?? 0) - (b.netAmount ?? 0))
      .slice(0, safeLimit),
    topGainers: [...sectors]
      .filter((sector) => (sector.pctChange ?? 0) > 0)
      .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0))
      .slice(0, safeLimit),
    topLosers: [...sectors]
      .filter((sector) => (sector.pctChange ?? 0) < 0)
      .sort((a, b) => (a.pctChange ?? 0) - (b.pctChange ?? 0))
      .slice(0, safeLimit),
    crowded: pickCrowdedScatterSectors(sectors, safeLimit),
  };
}

export function pickScatterLabelKeys(sectors: SectorFlowItem[], maxLabels = 8): Set<string> {
  const labelKeys = new Set<string>();
  if (!sectors.length || maxLabels <= 0) return labelKeys;

  const addLabel = (sector: SectorFlowItem | undefined) => {
    if (!sector || labelKeys.size >= maxLabels) return;
    labelKeys.add(getScatterSectorKey(sector));
  };

  const insightLists = buildScatterInsightLists(sectors, 3);
  [
    insightLists.topInflow[0],
    insightLists.topOutflow[0],
    insightLists.topGainers[0],
    insightLists.topLosers[0],
    insightLists.topInflow[1],
    insightLists.topOutflow[1],
    insightLists.topGainers[1],
    insightLists.topLosers[1],
  ].forEach(addLabel);

  if (labelKeys.size >= maxLabels) return labelKeys;

  const pctScale = Math.max(percentile(sectors.map((sector) => Math.abs(sector.pctChange ?? 0)), 0.9), 1);
  const flowScale = Math.max(
    percentile(sectors.map((sector) => Math.abs(yuanToYi(sector.netAmount))), 0.9),
    1
  );
  const amountScale = Math.max(
    percentile(sectors.map((sector) => Math.max((sector.amount ?? 0) / 10000, 0)), 0.9),
    1
  );

  [...sectors]
    .sort(
      (a, b) =>
        getScatterSignalScore(b, pctScale, flowScale, amountScale) -
        getScatterSignalScore(a, pctScale, flowScale, amountScale)
    )
    .forEach(addLabel);

  return labelKeys;
}

// ── Distribution ──────────────────────────────────────────────

/**
 * 从扁平 HeatmapItem[] 计算涨跌幅分布。
 * 以 1% 为步长生成 [-10, 10] 区间桶（共 21 个），
 * 并单独统计涨停/跌停/上涨/下跌/平盘家数。
 */
export function computeDistribution(items: HeatmapItem[]): HeatmapDistribution {
  let limitUp = 0;
  let limitDown = 0;
  let upCount = 0;
  let downCount = 0;
  let flatCount = 0;

  // 21 buckets: index 0 = [-10, -9), index 10 = [0, 1), index 20 = [9, 10+]
  const buckets = new Array<number>(21).fill(0);

  for (const item of items) {
    const pct = item.pctChg ?? 0;

    if (pct >= 9.9) limitUp += 1;
    else if (pct <= -9.9) limitDown += 1;

    if (pct > 0.1) upCount += 1;
    else if (pct < -0.1) downCount += 1;
    else flatCount += 1;

    // Map pct to bucket index: floor(pct + 10), clamped to [0, 20]
    // +10 shifts the [-10, +10] range to [0, 20]; clamp handles outliers beyond ±10%
    const idx = Math.max(0, Math.min(20, Math.floor(pct + 10)));
    buckets[idx] += 1;
  }

  const ranges = buckets.map((count, i) => {
    const low = i - 10;
    const high = low + 1;
    const range = `${low}~${high}`;
    return { range, count };
  });

  return { limitUp, limitDown, upCount, downCount, flatCount, ranges };
}
