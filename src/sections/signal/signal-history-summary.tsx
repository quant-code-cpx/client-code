import type { SignalForwardWindow, SignalHistoryResponse } from 'src/api/signal';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';

import { SignalReturnText } from './signal-return-text';

// ----------------------------------------------------------------------

type Props = {
  history: SignalHistoryResponse | null;
  forwardWindow: SignalForwardWindow;
};

export function SignalHistorySummary({ history, forwardWindow }: Props) {
  const stats = history?.aggregateStats ?? buildFallbackStats(history);
  const sampleSize = stats?.accuracy?.sampleSize ?? 0;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        mb: 3,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      <SummaryCard
        tone="primary"
        label="信号总数"
        value={stats ? fNumber(stats.totalSignals) : '—'}
        caption={
          stats
            ? `买入 ${stats.buyCount} · 卖出 ${stats.sellCount} · 持有 ${stats.holdCount}`
            : '暂无统计'
        }
      />
      <SummaryCard
        tone="info"
        label="买入:卖出"
        value={stats ? `${stats.buyCount} : ${stats.sellCount}` : '—'}
        caption="观察多空倾向与换手压力"
      />
      <SummaryCard
        tone="warning"
        label="平均置信度"
        value={
          stats?.avgConfidence !== null && stats?.avgConfidence !== undefined
            ? `${(stats.avgConfidence * 100).toFixed(1)}%`
            : '—'
        }
        caption="仅在同一策略内可比"
      />
      <Card
        sx={(theme) => ({
          p: 2,
          borderLeft: 2,
          borderColor: 'error.main',
          bgcolor: theme.vars.palette.background.paper,
        })}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            准确率 / 平均超额（T+{forwardWindow}）
          </Typography>
          {sampleSize > 0 && sampleSize < 30 && (
            <Label color="default" variant="soft">
              样本不足
            </Label>
          )}
        </Stack>
        <Typography
          variant="h5"
          sx={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}
        >
          {stats?.accuracy ? `${(stats.accuracy.rate * 100).toFixed(1)}%` : '待结算'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          平均超额：
          <SignalReturnText value={stats?.avgExcessReturn?.value} variant="caption" />
          {stats?.accuracy ? ` · n=${stats.accuracy.sampleSize}` : ''}
        </Typography>
      </Card>
    </Box>
  );
}

// ----------------------------------------------------------------------

function SummaryCard({
  tone,
  label,
  value,
  caption,
}: {
  tone: 'primary' | 'info' | 'warning';
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Card
      sx={(theme) => ({
        p: 2,
        borderLeft: 2,
        borderColor: `${tone}.main`,
        bgcolor: theme.vars.palette.background.paper,
      })}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {caption}
      </Typography>
    </Card>
  );
}

function buildFallbackStats(history: SignalHistoryResponse | null) {
  if (!history) return null;

  const signals = history.groups.flatMap((group) => group.signals);
  const confidenceValues = signals
    .map((signal) => signal.confidence)
    .filter((value): value is number => value !== null && value !== undefined);

  return {
    totalSignals: history.total || signals.length,
    buyCount: signals.filter((signal) => signal.action === 'BUY').length,
    sellCount: signals.filter((signal) => signal.action === 'SELL').length,
    holdCount: signals.filter((signal) => signal.action === 'HOLD').length,
    avgConfidence:
      confidenceValues.length > 0
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : null,
    accuracy: null,
    avgExcessReturn: null,
  };
}
