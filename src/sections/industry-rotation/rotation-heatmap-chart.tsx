import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { periodToDays } from 'src/utils/format-time';

import { fetchFlowAnalysis, fetchRotationHeatmap, type RotationHeatmapSector } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type ColorMode = 'pctChange' | 'netAmount';

type Props = {
  tradeDate?: string;
  period?: string;
  onSectorClick?: (name: string) => void;
};

export function RotationHeatmapChart({ tradeDate, period, onSectorClick }: Props) {
  const [colorMode, setColorMode] = useState<ColorMode>('pctChange');
  const [sectors, setSectors] = useState<RotationHeatmapSector[]>([]);
  // Map<sectorName, netAmount in yuan (元)> — populated from flow-analysis endpoint
  const [flowMap, setFlowMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Primary: fetch heatmap (period returns per sector)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchRotationHeatmap({ trade_date: tradeDate, periods: period ? [periodToDays(period)] : undefined })
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
  }, [tradeDate, period]);

  // Secondary: fetch flow analysis to populate netAmount per sector (best-effort, silent on error)
  useEffect(() => {
    let cancelled = false;
    fetchFlowAnalysis({ trade_date: tradeDate, days: period ? periodToDays(period) : undefined })
      .then((res) => {
        if (!cancelled) {
          const map = new Map<string, number>();
          for (const f of res?.flows ?? []) {
            map.set(f.name, f.netInflow); // netInflow is in yuan (元)
          }
          setFlowMap(map);
        }
      })
      .catch(() => {/* silently ignore — heatmap still works without flow data */});
    return () => { cancelled = true; };
  }, [tradeDate, period]);

  const handleColorModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, val: ColorMode | null) => {
      if (val) setColorMode(val);
    },
    []
  );

  const series = [
    {
      data: sectors.map((s) => {
        if (colorMode === 'pctChange') {
          return { x: s.name, y: Math.round(s.pctChange * 100) / 100 };
        }
        // Convert yuan → 亿
        const netYuan = flowMap.get(s.name) ?? 0;
        return { x: s.name, y: Math.round((netYuan / 1e8) * 100) / 100 };
      }),
    },
  ];

  // A-share convention: 红涨绿跌 (red = gain/inflow, green = drop/outflow)
  const pctRanges = [
    { from: -100, to: -7,  color: '#1A7A55' },
    { from: -7,   to: -3,  color: '#36B37E' },
    { from: -3,   to: -1,  color: '#86EFAC' },
    { from: -1,   to:  1,  color: '#919EAB' },
    { from:  1,   to:  3,  color: '#FFAC82' },
    { from:  3,   to:  7,  color: '#FF5630' },
    { from:  7,   to: 100, color: '#B72136' },
  ];

  // Net flow ranges in 亿 (same color convention)
  const flowRanges = [
    { from: -1e6, to: -50, color: '#1A7A55' },
    { from: -50,  to: -10, color: '#36B37E' },
    { from: -10,  to:  -2, color: '#86EFAC' },
    { from:  -2,  to:   2, color: '#919EAB' },
    { from:   2,  to:  10, color: '#FFAC82' },
    { from:  10,  to:  50, color: '#FF5630' },
    { from:  50,  to: 1e6, color: '#B72136' },
  ];

  const chartOptions = useChart({
    chart: {
      type: 'treemap',
      toolbar: { show: false },
      events: {
        dataPointSelection: (_event: unknown, _chartCtx: unknown, config: any) => {
          const name = sectors[(config as { dataPointIndex: number })?.dataPointIndex]?.name;
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
      formatter: (_val: unknown, opts: any) => {
        const item = (
          opts?.w?.config?.series?.[opts.seriesIndex] as
            | { data: Array<{ x: string; y: number }> }
            | undefined
        )?.data?.[opts.dataPointIndex];
        if (!item) return '';
        const sign = item.y > 0 ? '+' : '';
        const unit = colorMode === 'pctChange' ? '%' : '亿';
        return [`${item.x}`, `${sign}${item.y.toFixed(2)}${unit}`];
      },
    },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({
        dataPointIndex,
      }: {
        seriesIndex: number;
        dataPointIndex: number;
        w: unknown;
      }) => {
        const sector = sectors[dataPointIndex];
        if (!sector) return '';
        const netYuan = flowMap.get(sector.name) ?? 0;
        const netYi = (netYuan / 1e8).toFixed(2);
        const pctSign = sector.pctChange > 0 ? '+' : '';
        const flowSign = netYuan > 0 ? '+' : '';
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${sector.name}</b><br/>`,
          `涨跌幅：<span style="color:${sector.pctChange >= 0 ? '#FF5630' : '#1A7A55'}">${pctSign}${sector.pctChange.toFixed(2)}%</span><br/>`,
          `区间净流入：<span style="color:${netYuan >= 0 ? '#FF5630' : '#1A7A55'}">${flowSign}${netYi} 亿</span>`,
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

        {loading ? (
          <Skeleton variant="rectangular" height={480} />
        ) : sectors.length === 0 ? (
          <Box
            sx={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.disabled">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="treemap" series={series} options={chartOptions} sx={{ height: 480 }} />
        )}
      </CardContent>
    </Card>
  );
}

