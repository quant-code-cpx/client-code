import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { MarketHeatmapView } from '../../market-heatmap/view/market-heatmap-view';
import { IndustryRotationView } from '../../industry-rotation/view/industry-rotation-view';

// ----------------------------------------------------------------------

const TABS = [
  { label: '全景热力图', icon: 'solar:fire-bold' },
  { label: '行业轮动', icon: 'solar:shuffle-bold' },
] as const;

// ── Strip embedded DashboardContent padding ───────────────────────
//
// MarketHeatmapView / IndustryRotationView wrap their body in DashboardContent
// (a MUI Container with class "minimal__layout__main__content").
// We reset that padding so the tab panel doesn't add extra whitespace.
const EMBED_SX = {
  '& .minimal__layout__main__content': {
    pt: '0 !important',
    pb: '0 !important',
    px: '0 !important',
    maxWidth: '100% !important',
    flex: 'none',
  },
} as const;

// ----------------------------------------------------------------------

export function IndustryAnalysisView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = Number(searchParams.get('tab') ?? '1');
  const [currentTab, setCurrentTab] = useState<number>(
    tabParam >= 0 && tabParam < TABS.length ? tabParam : 1
  );

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, value: number) => {
      setCurrentTab(value);
      setSearchParams({ tab: String(value) });
    },
    [setSearchParams]
  );

  return (
    <DashboardContent>
      {/* ── Page Header ── */}
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h4">行业分析</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          全景热力图 · 行业轮动 · 强弱一览
        </Typography>
      </Stack>

      {/* ── Tab Bar ── */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 2,
          border: `1px solid`,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            px: 1,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {TABS.map((tab, idx) => (
            <Tab
              key={idx}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon={tab.icon} width={18} />
                  <span>{tab.label}</span>
                </Stack>
              }
              value={idx}
              sx={{ minHeight: 48 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── Tab Panels ── */}
      {currentTab === 0 && (
        <Box sx={EMBED_SX}>
          <MarketHeatmapView />
        </Box>
      )}

      {currentTab === 1 && (
        <Box sx={EMBED_SX}>
          <IndustryRotationView />
        </Box>
      )}
    </DashboardContent>
  );
}
