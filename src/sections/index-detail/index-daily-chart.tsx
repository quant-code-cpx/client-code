import type { IndexDailyItem } from 'src/api/index-detail';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchIndexDaily } from 'src/api/index-detail';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: 60, label: '3月' },
  { value: 120, label: '半年' },
  { value: 250, label: '1年' },
  { value: 500, label: '2年' },
];

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
};

export function IndexDailyChart({ tsCode }: Props) {
  const theme = useTheme();
  const [limit, setLimit] = useState(250);
  const [data, setData] = useState<IndexDailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexDaily({ ts_code: tsCode, limit })
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res) ? res : ((res as any)?.items ?? []));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载日线数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tsCode, limit]);

  const categories = data.map((d) => fmtDate(d.tradeDate));

  const series = [
    {
      name: '收盘价',
      type: 'area' as const,
      data: data.map((d) => d.close),
    },
    {
      name: '成交额（亿）',
      type: 'column' as const,
      data: data.map((d) => Number((d.amount / 100000).toFixed(2))),
    },
  ];

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { width: [2, 0], curve: 'smooth' },
    fill: {
      type: ['gradient', 'solid'],
      gradient: { opacityFrom: 0.3, opacityTo: 0 },
    },
    colors: [theme.palette.primary.main, varAlpha(theme.vars.palette.grey['500Channel'], 0.3)],
    plotOptions: { bar: { columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: { categories, tickAmount: 10 },
    yaxis: [
      {
        title: { text: '点位' },
        labels: { formatter: (v: number) => v.toFixed(0) },
      },
      {
        opposite: true,
        title: { text: '成交额（亿）' },
        labels: { formatter: (v: number) => v.toFixed(1) },
      },
    ],
    tooltip: { shared: true, intersect: false },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            日K线走势
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={limit}
            exclusive
            onChange={(_, v) => {
              if (v !== null) setLimit(v as number);
            }}
          >
            {PERIOD_OPTIONS.map((o) => (
              <ToggleButton key={o.value} value={o.value}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
        ) : data.length === 0 ? (
          <Box
            sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 360 }} />
        )}
      </CardContent>
    </Card>
  );
}
