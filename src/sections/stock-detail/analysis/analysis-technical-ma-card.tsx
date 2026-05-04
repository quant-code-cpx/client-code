import type { TechnicalDataPoint } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate as fmtD } from 'src/utils/format-time';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = { history: TechnicalDataPoint[] };

const MA_ITEMS = [
  { key: 'ma5' as const, label: 'MA5' },
  { key: 'ma10' as const, label: 'MA10' },
  { key: 'ma20' as const, label: 'MA20' },
  { key: 'ma60' as const, label: 'MA60' },
  { key: 'ma120' as const, label: 'MA120' },
  { key: 'ma250' as const, label: 'MA250' },
];

export function AnalysisTechnicalMaCard({ history }: Props) {
  const theme = useTheme();

  const last = history[history.length - 1];
  const dates = history.map((d) => fmtD(d.tradeDate));
  const maColors = [
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.info.main,
    theme.palette.success.main,
  ];

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
    colors: [theme.palette.text.primary, ...maColors],
    xaxis: { categories: dates, tickAmount: 10, labels: { rotate: -30 } },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    legend: { show: true },
    tooltip: { shared: true },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          均线系统
        </Typography>
        {last && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {MA_ITEMS.map((m, index) => (
              <Grid key={m.key} size={{ xs: 6, sm: 4, md: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: maColors[index] }}>
                    {m.label}
                  </Typography>
                  <Typography variant="body2">
                    {last[m.key] != null ? last[m.key]!.toFixed(2) : '--'}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
        {history.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            暂无数据
          </Typography>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 300 }} />
        )}
      </CardContent>
    </Card>
  );
}
