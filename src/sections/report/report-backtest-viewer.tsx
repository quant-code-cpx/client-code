import type { BacktestReportData } from 'src/api/report';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';

// ─── Sub-component: Metric Card ───────────────────────────────────────────────

type MetricCardProps = {
  label: string;
  value: string;
  color?: string;
};

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function pctColor(v: number, invert?: boolean): string {
  if (invert) return v < 0 ? 'success.main' : 'error.main';
  return v >= 0 ? 'error.main' : 'success.main';
}

function pctStr(v: number): string {
  return `${v >= 0 ? '+' : ''}${fPercent(v)}`;
}

// ─── Sub-component: NAV Curve Chart ──────────────────────────────────────────

type NavCurveChartProps = {
  points: { date: string; nav: number }[];
};

function NavCurveChart({ points }: NavCurveChartProps) {
  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories: points.map((p) => p.date), tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => v.toFixed(4) } },
  });

  const series = [{ name: '策略净值', data: points.map((p) => Number(p.nav.toFixed(4))) }];

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          净值曲线
        </Typography>
        {points.length === 0 ? (
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 300 }} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-component: Drawdown Curve Chart ─────────────────────────────────────

type DrawdownCurveChartProps = {
  points: { date: string; drawdown: number }[];
};

function DrawdownCurveChart({ points }: DrawdownCurveChartProps) {
  const theme = useTheme();
  const series = [{ name: '回撤', data: points.map((p) => Number((p.drawdown * 100).toFixed(2))) }];

  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    colors: [theme.palette.error.main],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories: points.map((p) => p.date), tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          回撤曲线
        </Typography>
        {points.length === 0 ? (
          <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 200 }} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-component: Monthly Returns Heatmap ──────────────────────────────────

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

type MonthlyHeatmapProps = {
  rows: { month: string; return: number }[];
};

function MonthlyHeatmap({ rows }: MonthlyHeatmapProps) {
  // Build year → month-index → return value map
  const data = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const [year, month] = row.month.split('-');
      if (!map[year]) map[year] = {};
      map[year][month] = row.return;
    }
    return map;
  }, [rows]);

  const years = Object.keys(data).sort();

  const getCellBg = (val: number | undefined): string => {
    if (val == null) return 'transparent';
    const abs = Math.min(Math.abs(val), 0.15) / 0.15;
    const alpha = 0.1 + abs * 0.5;
    return val > 0 ? `rgba(255, 72, 66, ${alpha})` : `rgba(54, 179, 126, ${alpha})`;
  };

  if (rows.length === 0) return null;

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
                    <TableCell key={m} align="center" sx={{ minWidth: 52 }}>{m}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year}>
                    <TableCell sx={{ fontWeight: 600 }}>{year}</TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = String(i + 1).padStart(2, '0');
                      const val = data[year]?.[month];
                      return (
                        <TableCell key={month} align="center" sx={{ bgcolor: getCellBg(val), p: 0.5 }}>
                          {val != null ? (
                            <Typography variant="caption" sx={{ color: val >= 0 ? 'error.dark' : 'success.dark', fontWeight: 600 }}>
                              {val >= 0 ? '+' : ''}{(val * 100).toFixed(1)}%
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>-</Typography>
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

// ─── Sub-component: Trades Table ─────────────────────────────────────────────

type TradesTableProps = {
  trades: BacktestReportData['trades'];
};

function TradesTable({ trades }: TradesTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const slice = trades.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          交易明细
        </Typography>
        <Scrollbar>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>日期</TableCell>
                  <TableCell>代码</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>方向</TableCell>
                  <TableCell align="right">成交价</TableCell>
                  <TableCell align="right">数量（股）</TableCell>
                  <TableCell align="right">成交额</TableCell>
                  <TableCell align="right">盈亏</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slice.map((t, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell><Typography variant="caption">{t.date}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{t.tsCode}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{t.name ?? '-'}</Typography></TableCell>
                    <TableCell>
                      <Label color={t.direction === 'BUY' ? 'error' : 'success'} variant="soft">
                        {t.direction === 'BUY' ? '买入' : '卖出'}
                      </Label>
                    </TableCell>
                    <TableCell align="right"><Typography variant="caption">{t.price.toFixed(2)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption">{fNumber(t.quantity)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption">{fNumber(Math.round(t.amount))}</Typography></TableCell>
                    <TableCell align="right">
                      {t.pnl != null ? (
                        <Typography variant="caption" sx={{ color: t.pnl >= 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                          {t.pnl >= 0 ? '+' : ''}{fNumber(Math.round(t.pnl))}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {slice.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>暂无交易记录</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
        <TablePagination
          component="div"
          count={trades.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
        />
      </CardContent>
    </Card>
  );
}

// ─── Sub-component: End Positions Table ──────────────────────────────────────

type PositionsTableProps = {
  positions: BacktestReportData['endPositions'];
};

function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          期末持仓
        </Typography>
        {positions.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>暂无持仓</Typography>
        ) : (
          <Scrollbar>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell align="right">数量（股）</TableCell>
                    <TableCell align="right">成本价</TableCell>
                    <TableCell align="right">市值</TableCell>
                    <TableCell align="right">权重</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((pos, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell><Typography variant="caption">{pos.tsCode}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{pos.name ?? '-'}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">{fNumber(pos.quantity)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">{pos.avgCost.toFixed(2)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">{fNumber(Math.round(pos.marketValue))}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{fPercent(pos.weight)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type BacktestReportViewerProps = {
  data: BacktestReportData;
};

export function BacktestReportViewer({ data }: BacktestReportViewerProps) {
  const { strategy, metrics, navCurve, drawdownCurve, monthlyReturns, trades, endPositions } = data;

  return (
    <Stack spacing={3}>
      {/* Strategy info */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {strategy.name}
          </Typography>
          {strategy.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {strategy.description}
            </Typography>
          )}
          {Object.keys(strategy.params).length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {Object.entries(strategy.params).map(([k, v]) => (
                  <Chip key={k} label={`${k}: ${String(v)}`} size="small" variant="outlined" />
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="总收益率" value={pctStr(metrics.totalReturn)} color={pctColor(metrics.totalReturn)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="年化收益率" value={pctStr(metrics.annualReturn)} color={pctColor(metrics.annualReturn)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="夏普比率" value={metrics.sharpe.toFixed(2)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="最大回撤" value={pctStr(metrics.maxDrawdown)} color={pctColor(metrics.maxDrawdown, true)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="胜率" value={fPercent(metrics.winRate)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="盈亏比" value={metrics.profitLossRatio.toFixed(2)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="交易次数" value={String(metrics.tradeCount)} />
        </Grid>
        {metrics.calmarRatio != null && (
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="卡尔玛比率" value={metrics.calmarRatio.toFixed(2)} />
          </Grid>
        )}
        {metrics.sortinoRatio != null && (
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="索提诺比率" value={metrics.sortinoRatio.toFixed(2)} />
          </Grid>
        )}
      </Grid>

      {/* Charts */}
      <NavCurveChart points={navCurve} />
      <DrawdownCurveChart points={drawdownCurve} />
      <MonthlyHeatmap rows={monthlyReturns} />

      {/* Tables */}
      <TradesTable trades={trades} />
      <PositionsTable positions={endPositions} />
    </Stack>
  );
}
