import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { DashboardContent } from 'src/layouts/dashboard';

import { MarketIndexCards } from '../market-index-cards';
import { MarketVolumeChart } from '../market-volume-chart';
import { MarketHeatmapChart } from '../market-heatmap-chart';
import { MarketSentimentCard } from '../market-sentiment-card';
import { MarketValuationCard } from '../market-valuation-card';
import { MarketIndexTrendChart } from '../market-index-trend-chart';
import { MarketSectorRankingChart } from '../market-sector-ranking-chart';
import { MarketValuationTrendChart } from '../market-valuation-trend-chart';
import { MarketSentimentTrendChart } from '../market-sentiment-trend-chart';
import { MarketChangeDistributionChart } from '../market-change-distribution-chart';

// ----------------------------------------------------------------------

export function MarketOverviewView() {
  const [tradeDate, setTradeDate] = useState<Dayjs | null>(null);

  // Convert Dayjs → YYYYMMDD string for API calls; null → undefined (latest)
  const tradeDateStr = tradeDate ? tradeDate.format('YYYYMMDD') : undefined;

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
          <DatePicker
            label="交易日期"
            value={tradeDate}
            onChange={(newVal) => setTradeDate(newVal)}
            format="YYYY-MM-DD"
            slotProps={{
              textField: {
                size: 'small',
                sx: { width: 200 },
              },
              field: { clearable: true },
            }}
          />
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* ── 指数卡片 ── */}
        <MarketIndexCards tradeDate={tradeDateStr} />

        {/* ── 指数走势图（左） + 市场情绪（右） ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketIndexTrendChart tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketSentimentCard tradeDate={tradeDateStr} />
        </Grid>

        {/* ── 涨跌幅分布（左） + 涨跌家数趋势（右） ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketChangeDistributionChart tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketSentimentTrendChart tradeDate={tradeDateStr} />
        </Grid>

        {/* ── 行业排行（左） + 成交额（右） ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketSectorRankingChart tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketVolumeChart tradeDate={tradeDateStr} />
        </Grid>

        {/* ── 市场估值面板 ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketValuationCard tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketValuationTrendChart tradeDate={tradeDateStr} />
        </Grid>

        {/* ── 市场热力图 ── */}
        <Grid size={{ xs: 12 }}>
          <MarketHeatmapChart tradeDate={tradeDateStr} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
