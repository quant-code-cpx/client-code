import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchFlowAnalysis, type FlowAnalysisItem } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type ChartMode = 'bar' | 'bubble';

type Props = {
  tradeDate?: string;
  period?: string;
  onSectorClick?: (name: string) => void;
};

function toYi(wan: number): number {
  return +(wan / 10000).toFixed(2);
}

export function RotationFlowAnalysisChart({ tradeDate, period, onSectorClick }: Props) {
  const theme = useTheme();
  const [chartMode, setChartMode] = useState<ChartMode>('bar');
  const [flows, setFlows] = useState<FlowAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchFlowAnalysis({ trade_date: tradeDate, days: period ? Number(period) : undefined })
      .then((res) => {
        if (!cancelled) setFlows(res?.flows ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载资金流转数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, period]);

  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, val: ChartMode | null) => {
      if (val) setChartMode(val);
    },
    []
  );

  // Sort by netInflow descending; take top 15 each side
  const sorted = [...flows].sort((a, b) => b.netInflow - a.netInflow);
  const topInflow = sorted.slice(0, 15);
  const topOutflow = sorted.slice(-15).reverse();
  const displayed = [...topInflow, ...topOutflow.filter((r) => !topInflow.includes(r))];

  const categories = displayed.map((r) => r.name);
  const inflowData = displayed.map((r) => toYi(r.inflowAmount));
  const outflowData = displayed.map((r) => -toYi(r.outflowAmount)); // negative for visual
  const netData = displayed.map((r) => toYi(r.netInflow));

  // Bar chart options
  const barOptions = useChart({
    chart: {
      type: 'bar',
      stacked: false,
      toolbar: { show: false },
       
      events: {
        dataPointSelection: (_e: unknown, _chart: unknown, opts: any) => {
          const idx = (opts as { dataPointIndex: number })?.dataPointIndex;
          const name = categories[idx];
          if (name && onSectorClick) onSectorClick(name);
        },
      },
    },
    colors: [theme.palette.error.light, theme.palette.success.light, theme.palette.info.main],
    plotOptions: {
      bar: { columnWidth: '55%', borderRadius: 2 },
    },
    stroke: {
      show: true,
      width: [0, 0, 2],
      colors: ['transparent', 'transparent', theme.palette.info.main],
    },
    xaxis: {
      categories,
      labels: { rotate: -40, style: { fontSize: '11px' } },
    },
    yaxis: [
      {
        title: { text: '金额（亿）' },
        labels: { formatter: (v: number) => `${v.toFixed(1)}亿` },
      },
      {
        opposite: true,
        title: { text: '净流入（亿）' },
        labels: { formatter: (v: number) => `${v.toFixed(1)}亿` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number) => `${Math.abs(val).toFixed(2)} 亿`,
      },
    },
    legend: { position: 'top' },
  });

  // Bubble chart options
  const bubbleSeries = flows.map((r) => ({
    name: r.name,
    data: [[r.inflowRatio, toYi(r.netInflow), toYi(r.inflowAmount)]] as [number, number, number][],
  }));

  const bubbleOptions = useChart({
    chart: { type: 'bubble', toolbar: { show: false } },
    xaxis: {
      title: { text: '流入占比 (%)' },
      labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
    },
    yaxis: {
      title: { text: '净流入 (亿)' },
      labels: { formatter: (v: number) => `${v.toFixed(1)}亿` },
    },
    tooltip: {
      shared: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}亿净流入` },
    },
    legend: { show: false },
  });

  const barSeries = [
    { name: '流入金额', type: 'column', data: inflowData },
    { name: '流出金额', type: 'column', data: outflowData },
    { name: '净流入', type: 'line', data: netData },
  ];

  const chartHeight = Math.max(360, categories.length * 26);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">行业资金流转</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={chartMode}
            onChange={handleModeChange}
          >
            <ToggleButton value="bar">柱状图</ToggleButton>
            <ToggleButton value="bubble">气泡图</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={360} />
        ) : flows.length === 0 ? (
          <Box
            sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.disabled">暂无数据</Typography>
          </Box>
        ) : chartMode === 'bubble' ? (
          <Chart type="bubble" series={bubbleSeries} options={bubbleOptions} sx={{ height: 360 }} />
        ) : (
          <Chart type="bar" series={barSeries} options={barOptions} sx={{ height: chartHeight }} />
        )}
      </CardContent>
    </Card>
  );
}
