import type {
  HeatmapItem,
  HeatmapDistribution,
  HeatmapSectorSummary,
} from 'src/api/heatmap';

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
  const map = new Map<string, {
    pctChgSum: number;
    stockCount: number;
    upCount: number;
    downCount: number;
    flatCount: number;
    totalAmount: number;
    totalMv: number;
  }>();

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
