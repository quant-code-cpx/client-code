import type { Dayjs } from 'dayjs';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { MarketQuickLinks } from '../market-quick-links';
import { MarketVolumeChart } from '../market-volume-chart';
import { MarketHsgtMiniCard } from '../market-hsgt-mini-card';
import { MarketValuationCard } from '../market-valuation-card';
import { MarketIndexTrendChart } from '../market-index-trend-chart';
import { MarketDailySnapshotCard } from '../market-daily-snapshot-card';
import { MarketValuationTrendChart } from '../market-valuation-trend-chart';
import { MarketSentimentTrendChart } from '../market-sentiment-trend-chart';
import { MarketChangeDistributionChart } from '../market-change-distribution-chart';

// ── Section Header ─────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 5, mb: 2.5 }}>
      <Box
        sx={{
          width: 4,
          height: 20,
          borderRadius: 0.5,
          bgcolor: 'primary.main',
          flexShrink: 0,
        }}
      />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function MarketOverviewView() {
  const [tradeDate, setTradeDate] = useState<Dayjs | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const tradeDateStr = tradeDate ? tradeDate.format('YYYYMMDD') : undefined;
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <DashboardContent>
      {/* ── Header ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">市场总览</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            A股当日全景深度分析
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <DatePicker
            label="交易日期"
            value={tradeDate}
            onChange={(newVal) => setTradeDate(newVal)}
            format="YYYY-MM-DD"
            slotProps={{
              textField: { size: 'small', sx: { width: 200 } },
              field: { clearable: true },
            }}
          />
          <Tooltip title="刷新数据">
            <IconButton size="small" onClick={handleRefresh}>
              <Iconify icon="solar:refresh-bold" width={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── 市场脉搏 ── */}
      <MarketDailySnapshotCard key={`snapshot-${refreshKey}`} tradeDate={tradeDateStr} />

      {/* ── 趋势分析 ── */}
      <SectionHeader title="趋势分析" />
      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <MarketIndexTrendChart key={`trend-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MarketVolumeChart key={`volume-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketChangeDistributionChart key={`dist-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketSentimentTrendChart key={`sent-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
      </Grid>

      {/* ── 资金 & 估值 ── */}
      <SectionHeader title="资金 & 估值" />
      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketHsgtMiniCard key={`hsgt-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketValuationCard key={`val-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <MarketValuationTrendChart key={`valtrend-${refreshKey}`} tradeDate={tradeDateStr} />
        </Grid>
      </Grid>

      {/* ── 深入分析入口 ── */}
      <SectionHeader title="深入分析" />
      <MarketQuickLinks />
    </DashboardContent>
  );
}
