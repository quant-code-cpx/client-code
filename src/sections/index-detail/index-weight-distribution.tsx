import type { IndexConstituentItem } from 'src/api/index-detail';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
  const missingWeightCount = constituents.filter((item) => !Number.isFinite(item.weight)).length;

  // ── Top-10 pie ──
  const { pieLabels, pieSeries } = useMemo(() => {
    if (!constituents.length) return { pieLabels: [] as string[], pieSeries: [] as number[] };

    const sorted = constituents
      .filter(
        (item): item is IndexConstituentItem & { weight: number } =>
          item.weight != null && Number.isFinite(item.weight)
      )
      .sort((a, b) => b.weight - a.weight);
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

    const map = new Map<string, { weight: number; weightedCount: number; count: number }>();
    constituents.forEach((c) => {
      const key = c.industry || '未知';
      const prev = map.get(key) ?? { weight: 0, weightedCount: 0, count: 0 };
      const hasWeight = Number.isFinite(c.weight);
      map.set(key, {
        weight: prev.weight + (hasWeight ? (c.weight as number) : 0),
        weightedCount: prev.weightedCount + (hasWeight ? 1 : 0),
        count: prev.count + 1,
      });
    });

    return [...map.entries()]
      .map(([name, { weight, weightedCount, count }]) => ({
        name,
        weight: weightedCount > 0 ? weight : null,
        count,
      }))
      .sort((a, b) => (b.weight ?? Number.NEGATIVE_INFINITY) - (a.weight ?? Number.NEGATIVE_INFINITY));
  }, [constituents]);

  const maxIndustryWeight = industryRows.find((row) => row.weight != null)?.weight ?? 1;

  const chartOptions = useChart({
    chart: { type: 'pie' },
    labels: pieLabels,
    legend: { position: 'bottom', horizontalAlign: 'center' },
    dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(1)}%` },
    tooltip: {
      followCursor: true,
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
  });

  if (!constituents.length) return null;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          权重分布
        </Typography>

        {missingWeightCount > 0 && (
          <Chip
            size="small"
            variant="outlined"
            label={`${missingWeightCount} 只成分股缺少权重，未计入权重图`}
            sx={{ mb: 2 }}
          />
        )}

        <Grid container spacing={3}>
          {/* Pie chart — top 10 */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Top 10 成分股权重
            </Typography>
            {pieSeries.length > 0 ? (
              <Chart
                type="pie"
                series={pieSeries}
                options={chartOptions}
                sx={{ height: 320, overflow: 'visible' }}
              />
            ) : (
              <Typography color="text.disabled" sx={{ py: 8, textAlign: 'center' }}>
                暂无有效权重数据
              </Typography>
            )}
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
                          {row.weight == null ? '—' : row.weight.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{row.count}</Typography>
                      </TableCell>
                      <TableCell>
                        {row.weight == null ? (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        ) : (
                          <LinearProgress
                            variant="determinate"
                            value={(row.weight / maxIndustryWeight) * 100}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        )}
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
