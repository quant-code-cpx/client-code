import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { HsgtTrendChart } from '../hsgt-trend-chart';
import { HsgtSummaryCard } from '../hsgt-summary-card';
import { MainFlowRankingTable } from '../main-flow-ranking-table';
import { CapitalFlowTrendChart } from '../capital-flow-trend-chart';
import { CapitalFlowSummaryCard } from '../capital-flow-summary-card';
import { SectorFlowRankingPanel } from '../sector-flow-ranking-panel';

// ----------------------------------------------------------------------

export function MarketMoneyFlowView() {
  const [tradeDate, setTradeDate] = useState('');

  return (
    <DashboardContent>
      {/* ── 页面标题 + 日期选择 ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">资金动态</Typography>

        <Box>
          <TextField
            size="small"
            label="交易日期（YYYYMMDD）"
            placeholder="不填则取最新"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            sx={{ width: 220 }}
          />
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* ── 大盘资金流概要 ── */}
        <Grid size={{ xs: 12 }}>
          <CapitalFlowSummaryCard tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 大盘资金流趋势（左）+ 沪深港通概要（右）── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <CapitalFlowTrendChart tradeDate={tradeDate || undefined} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <HsgtSummaryCard tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 沪深港通趋势 ── */}
        <Grid size={{ xs: 12 }}>
          <HsgtTrendChart tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 板块资金流排行（含展开趋势）── */}
        <Grid size={{ xs: 12 }}>
          <SectorFlowRankingPanel tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 主力资金 Top N（左右双表）── */}
        <Grid size={{ xs: 12 }}>
          <MainFlowRankingTable tradeDate={tradeDate || undefined} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
