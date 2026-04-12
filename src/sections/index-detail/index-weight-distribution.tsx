import type { IndexConstituentItem } from 'src/api/index-detail';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  constituents: IndexConstituentItem[];
};

export function IndexWeightDistribution({ constituents }: Props) {
  // ── Top-10 pie ──
  const { pieLabels, pieSeries } = useMemo(() => {
    if (!constituents.length) return { pieLabels: [] as string[], pieSeries: [] as number[] };

    const sorted = [...constituents].sort((a, b) => b.weight - a.weight);
    const top10 = sorted.slice(0, 10);
    const rest = sorted.slice(10);
    const restTotal = rest.reduce((acc, c) => acc + c.weight, 0);

    const labels = top10.map((c) => c.name);
    const series = top10.map((c) => Number(c.weight.toFixed(2)));

    if (restTotal > 0) {
      labels.push('其他');
      series.push(Number(restTotal.toFixed(2)));
    }

    return { pieLabels: labels, pieSeries: series };
  }, [constituents]);

  // ── Industry aggregation ──
  const industryRows = useMemo(() => {
    if (!constituents.length) return [];

    const map = new Map<string, { weight: number; count: number }>();
    constituents.forEach((c) => {
      const key = c.industry || '未知';
      const prev = map.get(key) ?? { weight: 0, count: 0 };
      map.set(key, { weight: prev.weight + c.weight, count: prev.count + 1 });
    });

    return [...map.entries()]
      .map(([name, { weight, count }]) => ({ name, weight, count }))
      .sort((a, b) => b.weight - a.weight);
  }, [constituents]);

  const maxIndustryWeight = industryRows[0]?.weight ?? 1;

  const chartOptions = useChart({
    chart: { type: 'pie' },
    labels: pieLabels,
    legend: { position: 'bottom', horizontalAlign: 'center' },
    dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(1)}%` },
    tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
  });

  if (!constituents.length) return null;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          权重分布
        </Typography>

        <Grid container spacing={3}>
          {/* Pie chart — top 10 */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Top 10 成分股权重
            </Typography>
            <Chart type="pie" series={pieSeries} options={chartOptions} sx={{ height: 320 }} />
          </Grid>

          {/* Industry summary table */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              行业权重汇总
            </Typography>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>行业</TableCell>
                    <TableCell align="right">权重合计（%）</TableCell>
                    <TableCell align="right">成分股数</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>占比</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {industryRows.map((row) => (
                    <TableRow key={row.name} hover>
                      <TableCell>
                        <Typography variant="caption">{row.name}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {row.weight.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{row.count}</Typography>
                      </TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={(row.weight / maxIndustryWeight) * 100}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
