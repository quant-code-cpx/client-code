import type {
  SignalPeriodStatistics,
  SignalHorizonStatistics,
  TechnicalSignalDefinition,
} from 'src/api/technical-signal';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { TechnicalSignalPerformanceChart } from './technical-signal-performance-chart';
import {
  formatCount,
  formatRatio,
  formatPercent,
  primaryMetric,
  formatTradeDate,
  DIRECTION_LABELS,
  formatConfidenceInterval,
  formatRatioConfidenceInterval,
} from './technical-signal-formatters';

// ----------------------------------------------------------------------

type MetricProps = {
  label: string;
  value: string;
};

type Props = {
  definition: TechnicalSignalDefinition | null;
  group: SignalPeriodStatistics | null;
  horizon: SignalHorizonStatistics | null;
  onOpenOccurrences: () => void;
};

function Metric({ label, value }: MetricProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        minWidth: 0,
        p: 1.5,
      }}
    >
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.5 }} variant="subtitle1">
        {value}
      </Typography>
    </Box>
  );
}

function DetailLine({ label, value }: MetricProps) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }} variant="body2">
        {value}
      </Typography>
    </Stack>
  );
}

export function TechnicalSignalDetailPanel({ definition, group, horizon, onOpenOccurrences }: Props) {
  if (!group || !horizon) {
    return <Alert severity="info">请从信号表现矩阵选择一个可评估的信号和观察周期。</Alert>;
  }

  const metric = primaryMetric(group.direction, horizon);
  const usesRawDistribution = group.direction === 'CONTEXTUAL';
  const successInterval =
    usesRawDistribution
      ? '情境信号不计算方向成功率'
      : formatRatioConfidenceInterval(
          horizon.directional.successConfidenceLower,
          horizon.directional.successConfidenceUpper
        );
  const returnInterval =
    group.direction === 'CONTEXTUAL'
      ? formatConfidenceInterval(horizon.raw.meanConfidenceLowerPct, horizon.raw.meanConfidenceUpperPct)
      : formatConfidenceInterval(
          horizon.directional.meanDirectionalConfidenceLowerPct,
          horizon.directional.meanDirectionalConfidenceUpperPct
        );

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack
            alignItems={{ md: 'center', xs: 'flex-start' }}
            direction={{ md: 'row', xs: 'column' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Box>
              <Typography variant="subtitle1">
                {definition?.displayName ?? group.signalKey} · T+{horizon.horizon}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {DIRECTION_LABELS[group.direction]} · {group.semanticsVersion} · 统计区间{' '}
                {formatTradeDate(group.requestedStartDate)} ～ {formatTradeDate(group.endDate)}
              </Typography>
            </Box>
            <Button onClick={onOpenOccurrences} variant="outlined">
              查看样本明细
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { lg: 'repeat(6, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            <Metric label="发生次数" value={formatCount(group.occurrenceCount)} />
            <Metric label="可到期样本" value={formatCount(horizon.eligibleOutcomeCount)} />
            <Metric label="有效样本" value={formatCount(horizon.validOutcomeCount)} />
            <Metric label={metric.ratioLabel} value={formatRatio(metric.ratio)} />
            <Metric label={metric.returnLabel} value={formatPercent(metric.returnPct)} />
            <Metric label="平均超额收益" value={formatPercent(horizon.excess?.averageReturnPct)} />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { lg: 'minmax(0, 1.65fr) minmax(270px, 1fr)' },
            }}
          >
            <Box>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                不同观察周期的平均表现
              </Typography>
              <TechnicalSignalPerformanceChart group={group} />
            </Box>

            <Stack divider={<Divider flexItem />} spacing={1.25}>
              <DetailLine label="成功率 95% 区间" value={successInterval} />
              <DetailLine label="平均收益 95% 区间" value={returnInterval} />
              <DetailLine
                label="中位数收益"
                value={formatPercent(
                  usesRawDistribution
                    ? horizon.raw.medianReturnPct
                    : horizon.directional.medianDirectionalReturnPct
                )}
              />
              <DetailLine
                label="收益标准差"
                value={formatPercent(
                  usesRawDistribution ? horizon.raw.stdDevPct : horizon.directional.stdDevDirectionalReturnPct
                )}
              />
              <DetailLine label="平均 MFE" value={formatPercent(horizon.excursion.averageMfePct)} />
              <DetailLine label="平均 MAE" value={formatPercent(horizon.excursion.averageMaePct)} />
              <DetailLine
                label="完整路径 / 部分路径"
                value={`${formatCount(horizon.excursion.completePathCount)} / ${formatCount(horizon.excursion.partialPathCount)}`}
              />
            </Stack>
          </Box>

          <Typography color="text.secondary" variant="caption">
            缺失样本 {formatCount(horizon.missingCount)} 个，未到期样本{' '}
            {formatCount(horizon.immatureCount)} 个，重叠样本 {formatCount(horizon.overlappingOccurrenceCount)} 个。
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
