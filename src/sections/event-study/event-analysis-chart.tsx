import type { EventAnalyzeResult } from 'src/api/event-study';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  result: EventAnalyzeResult;
};

export function EventAnalysisChart({ result }: Props) {
  const theme = useTheme();

  const preDays = result.window
    ? Number(result.window.split('/')[0])
    : Math.floor((result.aarSeries.length - 1) / 2);

  const categories = result.aarSeries.map((_, i) => {
    const offset = i - preDays;
    return offset === 0 ? '事件日(0)' : String(offset);
  });

  // ±2σ 上下界（基于 aarStdSeries 累计而成，做 CAAR 置信带）
  const stdSeries = result.aarStdSeries ?? [];
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  let cumStd2 = 0;
  for (let i = 0; i < result.caarSeries.length; i += 1) {
    const sigma = stdSeries[i] ?? 0;
    cumStd2 += sigma * sigma;
    const ciHalf = 2 * Math.sqrt(cumStd2);
    upperBand.push(Number(((result.caarSeries[i] + ciHalf) * 100).toFixed(4)));
    lowerBand.push(Number(((result.caarSeries[i] - ciHalf) * 100).toFixed(4)));
  }

  const series = [
    {
      name: 'CAAR上界(+2σ)',
      type: 'line' as const,
      data: upperBand,
    },
    {
      name: 'CAAR下界(-2σ)',
      type: 'line' as const,
      data: lowerBand,
    },
    {
      name: 'CAAR (%)',
      type: 'line' as const,
      data: result.caarSeries.map((v) => Number((v * 100).toFixed(4))),
    },
    {
      name: 'AAR (%)',
      type: 'column' as const,
      data: result.aarSeries.map((v) => Number((v * 100).toFixed(4))),
    },
  ];

  // 显著区段的 xaxis annotations 阴影
  const segmentAnnotations =
    (result.significantSegments ?? []).map((seg) => ({
      x: seg.from + preDays,
      x2: seg.to + preDays,
      fillColor: theme.palette.warning.lighter,
      opacity: 0.35,
      label: {
        text: `显著(${seg.direction === 'pos' ? '正' : '负'})`,
        style: { color: theme.palette.warning.darker, fontSize: '11px' },
      },
    })) ?? [];

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: {
      width: [1, 1, 2.5, 0],
      curve: 'smooth',
      dashArray: [4, 4, 0, 0],
    },
    fill: { opacity: [0, 0, 1, 0.6] },
    colors: [
      theme.palette.warning.main,
      theme.palette.warning.main,
      theme.palette.primary.main,
      theme.palette.info.main,
    ],
    dataLabels: { enabled: false },
    xaxis: { categories, tickAmount: 10 },
    yaxis: [{ labels: { formatter: (v: number) => `${v.toFixed(2)}%` } }],
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(4)}%` },
    },
    legend: { show: true, position: 'top' },
    annotations: {
      xaxis: [
        {
          x: preDays,
          borderColor: theme.palette.error.main,
          label: {
            text: '事件日',
            style: { color: '#fff', background: theme.palette.error.main },
          },
        },
        ...segmentAnnotations,
      ],
    },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          AAR / CAAR 超额收益曲线（含 ±2σ 置信带）
        </Typography>
        <Chart type="line" series={series} options={chartOptions} sx={{ height: 420 }} />
      </CardContent>
    </Card>
  );
}
