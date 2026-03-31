import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHsgtTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const PERIODS: Array<{ value: string; label: string }> = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

/** 百万元 → 亿元 */
function toYi(v: number): number {
  return +(v / 100).toFixed(2);
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function HsgtTrendChart({ tradeDate: _tradeDate }: Props) {
  const [period, setPeriod] = useState('3m');
  const [tabIndex, setTabIndex] = useState(0); // 0=北向, 1=南向
  const [data, setData] = useState<HsgtTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtTrend({ period })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载沪深港通趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const isNorth = tabIndex === 0;

  const dailyValues = data.map((d) => toYi(isNorth ? d.northMoney : d.southMoney));
  const cumulativeValues = data.map((d) =>
    toYi(isNorth ? d.cumulativeNorth : d.cumulativeSouth)
  );

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: '#00B746' },
            { from: 0, to: 9999999, color: '#FF4560' },
          ],
        },
      },
    },
    xaxis: {
      categories,
      labels: { rotate: -30 },
    },
    yaxis: [
      {
        title: { text: `每日净买入(亿)` },
        labels: {
          formatter: (v: number) => `${v.toFixed(0)}亿`,
        },
      },
      {
        opposite: true,
        title: { text: '累计净买入(亿)' },
        labels: {
          formatter: (v: number) => `${v.toFixed(0)}亿`,
        },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
  });

  const series = [
    { name: `${isNorth ? '北向' : '南向'}每日净买入`, type: 'column', data: dailyValues },
    { name: '累计净买入', type: 'line', data: cumulativeValues },
  ];

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">沪深港通资金趋势</Typography>

          <ToggleButtonGroup
            exclusive
            value={period}
            size="small"
            onChange={(_, v) => {
              if (v) setPeriod(v);
            }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ mb: 2 }}
        >
          <Tab label="北向资金" />
          <Tab label="南向资金" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 320 }} />
        )}
      </CardContent>
    </Card>
  );
}
