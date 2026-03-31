import type { TechnicalDataPoint } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
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

const MA_ITEMS = [
  { key: 'ma5' as const, label: 'MA5', color: '#EF5350' },
  { key: 'ma10' as const, label: 'MA10', color: '#FF9800' },
  { key: 'ma20' as const, label: 'MA20', color: '#1877F2' },
  { key: 'ma60' as const, label: 'MA60', color: '#AB47BC' },
  { key: 'ma120' as const, label: 'MA120', color: '#66BB6A' },
  { key: 'ma250' as const, label: 'MA250', color: '#26A69A' },
];

export function AnalysisTechnicalMaCard({ history }: Props) {
  const last = history[history.length - 1];
  const dates = history.map((d) => fmtD(d.tradeDate));

  const series = [
    { name: '收盘价', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.close })) },
    ...MA_ITEMS.map((m) => ({
      name: m.label,
      data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d[m.key] })),
    })),
  ];

  const chartOptions = useChart({
    chart: { id: 'ma-chart', type: 'line' },
    stroke: { width: [2, 1, 1, 1, 1, 1, 1], curve: 'smooth' },
    colors: ['#333333', '#EF5350', '#FF9800', '#1877F2', '#AB47BC', '#66BB6A', '#26A69A'],
    xaxis: { categories: dates, tickAmount: 10, labels: { rotate: -30 } },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    legend: { show: true },
    tooltip: { shared: true },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>均线系统</Typography>
        {last && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {MA_ITEMS.map((m) => (
              <Grid key={m.key} size={{ xs: 6, sm: 4, md: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: m.color }}>{m.label}</Typography>
                  <Typography variant="body2">
                    {last[m.key] != null ? last[m.key]!.toFixed(2) : '--'}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
        {history.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>暂无数据</Typography>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 300 }} />
        )}
      </CardContent>
    </Card>
  );
}
