import type {
  TechnicalSignalPeriod,
  SignalPeriodStatistics,
  TechnicalSignalDirection,
  TechnicalSignalDefinition,
} from 'src/api/technical-signal';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

import {
  formatCount,
  formatRatio,
  formatPercent,
  primaryMetric,
  DIRECTION_LABELS,
} from './technical-signal-formatters';

// ----------------------------------------------------------------------

type Props = {
  activePeriod: TechnicalSignalPeriod;
  definitions: TechnicalSignalDefinition[];
  groups: SignalPeriodStatistics[];
  onSelect: (signalKey: string, horizon: number) => void;
  requestedHorizons: number[];
  selectedHorizon: number | null;
  selectedSignalKey: string | null;
};

function directionColor(direction: TechnicalSignalDirection) {
  if (direction === 'BULLISH') return 'error' as const;
  if (direction === 'BEARISH') return 'success' as const;
  return 'info' as const;
}

export function TechnicalSignalMatrix({
  activePeriod,
  definitions,
  groups,
  onSelect,
  requestedHorizons,
  selectedHorizon,
  selectedSignalKey,
}: Props) {
  const definitionsByKey = useMemo(
    () => new Map(definitions.map((definition) => [definition.signalKey, definition])),
    [definitions]
  );
  const periodGroups = useMemo(
    () => groups.filter((group) => group.period === activePeriod),
    [activePeriod, groups]
  );
  const responseHorizons = useMemo(
    () =>
      [...new Set(periodGroups.flatMap((group) => group.horizons.map((item) => item.horizon)))].sort(
        (a, b) => a - b
      ),
    [periodGroups]
  );
  const horizons = responseHorizons.length > 0 ? responseHorizons : requestedHorizons;

  if (periodGroups.length === 0) {
    return <Alert severity="info">当前统计区间没有可展示的信号结果。</Alert>;
  }

  return (
    <Card>
      <CardContent sx={{ pb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          信号表现矩阵
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          点击信号或任意观察周期，查看完整统计口径与样本明细。
        </Typography>

        <Scrollbar sx={{ maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: 920 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 190 }}>信号</TableCell>
                <TableCell sx={{ minWidth: 80 }}>方向</TableCell>
                <TableCell align="right" sx={{ minWidth: 88 }}>
                  发生次数
                </TableCell>
                {horizons.map((horizon) => (
                  <TableCell key={horizon} align="right" sx={{ minWidth: 126 }}>
                    T+{horizon}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {periodGroups.map((group) => {
                const definition = definitionsByKey.get(group.signalKey);
                const isSelected = selectedSignalKey === group.signalKey;

                if (!group.evaluable) {
                  return (
                    <TableRow key={`${group.period}-${group.signalKey}`} selected={isSelected}>
                      <TableCell>
                        <Typography variant="body2">
                          {definition?.displayName ?? group.signalKey}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.semanticsVersion}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Label color={directionColor(group.direction)} variant="soft">
                          {DIRECTION_LABELS[group.direction]}
                        </Label>
                      </TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell colSpan={horizons.length}>
                        <Typography color="text.secondary" variant="body2">
                          历史不足：需要 {formatCount(group.requiredValidRows)} 条有效行情，当前仅有{' '}
                          {formatCount(group.actualValidRows)} 条。
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow
                    hover
                    key={`${group.period}-${group.signalKey}`}
                    onClick={() => onSelect(group.signalKey, group.horizons[0]?.horizon ?? 1)}
                    selected={isSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {definition?.displayName ?? group.signalKey}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.semanticsVersion}
                      </Typography>
                      {group.occurrenceCount === 0 ? (
                        <Typography color="text.secondary" variant="caption" sx={{ display: 'block' }}>
                          区间内未出现
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Label color={directionColor(group.direction)} variant="soft">
                        {DIRECTION_LABELS[group.direction]}
                      </Label>
                    </TableCell>
                    <TableCell align="right">{formatCount(group.occurrenceCount)}</TableCell>
                    {horizons.map((horizon) => {
                      const statistics = group.horizons.find((item) => item.horizon === horizon);
                      const selectedCell = isSelected && selectedHorizon === horizon;

                      if (!statistics) return <TableCell key={horizon} align="right">—</TableCell>;

                      const metric = primaryMetric(group.direction, statistics);
                      return (
                        <TableCell
                          key={horizon}
                          align="right"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(group.signalKey, horizon);
                          }}
                          sx={{ bgcolor: selectedCell ? 'action.selected' : 'transparent' }}
                        >
                          <Tooltip
                            title={`${metric.ratioLabel}以有效样本为分母；有效样本 ${statistics.validOutcomeCount} 个`}
                          >
                            <span>
                              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {metric.ratioLabel} {formatRatio(metric.ratio)}
                              </Typography>
                              <Typography
                                color="text.secondary"
                                variant="caption"
                                sx={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {metric.returnLabel} {formatPercent(metric.returnPct)}
                              </Typography>
                            </span>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Scrollbar>
      </CardContent>
    </Card>
  );
}
