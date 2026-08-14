import type { Dayjs } from 'dayjs';
import type { SectorFlowItem, MainFlowRankingItem } from 'src/api/market';
import type { HeatmapItem, HeatmapDistribution, HeatmapSectorSummary } from 'src/api/heatmap';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHeatmapData } from 'src/api/heatmap';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchSectorFlow, fetchMainFlowRanking } from 'src/api/market';

import { DatePicker } from 'src/components/date-picker';

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

// ----------------------------------------------------------------------

export type MarketHeatmapViewProps = {
  tradeDate?: string;
  refreshKey?: number;
  embedded?: boolean;
  onSectorSelected?: (item: HeatmapItem) => void;
};

export function MarketHeatmapView({
  tradeDate: externalTradeDate,
  refreshKey,
  embedded = false,
  onSectorSelected,
}: MarketHeatmapViewProps = {}) {
  // ── 内部日期状态（仅独立模式使用）──────────────
  const [internalDate, setInternalDate] = useState<Dayjs | null>(null);
  const tradeDateStr = embedded
    ? externalTradeDate
    : internalDate
      ? internalDate.format('YYYYMMDD')
      : undefined;

  // ── 共享状态 ─────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('scatter');

  // ── 热力图（TreeMap + 下方统计图）数据 ───────
  // 仅在 treemap 模式下加载 5000 股数据，避免散点图模式下浪费
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
  const [detailItems, setDetailItems] = useState<HeatmapItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequestRef = useRef(0);
  const heatmapCacheRef = useRef(new Map<string, HeatmapItem[]>());

  // ── 衍生数据 ─────────────────────────────────
  const sectors: HeatmapSectorSummary[] = useMemo(() => aggregateSectors(items), [items]);
  const distribution: HeatmapDistribution = useMemo(() => computeDistribution(items), [items]);

  // 散点接口只提供板块涨跌幅，不伪造个股数量、成交额或市值统计。
  const scatterSectors = useMemo(
    () =>
      sectorFlows.map((s) => ({
        groupName: s.name ?? s.tsCode,
        avgPctChg: Number.isFinite(s.pctChange) ? s.pctChange : null,
      })),
    [sectorFlows]
  );

  // 涨幅 Top N 按行业分组（从 HeatmapItem[]）
  const topGainersByGroup = useMemo(() => {
    const map: Record<string, Array<{ name: string; tsCode: string; pctChg: number }>> = {};
    for (const item of items) {
      if (!Number.isFinite(item.pctChg)) continue;
      const group = item.groupName ?? item.industry ?? '其他';
      if (!map[group]) map[group] = [];
      map[group].push({
        name: item.name ?? item.tsCode,
        tsCode: item.tsCode,
        pctChg: item.pctChg as number,
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
    const map: Record<string, Array<{ name: string; tsCode: string; mainNetInflow: number }>> = {};
    for (const item of mainFlowRanking) {
      if (!Number.isFinite(item.mainNetInflow)) continue;
      const group = item.industry ?? '其他';
      if (!map[group]) map[group] = [];
      map[group].push({
        name: item.name ?? item.tsCode,
        tsCode: item.tsCode,
        mainNetInflow: item.mainNetInflow,
      });
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.mainNetInflow - a.mainNetInflow);
      map[key] = map[key].slice(0, 10);
    }
    return map;
  }, [mainFlowRanking]);

  // ── 数据加载：热力图（仅 treemap 模式需要） ──
  useEffect(() => {
    if (viewMode !== 'treemap') return undefined;

    const cfg = GROUP_OPTIONS.find((o) => o.value === groupBy)!;
    let cancelled = false;
    setLoading(true);
    setError('');

    const cacheKey = `${tradeDateStr ?? 'latest'}:${cfg.groupBy}:${cfg.indexCode ?? ''}`;
    const cachedItems = heatmapCacheRef.current.get(cacheKey);
    if (cachedItems) {
      setItems(cachedItems);
      setLoading(false);
      return undefined;
    }

    fetchHeatmapData({
      trade_date: tradeDateStr,
      group_by: cfg.groupBy,
      index_code: cfg.indexCode,
      industry_source: 'sw_l1',
      include_mapping: true,
    })
      .then((result) => {
        if (!cancelled) {
          heatmapCacheRef.current.set(cacheKey, result);
          setItems(result);
        }
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
  }, [viewMode, tradeDateStr, groupBy, refreshKey]);

  // ── 数据加载：散点图数据 ──────────────────────
  useEffect(() => {
    if (viewMode !== 'scatter') return undefined;

    let cancelled = false;
    setScatterLoading(true);
    setScatterError('');

    // 散点图只请求 Top 30 行业/概念/地域，减少气泡数量，提升可读性和渲染性能
    Promise.all([
      fetchSectorFlow({
        trade_date: tradeDateStr,
        content_type: contentType,
        limit: 30,
      }),
      fetchMainFlowRanking({
        trade_date: tradeDateStr,
        limit: 100,
      }),
    ])
      .then(([flowRes, rankRes]) => {
        if (cancelled) return;
        // 后端按 contentType 分字段返回：industry / concept / region
        const flowKey = contentType.toLowerCase() as 'industry' | 'concept' | 'region';
        setSectorFlows(flowRes?.[flowKey] ?? []);
        setMainFlowRanking(rankRes != null && 'data' in rankRes ? (rankRes.data ?? []) : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setScatterError(err instanceof Error ? err.message : '散点图数据加载失败');
      })
      .finally(() => {
        if (!cancelled) setScatterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewMode, tradeDateStr, contentType, refreshKey]);

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

  const handleSizeByChange = useCallback((_e: React.MouseEvent<HTMLElement>, v: SizeBy | null) => {
    if (v) setSizeBy(v);
  }, []);

  const handleSectorClick = useCallback(
    (sector: SectorFlowItem) => {
      const requestId = detailRequestRef.current + 1;
      detailRequestRef.current = requestId;
      setDetailSector(sector);
      setDetailOpen(true);
      setDetailItems([]);
      setDetailError('');

      if (contentType !== 'INDUSTRY') {
        setDetailLoading(false);
        setDetailError('当前板块类型暂无个股明细');
        return;
      }

      const cacheKey = `${tradeDateStr ?? 'latest'}:industry:`;
      const cachedItems = heatmapCacheRef.current.get(cacheKey);
      if (cachedItems) {
        setDetailItems(cachedItems);
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);
      fetchHeatmapData({
        trade_date: tradeDateStr,
        group_by: 'industry',
        industry_source: 'sw_l1',
        include_mapping: true,
      })
        .then((result) => {
          heatmapCacheRef.current.set(cacheKey, result);
          if (detailRequestRef.current === requestId) setDetailItems(result);
        })
        .catch((err: unknown) => {
          if (detailRequestRef.current === requestId) {
            setDetailError(err instanceof Error ? err.message : '行业个股明细加载失败');
          }
        })
        .finally(() => {
          if (detailRequestRef.current === requestId) setDetailLoading(false);
        });
    },
    [contentType, tradeDateStr]
  );

  const handleSwitchToRotation = useCallback(
    (item: HeatmapItem) => {
      setDetailOpen(false);
      onSectorSelected?.(item);
    },
    [onSectorSelected]
  );

  const activeGroupBy = GROUP_OPTIONS.find((o) => o.value === groupBy)!.groupBy;

  // ── 弹窗数据：按行业筛选个股 ─────────────────
  const detailStocks = useMemo(() => {
    if (!detailSector?.name) return [];
    return detailItems.filter((s) => (s.groupName ?? s.industry) === detailSector.name);
  }, [detailItems, detailSector]);

  const detailStockFlows = useMemo(
    () =>
      detailSector?.name ? mainFlowRanking.filter((s) => s.industry === detailSector.name) : [],
    [mainFlowRanking, detailSector]
  );

  // 查找与 detailSector 对应的 HeatmapItem（用于传递 swCode/dcTsCode 等映射字段）
  const detailHeatmapItem = useMemo(() => {
    if (!detailSector?.name) return null;
    return detailItems.find((s) => (s.groupName ?? s.industry) === detailSector.name) ?? null;
  }, [detailItems, detailSector]);

  // ── 工具栏 ───────────────────────────────────
  const toolbar = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      {!embedded && <Typography variant="h4">市场热力图</Typography>}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        {!embedded && (
          <DatePicker
            label="交易日期"
            value={internalDate}
            onChange={(newVal) => setInternalDate(newVal)}
          />
        )}

        {/* 视图切换 */}
        <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={handleViewModeChange}>
          <ToggleButton value="scatter">散点图</ToggleButton>
          <ToggleButton value="treemap">树形图</ToggleButton>
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

            <ToggleButtonGroup size="small" exclusive value={sizeBy} onChange={handleSizeByChange}>
              <ToggleButton value="totalMv">总市值</ToggleButton>
              <ToggleButton value="amount">成交额</ToggleButton>
            </ToggleButtonGroup>
          </>
        )}
      </Stack>
    </Stack>
  );

  // ── 主内容 ───────────────────────────────────
  const content = (
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
      <Grid size={{ xs: 12, md: viewMode === 'treemap' ? 7 : 12 }}>
        <HeatmapSectorBarChart
          sectors={viewMode === 'scatter' ? scatterSectors : sectors}
          supportsCount={viewMode === 'treemap'}
          loading={viewMode === 'scatter' ? scatterLoading : loading}
          error={viewMode === 'scatter' ? scatterError : error}
        />
      </Grid>

      {viewMode === 'treemap' && (
        <Grid size={{ xs: 12, md: 5 }}>
          <HeatmapDistributionChart
            distribution={items.length > 0 ? distribution : null}
            loading={loading}
            error={error}
          />
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <HeatmapSnapshotPanel />
      </Grid>
    </Grid>
  );

  // ── 行业详情弹窗 ─────────────────────────────
  const detailDialog = (
    <HeatmapSectorDetailDialog
      open={detailOpen}
      onClose={() => setDetailOpen(false)}
      sector={detailSector}
      stocks={detailStocks}
      stockFlows={detailStockFlows}
      heatmapItem={detailHeatmapItem}
      loading={detailLoading}
      error={detailError}
      onSwitchToRotation={onSectorSelected ? handleSwitchToRotation : undefined}
    />
  );

  if (embedded) {
    return (
      <>
        {toolbar}
        {content}
        {detailDialog}
      </>
    );
  }

  return (
    <DashboardContent>
      {toolbar}
      {content}
      {detailDialog}
    </DashboardContent>
  );
}
