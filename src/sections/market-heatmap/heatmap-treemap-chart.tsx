import type { HeatmapItem, HeatmapDistribution } from 'src/api/heatmap';

import { useRef, useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Chart, useChart } from 'src/components/chart';

import { getHeatmapColor } from './utils';

// ----------------------------------------------------------------------

type SizeBy = 'totalMv' | 'amount';

type DisplayCount = 100 | 200 | 300;

type Props = {
  items: HeatmapItem[];
  distribution: HeatmapDistribution | null;
  loading: boolean;
  error: string;
  groupBy: string;
  sizeBy: SizeBy;
};

type ApexChartCtx = {
  seriesIndex: number;
  dataPointIndex: number;
  w: { config: { series: Array<{ data: Array<{ x: string }> }> } };
};

function getStockDisplayName(item: HeatmapItem): string {
  return item.name ?? item.tsCode;
}

function formatLabel(pctChg: number | null): string {
  const v = pctChg ?? 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function HeatmapTreemapChart({ items, distribution, loading, error, groupBy, sizeBy }: Props) {
  const theme = useTheme();
  const itemsRef = useRef<HeatmapItem[]>([]);
  const [displayCount, setDisplayCount] = useState<DisplayCount>(200);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const series = useMemo(() => {
    if (!items.length) return [];

    // Sort by sizeBy desc, limit by displayCount for performance
    const sorted = [...items]
      .sort((a, b) => (b[sizeBy] ?? 0) - (a[sizeBy] ?? 0))
      .slice(0, displayCount);

    if (groupBy === 'industry') {
      const grouped: Record<string, HeatmapItem[]> = {};
      for (const s of sorted) {
        const key = s.groupName ?? s.industry ?? '其他';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      }
      return Object.entries(grouped).map(([grp, stocks]) => ({
        name: grp,
        data: stocks.map((s) => ({
          x: getStockDisplayName(s),
          y: Math.max(s[sizeBy] ?? 1, 1),
          fillColor: getHeatmapColor(s.pctChg),
        })),
      }));
    }

    // Index mode: single series
    return [
      {
        name: '成分股',
        data: sorted.map((s) => ({
          x: getStockDisplayName(s),
          y: Math.max(s[sizeBy] ?? 1, 1),
          fillColor: getHeatmapColor(s.pctChg),
        })),
      },
    ];
  }, [items, groupBy, sizeBy, displayCount]);

  const chartOptions = useChart({
    chart: {
      type: 'treemap',
      toolbar: { show: false },
      animations: { enabled: false },
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false,
      },
    },
    states: {
      hover: {
        filter: { type: 'lighten' },
      },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '11px', fontWeight: 500, colors: ['#fff'] },
      formatter(text: string) {
        const item = itemsRef.current.find((s) => getStockDisplayName(s) === text);
        if (!item) return text;
        return [text, formatLabel(item.pctChg)];
      },
      offsetY: -4,
    },
    tooltip: {
      custom({ seriesIndex, dataPointIndex, w }: ApexChartCtx) {
        const point = w.config.series[seriesIndex]?.data[dataPointIndex];
        if (!point) return '';
        const item = itemsRef.current.find((s) => getStockDisplayName(s) === point.x);
        if (!item) return `<div style="padding:8px"><b>${point.x}</b></div>`;
        const pnlColor = (item.pctChg ?? 0) >= 0 ? '#F44336' : '#2E7D32';
        const amtBillion = ((item.amount ?? 0) / 100000).toFixed(2);
        const group = item.groupName ?? item.industry ?? '-';
        return `
          <div style="padding:10px 14px;font-size:13px;line-height:1.8">
            <b style="font-size:14px">${getStockDisplayName(item)}</b>
            <span style="color:#9e9e9e;font-size:11px"> ${item.tsCode}</span><br/>
            <span style="color:#9e9e9e">分组：</span>${group}<br/>
            <span style="color:${pnlColor};font-weight:600">${formatLabel(item.pctChg)}</span><br/>
            <span style="color:#9e9e9e">成交额：</span>${amtBillion} 亿
          </div>`;
      },
    },
    legend: { show: false },
    colors: [theme.palette.primary.main],
  });

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">市场热力图</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={displayCount}
              onChange={(_e, v) => { if (v) setDisplayCount(v as DisplayCount); }}
            >
              <ToggleButton value={100}>100</ToggleButton>
              <ToggleButton value={200}>200</ToggleButton>
              <ToggleButton value={300}>300</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {distribution && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`涨停 ${distribution.limitUp}`}
                sx={{ bgcolor: '#B71C1C', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`上涨 ${distribution.upCount}`}
                sx={{ bgcolor: '#F44336', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`平盘 ${distribution.flatCount}`}
                sx={{ bgcolor: '#757575', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`下跌 ${distribution.downCount}`}
                sx={{ bgcolor: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`跌停 ${distribution.limitDown}`}
                sx={{ bgcolor: '#00695C', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
            </Stack>
          )}
        </Stack>

        {loading && <Skeleton variant="rectangular" sx={{ borderRadius: 1 }} height={560} />}

        {!loading && error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {!loading && !error && series.length > 0 && (
          <Chart type="treemap" series={series} options={chartOptions} sx={{ height: 560 }} />
        )}

        {!loading && !error && series.length === 0 && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
