import type { ChartBlock } from 'src/types/agent/generated';

import { formatFinanceValue } from './format-finance-value';

export type ChartViewModel = {
  type: 'line' | 'bar' | 'area' | 'heatmap';
  xAxisType: 'category' | 'datetime' | 'numeric';
  series: Array<{
    name: string;
    data: Array<{ x: string | number; y: number | null }>;
  }>;
  summary: string;
};

const CHART_TYPES: Record<ChartBlock['chart'], ChartViewModel['type']> = {
  LINE: 'line',
  BAR: 'bar',
  AREA: 'area',
  HEATMAP: 'heatmap',
};

const AXIS_TYPES: Record<ChartBlock['xAxisType'], ChartViewModel['xAxisType']> = {
  CATEGORY: 'category',
  DATETIME: 'datetime',
  NUMBER: 'numeric',
};

export function chartSeriesValueLabel(
  value: number | null,
  series: ChartBlock['series'][number],
  includeUnit = true
): string {
  return formatFinanceValue(value, {
    unit: includeUnit ? series.unit : undefined,
    scale: series.scale,
  });
}

export function toChartViewModel(block: ChartBlock): ChartViewModel {
  const summaries = block.series.map((series) => {
    const values = series.points.flatMap((point) => (point.y == null ? [] : [point.y]));
    if (values.length === 0) return `${series.name} 无有效数据`;
    let latest: number | null = null;
    for (let index = series.points.length - 1; index >= 0; index -= 1) {
      if (series.points[index].y != null) {
        latest = series.points[index].y;
        break;
      }
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    return `${series.name}：最新 ${chartSeriesValueLabel(latest, series)}，区间 ${chartSeriesValueLabel(min, series)} 至 ${chartSeriesValueLabel(max, series)}`;
  });

  return {
    type: CHART_TYPES[block.chart],
    xAxisType: AXIS_TYPES[block.xAxisType],
    series: block.series.map((series) => ({ name: series.name, data: series.points })),
    summary: summaries.join('；'),
  };
}
