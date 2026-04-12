import type { EventAnalyzeResult } from 'src/api/event-study';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

type Props = {
  result: EventAnalyzeResult;
};

export function EventAnalysisSummaryCards({ result }: Props) {
  const caarColor =
    result.caar > 0 ? 'success.main' : result.caar < 0 ? 'error.main' : 'text.primary';
  const pValueColor = result.pValue < 0.05 ? 'success.main' : 'warning.main';

  const cards = [
    {
      title: '样本数量',
      value: String(result.sampleCount),
      color: 'info.main',
    },
    {
      title: 'CAAR',
      value: `${result.caar > 0 ? '+' : ''}${(result.caar * 100).toFixed(2)}%`,
      color: caarColor,
    },
    {
      title: 't 统计量',
      value: result.tStatistic.toFixed(3),
      color: 'primary.main',
    },
    {
      title: 'p 值',
      value: result.pValue.toFixed(4),
      color: pValueColor,
    },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card) => (
        <Grid key={card.title} size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {card.title}
              </Typography>
              <Typography variant="h4" sx={{ color: card.color, fontWeight: 700 }}>
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
