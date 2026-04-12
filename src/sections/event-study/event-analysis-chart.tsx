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

  const series = [
    {
      name: 'AAR (%)',
      type: 'column' as const,
      data: result.aarSeries.map((v) => Number((v * 100).toFixed(4))),
    },
    {
      name: 'CAAR (%)',
      type: 'line' as const,
      data: result.caarSeries.map((v) => Number((v * 100).toFixed(4))),
    },
  ];

  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
    },
    stroke: {
      width: [0, 2],
      curve: 'smooth',
    },
    fill: {
      opacity: [0.6, 1],
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      tickAmount: 10,
    },
    yaxis: [
      {
        title: { text: 'AAR (%)' },
        labels: { formatter: (v: number) => `${v.toFixed(2)}%` },
      },
      {
        opposite: true,
        title: { text: 'CAAR (%)' },
        labels: { formatter: (v: number) => `${v.toFixed(2)}%` },
      },
    ],
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
            style: {
              color: '#fff',
              background: theme.palette.error.main,
            },
          },
        },
      ],
    },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          AAR / CAAR 超额收益曲线
        </Typography>
        <Chart type="line" series={series} options={chartOptions} sx={{ height: 400 }} />
      </CardContent>
    </Card>
  );
}
