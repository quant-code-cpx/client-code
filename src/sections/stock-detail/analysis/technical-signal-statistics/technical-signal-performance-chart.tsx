import type { SignalPeriodStatistics } from 'src/api/technical-signal';

import { useTheme } from '@mui/material/styles';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  group: SignalPeriodStatistics;
};

export function TechnicalSignalPerformanceChart({ group }: Props) {
  const theme = useTheme();
  const useDirectional = group.direction !== 'CONTEXTUAL';
  const primaryName = useDirectional ? '平均方向收益' : '平均收益';
  const confidenceData = group.horizons.flatMap((item) => {
    const lower = useDirectional
      ? item.directional.meanDirectionalConfidenceLowerPct
      : item.raw.meanConfidenceLowerPct;
    const upper = useDirectional
      ? item.directional.meanDirectionalConfidenceUpperPct
      : item.raw.meanConfidenceUpperPct;

    return lower === null || upper === null ? [] : [{ x: `T+${item.horizon}`, y: [lower, upper] }];
  });
  const hasConfidenceBand = confidenceData.length > 0;
  const primaryData = group.horizons.map((item) => ({
    x: `T+${item.horizon}`,
    y: useDirectional ? item.directional.averageDirectionalReturnPct : item.raw.averageReturnPct,
  }));
  const excessData = group.horizons.map((item) => ({ x: `T+${item.horizon}`, y: item.excess?.averageReturnPct ?? null }));
  const hasExcess = excessData.some((item) => item.y !== null);
  const series = [
    ...(hasConfidenceBand
      ? [{ name: `${primaryName} 95% 置信区间`, type: 'rangeArea' as const, data: confidenceData }]
      : []),
    { name: primaryName, type: 'line' as const, data: primaryData },
    ...(hasExcess ? [{ name: '平均超额收益', type: 'line' as const, data: excessData }] : []),
  ];
  const chartType = hasConfidenceBand ? 'rangeArea' : 'line';
  const lineSeriesCount = 1 + (hasExcess ? 1 : 0);
  const chartOptions = useChart({
    chart: { type: chartType, id: `technical-signal-${group.period}-${group.signalKey}` },
    colors: hasConfidenceBand
      ? [theme.palette.primary.main, theme.palette.primary.dark, theme.palette.warning.main]
      : [theme.palette.primary.main, theme.palette.warning.main],
    fill: { opacity: hasConfidenceBand ? [0.16, ...Array(lineSeriesCount).fill(1)] : 1 },
    stroke: {
      curve: 'smooth',
      width: hasConfidenceBand ? [0, ...Array(lineSeriesCount).fill(2)] : Array(lineSeriesCount).fill(2),
    },
    xaxis: { type: 'category', labels: { rotate: 0 } },
    yaxis: { labels: { formatter: (value: number) => `${value.toFixed(2)}%` } },
    annotations: {
      yaxis: [{ y: 0, borderColor: theme.palette.text.disabled, strokeDashArray: 3 }],
    },
    tooltip: { intersect: false, shared: true, y: { formatter: (value: number) => `${value.toFixed(2)}%` } },
  });

  return <Chart type={chartType} series={series} options={chartOptions} sx={{ height: 260 }} />;
}
