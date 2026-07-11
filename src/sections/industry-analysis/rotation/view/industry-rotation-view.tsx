import { useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';

import { RotationHeatmapChart } from '../rotation-heatmap-chart';
import { RotationDetailDrawer } from '../rotation-detail-drawer';
import { RotationOverviewCards } from '../rotation-overview-cards';
import { RotationMomentumChart } from '../rotation-momentum-chart';
import { RotationFourFacetCard } from '../rotation-four-facet-card';
import { RotationValuationChart } from '../rotation-valuation-chart';
import { RotationFlowAnalysisChart } from '../rotation-flow-analysis-chart';
import { RotationReturnComparisonChart } from '../rotation-return-comparison-chart';

// ----------------------------------------------------------------------

type Period = '1w' | '1m' | '3m' | '6m' | '1y';

const PERIOD_OPTIONS: Period[] = ['1w', '1m', '3m', '6m', '1y'];

// ----------------------------------------------------------------------

export type FocusedSector = {
  dcTsCode?: string;
  swName?: string;
  dcName?: string;
};

export type IndustryRotationViewProps = {
  tradeDate?: string;
  refreshKey?: number;
  embedded?: boolean;
  focusedSector?: FocusedSector | null;
};

export function IndustryRotationView({
  tradeDate: externalTradeDate,
  refreshKey,
  embedded = false,
  focusedSector,
}: IndustryRotationViewProps = {}) {
  const [period, setPeriod] = useState<Period>('1m');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTsCode, setSelectedTsCode] = useState<string | undefined>(undefined);

  const tradeDate = embedded ? externalTradeDate : undefined;

  const handlePeriodChange = useCallback((_: React.MouseEvent<HTMLElement>, val: Period | null) => {
    if (val) setPeriod(val);
  }, []);

  const handleSectorClick = useCallback((name: string) => {
    setSelectedSector(name);
    setSelectedTsCode(undefined);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedSector(null);
    setSelectedTsCode(undefined);
  }, []);

  // ── 联动：从外壳传入 focusedSector 时自动打开详情抽屉 ──
  // 通过 focusedSector 的 dcTsCode 或 swName/dcName 定位行业
  const effectiveSector = selectedSector ?? focusedSector?.dcName ?? focusedSector?.swName ?? null;
  const effectiveTsCode = selectedTsCode ?? focusedSector?.dcTsCode ?? undefined;

  // ── 工具栏 ───────────────────────────────────
  const toolbar = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      {!embedded && <Typography variant="h4">行业轮动分析</Typography>}

      <Stack direction="row" spacing={1.5} alignItems="center">
        <ToggleButtonGroup size="small" exclusive value={period} onChange={handlePeriodChange}>
          {PERIOD_OPTIONS.map((p) => (
            <ToggleButton key={p} value={p}>
              {p.toUpperCase()}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  );

  // ── 主内容 ───────────────────────────────────
  const content = (
    <Grid container spacing={3}>
      {/* ── 总览卡片组 ── */}
      <RotationOverviewCards tradeDate={tradeDate} period={period} refreshKey={refreshKey} />

      {/* ── 四维并列卡 ── */}
      <Grid size={{ xs: 12 }}>
        <RotationFourFacetCard
          tradeDate={tradeDate}
          period={period}
          onSectorClick={handleSectorClick}
          refreshKey={refreshKey}
        />
      </Grid>

      {/* ── 热力图（全宽） ── */}
      <Grid size={{ xs: 12 }}>
        <RotationHeatmapChart
          tradeDate={tradeDate}
          period={period}
          onSectorClick={handleSectorClick}
          refreshKey={refreshKey}
        />
      </Grid>

      {/* ── 动量排名 ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <RotationMomentumChart
          tradeDate={tradeDate}
          period={period}
          onSectorClick={handleSectorClick}
          refreshKey={refreshKey}
        />
      </Grid>

      {/* ── 行业收益对比 ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <RotationReturnComparisonChart
          tradeDate={tradeDate}
          period={period}
          refreshKey={refreshKey}
        />
      </Grid>

      {/* ── 资金流转（全宽） ── */}
      <Grid size={{ xs: 12 }}>
        <RotationFlowAnalysisChart
          tradeDate={tradeDate}
          period={period}
          onSectorClick={handleSectorClick}
          refreshKey={refreshKey}
        />
      </Grid>

      {/* ── 估值分位（全宽） ── */}
      <Grid size={{ xs: 12 }}>
        <RotationValuationChart
          tradeDate={tradeDate}
          onSectorClick={handleSectorClick}
          refreshKey={refreshKey}
        />
      </Grid>
    </Grid>
  );

  // ── 行业详情抽屉 ─────────────────────────────
  const detailDrawer = (
    <RotationDetailDrawer
      open={Boolean(effectiveSector)}
      onClose={handleDrawerClose}
      sectorName={effectiveSector}
      tsCode={effectiveTsCode}
      period={period}
    />
  );

  if (embedded) {
    return (
      <>
        {toolbar}
        {content}
        {detailDrawer}
      </>
    );
  }

  return (
    <DashboardContent>
      {toolbar}
      {content}
      {detailDrawer}
    </DashboardContent>
  );
}
