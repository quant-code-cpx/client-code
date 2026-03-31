import type { MarginDailyItem } from 'src/api/stock';

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

type Props = { history: MarginDailyItem[] };

function RzyeTrendChart({ history }: Props) {
  const seriesRzye = [
    {
      name: '融资余额',
      type: 'area',
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.rzye != null ? d.rzye / 10000 : null })),
    },
    {
      name: '收盘价',
      type: 'line',
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.close })),
    },
  ];

  const options = useChart({
    chart: { type: 'area' },
    stroke: { width: [2, 2], curve: 'smooth' },
    colors: ['#1877F2', '#EF5350'],
    fill: { type: ['gradient', 'solid'], opacity: [0.2, 1] },
    xaxis: { type: 'category', tickAmount: 8, labels: { rotate: -30 } },
    yaxis: [
      {
        title: { text: '融资余额(万元)' },
        labels: {
          formatter: (v: number) => {
            if (v >= 10000) return `${(v / 10000).toFixed(1)}亿`;
            return `${v.toFixed(0)}万`;
          },
        },
      },
      {
        opposite: true,
        title: { text: '收盘价(元)' },
        labels: { formatter: (v: number) => v.toFixed(2) },
      },
    ],
    legend: { show: true },
    tooltip: { shared: true },
  });

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">融资余额趋势</Typography>
      <Chart type="area" series={seriesRzye} options={options} sx={{ height: 220 }} />
    </Stack>
  );
}

function RzjmreChart({ history }: Props) {
  const upNet = history.map((d) => ({
    x: fmtD(d.tradeDate),
    y: d.rzjmre != null && d.rzjmre >= 0 ? d.rzjmre / 10000 : null,
  }));
  const downNet = history.map((d) => ({
    x: fmtD(d.tradeDate),
    y: d.rzjmre != null && d.rzjmre < 0 ? d.rzjmre / 10000 : null,
  }));

  const series = [
    { name: '净买入(正)', type: 'bar', data: upNet },
    { name: '净卖出(负)', type: 'bar', data: downNet },
  ];

  const options = useChart({
    chart: { type: 'bar', stacked: true },
    stroke: { width: [0, 0] },
    colors: ['#EF5350', '#26A69A'],
    xaxis: { type: 'category', tickAmount: 8, labels: { rotate: -30 } },
    yaxis: {
      labels: {
        formatter: (v: number) => {
          if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}亿`;
          return `${v.toFixed(0)}万`;
        },
      },
    },
    annotations: { yaxis: [{ y: 0, borderColor: '#999', strokeDashArray: 3 }] },
    legend: { show: true },
    tooltip: { shared: true },
  });

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">融资净买入</Typography>
      <Chart type="bar" series={series} options={options} sx={{ height: 200 }} />
    </Stack>
  );
}

function RqyeChart({ history }: Props) {
  const series = [
    {
      name: '融券余额',
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.rqye != null ? d.rqye / 10000 : null })),
    },
  ];

  const options = useChart({
    chart: { type: 'line' },
    stroke: { width: [2], curve: 'smooth' },
    colors: ['#AB47BC'],
    xaxis: { type: 'category', tickAmount: 8, labels: { rotate: -30 } },
    yaxis: {
      labels: {
        formatter: (v: number) => {
          if (v >= 10000) return `${(v / 10000).toFixed(1)}亿`;
          return `${v.toFixed(0)}万`;
        },
      },
    },
    legend: { show: true },
  });

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">融券余额趋势</Typography>
      <Chart type="line" series={series} options={options} sx={{ height: 200 }} />
    </Stack>
  );
}

export function AnalysisMarginChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary" textAlign="center" py={4}>暂无融资融券历史数据</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>融资融券趋势</Typography>
        <Stack spacing={3}>
          <RzyeTrendChart history={history} />
          <RzjmreChart history={history} />
          <RqyeChart history={history} />
        </Stack>
      </CardContent>
    </Card>
  );
}
