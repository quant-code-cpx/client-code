import type { StrategyTemplate } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const CATEGORY_ICONS = {
  TECHNICAL: 'solar:chart-bold',
  SCREENING: 'solar:filter-bold',
  FACTOR: 'solar:library-bold',
  CUSTOM: 'solar:widget-bold',
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: '技术',
  SCREENING: '选股',
  FACTOR: '因子',
  CUSTOM: '自定义',
};

// ----------------------------------------------------------------------

interface BacktestTemplateCardsProps {
  templates: StrategyTemplate[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}

export function BacktestTemplateCards({
  templates,
  selectedTemplateId,
  onSelect,
}: BacktestTemplateCardsProps) {
  return (
    <Grid container spacing={2}>
      {templates.map((tmpl) => {
        const selected = tmpl.id === selectedTemplateId;
        return (
          <Grid key={tmpl.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                height: '100%',
                border: (theme) =>
                  selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                boxShadow: selected ? 6 : 1,
                transition: 'all 0.2s',
              }}
            >
              <CardActionArea
                onClick={() => onSelect(tmpl.id)}
                sx={{
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Iconify
                    icon={CATEGORY_ICONS[tmpl.category]}
                    width={24}
                    sx={{ color: selected ? 'primary.main' : 'text.secondary' }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: selected ? 'primary.main' : 'text.primary' }}
                  >
                    {tmpl.name}
                  </Typography>
                </Box>

                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mb: 1.5, flexGrow: 1 }}
                >
                  {tmpl.description}
                </Typography>

                <Label color={selected ? 'primary' : 'default'} variant="soft">
                  {CATEGORY_LABELS[tmpl.category] ?? tmpl.category}
                </Label>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
