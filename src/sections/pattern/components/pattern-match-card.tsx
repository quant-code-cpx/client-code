import type { PatternMatch } from 'src/api/pattern';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { fmtTradeDate } from 'src/utils/format-time';

import { PatternMiniChart } from './pattern-mini-chart';

type Props = {
  match: PatternMatch;
};

const FUTURE_LABELS = ['T+5', 'T+10', 'T+20'];

function ReturnChip({ label, value }: { label: string; value: number | undefined }) {
  const theme = useTheme();
  if (value === undefined || value === null || Number.isNaN(value)) {
    return (
      <Stack alignItems="center" sx={{ minWidth: 56 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 600 }}>
          —
        </Typography>
      </Stack>
    );
  }

  // 涨红跌绿（A 股数据色规约）
  const color =
    value > 0
      ? theme.palette.error.main
      : value < 0
        ? theme.palette.success.main
        : theme.palette.text.secondary;
  const sign = value > 0 ? '+' : '';

  return (
    <Stack alignItems="center" sx={{ minWidth: 56 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color }}
      >
        {sign}
        {value.toFixed(2)}%
      </Typography>
    </Stack>
  );
}

export function PatternMatchCard({ match }: Props) {
  const stockLabel = match.name ? `${match.name} ${match.tsCode}` : match.tsCode;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          {/* 股票 + 日期 */}
          <Box sx={{ minWidth: 220 }}>
            <Link
              href={`/stock/${match.tsCode}`}
              underline="hover"
              variant="subtitle2"
              color="text.primary"
              sx={{ fontWeight: 600 }}
            >
              {stockLabel}
            </Link>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {fmtTradeDate(match.startDate)} → {fmtTradeDate(match.endDate)}
            </Typography>
          </Box>

          {/* 相似度 */}
          <Box sx={{ minWidth: 180, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, match.similarity))}
                sx={{ flex: 1, height: 6, borderRadius: 1 }}
              />
              <Typography
                variant="body2"
                sx={{ minWidth: 48, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {match.similarity.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              相似度
            </Typography>
          </Box>

          {/* sparkline */}
          <Box sx={{ minWidth: 140, width: { xs: '100%', md: 140 } }}>
            {match.normalizedSeries.length > 0 && (
              <PatternMiniChart series={match.normalizedSeries} height={50} />
            )}
          </Box>

          {/* 未来收益 */}
          <Stack direction="row" spacing={1.5}>
            {FUTURE_LABELS.map((label, i) => (
              <ReturnChip key={label} label={label} value={match.futureReturns[i]} />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
