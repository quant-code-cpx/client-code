import type { LimitListItem } from 'src/api/alert';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';

// ----------------------------------------------------------------------

type Props = {
  items: LimitListItem[];
};

export function AlertLimitStreakCard({ items }: Props) {
  const router = useRouter();

  const streakGroups = useMemo(() => {
    const filtered = items
      .filter((i) => i.limitType === 'UP' && i.consecutiveDays >= 2)
      .sort((a, b) => b.consecutiveDays - a.consecutiveDays);

    const groups = new Map<number, LimitListItem[]>();
    filtered.forEach((item) => {
      const list = groups.get(item.consecutiveDays) ?? [];
      list.push(item);
      groups.set(item.consecutiveDays, list);
    });

    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [items]);

  if (streakGroups.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>连板龙虎榜</Typography>
          <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
            今日无连板股
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>连板龙虎榜</Typography>
        <Stack spacing={2}>
          {streakGroups.map(([days, stocks]) => (
            <Box key={days}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                {days}连板
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {stocks.map((s) => (
                  <Chip
                    key={s.tsCode}
                    label={s.stockName}
                    size="small"
                    color={days >= 5 ? 'error' : days >= 3 ? 'warning' : 'default'}
                    variant="outlined"
                    clickable
                    onClick={() => router.push(`/stock/detail?code=${s.tsCode}`)}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
