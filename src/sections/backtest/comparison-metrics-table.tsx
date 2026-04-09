import type { ComparisonMetricsRow } from 'src/api/backtest';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar } from 'src/components/scrollbar';

import { STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

const METRICS: Array<{ key: keyof ComparisonMetricsRow; label: string; pct?: boolean }> = [
  { key: 'totalReturn', label: '总收益', pct: true },
  { key: 'annualizedReturn', label: '年化收益', pct: true },
  { key: 'benchmarkReturn', label: '基准收益', pct: true },
  { key: 'excessReturn', label: '超额收益', pct: true },
  { key: 'maxDrawdown', label: '最大回撤', pct: true },
  { key: 'sharpeRatio', label: '夏普比率' },
  { key: 'sortinoRatio', label: 'Sortino' },
  { key: 'calmarRatio', label: 'Calmar' },
  { key: 'volatility', label: '波动率', pct: true },
  { key: 'alpha', label: 'Alpha', pct: true },
  { key: 'beta', label: 'Beta' },
  { key: 'informationRatio', label: '信息比率' },
  { key: 'winRate', label: '胜率', pct: true },
  { key: 'turnoverRate', label: '换手率', pct: true },
  { key: 'tradeCount', label: '交易次数' },
];

function formatCell(val: number | null, pct?: boolean): React.ReactNode {
  if (val === null || val === undefined) return '—';
  if (pct) {
    const color = val >= 0 ? 'success.main' : 'error.main';
    return (
      <Typography variant="body2" sx={{ color }}>
        {val >= 0 ? '+' : ''}
        {(val * 100).toFixed(2)}%
      </Typography>
    );
  }
  return <Typography variant="body2">{typeof val === 'number' ? val.toFixed(3) : val}</Typography>;
}

function getBestIndex(
  rows: ComparisonMetricsRow[],
  key: keyof ComparisonMetricsRow,
  pct?: boolean
): number | null {
  const vals = rows.map((r) => r[key] as number | null);
  const hasStats = vals.some((v) => v !== null);
  if (!hasStats) return null;
  // For maxDrawdown lower is better (more negative = worse), so find max (closest to 0)
  if (key === 'maxDrawdown') {
    let best = -Infinity;
    let bestIdx = -1;
    vals.forEach((v, i) => {
      if (v !== null && v > best) {
        best = v;
        bestIdx = i;
      }
    });
    return bestIdx;
  }
  let best = -Infinity;
  let bestIdx = -1;
  vals.forEach((v, i) => {
    if (v !== null && v > best) {
      best = v;
      bestIdx = i;
    }
  });
  return bestIdx;
}

// ----------------------------------------------------------------------

type Props = { rows: ComparisonMetricsRow[] };

export function ComparisonMetricsTable({ rows }: Props) {
  return (
    <Scrollbar>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 100 }}>指标</TableCell>
              {rows.map((row) => (
                <TableCell key={row.runId} align="right" sx={{ minWidth: 130 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {row.label ||
                      `策略 (${STRATEGY_TYPE_LABEL[row.strategyType] ?? row.strategyType})`}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {METRICS.map(({ key, label, pct }) => {
              const bestIdx = getBestIndex(rows, key, pct);
              return (
                <TableRow key={key} hover>
                  <TableCell sx={{ color: 'text.secondary' }}>{label}</TableCell>
                  {rows.map((row, i) => (
                    <TableCell
                      key={row.runId}
                      align="right"
                      sx={{
                        bgcolor: bestIdx === i ? 'success.lighter' : undefined,
                        borderRadius: bestIdx === i ? 1 : 0,
                      }}
                    >
                      {formatCell(row[key] as number | null, pct)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
