import type { PortfolioSummary } from 'src/api/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
}

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color: color ?? 'text.primary', fontWeight: 600 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  const pnlColor = summary.totalUnrealizedPnl >= 0 ? 'success.main' : 'error.main';
  const pnlPctColor = summary.totalPnlPct >= 0 ? 'success.main' : 'error.main';
  const pnlPrefix = summary.totalUnrealizedPnl >= 0 ? '+' : '';
  const pnlPctPrefix = summary.totalPnlPct >= 0 ? '+' : '';

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="总市值" value={fCurrency(summary.totalMarketValue)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="总盈亏"
            value={`${pnlPrefix}${fCurrency(summary.totalUnrealizedPnl)}`}
            color={pnlColor}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="盈亏比例"
            value={`${pnlPctPrefix}${(summary.totalPnlPct * 100).toFixed(2)}%`}
            color={pnlPctColor}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="剩余现金" value={fCurrency(summary.cashBalance)} />
        </Grid>
      </Grid>
    </Box>
  );
}
