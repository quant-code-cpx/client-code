import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchSectorValuation, type SectorValuationItem } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type ValMode = 'pe' | 'pb';

type Props = {
  tradeDate?: string;
  onSectorClick?: (name: string) => void;
};

export function RotationValuationChart({ tradeDate, onSectorClick }: Props) {
  const theme = useTheme();
  const [valMode, setValMode] = useState<ValMode>('pe');
  const [sectors, setSectors] = useState<SectorValuationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSectorValuation({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setSectors(res?.sectors ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载估值数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, val: ValMode) => {
    setValMode(val);
  }, []);

  // Sort ascending by percentile (low = undervalued, show on top)
  const sorted = [...sectors].sort((a, b) =>
    valMode === 'pe' ? a.pePercentile - b.pePercentile : a.pbPercentile - b.pbPercentile
  );

  const categories = sorted.map((s) => s.name);
  const percentiles = sorted.map((s) => (valMode === 'pe' ? s.pePercentile : s.pbPercentile));
  const currentValues = sorted.map((s) => (valMode === 'pe' ? s.peTtm : s.pbMrq));

  const series = [{ name: valMode === 'pe' ? 'PE分位' : 'PB分位', data: percentiles }];

  const chartOptions = useChart({
    chart: {
      type: 'bar',
      toolbar: { show: false },
       
      events: {
        dataPointSelection: (_e: unknown, _chart: unknown, opts: any) => {
          const idx = (opts as { dataPointIndex: number })?.dataPointIndex;
          const name = categories[idx];
          if (name && onSectorClick) onSectorClick(name);
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        distributed: true,
        colors: {
          backgroundBarColors: [],
          ranges: percentiles.map((p, i) => ({
            from: i,
            to: i,
            color:
              p <= 30
                ? theme.palette.success.main
                : p <= 70
                  ? theme.palette.warning.main
                  : theme.palette.error.main,
          })),
        },
      },
    },
    colors: [theme.palette.info.main],
    xaxis: {
      categories,
      min: 0,
      max: 100,
      labels: { formatter: (val: number) => `${val}%` },
    },
    yaxis: { labels: { style: { fontSize: '12px' } } },
    dataLabels: {
      enabled: true,
       
      formatter: (_val: unknown, opts: any) => {
        const idx = (opts as { dataPointIndex: number })?.dataPointIndex;
        const cv = currentValues[idx];
        return cv != null ? `${cv.toFixed(1)}` : '';
      },
      style: { fontSize: '11px', colors: [theme.palette.text.primary] },
      offsetX: 8,
    },
    tooltip: {
      shared: false,
      intersect: true,
       
      custom: ({ dataPointIndex }: any) => {
        const item = sorted[dataPointIndex];
        if (!item) return '';
        const percentile = valMode === 'pe' ? item.pePercentile : item.pbPercentile;
        const current = valMode === 'pe' ? item.peTtm : item.pbMrq;
        const median = valMode === 'pe' ? item.peMedian3y : item.pbMedian3y;
        const label = valMode === 'pe' ? 'PE_TTM' : 'PB_MRQ';
        const level = percentile <= 30 ? '低估' : percentile <= 70 ? '中性' : '高估';
        const levelColor =
          percentile <= 30
            ? theme.palette.success.main
            : percentile <= 70
              ? theme.palette.warning.main
              : theme.palette.error.main;
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${item.name}</b><br/>`,
          `${label}：${current.toFixed(2)}<br/>`,
          `3年中位数：${median.toFixed(2)}<br/>`,
          `历史分位：<span style="color:${levelColor}">${percentile.toFixed(1)}% (${level})</span>`,
          '</div>',
        ].join('');
      },
    },
    legend: { show: false },
  });

  const chartHeight = Math.max(400, sorted.length * 30);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">行业估值分位</Typography>
          <Tabs value={valMode} onChange={handleTabChange} sx={{ minHeight: 36 }}>
            <Tab label="PE 分位" value="pe" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="PB 分位" value="pb" sx={{ minHeight: 36, py: 0 }} />
          </Tabs>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {[
            { color: theme.palette.success.main, label: '低估 (0~30%)' },
            { color: theme.palette.warning.main, label: '中性 (30~70%)' },
            { color: theme.palette.error.main, label: '高估 (70~100%)' },
          ].map(({ color, label }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={400} />
        ) : sorted.length === 0 ? (
          <Box
            sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.disabled">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="bar" series={series} options={chartOptions} sx={{ height: chartHeight }} />
        )}
      </CardContent>
    </Card>
  );
}
