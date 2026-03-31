import type { IndexTrendItem, IndexTrendQuery } from 'src/api/market';

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

import { fetchIndexTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const INDEX_TABS = [
  { code: '000001.SH', label: '上证' },
  { code: '399001.SZ', label: '深证' },
  { code: '399006.SZ', label: '创业板' },
  { code: '000300.SH', label: '沪深300' },
  { code: '000905.SH', label: '中证500' },
  { code: '000852.SH', label: '中证1000' },
];

const PERIODS: Array<{ value: NonNullable<IndexTrendQuery['period']>; label: string }> = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
];

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketIndexTrendChart({ tradeDate: _tradeDate }: Props) {
  const [tabIndex, setTabIndex] = useState(0);
  const [period, setPeriod] = useState<IndexTrendQuery['period']>('3m');
  const [data, setData] = useState<IndexTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedCode = INDEX_TABS[tabIndex]?.code ?? '000001.SH';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexTrend({ ts_code: selectedCode, period })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载指数走势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCode, period]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const closes = data.map((d) => d.close);

  const chartOptions = useChart({
    chart: { type: 'area' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient' },
    tooltip: { shared: true, intersect: false },
    xaxis: { categories, labels: { rotate: -30, rotateAlways: false } },
    yaxis: {
      labels: {
        formatter: (v: number) => v.toFixed(0),
      },
    },
  });

  const series = [{ name: INDEX_TABS[tabIndex]?.label ?? '', data: closes }];

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
          <Typography variant="h6">核心指数走势</Typography>

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
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {INDEX_TABS.map((t) => (
            <Tab key={t.code} label={t.label} />
          ))}
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
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 320 }} />
        )}
      </CardContent>
    </Card>
  );
}
