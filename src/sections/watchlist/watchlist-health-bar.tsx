import type { Theme, SxProps } from '@mui/material/styles';
import type { IconifyName } from 'src/components/iconify/register-icons';
import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { computeTargetDistance } from './utils';

// ----------------------------------------------------------------------

const GROUP_LIMIT_FALLBACK = 10;
const STOCK_LIMIT_PER_GROUP = 200;

type StatItem = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: IconifyName;
  tone: 'default' | 'warning' | 'error' | 'info';
  onClick?: () => void;
};

type WatchlistHealthBarProps = {
  watchlists: WatchlistOverviewItem[];
  selectedWatchlist: WatchlistOverviewItem | null;
  stocks: WatchlistStock[];
  groupLimit?: number | null;
  onClickTargetHit?: () => void;
  onClickQuoteMissing?: () => void;
};

export function WatchlistHealthBar({
  watchlists,
  selectedWatchlist,
  stocks,
  groupLimit,
  onClickTargetHit,
  onClickQuoteMissing,
}: WatchlistHealthBarProps) {
  const stats = useMemo<StatItem[]>(() => {
    const groupCount = watchlists.length;
    const limit = groupLimit ?? GROUP_LIMIT_FALLBACK;
    const groupNearLimit = groupCount >= limit;

    const stockCount =
      selectedWatchlist?._count?.stocks ?? selectedWatchlist?.summary?.stockCount ?? 0;
    const stockNearLimit = stockCount >= STOCK_LIMIT_PER_GROUP * 0.9;

    const latestTradeDate = stocks.reduce<string | null>((acc, stock) => {
      const td = stock.quote?.tradeDate ?? null;
      if (!td) return acc;
      if (!acc || td > acc) return td;
      return acc;
    }, null);

    const targetHitCount = stocks.reduce((acc, stock) => {
      const distance = computeTargetDistance(stock);
      if (distance && distance.hit) return acc + 1;
      return acc;
    }, 0);

    const quoteMissingCount = stocks.filter((s) => !s.quote || s.quote.close == null).length;

    return [
      {
        key: 'groups',
        label: '\u81ea\u9009\u7ec4',
        value: `${groupCount} / ${limit}`,
        hint: groupNearLimit
          ? '\u5df2\u8fbe\u5230\u4e0a\u9650'
          : '\u5f53\u524d\u8d26\u53f7\u53ef\u521b\u5efa\u7684\u81ea\u9009\u7ec4\u603b\u6570',
        icon: 'solar:widget-bold',
        tone: groupNearLimit ? 'warning' : 'default',
      },
      {
        key: 'stocks',
        label: '\u5f53\u524d\u7ec4\u5bb9\u91cf',
        value: selectedWatchlist ? `${stockCount} / ${STOCK_LIMIT_PER_GROUP}` : '-',
        hint: '\u6bcf\u4e2a\u81ea\u9009\u7ec4\u6700\u591a\u53ef\u52a0\u5165 200 \u53ea\u80a1\u7968',
        icon: 'solar:layers-bold',
        tone: stockNearLimit ? 'warning' : 'default',
      },
      {
        key: 'tradeDate',
        label: '\u6700\u65b0\u4ea4\u6613\u65e5',
        value: latestTradeDate ? formatTradeDate(latestTradeDate) : '-',
        hint: '\u5f53\u524d\u7ec4\u80a1\u7968\u884c\u60c5\u6240\u5c5e\u7684\u6700\u65b0\u4ea4\u6613\u65e5',
        icon: 'solar:calendar-bold',
        tone: 'default',
      },
      {
        key: 'targetHit',
        label: '\u89e6\u8fbe\u76ee\u6807',
        value: `${targetHitCount}`,
        hint: '\u70b9\u51fb\u67e5\u770b\u5df2\u89e6\u53ca\u76ee\u6807\u4ef7\u7684\u80a1\u7968',
        icon: 'solar:target-bold',
        tone: targetHitCount > 0 ? 'error' : 'default',
        onClick: targetHitCount > 0 ? onClickTargetHit : undefined,
      },
      {
        key: 'quoteMissing',
        label: '\u884c\u60c5\u7f3a\u5931',
        value: `${quoteMissingCount}`,
        hint: '\u70b9\u51fb\u67e5\u770b\u505c\u724c / \u4ef7\u683c\u672a\u540c\u6b65\u7684\u80a1\u7968',
        icon: 'solar:danger-triangle-bold',
        tone: quoteMissingCount > 0 ? 'warning' : 'default',
        onClick: quoteMissingCount > 0 ? onClickQuoteMissing : undefined,
      },
    ];
  }, [
    watchlists.length,
    selectedWatchlist,
    stocks,
    groupLimit,
    onClickTargetHit,
    onClickQuoteMissing,
  ]);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        mb: 3,
        flexWrap: 'wrap',
        rowGap: 1.5,
      }}
    >
      {stats.map((stat) => (
        <StatCard key={stat.key} stat={stat} />
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function StatCard({ stat }: { stat: StatItem }) {
  const interactive = !!stat.onClick;
  const toneSx = TONE_STYLES[stat.tone];
  const sx: SxProps<Theme> = {
    flex: '1 1 180px',
    minWidth: 168,
    px: 2,
    py: 1.5,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    boxShadow: 'none',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    transition: (theme) =>
      theme.transitions.create(['border-color', 'background-color'], { duration: 200 }),
    cursor: interactive ? 'pointer' : 'default',
    '&:hover': interactive ? { borderColor: 'primary.main' } : undefined,
    ...toneSx,
  };

  return (
    <Tooltip title={stat.hint ?? ''} placement="top">
      <Card sx={sx} onClick={stat.onClick}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: TONE_ICON_BG[stat.tone],
            color: TONE_ICON_COLOR[stat.tone],
          }}
        >
          <Iconify icon={stat.icon} width={20} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {stat.label}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
            {stat.value}
          </Typography>
        </Box>
      </Card>
    </Tooltip>
  );
}

// ----------------------------------------------------------------------

const TONE_STYLES: Record<StatItem['tone'], SxProps<Theme>> = {
  default: {},
  warning: { borderColor: 'warning.light' },
  error: { borderColor: 'error.light' },
  info: { borderColor: 'info.light' },
};

const TONE_ICON_BG: Record<StatItem['tone'], string> = {
  default: 'action.hover',
  warning: 'warning.lighter',
  error: 'error.lighter',
  info: 'info.lighter',
};

const TONE_ICON_COLOR: Record<StatItem['tone'], string> = {
  default: 'text.secondary',
  warning: 'warning.dark',
  error: 'error.dark',
  info: 'info.dark',
};

function formatTradeDate(value: string): string {
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}
