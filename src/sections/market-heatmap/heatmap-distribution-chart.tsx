import type { HeatmapDataResult } from 'src/api/market';

import { useState, useEffect } from 'react';

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

import { fetchHeatmapData } from 'src/api/market';

import { Label } from 'src/components/label';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

type Segment = {
  label: string;
  count: number;
  color: string;
};

function parseRangeMin(range: string): number {
  // range like "-10~-9", "0~1", "9~10"
  const part = range.split('~')[0];
  return Number(part);
}

function buildSegments(dist: HeatmapDataResult['distribution']): Segment[] {
  // Aggregate ranges into 5 buckets
  const rangeMap: Record<string, number> = {};
  for (const r of dist.ranges) {
    rangeMap[r.range] = r.count;
  }

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

export function HeatmapDistributionChart({ tradeDate }: Props) {
  const [data, setData] = useState<HeatmapDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchHeatmapData({ trade_date: tradeDate });
        setData(result);
      } catch {
        setError('涨跌分布数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tradeDate]);

  const dist = data?.distribution;
  const segments: Segment[] = dist ? buildSegments(dist) : [];
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

        {/* Summary badges */}
        {dist && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Label sx={{ bgcolor: '#B71C1C', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              涨停 {dist.limitUp}
            </Label>
            <Label sx={{ bgcolor: '#F44336', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              上涨 {dist.upCount}
            </Label>
            <Label sx={{ bgcolor: '#9E9E9E', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              平盘 {dist.flatCount}
            </Label>
            <Label sx={{ bgcolor: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              下跌 {dist.downCount}
            </Label>
            <Label sx={{ bgcolor: '#00695C', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              跌停 {dist.limitDown}
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

        {/* Detailed range breakdown */}
        {!loading && !error && dist && dist.ranges.length > 0 && (
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
                  {[...dist.ranges]
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

        {!loading && !error && !dist && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
