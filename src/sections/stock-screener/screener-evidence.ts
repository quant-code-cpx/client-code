import type { ScreenerFilters, StockScreenerItem } from 'src/api/screener';

import { BUY_SIGNAL_LABELS } from './constants';

// ----------------------------------------------------------------------

export type ScreenerEvidence = {
  key: keyof ScreenerFilters;
  label: string;
  target: string;
  actual?: string;
  verified: boolean;
  financial?: boolean;
};

type FilterDescriptor = {
  key: keyof ScreenerFilters;
  label: string;
  target: (value: unknown, conceptNames: Record<string, string>) => string;
  actual?: (item: StockScreenerItem) => string;
  financial?: boolean;
};

const formatNumber = (value: number | null, suffix = '') =>
  value === null ? '—' : `${value.toFixed(2)}${suffix}`;

const formatWanYuan = (value: number | null) => {
  if (value === null) return '—';
  return Math.abs(value) >= 10000
    ? `${(value / 10000).toFixed(2)}亿`
    : `${value.toFixed(2)}万`;
};

const asText = (value: unknown) => String(value);
const asList = (value: unknown) => (Array.isArray(value) ? value.join('、') : String(value));
const min = (unit = '') => (value: unknown) => `≥ ${asText(value)}${unit}`;
const max = (unit = '') => (value: unknown) => `≤ ${asText(value)}${unit}`;
const actualNumber = (key: keyof StockScreenerItem, suffix = '') => (item: StockScreenerItem) =>
  formatNumber(item[key] as number | null, suffix);
const actualWanYuan = (key: 'totalMv' | 'circMv' | 'mainNetInflow5d' | 'mainNetInflow20d') =>
  (item: StockScreenerItem) => formatWanYuan(item[key]);

const SELECT_LABELS: Record<string, string> = {
  golden_cross: '金叉',
  death_cross: '死叉',
  overbought: '超买',
  oversold: '超卖',
  above_upper: '突破上轨',
  below_lower: '跌破下轨',
  squeeze: '缩口',
  bullish: '多头排列',
  bearish: '空头排列',
};

const descriptors: FilterDescriptor[] = [
  { key: 'exchange', label: '交易所', target: (value) => asText(value) },
  { key: 'market', label: '板块', target: (value) => asText(value), actual: (item) => item.market ?? '—' },
  { key: 'industry', label: '行业（历史）', target: (value) => asText(value), actual: (item) => item.industry ?? '—' },
  { key: 'area', label: '地域（历史）', target: (value) => asText(value) },
  { key: 'isHs', label: '沪深港通资格（历史）', target: (value) => asText(value) },
  { key: 'industries', label: '行业', target: (value) => asList(value), actual: (item) => item.industry ?? '—' },
  { key: 'areas', label: '地域', target: (value) => asList(value) },
  {
    key: 'conceptCodes',
    label: '概念板块',
    target: (value, conceptNames) =>
      Array.isArray(value)
        ? value.map((code) => conceptNames[String(code)] ?? String(code)).join('、')
        : asText(value),
    actual: (item) => item.concepts?.join('、') ?? '—',
  },
  { key: 'minPeTtm', label: 'PE TTM', target: min(), actual: actualNumber('peTtm') },
  { key: 'maxPeTtm', label: 'PE TTM', target: max(), actual: actualNumber('peTtm') },
  { key: 'minPb', label: 'PB', target: min(), actual: actualNumber('pb') },
  { key: 'maxPb', label: 'PB', target: max(), actual: actualNumber('pb') },
  { key: 'minPsTtm', label: 'PS TTM', target: min(), actual: actualNumber('psTtm') },
  { key: 'maxPsTtm', label: 'PS TTM', target: max(), actual: actualNumber('psTtm') },
  { key: 'minDvTtm', label: '股息率 TTM', target: min('%'), actual: actualNumber('dvTtm', '%') },
  {
    key: 'minTotalMv',
    label: '总市值',
    target: (value) => `≥ ${formatWanYuan(value as number)}`,
    actual: actualWanYuan('totalMv'),
  },
  {
    key: 'maxTotalMv',
    label: '总市值',
    target: (value) => `≤ ${formatWanYuan(value as number)}`,
    actual: actualWanYuan('totalMv'),
  },
  {
    key: 'minCircMv',
    label: '流通市值（历史）',
    target: (value) => `≥ ${formatWanYuan(value as number)}`,
    actual: actualWanYuan('circMv'),
  },
  {
    key: 'maxCircMv',
    label: '流通市值（历史）',
    target: (value) => `≤ ${formatWanYuan(value as number)}`,
    actual: actualWanYuan('circMv'),
  },
  { key: 'minPctChg', label: '涨跌幅', target: min('%'), actual: actualNumber('pctChg', '%') },
  { key: 'maxPctChg', label: '涨跌幅', target: max('%'), actual: actualNumber('pctChg', '%') },
  { key: 'minTurnoverRate', label: '换手率', target: min('%'), actual: actualNumber('turnoverRate', '%') },
  { key: 'maxTurnoverRate', label: '换手率', target: max('%'), actual: actualNumber('turnoverRate', '%') },
  { key: 'minAmount', label: '成交额（历史）', target: min(' 千元'), actual: actualNumber('amount', ' 千元') },
  { key: 'maxAmount', label: '成交额（历史）', target: max(' 千元'), actual: actualNumber('amount', ' 千元') },
  { key: 'minRevenueYoy', label: '营收同比', target: min('%'), actual: actualNumber('revenueYoy', '%'), financial: true },
  { key: 'maxRevenueYoy', label: '营收同比', target: max('%'), actual: actualNumber('revenueYoy', '%'), financial: true },
  { key: 'minNetprofitYoy', label: '净利润同比', target: min('%'), actual: actualNumber('netprofitYoy', '%'), financial: true },
  { key: 'maxNetprofitYoy', label: '净利润同比', target: max('%'), actual: actualNumber('netprofitYoy', '%'), financial: true },
  { key: 'minRoe', label: 'ROE', target: min('%'), actual: actualNumber('roe', '%'), financial: true },
  { key: 'maxRoe', label: 'ROE', target: max('%'), actual: actualNumber('roe', '%'), financial: true },
  { key: 'minGrossMargin', label: '毛利率', target: min('%'), actual: actualNumber('grossMargin', '%'), financial: true },
  { key: 'maxGrossMargin', label: '毛利率（历史）', target: max('%'), actual: actualNumber('grossMargin', '%'), financial: true },
  { key: 'minNetMargin', label: '净利率', target: min('%'), actual: actualNumber('netMargin', '%'), financial: true },
  { key: 'maxNetMargin', label: '净利率（历史）', target: max('%'), actual: actualNumber('netMargin', '%'), financial: true },
  { key: 'maxDebtToAssets', label: '资产负债率', target: max('%'), actual: actualNumber('debtToAssets', '%'), financial: true },
  { key: 'minCurrentRatio', label: '流动比率', target: min(), actual: actualNumber('currentRatio'), financial: true },
  { key: 'minQuickRatio', label: '速动比率', target: min(), actual: actualNumber('quickRatio'), financial: true },
  { key: 'minOcfToNetprofit', label: '经营现金流/净利润', target: min(), actual: actualNumber('ocfToNetprofit'), financial: true },
  {
    key: 'minMainNetInflow5d',
    label: '近 5 日主力净流入',
    target: (value) => `≥ ${formatWanYuan(value as number)}`,
    actual: actualWanYuan('mainNetInflow5d'),
  },
  {
    key: 'minMainNetInflow20d',
    label: '近 20 日主力净流入',
    target: (value) => `≥ ${formatWanYuan(value as number)}`,
    actual: actualWanYuan('mainNetInflow20d'),
  },
  {
    key: 'minBuySignalCount',
    label: '偏多信号数',
    target: min(' 项'),
    actual: (item) => {
      if (item.buySignalCount === null) return '—';
      const signals = item.buySignals?.map((signal) => BUY_SIGNAL_LABELS[signal]).join('、');
      return signals ? `${item.buySignalCount} 项（${signals}）` : `${item.buySignalCount} 项`;
    },
  },
  { key: 'macdSignal', label: 'MACD 信号', target: (value) => SELECT_LABELS[asText(value)] ?? asText(value) },
  { key: 'kdjSignal', label: 'KDJ 信号', target: (value) => SELECT_LABELS[asText(value)] ?? asText(value) },
  { key: 'rsiSignal', label: 'RSI 信号', target: (value) => SELECT_LABELS[asText(value)] ?? asText(value) },
  { key: 'minRsi6', label: 'RSI 6 日', target: min() },
  { key: 'maxRsi6', label: 'RSI 6 日', target: max() },
  { key: 'bollSignal', label: '布林带信号', target: (value) => SELECT_LABELS[asText(value)] ?? asText(value) },
  { key: 'maTrend', label: '均线趋势', target: (value) => SELECT_LABELS[asText(value)] ?? asText(value) },
  { key: 'northboundOnly', label: '北向持仓', target: () => '是' },
];

export function isEnabledFilter(value: ScreenerFilters[keyof ScreenerFilters]): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value === true;
  return value !== undefined && value !== null && value !== '';
}

export function buildFilterSummaries(
  filters: ScreenerFilters,
  conceptNames: Record<string, string> = {}
): string[] {
  return descriptors.flatMap((descriptor) => {
    const value = filters[descriptor.key];
    return isEnabledFilter(value)
      ? [`${descriptor.label} ${descriptor.target(value, conceptNames)}`]
      : [];
  });
}

export function buildScreenerEvidence(
  item: StockScreenerItem,
  filters: ScreenerFilters,
  conceptNames: Record<string, string> = {}
): ScreenerEvidence[] {
  return descriptors.flatMap((descriptor) => {
    const value = filters[descriptor.key];
    if (!isEnabledFilter(value)) return [];
    return [
      {
        key: descriptor.key,
        label: descriptor.label,
        target: descriptor.target(value, conceptNames),
        actual: descriptor.actual?.(item),
        verified: descriptor.actual === undefined,
        financial: descriptor.financial,
      },
    ];
  });
}

export function filtersEqual(left: ScreenerFilters, right: ScreenerFilters): boolean {
  const normalize = (filters: ScreenerFilters) =>
    Object.fromEntries(
      Object.entries(filters)
        .filter(([, value]) => isEnabledFilter(value as ScreenerFilters[keyof ScreenerFilters]))
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    );
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}
