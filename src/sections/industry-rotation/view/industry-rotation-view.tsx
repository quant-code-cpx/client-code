import { useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';

import { RotationHeatmapChart } from '../rotation-heatmap-chart';
import { RotationDetailDrawer } from '../rotation-detail-drawer';
import { RotationOverviewCards } from '../rotation-overview-cards';
import { RotationMomentumChart } from '../rotation-momentum-chart';
import { RotationValuationChart } from '../rotation-valuation-chart';
import { RotationFlowAnalysisChart } from '../rotation-flow-analysis-chart';
import { RotationReturnComparisonChart } from '../rotation-return-comparison-chart';

// ----------------------------------------------------------------------

type Period = '1w' | '1m' | '3m' | '6m' | '1y';

const PERIOD_OPTIONS: Period[] = ['1w', '1m', '3m', '6m', '1y'];

export function IndustryRotationView() {
  const [tradeDate, setTradeDate] = useState('');
  const [period, setPeriod] = useState<Period>('1m');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const handlePeriodChange = useCallback((_: React.MouseEvent<HTMLElement>, val: Period | null) => {
    if (val) setPeriod(val);
  }, []);

  const handleSectorClick = useCallback((name: string) => {
    setSelectedSector(name);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedSector(null);
  }, []);

  return (
    <DashboardContent>
      {/* ── 页面标题 + 筛选器 ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">行业轮动分析</Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            label="交易日期（YYYYMMDD）"
            placeholder="不填则取最新"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            sx={{ width: 200 }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={handlePeriodChange}
          >
            {PERIOD_OPTIONS.map((p) => (
              <ToggleButton key={p} value={p} sx={{ px: 1.5 }}>
                {p.toUpperCase()}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* ── 总览卡片组 ── */}
        <RotationOverviewCards tradeDate={tradeDate || undefined} period={period} />

        {/* ── 热力图（全宽） ── */}
        <Grid size={{ xs: 12 }}>
          <RotationHeatmapChart
            tradeDate={tradeDate || undefined}
            period={period}
            onSectorClick={handleSectorClick}
          />
        </Grid>

        {/* ── 动量排名 ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <RotationMomentumChart
            tradeDate={tradeDate || undefined}
            period={period}
            onSectorClick={handleSectorClick}
          />
        </Grid>

        {/* ── 行业收益对比 ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <RotationReturnComparisonChart tradeDate={tradeDate || undefined} period={period} />
        </Grid>

        {/* ── 资金流转（全宽） ── */}
        <Grid size={{ xs: 12 }}>
          <RotationFlowAnalysisChart
            tradeDate={tradeDate || undefined}
            period={period}
            onSectorClick={handleSectorClick}
          />
        </Grid>

        {/* ── 估值分位（全宽） ── */}
        <Grid size={{ xs: 12 }}>
          <RotationValuationChart
            tradeDate={tradeDate || undefined}
            onSectorClick={handleSectorClick}
          />
        </Grid>
      </Grid>

      {/* ── 单行业详情抽屉 ── */}
      <RotationDetailDrawer
        open={Boolean(selectedSector)}
        onClose={handleDrawerClose}
        sectorName={selectedSector}
        tradeDate={tradeDate || undefined}
        period={period}
      />
    </DashboardContent>
  );
}
