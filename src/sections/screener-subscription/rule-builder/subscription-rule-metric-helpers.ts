import type { ScreenerFilters } from 'src/api/screener';
import type {
  MetricDefinition,
  FactorConditionSpec,
  SignalConditionSpec,
} from 'src/api/screener-subscription';

// ----------------------------------------------------------------------

export const factorOperatorLabels: Record<FactorConditionSpec['operator'], string> = {
  GT: '大于',
  GTE: '大于等于',
  LT: '小于',
  LTE: '小于等于',
  BETWEEN: '区间',
  TOP_PERCENT: '前 N%',
  BOTTOM_PERCENT: '后 N%',
};

export const signalEventLabels: Record<SignalConditionSpec['eventType'], string> = {
  GOLDEN_CROSS: '金叉',
  DEATH_CROSS: '死叉',
  OVERBOUGHT_ENTER: '进入超买',
  OVERSOLD_ENTER: '进入超卖',
  BREAK_UP: '向上突破',
  BREAK_DOWN: '向下突破',
  BULLISH_STATE_ENTER: '进入多头状态',
  BEARISH_STATE_ENTER: '进入空头状态',
  VOLUME_EXPAND: '量能放大',
  VOLUME_SHRINK: '量能萎缩',
  SCORE_CROSS_UP: '评分上穿',
  SCORE_CROSS_DOWN: '评分下穿',
};

export function displayMetricValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(' ~ ');
  return value === undefined || value === null ? '' : String(value);
}

export function metricDefaultValue(metric: MetricDefinition): string | number | boolean {
  if (metric.valueType === 'BOOLEAN') return false;
  if (metric.valueType === 'ENUM') return metric.enumOptions?.[0]?.value ?? '';
  return metric.min ?? 0;
}

export function normalizeMetricId(value: string): keyof ScreenerFilters {
  return value as keyof ScreenerFilters;
}

export function stockMetricFilterKey(metric: MetricDefinition): keyof ScreenerFilters {
  return normalizeMetricId(metric.filterKey ?? metric.id);
}

export function isMetricAvailable(metric: MetricDefinition): boolean {
  return metric.availability === 'ENABLED';
}

export function metricNotReadyMessage(metric: MetricDefinition): string {
  return `「${metric.label}」所需数据尚未就绪，暂不能添加或运行预览。`;
}
