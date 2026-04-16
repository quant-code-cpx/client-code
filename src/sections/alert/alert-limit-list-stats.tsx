import type { LimitListItem } from 'src/api/alert';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  items: LimitListItem[];
};

export function AlertLimitListStats({ items }: Props) {
  const limitUp = items.filter((i) => i.limitType === 'UP');
  const limitDown = items.filter((i) => i.limitType === 'DOWN');
  const streak2 = items.filter((i) => i.consecutiveDays >= 2);
  const avgSealAmount =
    limitUp.length > 0
      ? limitUp.reduce((sum, i) => sum + i.sealAmount, 0) / limitUp.length
      : 0;

  const stats = [
    { label: '涨停', value: String(limitUp.length), color: 'error.main' },
    { label: '跌停', value: String(limitDown.length), color: 'success.main' },
    { label: '连板≥2', value: String(streak2.length), color: 'warning.main' },
    { label: '平均封单额', value: `${fNumber(Math.round(avgSealAmount))}万`, color: 'info.main' },
  ];

  return (
    <Grid container spacing={2}>
      {stats.map((s) => (
        <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {s.label}
            </Typography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
