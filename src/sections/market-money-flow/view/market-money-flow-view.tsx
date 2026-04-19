import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { HsgtTrendChart } from '../hsgt-trend-chart';
import { HsgtSummaryCard } from '../hsgt-summary-card';
import { SectorFlowPanel } from '../sector-flow-panel';
import { ConceptBoardPanel } from '../concept-board-panel';
import { MainFlowRankingTable } from '../main-flow-ranking-table';
import { CapitalFlowTrendChart } from '../capital-flow-trend-chart';
import { CapitalFlowSummaryCard } from '../capital-flow-summary-card';
import { SectorFlowRankingPanel } from '../sector-flow-ranking-panel';

// ----------------------------------------------------------------------

const TABS = [
  { label: '大盘趋势', icon: 'solar:chart-2-bold' },
  { label: '沪深港通', icon: 'solar:shuffle-bold' },
  { label: '板块资金', icon: 'solar:layers-bold' },
  { label: '主力追踪', icon: 'solar:target-bold' },
] as const;

// ----------------------------------------------------------------------

export function MarketMoneyFlowView() {
  const theme = useTheme();
  const [tradeDate, setTradeDate] = useState('');
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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
            大盘资金流向、沪深港通、板块资金与主力追踪
          </Typography>
        </Box>

        <TextField
          size="small"
          label="交易日期（YYYYMMDD）"
          placeholder="不填则取最新"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          sx={{ width: 200 }}
        />
      </Stack>

      {/* ── 大盘资金流概要（始终可见）── */}
      <Box sx={{ mb: 3 }}>
        <CapitalFlowSummaryCard tradeDate={tradeDate || undefined} />
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

      {/* ── Tab 0: 大盘趋势 ── */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <CapitalFlowTrendChart tradeDate={tradeDate || undefined} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <HsgtSummaryCard tradeDate={tradeDate || undefined} />
          </Grid>
        </Grid>
      )}

      {/* ── Tab 1: 沪深港通 ── */}
      {currentTab === 1 && <HsgtTrendChart tradeDate={tradeDate || undefined} />}

      {/* ── Tab 2: 板块资金 ── */}
      {currentTab === 2 && (
        <Stack spacing={3}>
          <SectorFlowRankingPanel tradeDate={tradeDate || undefined} />
          <SectorFlowPanel tradeDate={tradeDate || undefined} />
        </Stack>
      )}

      {/* ── Tab 3: 主力追踪 ── */}
      {currentTab === 3 && (
        <Stack spacing={3}>
          <MainFlowRankingTable tradeDate={tradeDate || undefined} />
          <ConceptBoardPanel tradeDate={tradeDate || undefined} />
        </Stack>
      )}
    </DashboardContent>
  );
}
