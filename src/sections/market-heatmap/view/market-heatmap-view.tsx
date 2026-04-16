import type { Dayjs } from 'dayjs';
import type { SectorFlowItem, MainFlowRankingItem } from 'src/api/market';
import type { HeatmapItem, HeatmapDistribution, HeatmapSectorSummary } from 'src/api/heatmap';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHeatmapData } from 'src/api/heatmap';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchSectorFlow, fetchMainFlowRanking } from 'src/api/market';

import { HeatmapTreemapChart } from '../heatmap-treemap-chart';
import { HeatmapScatterChart } from '../heatmap-scatter-chart';
import { aggregateSectors, computeDistribution } from '../utils';
import { HeatmapSnapshotPanel } from '../heatmap-snapshot-panel';
import { HeatmapSectorBarChart } from '../heatmap-sector-bar-chart';
import { HeatmapDistributionChart } from '../heatmap-distribution-chart';
import { HeatmapSectorDetailDialog } from '../heatmap-sector-detail-dialog';

// ----------------------------------------------------------------------

type ViewMode = 'scatter' | 'treemap';
type ContentType = 'INDUSTRY' | 'CONCEPT' | 'REGION';
type GroupByOption = 'industry' | 'hs300' | 'zz500' | 'sz50' | 'cyb';
type SizeBy = 'totalMv' | 'amount';

type GroupConfig = {
  value: GroupByOption;
  label: string;
  groupBy: 'industry' | 'index' | 'concept';
  indexCode?: string;
};

const GROUP_OPTIONS: GroupConfig[] = [
  { value: 'industry', label: '按行业', groupBy: 'industry' },
  { value: 'hs300', label: '沪深300', groupBy: 'index', indexCode: '000300.SH' },
  { value: 'zz500', label: '中证500', groupBy: 'index', indexCode: '000905.SH' },
  { value: 'sz50', label: '上证50', groupBy: 'index', indexCode: '000016.SH' },
  { value: 'cyb', label: '创业板', groupBy: 'index', indexCode: '399006.SZ' },
];

export function MarketHeatmapView() {
  // ── 共享状态 ─────────────────────────────────
  const [tradeDate, setTradeDate] = useState<Dayjs | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('scatter');

  const tradeDateStr = tradeDate ? tradeDate.format('YYYYMMDD') : undefined;

  // ── 热力图（TreeMap + 下方统计图）数据 ───────
  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── TreeMap 专属控件 ─────────────────────────
  const [groupBy, setGroupBy] = useState<GroupByOption>('industry');
  const [sizeBy, setSizeBy] = useState<SizeBy>('totalMv');

  // ── 散点图专属状态 ────────────────────────────
  const [contentType, setContentType] = useState<ContentType>('INDUSTRY');
  const [sectorFlows, setSectorFlows] = useState<SectorFlowItem[]>([]);
  const [mainFlowRanking, setMainFlowRanking] = useState<MainFlowRankingItem[]>([]);
  const [scatterLoading, setScatterLoading] = useState(false);
  const [scatterError, setScatterError] = useState('');

  // ── 行业详情弹窗 ─────────────────────────────
  const [detailSector, setDetailSector] = useState<SectorFlowItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── 衍生数据 ─────────────────────────────────
  const sectors: HeatmapSectorSummary[] = useMemo(() => aggregateSectors(items), [items]);
  const distribution: HeatmapDistribution = useMemo(() => computeDistribution(items), [items]);

  // 涨幅 Top N 按行业分组（从 HeatmapItem[]）
  const topGainersByGroup = useMemo(() => {
    const map: Record<string, Array<{ name: string; tsCode: string; pctChg: number }>> = {};
    for (const item of items) {
      const group = item.groupName ?? item.industry ?? '其他';
      if (!map[group]) map[group] = [];
      map[group].push({
        name: item.name ?? item.tsCode,
        tsCode: item.tsCode,
        pctChg: item.pctChg ?? 0,
      });
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.pctChg - a.pctChg);
      map[key] = map[key].slice(0, 10);
    }
    return map;
  }, [items]);

  // 资金流入 Top N 按行业分组（从 MainFlowRankingItem[]）
  const topInflowByGroup = useMemo(() => {
    const map: Record<
      string,
      Array<{ name: string; tsCode: string; mainNetInflow: number }>
    > = {};
    for (const item of mainFlowRanking) {
      const group = item.industry ?? '其他';
      if (!map[group]) map[group] = [];
      map[group].push({
        name: item.name ?? item.tsCode,
        tsCode: item.tsCode,
        mainNetInflow: item.mainNetInflow ?? 0,
      });
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.mainNetInflow - a.mainNetInflow);
      map[key] = map[key].slice(0, 10);
    }
    return map;
  }, [mainFlowRanking]);

  // ── 数据加载：热力图（始终加载，下方统计图依赖） ──
  useEffect(() => {
    const cfg = GROUP_OPTIONS.find((o) => o.value === groupBy)!;
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHeatmapData({
      trade_date: tradeDateStr,
      group_by: cfg.groupBy,
      index_code: cfg.indexCode,
    })
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch(() => {
        if (!cancelled) setError('热力图数据加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDateStr, groupBy]);

  // ── 数据加载：散点图数据 ──────────────────────
  useEffect(() => {
    if (viewMode !== 'scatter') return undefined;

    let cancelled = false;
    setScatterLoading(true);
    setScatterError('');

    Promise.all([
      fetchSectorFlow({
        trade_date: tradeDateStr,
        content_type: contentType,
      }),
      fetchMainFlowRanking({
        trade_date: tradeDateStr,
        limit: 200,
      }),
    ])
      .then(([flowRes, rankRes]) => {
        if (cancelled) return;
        setSectorFlows(flowRes?.sectors ?? []);
        setMainFlowRanking(rankRes?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setScatterError(err instanceof Error ? err.message : '散点图数据加载失败');
      })
      .finally(() => {
        if (!cancelled) setScatterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewMode, tradeDateStr, contentType]);

  // ── 事件处理 ─────────────────────────────────
  const handleViewModeChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: ViewMode | null) => {
      if (v) setViewMode(v);
    },
    []
  );

  const handleContentTypeChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: ContentType | null) => {
      if (v) setContentType(v);
    },
    []
  );

  const handleGroupByChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: GroupByOption | null) => {
      if (v) setGroupBy(v);
    },
    []
  );

  const handleSizeByChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: SizeBy | null) => {
      if (v) setSizeBy(v);
    },
    []
  );

  const handleSectorClick = useCallback((sector: SectorFlowItem) => {
    setDetailSector(sector);
    setDetailOpen(true);
  }, []);

  const activeGroupBy = GROUP_OPTIONS.find((o) => o.value === groupBy)!.groupBy;

  // ── 弹窗数据：按行业筛选个股 ─────────────────
  const detailStocks = useMemo(
    () =>
      detailSector
        ? items.filter(
            (s) => (s.groupName ?? s.industry) === detailSector.name
          )
        : [],
    [items, detailSector]
  );

  const detailStockFlows = useMemo(
    () =>
      detailSector
        ? mainFlowRanking.filter((s) => s.industry === detailSector.name)
        : [],
    [mainFlowRanking, detailSector]
  );

  return (
    <DashboardContent>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">市场热力图</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <DatePicker
            label="交易日期"
            value={tradeDate}
            onChange={(newVal) => setTradeDate(newVal)}
            format="YYYY-MM-DD"
            slotProps={{
              textField: { size: 'small', sx: { width: 190 } },
              field: { clearable: true },
            }}
          />

          {/* 视图切换 */}
          <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={handleViewModeChange}>
            <ToggleButton value="scatter">散点图</ToggleButton>
            <ToggleButton value="treemap">TreeMap</ToggleButton>
          </ToggleButtonGroup>

          {/* 散点图：板块类型切换 */}
          {viewMode === 'scatter' && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={contentType}
              onChange={handleContentTypeChange}
            >
              <ToggleButton value="INDUSTRY">行业</ToggleButton>
              <ToggleButton value="CONCEPT">概念</ToggleButton>
              <ToggleButton value="REGION">地域</ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* TreeMap：分组 + 大小维度 */}
          {viewMode === 'treemap' && (
            <>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={groupBy}
                onChange={handleGroupByChange}
              >
                {GROUP_OPTIONS.map((opt) => (
                  <ToggleButton key={opt.value} value={opt.value}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <ToggleButtonGroup
                size="small"
                exclusive
                value={sizeBy}
                onChange={handleSizeByChange}
              >
                <ToggleButton value="totalMv">总市值</ToggleButton>
                <ToggleButton value="amount">成交额</ToggleButton>
              </ToggleButtonGroup>
            </>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* 主图区 */}
        <Grid size={{ xs: 12 }}>
          {viewMode === 'scatter' ? (
            <HeatmapScatterChart
              sectors={sectorFlows}
              topGainersByGroup={topGainersByGroup}
              topInflowByGroup={topInflowByGroup}
              loading={scatterLoading}
              error={scatterError}
              onSectorClick={handleSectorClick}
            />
          ) : (
            <HeatmapTreemapChart
              items={items}
              distribution={items.length > 0 ? distribution : null}
              loading={loading}
              error={error}
              groupBy={activeGroupBy}
              sizeBy={sizeBy}
            />
          )}
        </Grid>

        {/* 下方统计图 — 始终显示 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <HeatmapSectorBarChart sectors={sectors} loading={loading} error={error} />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <HeatmapDistributionChart
            distribution={items.length > 0 ? distribution : null}
            loading={loading}
            error={error}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <HeatmapSnapshotPanel />
        </Grid>
      </Grid>

      {/* 行业详情弹窗 */}
      <HeatmapSectorDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        sector={detailSector}
        stocks={detailStocks}
        stockFlows={detailStockFlows}
      />
    </DashboardContent>
  );
}
