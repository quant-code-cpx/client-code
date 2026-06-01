import type { TimingScoreSummary } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const RATING_LABEL: Record<string, string> = {
  bullish: '偏多',
  bearish: '偏空',
  neutral: '中性',
};

type Props = { scoreSummary: TimingScoreSummary };

export function AnalysisTimingScoreCard({ scoreSummary }: Props) {
  const theme = useTheme();

  const { score, rating, bullishCount, bearishCount, neutralCount } = scoreSummary;
  const scoreColor =
    score >= 70
      ? theme.palette.error.main
      : score >= 50
        ? theme.palette.warning.main
        : theme.palette.success.main;

  const series = [score];
  const chartOptions = useChart({
    chart: { type: 'radialBar' },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: { show: false },
          value: {
            show: false,
            formatter: (v: number) => String(Math.round(v)),
          },
          total: { show: false },
        },
        track: { background: theme.palette.action.hover, strokeWidth: '100%' },
        hollow: { size: '60%' },
      },
    },
    fill: { colors: [scoreColor] },
    labels: [''],
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          综合择时评分
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 5 }}>
            <Box sx={{ position: 'relative', height: 260, width: 1 }}>
              <Chart
                type="radialBar"
                series={series}
                options={chartOptions}
                sx={{ height: '100%' }}
              />
              <Box
                aria-hidden="true"
                data-testid="timing-score-center-value"
                sx={{
                  top: '50%',
                  left: '50%',
                  position: 'absolute',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ color: scoreColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
                >
                  {score}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography
                  variant="h4"
                  sx={{ color: scoreColor, fontVariantNumeric: 'tabular-nums' }}
                >
                  {score}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  综合评分 · {RATING_LABEL[rating] ?? rating}
                </Typography>
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
