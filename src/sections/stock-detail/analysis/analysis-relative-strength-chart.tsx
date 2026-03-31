import type { RelativeStrengthPoint } from 'src/api/stock';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtD(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

type Props = {
  history: RelativeStrengthPoint[];
  benchmarkName: string;
};

export function AnalysisRelativeStrengthChart({ history, benchmarkName }: Props) {
  const cumulativeSeries = [
    {
      name: '个股收益',
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.stockCumReturn })),
    },
    {
      name: benchmarkName,
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.benchmarkCumReturn })),
    },
  ];

  const cumulativeOptions = useChart({
    chart: { type: 'line', id: 'cum-return' },
    stroke: { width: [2, 2], curve: 'smooth' },
    colors: ['#EF5350', '#1877F2'],
    xaxis: { type: 'category', tickAmount: 8, labels: { rotate: -30 } },
    yaxis: {
      labels: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    annotations: { yaxis: [{ y: 0, borderColor: '#999', strokeDashArray: 3 }] },
    legend: { show: true },
    tooltip: { shared: true, y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
  });

  const excessSeries = [
    {
      name: '超额收益',
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.excessReturn })),
    },
  ];

  const excessOptions = useChart({
    chart: { type: 'area', id: 'excess-return' },
    stroke: { width: [2], curve: 'smooth' },
    colors: ['#EF5350'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0 } },
    xaxis: { type: 'category', tickAmount: 8, labels: { rotate: -30 } },
    yaxis: {
      labels: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    annotations: { yaxis: [{ y: 0, borderColor: '#999', strokeDashArray: 3 }] },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
  });

  if (history.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary" textAlign="center" py={4}>暂无数据</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>相对强弱对比</Typography>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">累计收益对比</Typography>
            <Chart type="line" series={cumulativeSeries} options={cumulativeOptions} sx={{ height: 250 }} />
          </Stack>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">超额收益趋势</Typography>
            <Chart type="area" series={excessSeries} options={excessOptions} sx={{ height: 250 }} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
