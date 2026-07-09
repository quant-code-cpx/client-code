import type { Dayjs } from 'dayjs';
import type { HeatmapItem } from 'src/api/heatmap';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useIndustryDictMapping } from 'src/hooks/use-industry-dict-mapping';

import {
  formatIndustryDictStatus,
  resolveDcTsCodeFromHeatmapItem,
} from 'src/utils/industry-mapping';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { MarketHeatmapView } from '../heatmap/view/market-heatmap-view';
import { IndustryRotationView } from '../rotation/view/industry-rotation-view';

import type { FocusedSector } from '../rotation/view/industry-rotation-view';

// ----------------------------------------------------------------------

const TABS = [
  { label: '全景热力图', icon: 'solar:fire-bold' },
  { label: '行业轮动', icon: 'solar:shuffle-bold' },
] as const;

const CONTROL_HEIGHT = 40;

// ----------------------------------------------------------------------

export function IndustryAnalysisView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = Number(searchParams.get('tab') ?? '1');
  const [currentTab, setCurrentTab] = useState<number>(
    tabParam >= 0 && tabParam < TABS.length ? tabParam : 1
  );

  // ── 共享状态 ─────────────────────────────────
  const [tradeDate, setTradeDate] = useState<string | undefined>(undefined);
  const [displayDate, setDisplayDate] = useState<Dayjs | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusedSector, setFocusedSector] = useState<FocusedSector | null>(null);
  const [headlineHint, setHeadlineHint] = useState<string | null>(null);

  // ── 行业字典 ─────────────────────────────────
  const { indexes, coverage, status: dictStatus } = useIndustryDictMapping();
  const dictInfo = formatIndustryDictStatus({
    coverage: coverage ?? null,
    failed: dictStatus === 'error',
  });

  // ── 事件处理 ─────────────────────────────────
  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, value: number) => {
      setCurrentTab(value);
      setSearchParams({ tab: String(value) });
    },
    [setSearchParams]
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSectorSelected = useCallback(
    (item: HeatmapItem) => {
      const resolved = resolveDcTsCodeFromHeatmapItem(item, indexes);
      if (!resolved.dcTsCode) {
        setHeadlineHint('该行业在轮动数据中暂未找到对应板块（行业字典差异）');
        return;
      }
      setHeadlineHint(null);
      setFocusedSector({
        dcTsCode: resolved.dcTsCode ?? undefined,
        swName: resolved.swName ?? undefined,
        dcName: resolved.dcName ?? undefined,
      });
      setCurrentTab(1);
      setSearchParams({ tab: '1' });
    },
    [indexes, setSearchParams]
  );

  // ── 副标题 ───────────────────────────────────
  const subtitle =
    headlineHint ?? (currentTab === 0 ? '全景 · 当日行业涨跌一览' : '轮动 · 周期强弱多维对比');

  return (
    <DashboardContent>
      {/* ── Page Header ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4">行业分析</Typography>
            {dictInfo.text && (
              <Tooltip
                title={
                  <Typography variant="caption" sx={{ display: 'block', maxWidth: 300 }}>
                    主字典 SW2021，热力图按申万一级分组；点击行业后后端返回东财板块 ts_code 作跨 Tab
                    跳转。
                  </Typography>
                }
                arrow
              >
                <IconButton size="small" aria-label="行业字典说明" sx={{ color: 'text.secondary' }}>
                  <Iconify icon="solar:question-circle-bold" width={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="body2"
              sx={{
                color: headlineHint ? 'warning.main' : 'text.secondary',
                mt: 0.25,
              }}
            >
              {subtitle}
            </Typography>
            {dictInfo.text && (
              <Typography
                variant="caption"
                sx={{
                  color:
                    dictInfo.tone === 'warning'
                      ? 'warning.main'
                      : dictInfo.tone === 'error'
                        ? 'text.disabled'
                        : 'text.secondary',
                  ml: 1,
                }}
              >
                {dictInfo.text}
              </Typography>
            )}
          </Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <DatePicker
            label="交易日期"
            value={displayDate}
            onChange={(newVal) => {
              setDisplayDate(newVal);
              setTradeDate(newVal ? newVal.format('YYYYMMDD') : undefined);
            }}
            slotProps={{
              textField: {
                sx: {
                  '& .MuiInputBase-root': { height: CONTROL_HEIGHT },
                },
              },
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:refresh-bold" />}
            onClick={handleRefresh}
            sx={{
              height: CONTROL_HEIGHT,
              minWidth: 88,
              px: 1.75,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            刷新
          </Button>
        </Stack>
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
        <MarketHeatmapView
          tradeDate={tradeDate}
          refreshKey={refreshKey}
          embedded
          onSectorSelected={handleSectorSelected}
        />
      )}

      {currentTab === 1 && (
        <IndustryRotationView
          tradeDate={tradeDate}
          refreshKey={refreshKey}
          embedded
          focusedSector={focusedSector}
        />
      )}
    </DashboardContent>
  );
}
