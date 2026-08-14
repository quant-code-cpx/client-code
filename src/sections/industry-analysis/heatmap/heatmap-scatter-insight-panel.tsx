import type { SectorFlowItem } from 'src/api/market';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { getScatterSectorKey, type ScatterInsightLists } from './utils';
import {
  signedScatterYi,
  scatterFlowColor,
  scatterPercentColor,
  signedScatterPercent,
} from './heatmap-scatter-formatters';

type InsightValueMode = 'flow' | 'pct' | 'crowded';

type InsightSection = {
  title: string;
  rows: SectorFlowItem[];
  valueMode: InsightValueMode;
};

function InsightRow({
  sector,
  index,
  valueMode,
  onSectorClick,
}: {
  sector: SectorFlowItem;
  index: number;
  valueMode: InsightValueMode;
  onSectorClick?: (sector: SectorFlowItem) => void;
}) {
  const netAmount = sector.netAmount;
  const pctChange = sector.pctChange;

  return (
    <ButtonBase
      type="button"
      disabled={onSectorClick == null}
      onClick={() => onSectorClick?.(sector)}
      sx={(theme) => ({
        px: 1,
        py: 0.75,
        gap: 1,
        width: '100%',
        minHeight: 46,
        borderRadius: 1,
        display: 'flex',
        textAlign: 'left',
        alignItems: 'center',
        color: 'text.primary',
        justifyContent: 'space-between',
        border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        '&:hover': { bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08) },
        '&.Mui-disabled': { opacity: 1, color: 'text.primary' },
      })}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            width: 18,
            flexShrink: 0,
            color: 'text.disabled',
            fontWeight: 700,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {index + 1}
        </Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap fontWeight="fontWeightMedium">
            {sector.name ?? sector.tsCode}
          </Typography>
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.disabled' }}>
            {sector.tsCode}
          </Typography>
        </Box>
      </Stack>

      {valueMode === 'flow' && (
        <Typography
          variant="body2"
          sx={{ flexShrink: 0, color: scatterFlowColor(netAmount), fontWeight: 700 }}
        >
          {signedScatterYi(netAmount)}
        </Typography>
      )}
      {valueMode === 'pct' && (
        <Typography
          variant="body2"
          sx={{ flexShrink: 0, color: scatterPercentColor(pctChange), fontWeight: 700 }}
        >
          {signedScatterPercent(pctChange)}
        </Typography>
      )}
      {valueMode === 'crowded' && (
        <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: scatterPercentColor(pctChange), fontWeight: 700 }}
          >
            {signedScatterPercent(pctChange)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: scatterFlowColor(netAmount), fontWeight: 700 }}
          >
            {signedScatterYi(netAmount)}
          </Typography>
        </Stack>
      )}
    </ButtonBase>
  );
}

function InsightList({
  title,
  rows,
  valueMode,
  onSectorClick,
}: InsightSection & { onSectorClick?: (sector: SectorFlowItem) => void }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      {rows.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
          暂无
        </Typography>
      )}
      {rows.map((sector, index) => (
        <InsightRow
          index={index}
          sector={sector}
          key={getScatterSectorKey(sector)}
          valueMode={valueMode}
          onSectorClick={onSectorClick}
        />
      ))}
    </Stack>
  );
}

export function HeatmapScatterInsightPanel({
  sectors,
  insights,
  onSectorClick,
}: {
  sectors: SectorFlowItem[];
  insights: ScatterInsightLists;
  onSectorClick?: (sector: SectorFlowItem) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sections: InsightSection[] = [
    { title: '净流入', rows: insights.topInflow, valueMode: 'flow' },
    { title: '净流出', rows: insights.topOutflow, valueMode: 'flow' },
    { title: '涨幅', rows: insights.topGainers, valueMode: 'pct' },
    { title: '跌幅', rows: insights.topLosers, valueMode: 'pct' },
    { title: '中心拥挤区', rows: insights.crowded, valueMode: 'crowded' },
  ];

  return (
    <Box
      component="aside"
      sx={(theme) => ({
        minWidth: 0,
        pl: { lg: 2.5 },
        pt: { xs: 2, lg: 0 },
        borderTop: {
          xs: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
          lg: 0,
        },
        borderLeft: {
          xs: 0,
          lg: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
        },
      })}
    >
      <Stack spacing={1.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            信息索引
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
            {sectors.length} 个板块
          </Typography>
        </Stack>
        <Tabs
          value={activeIndex}
          onChange={(_event, value: number) => setActiveIndex(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="散点图信息索引"
        >
          {sections.map((section) => (
            <Tab key={section.title} label={section.title} sx={{ minWidth: 76 }} />
          ))}
        </Tabs>
        <Box
          role="region"
          aria-label={`${sections[activeIndex].title}板块列表`}
          sx={{ maxHeight: { xs: 360, lg: 560 }, overflowY: 'auto', pr: 0.5 }}
        >
          <InsightList {...sections[activeIndex]} onSectorClick={onSectorClick} />
        </Box>
      </Stack>
    </Box>
  );
}
