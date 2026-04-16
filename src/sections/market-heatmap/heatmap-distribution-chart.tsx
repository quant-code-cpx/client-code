import type { HeatmapDistribution } from 'src/api/heatmap';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Label } from 'src/components/label';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  distribution: HeatmapDistribution | null;
  loading: boolean;
  error: string;
};

type Segment = {
  label: string;
  count: number;
  color: string;
};

function parseRangeMin(range: string): number {
  const part = range.split('~')[0];
  return Number(part);
}

function buildSegments(dist: HeatmapDistribution): Segment[] {
  function sumBucket(minInclusive: number, maxExclusive: number) {
    return dist.ranges
      .filter((r) => {
        const v = parseRangeMin(r.range);
        return v >= minInclusive && v < maxExclusive;
      })
      .reduce((acc, r) => acc + r.count, 0);
  }

  return [
    { label: '涨≥5%', count: sumBucket(5, 100) + dist.limitUp, color: '#B71C1C' },
    { label: '涨0~5%', count: sumBucket(0, 5), color: '#EF9A9A' },
    { label: '平盘', count: dist.flatCount, color: '#9E9E9E' },
    { label: '跌0~5%', count: sumBucket(-5, 0), color: '#A5D6A7' },
    { label: '跌≥5%', count: sumBucket(-100, -5) + dist.limitDown, color: '#00695C' },
  ];
}

export function HeatmapDistributionChart({ distribution, loading, error }: Props) {
  const segments: Segment[] = distribution ? buildSegments(distribution) : [];
  const totalStocks = segments.reduce((acc, s) => acc + s.count, 0);

  const donutOptions = useChart({
    chart: { type: 'donut' },
    labels: segments.map((s) => s.label),
    colors: segments.map((s) => s.color),
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '总计',
              fontSize: '13px',
              formatter: () => String(totalStocks),
            },
            value: {
              fontSize: '22px',
              fontWeight: 700,
            },
          },
        },
      },
    },
    legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px' },
    tooltip: {
      y: {
        formatter: (v: number) =>
          `${v} 家（${totalStocks > 0 ? ((v / totalStocks) * 100).toFixed(1) : 0}%）`,
      },
    },
    dataLabels: { enabled: false },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          涨跌幅分布
        </Typography>

        {distribution && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Label sx={{ bgcolor: '#B71C1C', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              涨停 {distribution.limitUp}
            </Label>
            <Label sx={{ bgcolor: '#F44336', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              上涨 {distribution.upCount}
            </Label>
            <Label sx={{ bgcolor: '#9E9E9E', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              平盘 {distribution.flatCount}
            </Label>
            <Label sx={{ bgcolor: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              下跌 {distribution.downCount}
            </Label>
            <Label sx={{ bgcolor: '#00695C', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              跌停 {distribution.limitDown}
            </Label>
          </Stack>
        )}

        {loading && <Skeleton variant="circular" width={240} height={240} sx={{ mx: 'auto' }} />}

        {!loading && error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {!loading && !error && segments.length > 0 && (
          <Chart
            type="donut"
            series={segments.map((s) => s.count)}
            options={donutOptions}
            sx={{ height: 300 }}
          />
        )}

        {!loading && !error && distribution && distribution.ranges.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              区间明细
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>涨跌幅区间</TableCell>
                    <TableCell align="right">家数</TableCell>
                    <TableCell align="right">占比</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...distribution.ranges]
                    .sort((a, b) => parseRangeMin(b.range) - parseRangeMin(a.range))
                    .map((r) => {
                      const pct =
                        totalStocks > 0 ? ((r.count / totalStocks) * 100).toFixed(1) : '0.0';
                      const minVal = parseRangeMin(r.range);
                      const cellColor =
                        minVal >= 5
                          ? '#B71C1C'
                          : minVal >= 0
                            ? '#F44336'
                            : minVal >= -5
                              ? '#2E7D32'
                              : '#00695C';
                      return (
                        <TableRow key={r.range} hover>
                          <TableCell sx={{ color: cellColor, fontWeight: 500 }}>
                            {r.range}%
                          </TableCell>
                          <TableCell align="right">{r.count}</TableCell>
                          <TableCell align="right" sx={{ color: 'text.secondary' }}>
                            {pct}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        {!loading && !error && !distribution && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
