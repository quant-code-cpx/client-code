import type { MarginSummary } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { fWanYuan, fPctChg } from 'src/utils/format-number';

// ----------------------------------------------------------------------

function StatItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2" sx={{ color: valueColor }}>{value}</Typography>
    </Box>
  );
}

function getTrendColor(trend: string): 'error' | 'success' | 'default' {
  if (trend.includes('增') || trend.includes('上升') || trend.includes('increasing')) return 'error';
  if (trend.includes('减') || trend.includes('下降') || trend.includes('decreasing')) return 'success';
  return 'default';
}

type Props = { summary: MarginSummary };

export function AnalysisMarginSummaryCard({ summary }: Props) {
  const {
    latestRzye, latestRqye, latestRzrqye,
    rzNetBuy5d, rzNetBuy20d,
    rzye5dChgPct, rzye20dChgPct,
    trend,
  } = summary;

  const fmtVal = (v: number | null) => v != null ? fWanYuan(v / 10000) : '--';

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>融资融券摘要</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="融资余额" value={fmtVal(latestRzye)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="融券余额" value={fmtVal(latestRqye)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="两融余额" value={fmtVal(latestRzrqye)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="5日融资净买入" value={fmtVal(rzNetBuy5d)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="20日融资净买入" value={fmtVal(rzNetBuy20d)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="5日变化率" value={fPctChg(rzye5dChgPct)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="20日变化率" value={fPctChg(rzye20dChgPct)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">趋势</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={trend || '--'} color={getTrendColor(trend)} size="small" />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
