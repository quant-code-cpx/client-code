import type { TimingScoreSummary } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = { scoreSummary: TimingScoreSummary };

export function AnalysisTimingScoreCard({ scoreSummary }: Props) {
  const { score, rating, bullishCount, bearishCount, neutralCount } = scoreSummary;
  const scoreColor = score >= 70 ? '#EF5350' : score >= 50 ? '#FF9800' : '#26A69A';

  const series = [score];
  const chartOptions = useChart({
    chart: { type: 'radialBar' },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: { fontSize: '12px', color: '#999', offsetY: 20 },
          value: {
            fontSize: '24px',
            fontWeight: 700,
            color: scoreColor,
            formatter: (v: number) => String(Math.round(v)),
          },
        },
        track: { background: '#f0f0f0', strokeWidth: '100%' },
        hollow: { size: '60%' },
      },
    },
    fill: { colors: [scoreColor] },
    labels: [rating],
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>综合择时评分</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 5 }}>
            <Chart type="radialBar" series={series} options={chartOptions} sx={{ height: 260 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ color: scoreColor }}>{score}</Typography>
                <Typography variant="body2" color="text.secondary">综合评分</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={`看多: ${bullishCount} 个`} color="error" size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={`看空: ${bearishCount} 个`} color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={`中性: ${neutralCount} 个`} color="default" size="small" />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
