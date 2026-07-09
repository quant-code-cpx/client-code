import type { Dayjs } from 'dayjs';
import type { MarketMoneyFlowDetail } from 'src/api/market';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { PulseHeadline } from '../pulse-headline';
import { HsgtTrendChart } from '../hsgt-trend-chart';
import { ConceptExplorer } from '../concept-explorer';
import { HsgtSummaryCard } from '../hsgt-summary-card';
import { MainFlowRankingTable } from '../main-flow-ranking-table';
import { CapitalFlowTrendChart } from '../capital-flow-trend-chart';
import { CapitalFlowSummaryCard } from '../capital-flow-summary-card';
import { SectorFlowRankingPanel } from '../sector-flow-ranking-panel';

import type { ContentType } from '../sector-flow-ranking-panel';

// ----------------------------------------------------------------------

const TABS = [
  { label: '大盘资金', icon: 'solar:chart-2-bold' },
  { label: '沪深港通', icon: 'solar:shuffle-bold' },
  { label: '板块轮动', icon: 'solar:layers-bold' },
  { label: '个股资金榜', icon: 'solar:target-bold' },
] as const;

// ----------------------------------------------------------------------

export function MarketMoneyFlowView() {
  const theme = useTheme();
  // displayDate: 日期选择器展示值（首次由概要卡片回填后端返回的 tradeDate）
  const [displayDate, setDisplayDate] = useState<Dayjs | null>(null);
  // apiFetchDate: 真正驱动所有 API 请求的日期；只在用户主动选日期时改变
  const [apiFetchDate, setApiFetchDate] = useState<string | undefined>(undefined);
  const [currentTab, setCurrentTab] = useState(0);
  const [summaryData, setSummaryData] = useState<MarketMoneyFlowDetail | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  // Tab 3 下从 A 区升级上来的状态（选中概念 + 当前序 content_type）
  const [sectorContentType, setSectorContentType] = useState<ContentType>('INDUSTRY');
  const [selectedConcept, setSelectedConcept] = useState<{ tsCode: string; name: string } | null>(
    null
  );

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handleDateChange = useCallback((newVal: Dayjs | null) => {
    setDisplayDate(newVal);
    setApiFetchDate(newVal ? newVal.format('YYYYMMDD') : undefined);
  }, []);

  // 概要卡解析出后端最新交易日后回填到选择器（不触发重新请求）
  const handleTradeDateResolved = useCallback(
    (resolved: string) => {
      if (!resolved) return;
      // 仅在用户尚未选择且当前展示与解析值不同时回填
      if (apiFetchDate == null) {
        const next = dayjs(resolved, 'YYYYMMDD');
        if (next.isValid() && (!displayDate || !displayDate.isSame(next, 'day'))) {
          setDisplayDate(next);
        }
      }
    },
    [apiFetchDate, displayDate]
  );

  const handleDataResolved = useCallback((data: MarketMoneyFlowDetail) => {
    setSummaryData(data);
    setSummaryLoading(false);
  }, []);

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
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            资金动态
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            大盘资金流向、沪深港通、板块轮动与个股资金追踪
          </Typography>
        </Box>

        <DatePicker
          label="交易日期"
          value={displayDate}
          onChange={handleDateChange}
        />
      </Stack>

      {/* ── 大盘资金流概要（始终可见）── */}
      <Box sx={{ mb: 3 }}>
        <CapitalFlowSummaryCard
          tradeDate={apiFetchDate}
          onTradeDateResolved={handleTradeDateResolved}
          onDataResolved={handleDataResolved}
        />
        <PulseHeadline data={summaryData} loading={summaryLoading} tradeDate={apiFetchDate} />
      </Box>

      {/* ── Tab 导航 ── */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 1.5,
          bgcolor: varAlpha(theme.vars.palette.background.neutralChannel, 0.04),
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 'fontWeightSemiBold',
              textTransform: 'none',
              gap: 0.75,
            },
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.label}
              icon={<Iconify icon={tab.icon} width={20} />}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── Tab 0: 大盘资金 ── */}
      {currentTab === 0 && <CapitalFlowTrendChart tradeDate={apiFetchDate} />}

      {/* ── Tab 1: 沪深港通 ── */}
      {currentTab === 1 && (
        <Grid container spacing={3} alignItems="stretch">
          <Grid size={{ xs: 12, md: 4 }}>
            <HsgtSummaryCard tradeDate={apiFetchDate} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <HsgtTrendChart tradeDate={apiFetchDate} />
          </Grid>
        </Grid>
      )}

      {/* ── Tab 2: 板块轮动 ── */}
      {currentTab === 2 && (
        <Stack spacing={3}>
          <SectorFlowRankingPanel
            tradeDate={apiFetchDate}
            onConceptSelected={setSelectedConcept}
            onContentTypeChange={setSectorContentType}
          />
          {sectorContentType === 'CONCEPT' && <ConceptExplorer initialConcept={selectedConcept} />}
        </Stack>
      )}

      {/* ── Tab 3: 个股资金榜 ── */}
      {currentTab === 3 && <MainFlowRankingTable tradeDate={apiFetchDate} />}
    </DashboardContent>
  );
}
