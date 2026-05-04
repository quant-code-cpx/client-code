import type { PnlToday, PortfolioSummary } from 'src/api/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import {
  fSignedRatio,
  fNullableRatio,
  fSignedCurrency,
  fNullableCurrency,
  getPortfolioValueTone,
} from 'src/utils/format-portfolio';

// ----------------------------------------------------------------------

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
  pnlToday?: PnlToday | null;
}

interface StatCardProps {
  label: string;
  value: string;
  color?: 'success.main' | 'error.main' | 'text.secondary' | 'text.primary';
  hint?: string;
}

function StatCard({ label, value, color = 'text.primary', hint }: StatCardProps) {
  return (
    <Card sx={{ height: 1, borderLeft: 2, borderLeftColor: color }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function PortfolioSummaryCards({ summary, pnlToday }: PortfolioSummaryCardsProps) {
  const todayPnl = pnlToday?.todayPnl ?? summary.todayPnl ?? null;
  const todayPnlPct = pnlToday?.todayPnlPct ?? summary.todayPnlPct ?? null;
  const isTradingDay = pnlToday?.isTradingDay ?? summary.isTradingDay;
  const todayHint = todayPnl === null && isTradingDay === false ? '今天非交易日' : undefined;

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="今日盈亏"
            value={fSignedCurrency(todayPnl)}
            color={getPortfolioValueTone(todayPnl)}
            hint={todayHint}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="今日涨幅"
            value={fSignedRatio(todayPnlPct)}
            color={getPortfolioValueTone(todayPnlPct)}
            hint={todayHint}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard label="总市值" value={fNullableCurrency(summary.totalMarketValue)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="总盈亏"
            value={fSignedCurrency(summary.totalUnrealizedPnl, '--')}
            color={getPortfolioValueTone(summary.totalUnrealizedPnl)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="盈亏比例"
            value={fSignedRatio(summary.totalPnlPct, '--')}
            color={getPortfolioValueTone(summary.totalPnlPct)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="剩余现金"
            value={fNullableCurrency(summary.cashBalance)}
            hint={`累计收益 ${fNullableRatio(summary.cumulativeReturn ?? summary.totalPnlPct)}`}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
