import type { PatternTemplate } from 'src/api/pattern';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { PatternMiniChart } from './pattern-mini-chart';
import { PATTERN_TYPE_LABELS } from './pattern-template-meta';

type Props = {
  template: PatternTemplate;
  selected: boolean;
  onSelect: () => void;
};

const SIGNAL_ICON = {
  bullish: 'eva:arrow-ios-upward-fill',
  bearish: 'eva:arrow-ios-downward-fill',
  neutral: null,
} as const;

const SIGNAL_LABEL: Record<PatternTemplate['expectedSignal'], string> = {
  bullish: '看涨',
  bearish: '看跌',
  neutral: '双向',
};

export function PatternTemplateCard({ template, selected, onSelect }: Props) {
  const theme = useTheme();

  return (
    <Tooltip title={template.description} placement="top" arrow>
      <Card
        onClick={onSelect}
        sx={{
          cursor: 'pointer',
          border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
          bgcolor: selected
            ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08)
            : 'background.paper',
          transition: 'border-color 0.15s, background-color 0.15s',
          '&:hover': { border: `2px solid ${theme.palette.primary.light}` },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {template.series.length > 0 ? (
            <PatternMiniChart
              series={template.series}
              tone={
                template.expectedSignal === 'bullish'
                  ? 'bullish'
                  : template.expectedSignal === 'bearish'
                    ? 'bearish'
                    : 'primary'
              }
            />
          ) : (
            <Box
              sx={{
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                fontSize: 12,
              }}
            >
              暂无样图
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, mb: 0.5 }}>
            <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
              {template.name}
            </Typography>
            {SIGNAL_ICON[template.expectedSignal] && (
              <Tooltip title={SIGNAL_LABEL[template.expectedSignal]}>
                <Iconify
                  icon={SIGNAL_ICON[template.expectedSignal]!}
                  width={16}
                  sx={{ color: 'text.secondary' }}
                />
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Label color="default" variant="soft" sx={{ fontSize: 12 }}>
              {PATTERN_TYPE_LABELS[template.type]}
            </Label>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {template.length} 日
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Tooltip>
  );
}
