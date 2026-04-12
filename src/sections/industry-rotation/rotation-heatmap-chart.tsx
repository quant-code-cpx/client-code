import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchRotationHeatmap, type RotationHeatmapSector } from 'src/api/market';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchRotationHeatmap({ trade_date: tradeDate, periods: period ? [period] : undefined })
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

  const handleColorModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, val: ColorMode | null) => {
      if (val) setColorMode(val);
    },
    []
  );

  const series = [
    {
      data: sectors.map((s) => ({
        x: s.name,
        y:
          colorMode === 'pctChange'
            ? Math.round(s.pctChange * 100) / 100
            : Math.round(s.netAmount / 10000) / 100,
      })),
    },
  ];

  const pctRanges = [
    { from: -20, to: -5, color: '#006097' },
    { from: -5, to: -2, color: '#00B8D9' },
    { from: -2, to: -0.5, color: '#22C55E' },
    { from: -0.5, to: 0.5, color: '#919EAB' },
    { from: 0.5, to: 2, color: '#FFAB00' },
    { from: 2, to: 5, color: '#FF5630' },
    { from: 5, to: 20, color: '#B72136' },
  ];

  const flowRanges = [
    { from: -1e9, to: -50, color: '#006097' },
    { from: -50, to: -10, color: '#00B8D9' },
    { from: -10, to: -2, color: '#22C55E' },
    { from: -2, to: 2, color: '#919EAB' },
    { from: 2, to: 10, color: '#FFAB00' },
    { from: 10, to: 50, color: '#FF5630' },
    { from: 50, to: 1e9, color: '#B72136' },
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
        return [
          `${item.x}`,
          `${sign}${item.y.toFixed(2)}${colorMode === 'pctChange' ? '%' : '亿'}`,
        ];
      },
    },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({
        seriesIndex,
        dataPointIndex,
        w,
      }: {
        seriesIndex: number;
        dataPointIndex: number;
        w: { config: { series: Array<{ data: Array<{ x: string; y: number }> }> } };
      }) => {
        const sector = sectors[dataPointIndex];
        if (!sector) return '';
        const amount = (sector.amount / 10000).toFixed(1);
        const netAmount = (sector.netAmount / 10000).toFixed(1);
        const sign = sector.pctChange > 0 ? '+' : '';
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${sector.name}</b><br/>`,
          `涨跌幅：<span style="color:${sector.pctChange >= 0 ? '#FF5630' : '#22C55E'}">${sign}${sector.pctChange.toFixed(2)}%</span><br/>`,
          `成交额：${amount} 亿<br/>`,
          `净流入：<span style="color:${sector.netAmount >= 0 ? '#FF5630' : '#22C55E'}">${netAmount} 亿</span>`,
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
