import type { ChipKeyLevels, ChipConcentration } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fRatePercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2">{value}</Typography>
    </Box>
  );
}

type Props = {
  concentration: ChipConcentration;
  keyLevels: ChipKeyLevels;
  currentPrice: number | null;
};

export function AnalysisChipSummaryCard({ concentration, keyLevels, currentPrice }: Props) {
  const { profitRatio, avgCost, range70Low, range70High, range90Low, range90High, score } = concentration;
  const { peakPrice, resistanceHigh, resistanceLow, supportHigh, supportLow } = keyLevels;

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>筹码摘要</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatItem label="获利比例" value={fRatePercent(profitRatio)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatItem label="平均成本" value={avgCost != null ? `¥${avgCost.toFixed(2)}` : '--'} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatItem
              label="70%集中区"
              value={range70Low != null && range70High != null ? `¥${range70Low.toFixed(2)}-${range70High.toFixed(2)}` : '--'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatItem
              label="90%集中区"
              value={range90Low != null && range90High != null ? `¥${range90Low.toFixed(2)}-${range90High.toFixed(2)}` : '--'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatItem label="集中度评分" value={score != null ? `${score}/100` : '--'} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatItem label="主力成本" value={peakPrice != null ? `¥${peakPrice.toFixed(2)}` : '--'} />
          </Grid>
          {currentPrice != null && (
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatItem label="当前价格" value={`¥${currentPrice.toFixed(2)}`} />
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>关键价位</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatItem
              label="阻力区（上）"
              value={resistanceHigh != null ? `¥${resistanceHigh.toFixed(2)}` : '--'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatItem
              label="阻力区（下）"
              value={resistanceLow != null ? `¥${resistanceLow.toFixed(2)}` : '--'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatItem
              label="支撑区（上）"
              value={supportHigh != null ? `¥${supportHigh.toFixed(2)}` : '--'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatItem
              label="支撑区（下）"
              value={supportLow != null ? `¥${supportLow.toFixed(2)}` : '--'}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
