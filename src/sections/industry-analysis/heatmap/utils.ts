import type { SectorFlowItem } from 'src/api/market';
import type { HeatmapItem, HeatmapDistribution, HeatmapSectorSummary } from 'src/api/heatmap';

// ── Color mapping ──────────────────────────────────────────────

export type HeatmapColorPalette = {
  strongNegative: string;
  negative: string;
  weakNegative: string;
  neutral: string;
  weakPositive: string;
  positive: string;
  strongPositive: string;
};

/** 根据涨跌幅（%）返回热力图颜色。缺失值使用中性色，但不代表平盘。 */
export function getHeatmapColor(pctChg: number | null, palette: HeatmapColorPalette): string {
  const v = Number.isFinite(pctChg) ? (pctChg as number) : 0;
  if (v <= -7) return palette.strongNegative;
  if (v <= -3) return palette.negative;
  if (v <= -0.5) return palette.weakNegative;
  if (v < 0.5) return palette.neutral;
  if (v < 3) return palette.weakPositive;
  if (v < 7) return palette.positive;
  return palette.strongPositive;
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
      pctChgCount: number;
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
    const hasPct = Number.isFinite(item.pctChg);
    const pct = hasPct ? (item.pctChg as number) : null;
    const isUp = pct != null && pct > 0.1;
    const isDown = pct != null && pct < -0.1;

    if (!existing) {
      map.set(key, {
        pctChgSum: pct ?? 0,
        pctChgCount: pct == null ? 0 : 1,
        stockCount: 1,
        upCount: isUp ? 1 : 0,
        downCount: isDown ? 1 : 0,
        flatCount: pct != null && !isUp && !isDown ? 1 : 0,
        totalAmount: item.amount ?? 0,
        totalMv: item.totalMv ?? 0,
      });
    } else {
      if (pct != null) {
        existing.pctChgSum += pct;
        existing.pctChgCount += 1;
      }
      existing.stockCount += 1;
      if (isUp) existing.upCount += 1;
      else if (isDown) existing.downCount += 1;
      else if (pct != null) existing.flatCount += 1;
      existing.totalAmount += item.amount ?? 0;
      existing.totalMv += item.totalMv ?? 0;
    }
  }

  const result: HeatmapSectorSummary[] = [];
  map.forEach((v, groupName) => {
    result.push({
      groupName,
      avgPctChg: v.pctChgCount > 0 ? v.pctChgSum / v.pctChgCount : null,
      stockCount: v.stockCount,
      upCount: v.upCount,
      downCount: v.downCount,
      flatCount: v.flatCount,
      totalAmount: v.totalAmount,
      totalMv: v.totalMv,
    });
  });

  result.sort(
    (a, b) => (b.avgPctChg ?? Number.NEGATIVE_INFINITY) - (a.avgPctChg ?? Number.NEGATIVE_INFINITY)
  );
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
export function getScatterColor(netAmount: number, palette: HeatmapColorPalette): string {
  const yi = Number.isFinite(netAmount) ? netAmount / 100_000_000 : 0;

  if (Math.abs(yi) < 0.5) return palette.neutral;
  if (yi >= 20) return palette.strongPositive;
  if (yi >= 5) return palette.positive;
  if (yi > 0) return palette.weakPositive;

  const absYi = Math.abs(yi);
  if (absYi >= 20) return palette.strongNegative;
  if (absYi >= 5) return palette.negative;
  return palette.weakNegative;
}

/**
 * 万元转亿元，保留指定小数位
 */
export function toYi(wan: number | null | undefined, decimals = 2): number {
  const safeValue = Number.isFinite(wan) ? (wan as number) : 0;
  return +(safeValue / 10000).toFixed(decimals);
}

/**
 * 元转亿元，保留指定小数位
 * 适用于 /api/market/sector-flow 的 netAmount 等字段（单位：元）
 */
export function yuanToYi(yuan: number | null | undefined, decimals = 2): number {
  const safeValue = Number.isFinite(yuan) ? (yuan as number) : 0;
  return +(safeValue / 100_000_000).toFixed(decimals);
}

export type LinearAxisBounds = { min: number; max: number };

/**
 * 全量线性轴边界。只过滤非有限值，不裁剪任何真实点；边界增加固定比例 padding。
 * 空数组、单点、全零和同值数组均返回可绘制的有限范围。
 */
export function computeLinearAxisBounds(
  values: Array<number | null | undefined>,
  fallback: LinearAxisBounds,
  paddingRatio = 0.08
): LinearAxisBounds {
  const finiteValues = values.filter((value): value is number => Number.isFinite(value));
  if (!finiteValues.length) return fallback;

  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const span = rawMax - rawMin;
  const base = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1);
  const padding = span > 0 ? span * paddingRatio : base * paddingRatio;

  return { min: rawMin - padding, max: rawMax + padding };
}

export type ScatterInsightLists = {
  topInflow: SectorFlowItem[];
  topOutflow: SectorFlowItem[];
  topGainers: SectorFlowItem[];
  topLosers: SectorFlowItem[];
  crowded: SectorFlowItem[];
};

export function getScatterSectorKey(sector: Pick<SectorFlowItem, 'tsCode' | 'name'>): string {
  return sector.tsCode || sector.name || '';
}

export function hasScatterCoordinates(
  sector: SectorFlowItem
): sector is SectorFlowItem & { pctChange: number; netAmount: number } {
  return Number.isFinite(sector.pctChange) && Number.isFinite(sector.netAmount);
}

function percentile(values: number[], ratio: number): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;

  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function getCenterDistance(sector: SectorFlowItem, pctScale: number, flowScale: number): number {
  const pctPart = Math.abs(sector.pctChange as number) / Math.max(pctScale, 0.01);
  const flowPart = Math.abs(yuanToYi(sector.netAmount)) / Math.max(flowScale, 0.01);

  return Math.hypot(pctPart, flowPart);
}

function getScatterSignalScore(
  sector: SectorFlowItem,
  pctScale: number,
  flowScale: number
): number {
  const pctPart = Math.abs(sector.pctChange as number) / Math.max(pctScale, 0.01);
  const flowPart = Math.abs(yuanToYi(sector.netAmount)) / Math.max(flowScale, 0.01);

  return pctPart + flowPart * 1.2;
}

export function pickCrowdedScatterSectors(sectors: SectorFlowItem[], limit = 6): SectorFlowItem[] {
  const validSectors = sectors.filter(hasScatterCoordinates);
  if (!validSectors.length || limit <= 0) return [];

  const absPctValues = validSectors.map((sector) => Math.abs(sector.pctChange));
  const absFlowValues = validSectors.map((sector) => Math.abs(yuanToYi(sector.netAmount)));
  const pctThreshold = Math.max(percentile(absPctValues, 0.45), 0.8);
  const flowThreshold = Math.max(percentile(absFlowValues, 0.45), 1);
  const minimumUsefulCount = Math.min(limit, 3);

  const centerCandidates = validSectors.filter(
    (sector) =>
      Math.abs(sector.pctChange) <= pctThreshold &&
      Math.abs(yuanToYi(sector.netAmount)) <= flowThreshold
  );

  const source = centerCandidates.length >= minimumUsefulCount ? centerCandidates : validSectors;

  return [...source]
    .sort(
      (a, b) =>
        getCenterDistance(a, pctThreshold, flowThreshold) -
        getCenterDistance(b, pctThreshold, flowThreshold)
    )
    .slice(0, limit);
}

export function buildScatterInsightLists(
  sectors: SectorFlowItem[],
  limit = 5
): ScatterInsightLists {
  const safeLimit = Math.max(0, limit);
  const validSectors = sectors.filter(hasScatterCoordinates);

  return {
    topInflow: [...validSectors]
      .filter((sector) => sector.netAmount > 0)
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, safeLimit),
    topOutflow: [...validSectors]
      .filter((sector) => sector.netAmount < 0)
      .sort((a, b) => a.netAmount - b.netAmount)
      .slice(0, safeLimit),
    topGainers: [...validSectors]
      .filter((sector) => sector.pctChange > 0)
      .sort((a, b) => b.pctChange - a.pctChange)
      .slice(0, safeLimit),
    topLosers: [...validSectors]
      .filter((sector) => sector.pctChange < 0)
      .sort((a, b) => a.pctChange - b.pctChange)
      .slice(0, safeLimit),
    crowded: pickCrowdedScatterSectors(validSectors, safeLimit),
  };
}

export function pickScatterLabelKeys(sectors: SectorFlowItem[], maxLabels = 8): Set<string> {
  const labelKeys = new Set<string>();
  const validSectors = sectors.filter(hasScatterCoordinates);
  if (!validSectors.length || maxLabels <= 0) return labelKeys;

  const addLabel = (sector: SectorFlowItem | undefined) => {
    if (!sector || labelKeys.size >= maxLabels) return;
    labelKeys.add(getScatterSectorKey(sector));
  };

  const insightLists = buildScatterInsightLists(validSectors, 3);
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

  const pctScale = Math.max(
    percentile(
      validSectors.map((sector) => Math.abs(sector.pctChange)),
      0.9
    ),
    1
  );
  const flowScale = Math.max(
    percentile(
      validSectors.map((sector) => Math.abs(yuanToYi(sector.netAmount))),
      0.9
    ),
    1
  );

  [...validSectors]
    .sort(
      (a, b) =>
        getScatterSignalScore(b, pctScale, flowScale) -
        getScatterSignalScore(a, pctScale, flowScale)
    )
    .forEach(addLabel);

  return labelKeys;
}

export type SectorStockSummary = {
  totalAmountYi: number | null;
  upCount: number | null;
  downCount: number | null;
};

/** 从已加载的真实个股明细派生板块摘要；没有可用样本时保持缺失，不伪造为 0。 */
export function summarizeSectorStocks(stocks: HeatmapItem[]): SectorStockSummary {
  if (stocks.length === 0) {
    return { totalAmountYi: null, upCount: null, downCount: null };
  }

  const amounts = stocks
    .map((stock) => stock.amount)
    .filter((amount): amount is number => Number.isFinite(amount));
  const changes = stocks
    .map((stock) => stock.pctChg)
    .filter((pctChg): pctChg is number => Number.isFinite(pctChg));

  return {
    // HeatmapItem.amount 单位为千元，100_000 千元 = 1 亿元。
    totalAmountYi:
      amounts.length > 0 ? amounts.reduce((total, amount) => total + amount, 0) / 100_000 : null,
    upCount: changes.length > 0 ? changes.filter((pctChg) => pctChg > 0.1).length : null,
    downCount: changes.length > 0 ? changes.filter((pctChg) => pctChg < -0.1).length : null,
  };
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
  let missingCount = 0;

  // 21 buckets: index 0 = [-10, -9), index 10 = [0, 1), index 20 = [9, 10+]
  const buckets = new Array<number>(21).fill(0);

  for (const item of items) {
    if (!Number.isFinite(item.pctChg)) {
      missingCount += 1;
      continue;
    }
    const pct = item.pctChg as number;

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

  return { limitUp, limitDown, upCount, downCount, flatCount, missingCount, ranges };
}

export type DistributionSegment = { label: string; count: number };

/** 五段展示只拆分上涨/下跌/平盘全集，不重复叠加涨跌停 KPI。 */
export function buildDistributionSegments(dist: HeatmapDistribution): DistributionSegment[] {
  const sumBucket = (minInclusive: number, maxExclusive: number) =>
    dist.ranges
      .filter((range) => {
        const min = Number(range.range.split('~')[0]);
        return min >= minInclusive && min < maxExclusive;
      })
      .reduce((total, range) => total + range.count, 0);
  const strongUp = sumBucket(5, 100);
  const strongDown = sumBucket(-100, -5);

  return [
    { label: '涨≥5%', count: strongUp },
    { label: '涨0~5%', count: Math.max(dist.upCount - strongUp, 0) },
    { label: '平盘', count: dist.flatCount },
    { label: '跌0~5%', count: Math.max(dist.downCount - strongDown, 0) },
    { label: '跌≥5%', count: strongDown },
  ];
}
