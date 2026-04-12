import type { StrategyResearchReportData } from 'src/api/report';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';

// ─── Metric card ──────────────────────────────────────────────

type MetricCardProps = { label: string; value: string; color?: string };
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

function pctStr(v: number): string {
  return `${v >= 0 ? '+' : ''}${fPercent(v)}`;
}
function pctColor(v: number, invert?: boolean): string {
  if (invert) return v < 0 ? 'success.main' : 'error.main';
  return v >= 0 ? 'error.main' : 'success.main';
}

// ─── NAV curve chart ─────────────────────────────────────────

type NavCurveProps = { points: { date: string; nav: number }[] };
function NavCurveChart({ points }: NavCurveProps) {
  const series = [{ name: '策略净值', data: points.map((p) => Number(p.nav.toFixed(4))) }];
  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories: points.map((p) => p.date), tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => v.toFixed(4) } },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          净值曲线
        </Typography>
        {points.length === 0 ? (
          <Box
            sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 260 }} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Drawdown chart ──────────────────────────────────────────

type DrawdownChartProps = { points: { date: string; drawdown: number }[] };
function DrawdownChart({ points }: DrawdownChartProps) {
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
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          回撤曲线
        </Typography>
        {points.length === 0 ? (
          <Box
            sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 180 }} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Trade logs table ─────────────────────────────────────────

type TradeLogsProps = {
  trades: NonNullable<StrategyResearchReportData['sections']['tradeLogs']>;
};
function TradeLogsTable({ trades }: TradeLogsProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          交易日志
        </Typography>
        <Scrollbar>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 740 }}>
              <TableHead>
                <TableRow>
                  <TableCell>日期</TableCell>
                  <TableCell>代码</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>方向</TableCell>
                  <TableCell align="right">成交价</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell align="right">成交额</TableCell>
                  <TableCell align="right">盈亏</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.map((t, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Typography variant="caption">{t.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{t.tsCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{t.name ?? '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Label color={t.direction === 'BUY' ? 'error' : 'success'} variant="soft">
                        {t.direction === 'BUY' ? '买入' : '卖出'}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{t.price.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{fNumber(t.quantity)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{fNumber(Math.round(t.amount))}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {t.pnl != null ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: t.pnl >= 0 ? 'error.main' : 'success.main',
                            fontWeight: 600,
                          }}
                        >
                          {t.pnl >= 0 ? '+' : ''}
                          {fNumber(Math.round(t.pnl))}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {trades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        暂无交易记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────

type StrategyReportViewerProps = {
  data: StrategyResearchReportData;
};

export function StrategyReportViewer({ data }: StrategyReportViewerProps) {
  const { title, generatedAt, sections } = data;
  const { overview, backtestPerformance, holdingsAnalysis, riskAssessment, tradeLogs } = sections;

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            生成于 {generatedAt}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  策略名称
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {overview.strategyName}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  回测周期
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {overview.backtestPeriod}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {overview.benchmark && (
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    基准
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {overview.benchmark}
                  </Typography>
                </Stack>
              )}
            </Grid>
          </Grid>

          {overview.description && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {overview.description}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backtest performance */}
      {backtestPerformance && (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="总收益率"
                value={pctStr(backtestPerformance.totalReturn)}
                color={pctColor(backtestPerformance.totalReturn)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="年化收益率"
                value={pctStr(backtestPerformance.annualReturn)}
                color={pctColor(backtestPerformance.annualReturn)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard label="夏普比率" value={backtestPerformance.sharpe.toFixed(2)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="最大回撤"
                value={pctStr(backtestPerformance.maxDrawdown)}
                color={pctColor(backtestPerformance.maxDrawdown, true)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard label="胜率" value={fPercent(backtestPerformance.winRate)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard label="交易次数" value={String(backtestPerformance.tradeCount)} />
            </Grid>
          </Grid>
          <NavCurveChart points={backtestPerformance.navCurve} />
          <DrawdownChart points={backtestPerformance.drawdownCurve} />
        </>
      )}

      {/* Risk assessment */}
      {riskAssessment && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              风险评估
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="最大回撤"
                  value={pctStr(riskAssessment.maxDrawdown)}
                  color={pctColor(riskAssessment.maxDrawdown, true)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard label="年化波动率" value={fPercent(riskAssessment.volatility)} />
              </Grid>
              {riskAssessment.beta != null && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard label="Beta" value={riskAssessment.beta.toFixed(2)} />
                </Grid>
              )}
              {riskAssessment.var95 != null && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard label="VaR 95%" value={fPercent(riskAssessment.var95)} />
                </Grid>
              )}
              {riskAssessment.calmarRatio != null && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard label="卡尔玛比率" value={riskAssessment.calmarRatio.toFixed(2)} />
                </Grid>
              )}
              {riskAssessment.sortinoRatio != null && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard label="索提诺比率" value={riskAssessment.sortinoRatio.toFixed(2)} />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Holdings analysis */}
      {holdingsAnalysis && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              持仓分析
            </Typography>
            <Grid container spacing={3}>
              {/* End positions */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  期末持仓
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>代码</TableCell>
                        <TableCell>名称</TableCell>
                        <TableCell align="right">数量（股）</TableCell>
                        <TableCell align="right">市值</TableCell>
                        <TableCell align="right">权重</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {holdingsAnalysis.endPositions.map((pos, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="caption">{pos.tsCode}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{pos.name ?? '-'}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">{fNumber(pos.quantity)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">
                              {fNumber(Math.round(pos.marketValue))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {fPercent(pos.weight)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              {/* Industry distribution */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  行业分布
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>行业</TableCell>
                        <TableCell align="right">权重</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {holdingsAnalysis.industryDistribution.map((ind, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="caption">{ind.industry}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {fPercent(ind.weight)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Trade logs */}
      {tradeLogs && tradeLogs.length > 0 && <TradeLogsTable trades={tradeLogs} />}
    </Stack>
  );
}
