import type { LimitListItem } from 'src/api/alert';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { getStreakDays, STREAK_STATUS_LABEL, STREAK_STATUS_COLOR } from './utils/limit-glossary';

// ----------------------------------------------------------------------

type Props = {
  items: LimitListItem[];
  onSelect?: (item: LimitListItem) => void;
};

type LadderRow = {
  days: number;
  stocks: LimitListItem[];
};

function buildLadder(items: LimitListItem[], type: 'UP' | 'DOWN'): LadderRow[] {
  const filtered = items.filter((it) => it.limitType === type);
  const groups = new Map<number, LimitListItem[]>();
  filtered.forEach((it) => {
    const days = getStreakDays(it);
    if (days <= 0) return;
    const list = groups.get(days) ?? [];
    list.push(it);
    groups.set(days, list);
  });
  return Array.from(groups.entries())
    .map(([days, stocks]) => ({ days, stocks }))
    .sort((a, b) => b.days - a.days);
}

function emptyHint(type: 'UP' | 'DOWN') {
  return type === 'UP' ? '今日无连板股' : '今日无连续跌停股';
}

function renderColumn(
  title: string,
  ladder: LadderRow[],
  type: 'UP' | 'DOWN',
  onSelect?: (item: LimitListItem) => void
) {
  const accentColor = type === 'UP' ? 'error.main' : 'success.main';

  return (
    <Card sx={{ flex: 1, minWidth: 260 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">{title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            共 {ladder.reduce((sum, row) => sum + row.stocks.length, 0)} 只
          </Typography>
        </Stack>

        {ladder.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
            {emptyHint(type)}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {ladder.map((row) => (
              <Box key={row.days}>
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.75 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Barlow, sans-serif',
                      fontWeight: 700,
                      fontSize: 20,
                      lineHeight: 1,
                      color: row.days >= 5 ? accentColor : 'text.primary',
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {row.days}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {type === 'UP' ? '连板' : '连续跌停'} · {row.stocks.length} 只
                  </Typography>
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {row.stocks.map((s) => {
                    const status = s.streakStatus;
                    const knownLabel = status != null ? STREAK_STATUS_LABEL[status] : null;
                    const knownColor = status != null ? STREAK_STATUS_COLOR[status] : null;
                    const tip = knownLabel ? `${knownLabel} · ${s.tsCode}` : s.tsCode;
                    return (
                      <Tooltip key={s.tsCode} title={tip} arrow>
                        <Chip
                          label={s.stockName}
                          size="small"
                          color={knownColor ?? (row.days >= 5 ? 'error' : 'default')}
                          variant="outlined"
                          clickable
                          onClick={() => onSelect?.(s)}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function AlertLimitStreakLadder({ items, onSelect }: Props) {
  const upLadder = useMemo(() => buildLadder(items, 'UP'), [items]);
  const downLadder = useMemo(() => buildLadder(items, 'DOWN'), [items]);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {renderColumn('涨停连板梯队', upLadder, 'UP', onSelect)}
      {renderColumn('跌停连续梯队', downLadder, 'DOWN', onSelect)}
    </Stack>
  );
}
