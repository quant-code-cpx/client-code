import type { FactorCorrelationResult } from 'src/api/factor';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { CorrelationStats } from './factor-correlation-helpers';

// ----------------------------------------------------------------------

const UNIVERSE_LABELS: Record<string, string> = {
  '': '全市场',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
  '000016.SH': '上证50',
};

type Props = {
  result: FactorCorrelationResult;
  stats: CorrelationStats;
  threshold: number;
  onShowMethod: (el: HTMLElement) => void;
  onFocusHighPairs: () => void;
};

type KpiCellProps = {
  label: string;
  value: string;
  caption?: string;
  accent?: 'positive' | 'negative' | 'neutral' | 'warning';
  onClick?: () => void;
};

function KpiCell({ label, value, caption, accent = 'neutral', onClick }: KpiCellProps) {
  const theme = useTheme();
  const accentColor =
    accent === 'positive'
      ? theme.palette.error.main
      : accent === 'negative'
        ? theme.palette.info.main
        : accent === 'warning'
          ? theme.palette.warning.main
          : theme.palette.text.disabled;

  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: 160,
        py: 1.5,
        px: 2,
        borderLeft: 2,
        borderColor: accentColor,
        cursor: onClick ? 'pointer' : 'default',
        transition: theme.transitions.create('background-color'),
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
}

export function FactorCorrelationSummary({
  result,
  stats,
  threshold,
  onShowMethod,
  onFocusHighPairs,
}: Props) {
  const universeLabel =
    UNIVERSE_LABELS[result.meta?.universe ?? ''] ?? result.meta?.universe ?? '全市场';
  const formattedDate = dayjs(result.tradeDate, 'YYYYMMDD').format('YYYY-MM-DD');
  const methodLabel = result.method === 'spearman' ? 'Spearman' : 'Pearson';
  const matrixModeLabel =
    result.meta?.matrixMode === 'pairwise'
      ? '两两交集（pairwise）'
      : (result.meta?.matrixMode ?? '未知');

  const maxPos = stats.maxPositive ? `+${stats.maxPositive.rho.toFixed(3)}` : '—';
  const maxPosCaption = stats.maxPositive
    ? `${stats.maxPositive.labelA} × ${stats.maxPositive.labelB}`
    : '无正相关对';

  const maxNeg = stats.maxNegative ? stats.maxNegative.rho.toFixed(3) : '—';
  const maxNegCaption = stats.maxNegative
    ? `${stats.maxNegative.labelA} × ${stats.maxNegative.labelB}`
    : '无负相关对';

  const highCountText = `${stats.highCount}`;
  const highCountCaption = `|ρ| ≥ ${threshold.toFixed(2)}`;

  const medianText = stats.medianN !== null ? stats.medianN.toLocaleString() : '未知';
  const medianCaption =
    stats.missingCellCount > 0 ? `缺失格 ${stats.missingCellCount}` : '无缺失格';

  return (
    <Card sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems="center"
        spacing={2}
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.neutral',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          日期 <b>{formattedDate}</b> · 股票池 <b>{universeLabel}</b> · 方法 <b>{methodLabel}</b> ·
          口径 <b>{matrixModeLabel}</b>
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="计算口径与缓存策略">
          <IconButton size="small" onClick={(e) => onShowMethod(e.currentTarget)}>
            <Iconify icon="solar:info-circle-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack
        direction="row"
        divider={<Box sx={{ borderRight: 1, borderColor: 'divider' }} />}
        flexWrap="wrap"
      >
        <KpiCell label="最大正相关" value={maxPos} caption={maxPosCaption} accent="positive" />
        <KpiCell label="最大负相关" value={maxNeg} caption={maxNegCaption} accent="negative" />
        <KpiCell
          label="高相关对数"
          value={highCountText}
          caption={highCountCaption}
          accent={stats.highCount > 0 ? 'warning' : 'neutral'}
          onClick={stats.highCount > 0 ? onFocusHighPairs : undefined}
        />
        <KpiCell label="样本中位数" value={medianText} caption={medianCaption} />
      </Stack>
    </Card>
  );
}
