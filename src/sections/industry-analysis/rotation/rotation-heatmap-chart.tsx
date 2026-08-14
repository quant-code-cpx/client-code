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

import { yuanToYi } from 'src/utils/format-number';
import { periodToDays } from 'src/utils/format-time';

import {
  fetchFlowAnalysis,
  fetchRotationHeatmap,
  type RotationHeatmapSector,
} from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type ColorMode = 'pctChange' | 'netAmount';

type HeatmapChartPoint = {
  sector: RotationHeatmapSector;
  x: string;
  y: number;
  netInflowYuan: number | null;
};

type Props = {
  tradeDate?: string;
  period?: string;
  onSectorClick?: (name: string) => void;
  refreshKey?: number;
};

export function RotationHeatmapChart({ tradeDate, period, onSectorClick, refreshKey }: Props) {
  const theme = useTheme();
  const [colorMode, setColorMode] = useState<ColorMode>('pctChange');
  const [sectors, setSectors] = useState<RotationHeatmapSector[]>([]);
  // Map<sectorName, net inflow in 元> — populated from flow-analysis endpoint.
  const [flowMap, setFlowMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flowError, setFlowError] = useState('');

  // Primary: fetch heatmap (period returns per sector)
  useEffect(() => {
    let cancelled = false;
    setFlowError('');
    setLoading(true);
    setError('');

    const periodDays = period ? periodToDays(period) : undefined;

    fetchRotationHeatmap({
      trade_date: tradeDate,
      periods: periodDays ? [periodDays] : undefined,
    })
      .then((res) => {
        if (!cancelled) setSectors(res?.sectors ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载热力图数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, period, refreshKey]);

  // Secondary: fetch flow analysis to populate netAmount per sector (best-effort, silent on error)
  useEffect(() => {
    let cancelled = false;
    const periodDays = period ? periodToDays(period) : undefined;
    fetchFlowAnalysis({
      trade_date: tradeDate,
      days: periodDays,
      sort_by: 'cumulative_net',
      order: 'desc',
    })
      .then((res) => {
        if (!cancelled) {
          const map = new Map<string, number>();
          for (const f of res?.flows ?? []) {
            map.set(f.name, f.netInflowYuan);
          }
          setFlowMap(map);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFlowMap(new Map());
          setFlowError('净流入暂不可用');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tradeDate, period, refreshKey]);

  const handleColorModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, val: ColorMode | null) => {
      if (val) setColorMode(val);
    },
    []
  );

  const chartData: HeatmapChartPoint[] = sectors
    .flatMap((sector): HeatmapChartPoint[] => {
      const netInflowYuan = flowMap.get(sector.name) ?? null;
      const rawValue = colorMode === 'pctChange' ? sector.pctChange : netInflowYuan;
      if (!Number.isFinite(rawValue)) return [];

      const y =
        colorMode === 'pctChange'
          ? Math.round((rawValue as number) * 100) / 100
          : Math.round(yuanToYi(rawValue as number) * 100) / 100;

      return [{ sector, x: sector.name, y, netInflowYuan }];
    })
    .sort((a, b) => b.y - a.y);

  const series = [
    { data: chartData.map(({ x, y, netInflowYuan }) => ({ x, y, netInflowYuan })) },
  ];

  // A-share convention: 红涨绿跌 (red = gain/inflow, green = drop/outflow)
  const pctRanges = [
    { from: -100, to: -7, color: theme.palette.success.darker },
    { from: -7, to: -3, color: theme.palette.success.dark },
    { from: -3, to: -1, color: theme.palette.success.light },
    { from: -1, to: 1, color: theme.palette.grey[500] },
    { from: 1, to: 3, color: theme.palette.error.light },
    { from: 3, to: 7, color: theme.palette.error.main },
    { from: 7, to: 100, color: theme.palette.error.dark },
  ];

  // Net flow ranges in 亿 (same color convention)
  const flowRanges = [
    { from: -1e6, to: -50, color: theme.palette.success.darker },
    { from: -50, to: -10, color: theme.palette.success.dark },
    { from: -10, to: -2, color: theme.palette.success.light },
    { from: -2, to: 2, color: theme.palette.grey[500] },
    { from: 2, to: 10, color: theme.palette.error.light },
    { from: 10, to: 50, color: theme.palette.error.main },
    { from: 50, to: 1e6, color: theme.palette.error.dark },
  ];

  const chartOptions = useChart({
    chart: {
      type: 'treemap',
      toolbar: { show: false },
      events: {
        dataPointSelection: (_event: unknown, _chartCtx: unknown, config: unknown) => {
          const name =
            chartData[(config as { dataPointIndex: number })?.dataPointIndex]?.sector.name;
          if (name && onSectorClick) onSectorClick(name);
        },
      },
    },
    plotOptions: {
      treemap: {
        enableShades: false,
        colorScale: {
          ranges: colorMode === 'pctChange' ? pctRanges : flowRanges,
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '12px', fontWeight: '600' },
      formatter: (_val: unknown, options?: unknown) => {
        const opts = options as
          | { seriesIndex: number; dataPointIndex: number; w?: { config?: { series?: unknown[] } } }
          | undefined;
        const item = (
          opts?.w?.config?.series?.[opts.seriesIndex] as
            | { data: Array<{ x: string; y: number }> }
            | undefined
        )?.data?.[opts?.dataPointIndex ?? -1];
        if (!item) return '';
        const sign = item.y > 0 ? '+' : '';
        const unit = colorMode === 'pctChange' ? '%' : '亿';
        return [`${item.x}`, `${sign}${item.y.toFixed(2)}${unit}`];
      },
    },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({ dataPointIndex }: { seriesIndex: number; dataPointIndex: number; w: unknown }) => {
        const item = chartData[dataPointIndex];
        const sector = item?.sector;
        if (!sector) return '';
        const netInflowYuan = item.netInflowYuan;
        const pctText =
          sector.pctChange == null
            ? '—'
            : `${sector.pctChange > 0 ? '+' : ''}${sector.pctChange.toFixed(2)}%`;
        const netText =
          netInflowYuan == null
            ? '—'
            : `${netInflowYuan > 0 ? '+' : ''}${yuanToYi(netInflowYuan).toFixed(2)} 亿`;
        const pctColor =
          sector.pctChange == null
            ? theme.palette.text.secondary
            : sector.pctChange >= 0
              ? theme.palette.error.main
              : theme.palette.success.dark;
        const flowColor =
          netInflowYuan == null
            ? theme.palette.text.secondary
            : netInflowYuan >= 0
              ? theme.palette.error.main
              : theme.palette.success.dark;
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${sector.name}</b><br/>`,
          `涨跌幅：<span style="color:${pctColor}">${pctText}</span><br/>`,
          `区间净流入：<span style="color:${flowColor}">${netText}</span>`,
          '</div>',
        ].join('');
      },
    },
    legend: { show: false },
  });

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">行业热力图</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={colorMode}
            onChange={handleColorModeChange}
          >
            <ToggleButton value="pctChange">涨跌幅</ToggleButton>
            <ToggleButton value="netAmount">净流入</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!error && flowError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {flowError}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={480} />
        ) : chartData.length === 0 ? (
          <Box
            sx={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.disabled">暂无有效数据</Typography>
          </Box>
        ) : (
          <Chart type="treemap" series={series} options={chartOptions} sx={{ height: 480 }} />
        )}
      </CardContent>
    </Card>
  );
}
