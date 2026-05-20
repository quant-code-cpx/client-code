import type { EventAnalyzeResult } from 'src/api/event-study';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { TermTooltip } from './_shared/term-tooltip';

// ----------------------------------------------------------------------

type Props = {
  result: EventAnalyzeResult;
};

export function EventAnalysisSummaryCards({ result }: Props) {
  const caarColor =
    result.caar > 0 ? 'success.main' : result.caar < 0 ? 'error.main' : 'text.primary';
  const pValueColor = result.pValue < 0.05 ? 'success.main' : 'warning.main';

  const significantRatio = result.significantSampleRatio ?? null;

  const cards: Array<{ title: React.ReactNode; value: string; color: string }> = [
    { title: '样本数量', value: String(result.sampleCount), color: 'info.main' },
    {
      title: <TermTooltip termKey="CAAR" label="CAAR" />,
      value: `${result.caar > 0 ? '+' : ''}${(result.caar * 100).toFixed(2)}%`,
      color: caarColor,
    },
    {
      title: <TermTooltip termKey="T_STAT" label="t 统计量" />,
      value: result.tStatistic.toFixed(3),
      color: 'primary.main',
    },
    {
      title: <TermTooltip termKey="P_VALUE" label="p 值" />,
      value: result.pValue.toFixed(4),
      color: pValueColor,
    },
    {
      title: <TermTooltip termKey="SIGNIFICANT_RATIO" label="显著样本占比" />,
      value: significantRatio != null ? `${(significantRatio * 100).toFixed(1)}%` : '-',
      color: 'secondary.main',
    },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, i) => (
        <Grid key={i} size={{ xs: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Stack alignItems="center" spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {card.title}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: card.color,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {card.value}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
