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
  if (pctChg == null || !Number.isFinite(pctChg)) return '—';
  return `${pctChg >= 0 ? '+' : ''}${pctChg.toFixed(1)}%`;
}

export function HeatmapTreemapChart({
  items,
  distribution,
  loading,
  error,
  groupBy,
  sizeBy,
}: Props) {
  const theme = useTheme();
  const itemsRef = useRef<HeatmapItem[]>([]);
  const [displayCount, setDisplayCount] = useState<DisplayCount>(100);
  const colorPalette = useMemo(
    () => ({
      strongNegative: theme.vars.palette.success.dark,
      negative: theme.vars.palette.success.main,
      weakNegative: theme.vars.palette.success.light,
      neutral: theme.vars.palette.grey[500],
      weakPositive: theme.vars.palette.error.light,
      positive: theme.vars.palette.error.main,
      strongPositive: theme.vars.palette.error.dark,
    }),
    [theme]
  );

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
          fillColor: getHeatmapColor(s.pctChg, colorPalette),
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
          fillColor: getHeatmapColor(s.pctChg, colorPalette),
        })),
      },
    ];
  }, [items, groupBy, sizeBy, displayCount, colorPalette]);

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
      style: { fontSize: '12px', fontWeight: 500, colors: [theme.vars.palette.common.white] },
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
        const pnlColor =
          item.pctChg == null
            ? theme.vars.palette.text.secondary
            : item.pctChg >= 0
              ? theme.vars.palette.error.main
              : theme.vars.palette.success.main;
        const amtBillion = item.amount == null ? '—' : `${(item.amount / 100000).toFixed(2)} 亿`;
        const group = item.groupName ?? item.industry ?? '-';
        return `
          <div style="padding:10px 14px;font-size:13px;line-height:1.8">
            <b style="font-size:14px">${getStockDisplayName(item)}</b>
            <span style="color:${theme.vars.palette.text.secondary};font-size:12px"> ${item.tsCode}</span><br/>
            <span style="color:${theme.vars.palette.text.secondary}">分组：</span>${group}<br/>
            <span style="color:${pnlColor};font-weight:600">${formatLabel(item.pctChg)}</span><br/>
            <span style="color:${theme.vars.palette.text.secondary}">成交额：</span>${amtBillion}
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
              onChange={(_e, v) => {
                if (v) setDisplayCount(v as DisplayCount);
              }}
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
                sx={{ bgcolor: 'error.dark', color: 'common.white', fontWeight: 700, fontSize: 12 }}
              />
              <Chip
                size="small"
                label={`上涨 ${distribution.upCount}`}
                sx={{ bgcolor: 'error.main', color: 'common.white', fontWeight: 700, fontSize: 12 }}
              />
              <Chip
                size="small"
                label={`平盘 ${distribution.flatCount}`}
                sx={{ bgcolor: 'grey.600', color: 'common.white', fontWeight: 700, fontSize: 12 }}
              />
              <Chip
                size="small"
                label={`下跌 ${distribution.downCount}`}
                sx={{ bgcolor: 'success.main', color: 'common.white', fontWeight: 700, fontSize: 12 }}
              />
              <Chip
                size="small"
                label={`跌停 ${distribution.limitDown}`}
                sx={{ bgcolor: 'success.dark', color: 'common.white', fontWeight: 700, fontSize: 12 }}
              />
              {distribution.missingCount > 0 && (
                <Chip size="small" label={`缺失 ${distribution.missingCount}`} variant="outlined" />
              )}
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
