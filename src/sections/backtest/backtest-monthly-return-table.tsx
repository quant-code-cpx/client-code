import type { BacktestEquityPoint } from 'src/api/backtest';

import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface BacktestMonthlyReturnTableProps {
  points: BacktestEquityPoint[];
}

type MonthlyData = Record<string, Record<string, number>>;

function buildMonthlyReturns(points: BacktestEquityPoint[]): MonthlyData {
  const data: MonthlyData = {};

  // Group by year-month
  const monthMap: Record<string, BacktestEquityPoint[]> = {};
  for (const p of points) {
    const [year, month] = p.tradeDate.split('-');
    const key = `${year}-${month}`;
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(p);
  }

  for (const [ym, pts] of Object.entries(monthMap)) {
    const [year, month] = ym.split('-');
    const first = pts[0];
    const last = pts[pts.length - 1];
    const ret = last.nav / first.nav - 1;

    if (!data[year]) data[year] = {};
    data[year][month] = ret;
  }

  return data;
}

export function BacktestMonthlyReturnTable({ points }: BacktestMonthlyReturnTableProps) {
  const theme = useTheme();
  const monthlyData = useMemo(() => buildMonthlyReturns(points), [points]);
  const years = Object.keys(monthlyData).sort();

  const getCellBg = (value: number | undefined): string => {
    if (value == null) return 'transparent';
    // Positive: red tones; Negative: green tones (A-shares convention)
    const abs = Math.min(Math.abs(value), 0.15) / 0.15;
    if (value > 0) {
      const alpha = 0.1 + abs * 0.5;
      return `rgba(255, 72, 66, ${alpha})`;
    }
    const alpha = 0.1 + abs * 0.5;
    return `rgba(54, 179, 126, ${alpha})`;
  };

  if (points.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          月收益热力表
        </Typography>

        <Scrollbar>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, minWidth: 60 }}>年份</TableCell>
                  {MONTH_LABELS.map((m) => (
                    <TableCell key={m} align="center" sx={{ minWidth: 52 }}>
                      {m}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year}>
                    <TableCell sx={{ fontWeight: 600 }}>{year}</TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = String(i + 1).padStart(2, '0');
                      const val = monthlyData[year]?.[month];
                      return (
                        <TableCell
                          key={month}
                          align="center"
                          sx={{
                            bgcolor: getCellBg(val),
                            p: 0.5,
                          }}
                        >
                          {val != null ? (
                            <Typography
                              variant="caption"
                              sx={{
                                color: val >= 0 ? 'error.dark' : 'success.dark',
                                fontWeight: 600,
                              }}
                            >
                              {val >= 0 ? '+' : ''}{(val * 100).toFixed(1)}%
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              -
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </CardContent>
    </Card>
  );
}
