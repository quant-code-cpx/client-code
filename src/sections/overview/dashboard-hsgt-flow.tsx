import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate } from 'src/utils/format-time';

import { fetchHsgtFlow } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  return fmtTradeDate(d, 'MM-DD');
}

// ----------------------------------------------------------------------

export function DashboardHsgtFlow() {
  const [data, setData] = useState<HsgtTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtFlow({ days: 30 })
      .then((res) => {
        if (!cancelled) setData(res?.history ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载北向资金失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  // 后端 northMoney 单位为百万元，前端转为亿元展示
  const dailyValues = data.map((d) => +((d.northMoney ?? 0) / 100).toFixed(2));

  // hsgt-flow 端点不含累计字段，客户端自行计算
  const cumulativeValues: number[] = [];
  let cumSum = 0;
  for (const d of data) {
    cumSum += (d.northMoney ?? 0) / 100;
    cumulativeValues.push(+cumSum.toFixed(2));
  }

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: '#00B746' },
            { from: 0, to: 9999999, color: '#FF4560' },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '10px' } } },
    yaxis: [
      {
        title: { text: '每日流入(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}` },
      },
      {
        opposite: true,
        title: { text: '累计(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}` },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true, position: 'top' },
  });

  const series = [
    { name: '每日北向资金', type: 'bar', data: dailyValues },
    { name: '累计北向资金', type: 'line', data: cumulativeValues },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          北向资金（近30日）
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={220} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 220 }} />
        )}
      </CardContent>
    </Card>
  );
}
