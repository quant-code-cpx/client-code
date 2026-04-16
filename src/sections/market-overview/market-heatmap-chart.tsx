import type { Dayjs } from 'dayjs';
import type { HeatmapItem, HeatmapDistribution, HeatmapSectorSummary } from 'src/api/heatmap';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHeatmapData, fetchHeatmapSnapshotHistory } from 'src/api/heatmap';

import { Chart, useChart } from 'src/components/chart';

import { aggregateSectors, computeDistribution } from 'src/sections/market-heatmap/utils';

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
  dist: HeatmapDistribution;
  total: number;
};

function StatsChips({ dist, total }: StatsChipsProps) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip
        label={`涨停 ${dist.limitUp}`}
        size="small"
        sx={{ bgcolor: '#7A0000', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`上涨 ${dist.upCount}`}
        size="small"
        sx={{ bgcolor: 'error.light', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`平盘 ${dist.flatCount}`}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700 }}
      />
      <Chip
        label={`下跌 ${dist.downCount}`}
        size="small"
        sx={{ bgcolor: 'success.light', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`跌停 ${dist.limitDown}`}
        size="small"
        sx={{ bgcolor: '#003300', color: '#fff', fontWeight: 700 }}
      />
      <Chip
        label={`共 ${total} 只`}
        size="small"
        variant="outlined"
        sx={{ color: 'text.secondary' }}
      />
    </Stack>
  );
}

// ── Treemap chart ─────────────────────────────────────────────

type HeatmapTreemapProps = {
  sectors: HeatmapSectorSummary[];
};

function HeatmapTreemap({ sectors }: HeatmapTreemapProps) {
  const series = [
    {
      data: sectors.map((s) => ({
        x: s.groupName,
        y: Math.round(s.avgPctChg * 100) / 100,
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
        const sec = sectors[dataPointIndex];
        if (!sec) return '';
        const sign = sec.avgPctChg > 0 ? '+' : '';
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${sec.groupName}</b><br/>`,
          `平均涨跌：<span style="color:${sec.avgPctChg >= 0 ? '#FF5630' : '#22C55E'}">${sign}${sec.avgPctChg.toFixed(2)}%</span><br/>`,
          `上涨：${sec.upCount} 只 / 下跌：${sec.downCount} 只 / 共 ${sec.stockCount} 只`,
          '</div>',
        ].join('');
      },
    },
    legend: { show: false },
  });

  if (sectors.length === 0) {
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
  const [snapshotDate, setSnapshotDate] = useState<Dayjs | null>(null);
  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const snapshotDateStr = snapshotDate ? snapshotDate.format('YYYYMMDD') : '';

  const load = useCallback(
    (mode: ViewMode, date: string) => {
      let cancelled = false;
      setLoading(true);
      setError('');

      const req =
        mode === 'snapshot' && date
          ? fetchHeatmapSnapshotHistory({ trade_date: date }).then((res) => res.items)
          : fetchHeatmapData({ trade_date: tradeDate });

      req
        .then((res) => {
          if (!cancelled) setItems(res);
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
    const cleanup = load(viewMode, snapshotDateStr);
    return cleanup;
  }, [load, viewMode, snapshotDateStr, tradeDate]);

  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, val: ViewMode | null) => {
      if (val) setViewMode(val);
    },
    []
  );

  const sectors = aggregateSectors(items);
  const distribution = computeDistribution(items);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            市场热力图
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
              <DatePicker
                label="快照日期"
                value={snapshotDate}
                onChange={(newVal) => setSnapshotDate(newVal)}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: { size: 'small', sx: { width: 190 } },
                  field: { clearable: true },
                }}
              />
            )}
          </Stack>
        </Stack>

        {items.length > 0 && !loading && (
          <Box sx={{ mb: 2 }}>
            <StatsChips dist={distribution} total={items.length} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={460} sx={{ borderRadius: 1 }} />
        ) : (
          <HeatmapTreemap sectors={sectors} />
        )}
      </CardContent>
    </Card>
  );
}
