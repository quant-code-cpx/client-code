import type { RelativeStrengthSummary } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fPctChg, fRatePercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

function StatItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2" sx={{ color: valueColor }}>{value}</Typography>
    </Box>
  );
}

type Props = { summary: RelativeStrengthSummary };

export function AnalysisRelativeStrengthSummaryCard({ summary }: Props) {
  const {
    stockTotalReturn, benchmarkTotalReturn, excessReturn, excess20d,
    annualizedVol, maxDrawdown, beta, informationRatio,
  } = summary;

  const stockColor = stockTotalReturn != null && stockTotalReturn > 0 ? '#EF5350' : stockTotalReturn != null && stockTotalReturn < 0 ? '#26A69A' : undefined;
  const excessColor = excessReturn != null && excessReturn > 0 ? '#EF5350' : excessReturn != null && excessReturn < 0 ? '#26A69A' : undefined;
  const drawdownColor = '#26A69A';

  const betaLabel = beta != null
    ? `${beta.toFixed(2)}${beta > 1 ? ' (高于大盘)' : beta < 1 ? ' (低于大盘)' : ''}`
    : '--';

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>风险收益指标</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="区间涨跌幅" value={fPctChg(stockTotalReturn)} valueColor={stockColor} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="基准涨跌幅" value={fPctChg(benchmarkTotalReturn)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="超额收益" value={fPctChg(excessReturn)} valueColor={excessColor} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="20日超额" value={fPctChg(excess20d)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="年化波动率" value={fRatePercent(annualizedVol)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="最大回撤" value={fPctChg(maxDrawdown)} valueColor={drawdownColor} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="Beta" value={betaLabel} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <StatItem label="信息比率" value={informationRatio != null ? informationRatio.toFixed(2) : '--'} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
