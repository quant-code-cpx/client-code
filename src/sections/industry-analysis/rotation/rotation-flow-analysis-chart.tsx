import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { yuanToYi } from 'src/utils/format-number';
import { periodToDays } from 'src/utils/format-time';

import { fetchFlowAnalysis, type FlowAnalysisItem } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const MAX_SECTORS = 20;

type Props = {
  tradeDate?: string;
  period?: string;
  onSectorClick?: (name: string) => void;
  refreshKey?: number;
};

export function RotationFlowAnalysisChart({ tradeDate, period, onSectorClick, refreshKey }: Props) {
  const theme = useTheme();
  const [flows, setFlows] = useState<FlowAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const periodDays = period ? periodToDays(period) : undefined;

    fetchFlowAnalysis({
      trade_date: tradeDate,
      days: periodDays,
      sort_by: 'cumulative_net',
      order: 'desc',
    })
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
  }, [tradeDate, period, refreshKey]);

  // Sort by net inflow descending, take top MAX_SECTORS.
  const displayed = [...flows]
    .sort((a, b) => b.netInflowYuan - a.netInflowYuan)
    .slice(0, MAX_SECTORS);
  const categories = displayed.map((r) => r.name);
  const netValues = displayed.map((r) => yuanToYi(r.netInflowYuan));
  // Distributed colors: red = inflow (A-share convention), green = outflow
  const colors = netValues.map((v) =>
    v >= 0 ? theme.palette.error.main : theme.palette.success.main
  );

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
    colors,
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        distributed: true,
        borderRadius: 3,
      },
    },
    xaxis: {
      categories,
      labels: {
        formatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}亿`,
      },
      title: { text: '区间净流入（亿元）' },
    },
    yaxis: {
      labels: { style: { fontSize: '12px' } },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val > 0 ? '+' : ''}${(val as number).toFixed(1)}亿`,
      style: { fontSize: '12px', colors: [theme.palette.common.white] },
      offsetX: 0,
    },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({ dataPointIndex }: any) => {
        const item = displayed[dataPointIndex];
        if (!item) return '';
        const net = yuanToYi(item.netInflowYuan);
        const sign = net > 0 ? '+' : '';
        const color = net >= 0 ? theme.palette.error.main : theme.palette.success.main;
        const label = net >= 0 ? '净流入' : '净流出';
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${item.name}</b><br/>`,
          `${label}：<span style="color:${color}">${sign}${net.toFixed(2)} 亿</span>`,
          '</div>',
        ].join('');
      },
    },
    legend: { show: false },
  });

  const series = [{ name: '净流入', data: netValues }];
  const chartHeight = Math.max(320, displayed.length * 34);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            行业资金净流入
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Top {MAX_SECTORS} · 单位：亿元
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : flows.length === 0 ? (
          <Box
            sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
