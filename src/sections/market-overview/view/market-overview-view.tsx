import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { MarketIndexCards } from '../market-index-cards';
import { MarketVolumeChart } from '../market-volume-chart';
import { MarketSentimentCard } from '../market-sentiment-card';
import { MarketValuationCard } from '../market-valuation-card';
import { MarketIndexTrendChart } from '../market-index-trend-chart';
import { MarketSectorRankingChart } from '../market-sector-ranking-chart';
import { MarketValuationTrendChart } from '../market-valuation-trend-chart';
import { MarketSentimentTrendChart } from '../market-sentiment-trend-chart';
import { MarketChangeDistributionChart } from '../market-change-distribution-chart';

// ----------------------------------------------------------------------

export function MarketOverviewView() {
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
        <Typography variant="h4">市场概览</Typography>

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
        {/* ── 指数卡片 ── */}
        <MarketIndexCards tradeDate={tradeDate || undefined} />

        {/* ── 指数走势图（左） + 市场情绪（右） ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketIndexTrendChart tradeDate={tradeDate || undefined} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketSentimentCard tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 涨跌幅分布（左） + 涨跌家数趋势（右） ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketChangeDistributionChart tradeDate={tradeDate || undefined} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketSentimentTrendChart tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 行业排行（左） + 成交额（右） ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketSectorRankingChart tradeDate={tradeDate || undefined} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketVolumeChart tradeDate={tradeDate || undefined} />
        </Grid>

        {/* ── 市场估值面板 ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketValuationCard tradeDate={tradeDate || undefined} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketValuationTrendChart tradeDate={tradeDate || undefined} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
