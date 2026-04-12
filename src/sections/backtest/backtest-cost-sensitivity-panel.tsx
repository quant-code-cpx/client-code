import type { CostSensitivityResponse, CostSensitivityResultRow } from 'src/api/backtest';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { analyzeCostSensitivity } from 'src/api/backtest';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface BacktestCostSensitivityPanelProps {
  runId: string;
}

function fPct(v: number | null, decimals = 2) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(decimals)}%`;
}

function fNum(v: number | null, decimals = 2) {
  if (v == null) return '--';
  return v.toFixed(decimals);
}

function fBps(v: number) {
  return `${(v * 10000).toFixed(0)}bps`;
}

// Group rows by slippage for the chart
function groupBySlippage(rows: CostSensitivityResultRow[]) {
  const map = new Map<number, CostSensitivityResultRow[]>();
  for (const row of rows) {
    const key = row.slippageBps;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

export function BacktestCostSensitivityPanel({ runId }: BacktestCostSensitivityPanelProps) {
  const [result, setResult] = useState<CostSensitivityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyzeCostSensitivity({ runId });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '成本敏感性分析失败');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  const rows = useMemo(() => result?.results ?? [], [result]);

  // Build chart series: group by slippage, x = commissionRate, y = annualizedReturn
  const slippageGroups = useMemo(() => groupBySlippage(rows), [rows]);
  const allCommissions = useMemo(
    () => [...new Set(rows.map((r) => r.commissionRate))].sort((a, b) => a - b),
    [rows]
  );

  const chartSeries = useMemo(
    () =>
      [...slippageGroups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([slippage, groupRows]) => ({
          name: `滑点 ${fBps(slippage)}`,
          data: allCommissions.map((c) => {
            const match = groupRows.find((r) => r.commissionRate === c);
            return Number(((match?.annualizedReturn ?? 0) * 100).toFixed(2));
          }),
        })),
    [slippageGroups, allCommissions]
  );

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: {
      categories: allCommissions.map((c) => fBps(c)),
      title: { text: '佣金费率' },
    },
    yaxis: {
      title: { text: '年化收益率 (%)' },
      labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
    },
    legend: { show: true, position: 'top' },
    tooltip: { shared: true, y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          使用服务端默认参数范围进行网格扫描
        </Typography>
        <Button
          variant="contained"
          onClick={handleRun}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? '分析中…' : '运行分析'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && rows.length > 0 && (
        <>
          {/* Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                年化收益率 vs 佣金费率
              </Typography>
              <Chart type="line" series={chartSeries} options={chartOptions} sx={{ height: 280 }} />
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ px: 2, py: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  完整结果矩阵
                </Typography>
              </Box>
              <Divider />
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>佣金费率</TableCell>
                      <TableCell>滑点</TableCell>
                      <TableCell align="right">年化收益</TableCell>
                      <TableCell align="right">夏普比率</TableCell>
                      <TableCell align="right">最大回撤</TableCell>
                      <TableCell align="right">总交易成本</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const maxRet = Math.max(...rows.map((r) => r.annualizedReturn ?? -Infinity));
                      const minRet = Math.min(...rows.map((r) => r.annualizedReturn ?? Infinity));
                      const isMax = row.annualizedReturn === maxRet;
                      const isMin = row.annualizedReturn === minRet;
                      return (
                        <TableRow
                          key={idx}
                          hover
                          sx={{
                            bgcolor: isMax
                              ? 'success.lighter'
                              : isMin
                                ? 'error.lighter'
                                : undefined,
                          }}
                        >
                          <TableCell>{fBps(row.commissionRate)}</TableCell>
                          <TableCell>{fBps(row.slippageBps)}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color:
                                (row.annualizedReturn ?? 0) >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {fPct(row.annualizedReturn)}
                          </TableCell>
                          <TableCell align="right">{fNum(row.sharpeRatio)}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>
                            {fPct(row.maxDrawdown)}
                          </TableCell>
                          <TableCell align="right">{fPct(row.totalCost)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {!result && !loading && (
        <Box
          sx={{
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            点击「运行分析」以开始交易成本敏感性分析
          </Typography>
        </Box>
      )}
    </Box>
  );
}
