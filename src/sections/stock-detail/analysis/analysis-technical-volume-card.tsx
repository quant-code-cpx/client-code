import type { TechnicalDataPoint } from 'src/api/stock';

import Card from '@mui/material/Card';
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

type Props = { history: TechnicalDataPoint[] };

export function AnalysisTechnicalVolumeCard({ history }: Props) {
  const upVol = history.map((d) => ({
    x: fmtD(d.tradeDate),
    y: (d.pctChg ?? 0) >= 0 ? d.vol : null,
  }));
  const downVol = history.map((d) => ({
    x: fmtD(d.tradeDate),
    y: (d.pctChg ?? 0) < 0 ? d.vol : null,
  }));

  const series = [
    { name: '上涨量', type: 'bar', data: upVol },
    { name: '下跌量', type: 'bar', data: downVol },
    { name: 'MA5', type: 'line', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.volMa5 })) },
    { name: 'MA10', type: 'line', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.volMa10 })) },
    { name: 'MA20', type: 'line', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.volMa20 })) },
  ];

  const chartOptions = useChart({
    chart: { type: 'bar', stacked: true },
    stroke: { width: [0, 0, 1.5, 1.5, 1.5] },
    colors: ['#EF5350', '#26A69A', '#FF9800', '#1877F2', '#AB47BC'],
    xaxis: { type: 'category', tickAmount: 8, labels: { rotate: -30 } },
    yaxis: {
      labels: {
        formatter: (v: number) => {
          if (v >= 100000000) return `${(v / 100000000).toFixed(1)}亿`;
          if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
          return String(Math.round(v));
        },
      },
    },
    legend: { show: true },
    tooltip: { shared: true },
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
        <Typography variant="subtitle1" sx={{ mb: 2 }}>量价分析</Typography>
        <Chart type="bar" series={series} options={chartOptions} sx={{ height: 280 }} />
      </CardContent>
    </Card>
  );
}
