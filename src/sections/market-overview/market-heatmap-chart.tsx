import type { HeatmapDataResult, HeatmapIndustryItem } from 'src/api/heatmap';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHeatmapData, fetchHeatmapSnapshotHistory } from 'src/api/heatmap';

import { Chart, useChart } from 'src/components/chart';

// ── Color scale ranges (A-shares: red = up, green = down) ─────

const PCT_RANGES = [
  { from: -20, to: -5, color: '#005249' },
  { from: -5, to: -2, color: '#007867' },
  { from: -2, to: -0.5, color: '#22C55E' },
  { from: -0.5, to: 0.5, color: '#919EAB' },
  { from: 0.5, to: 2, color: '#FFAB00' },
  { from: 2, to: 5, color: '#FF5630' },
  { from: 5, to: 20, color: '#B72136' },
];

// ── Stats chips ───────────────────────────────────────────────

type StatsChipsProps = {
  stats: HeatmapDataResult['stats'];
};

function StatsChips({ stats }: StatsChipsProps) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip
        label={`涨停 ${stats.limitUp}`}
        size="small"
        sx={{ bgcolor: '#7A0000', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`上涨 ${stats.risers}`}
        size="small"
        sx={{ bgcolor: 'error.light', color: '#fff', fontWeight: 700 }}
      />
      <Chip label={`平盘 ${stats.flat}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
      <Chip
        label={`下跌 ${stats.fallers}`}
        size="small"
        sx={{ bgcolor: 'success.light', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`跌停 ${stats.limitDown}`}
        size="small"
        sx={{ bgcolor: '#003300', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`共 ${stats.total} 只`}
        size="small"
        variant="outlined"
        sx={{ color: 'text.secondary' }}
      />
    </Stack>
  );
}

// ── Treemap chart ─────────────────────────────────────────────

type HeatmapTreemapProps = {
  industries: HeatmapIndustryItem[];
};

function HeatmapTreemap({ industries }: HeatmapTreemapProps) {
  const series = [
    {
      data: industries.map((ind) => ({
        x: ind.industryName,
        y: Math.round(ind.pctChgAvg * 100) / 100,
      })),
    },
  ];

  const chartOptions = useChart({
    chart: { type: 'treemap', toolbar: { show: false } },
    plotOptions: {
      treemap: {
        enableShades: false,
        colorScale: { ranges: PCT_RANGES },
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
        return [`${item.x}`, `${sign}${item.y.toFixed(2)}%`];
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
        w: { config: { series: Array<{ data: Array<{ x: string; y: number }> }> } };
      }) => {
        const ind = industries[dataPointIndex];
        if (!ind) return '';
        const sign = ind.pctChgAvg > 0 ? '+' : '';
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${ind.industryName}</b><br/>`,
          `平均涨跌：<span style="color:${ind.pctChgAvg >= 0 ? '#FF5630' : '#22C55E'}">${sign}${ind.pctChgAvg.toFixed(2)}%</span><br/>`,
          `上涨：${ind.risers} 只 / 下跌：${ind.fallers} 只 / 共 ${ind.stockCount} 只`,
          '</div>',
        ].join('');
      },
    },
    legend: { show: false },
  });

  if (industries.length === 0) {
    return (
      <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          暂无行业数据
        </Typography>
      </Box>
    );
  }

  return <Chart type="treemap" series={series} options={chartOptions} sx={{ height: 460 }} />;
}

// ── Main component ────────────────────────────────────────────

type ViewMode = 'live' | 'snapshot';

type Props = {
  tradeDate?: string;
};

export function MarketHeatmapChart({ tradeDate }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [snapshotDate, setSnapshotDate] = useState('');
  const [data, setData] = useState<HeatmapDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    (mode: ViewMode, date: string) => {
      let cancelled = false;
      setLoading(true);
      setError('');

      const req =
        mode === 'snapshot' && date
          ? fetchHeatmapSnapshotHistory({ trade_date: date })
          : fetchHeatmapData({ trade_date: tradeDate });

      req
        .then((res) => {
          if (!cancelled) setData(res);
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
    },
    [tradeDate]
  );

  useEffect(() => {
    const cleanup = load(viewMode, snapshotDate);
    return cleanup;
  }, [load, viewMode, snapshotDate, tradeDate]);

  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, val: ViewMode | null) => {
      if (val) setViewMode(val);
    },
    []
  );

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            市场热力图
            {data?.tradeDate && (
              <Typography
                component="span"
                variant="caption"
                sx={{ ml: 1, color: 'text.secondary' }}
              >
                {data.tradeDate}
              </Typography>
            )}
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={handleViewModeChange}
            >
              <ToggleButton value="live" sx={{ px: 1.5 }}>
                实时
              </ToggleButton>
              <ToggleButton value="snapshot" sx={{ px: 1.5 }}>
                历史快照
              </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'snapshot' && (
              <TextField
                size="small"
                label="日期（YYYYMMDD）"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                sx={{ width: 170 }}
              />
            )}
          </Stack>
        </Stack>

        {/* Stats */}
        {data?.stats && !loading && (
          <Box sx={{ mb: 2 }}>
            <StatsChips stats={data.stats} />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Treemap */}
        {loading ? (
          <Skeleton variant="rectangular" height={460} sx={{ borderRadius: 1 }} />
        ) : (
          <HeatmapTreemap industries={data?.industries ?? []} />
        )}
      </CardContent>
    </Card>
  );
}
