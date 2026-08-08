import type { Dayjs } from 'dayjs';
import type { HsgtTrendItem } from 'src/api/market';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fetchHsgtFlow } from 'src/api/market';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { MarketQuickLinks } from '../market-quick-links';
import { MarketVolumeChart } from '../market-volume-chart';
import { MarketSectorPanel } from '../market-sector-panel';
import { MarketHsgtMiniCard } from '../market-hsgt-mini-card';
import { MarketValuationCard } from '../market-valuation-card';
import { MarketHeroNarrative } from '../market-hero-narrative';
import { MarketIndexTrendChart } from '../market-index-trend-chart';
import { MarketDailySnapshotCard } from '../market-daily-snapshot-card';
import { MarketChangeDistributionChart } from '../market-change-distribution-chart';

const CONTROL_HEIGHT = 40;

// ── Section Header ─────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 4.5, mb: 2 }}>
      <Box
        sx={{
          width: 3,
          height: 16,
          borderRadius: 1,
          bgcolor: 'primary.main',
          flexShrink: 0,
        }}
      />
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, letterSpacing: 1.2, color: 'text.secondary' }}
      >
        {title}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      {action}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function MarketOverviewView() {
  // displayDate: what the DatePicker shows (auto-filled by Hero callback)
  const [displayDate, setDisplayDate] = useState<Dayjs | null>(null);
  // apiFetchDate: drives all API calls (only changes on user interaction)
  const [apiFetchDate, setApiFetchDate] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  // Shared HSGT history — fetched once here, passed to Hero + HsgtMiniCard.
  const [hsgtHistory, setHsgtHistory] = useState<HsgtTrendItem[]>([]);
  const [hsgtLoading, setHsgtLoading] = useState(true);
  const [hsgtError, setHsgtError] = useState('');

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // User explicitly picks a date — update both display and API fetch date
  const handleDateChange = useCallback((newVal: Dayjs | null) => {
    setDisplayDate(newVal);
    setApiFetchDate(newVal ? newVal.format('YYYYMMDD') : undefined);
  }, []);

  // Lift fetchHsgtFlow here to avoid duplicate calls from Hero + HsgtMiniCard.
  // Depends only on apiFetchDate (user-driven) and refreshKey — NOT on the auto-filled
  // displayDate — so Hero's onTradeDateResolved callback does NOT trigger a refetch.
  useEffect(() => {
    let cancelled = false;
    setHsgtLoading(true);
    setHsgtError('');
    fetchHsgtFlow({ trade_date: apiFetchDate, days: 10 })
      .then((res) => {
        if (!cancelled) setHsgtHistory(res?.history ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHsgtHistory([]);
          setHsgtError(err instanceof Error ? err.message : '加载沪深港通数据失败');
        }
      })
      .finally(() => {
        if (!cancelled) setHsgtLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetchDate, refreshKey]);

  // Called once by Hero after it resolves the latest tradeDate from market-breadth.
  // Only updates the DatePicker display — does NOT change apiFetchDate, so no refetch.
  const handleTradeDateResolved = useCallback((date: string) => {
    setDisplayDate((prev) => prev ?? dayjs(date, 'YYYYMMDD'));
  }, []);

  return (
    <DashboardContent>
      {/* ── Page Header ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h4">市场总览</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            A股当日全景 · 叙事驱动
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <DatePicker
            label="交易日期"
            value={displayDate}
            onChange={handleDateChange}
            shouldDisableDate={(day) => day.day() === 0 || day.day() === 6}
            slotProps={{
              textField: {
                sx: { '& .MuiInputBase-root': { height: CONTROL_HEIGHT } },
              },
            }}
          />
          <Tooltip title="刷新数据">
            <IconButton
              size="medium"
              onClick={handleRefresh}
              aria-label="刷新数据"
            >
              <Iconify icon="solar:refresh-bold" width={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── 今日叙事 Hero ── */}
      <MarketHeroNarrative
        refreshKey={refreshKey}
        tradeDate={apiFetchDate}
        hsgtHistory={hsgtHistory}
        onTradeDateResolved={handleTradeDateResolved}
      />

      {/* ── 指数行情 ── */}
      <SectionHeader title="指数行情" />
      <MarketDailySnapshotCard refreshKey={refreshKey} tradeDate={apiFetchDate} />

      {/* ── 趋势分析 ── */}
      <SectionHeader title="趋势分析" />
      <Grid container spacing={3} alignItems="stretch">
        <Grid size={{ xs: 12, md: 7 }}>
          <MarketIndexTrendChart refreshKey={refreshKey} tradeDate={apiFetchDate} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <MarketVolumeChart refreshKey={refreshKey} tradeDate={apiFetchDate} />
        </Grid>
      </Grid>

      {/* ── 行业资金 ── */}
      <SectionHeader title="行业资金" />
      <Grid container spacing={3} alignItems="stretch">
        <Grid size={{ xs: 12, md: 7 }}>
          <MarketSectorPanel refreshKey={refreshKey} tradeDate={apiFetchDate} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <MarketHsgtMiniCard history={hsgtHistory} loading={hsgtLoading} error={hsgtError} />
        </Grid>
      </Grid>

      {/* ── 估值概览 ── */}
      <SectionHeader title="估值概览" />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <MarketValuationCard refreshKey={refreshKey} tradeDate={apiFetchDate} />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <MarketChangeDistributionChart refreshKey={refreshKey} tradeDate={apiFetchDate} />
        </Grid>
      </Grid>

      {/* ── 深入分析入口 ── */}
      <SectionHeader title="深入分析" />
      <MarketQuickLinks />
    </DashboardContent>
  );
}
