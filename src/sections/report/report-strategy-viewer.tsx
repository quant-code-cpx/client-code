import type { StrategyResearchReportData } from 'src/api/report';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

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

function pctStr(value: number | null, signed = false): string {
  if (value == null) return '—';
  return `${signed && value > 0 ? '+' : ''}${fPercent(value)}`;
}

function pctColor(value: number | null): string | undefined {
  if (value == null || value === 0) return undefined;
  return value > 0 ? 'error.main' : 'success.main';
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    ADD: '新增',
    REMOVE: '移除',
    ADJUST: '调整',
    BUY: '买入',
    SELL: '卖出',
  };
  return labels[action] ?? action;
}

function actionColor(action: string): 'default' | 'error' | 'success' | 'warning' {
  if (action === 'BUY' || action === 'ADD') return 'error';
  if (action === 'SELL' || action === 'REMOVE') return 'success';
  if (action === 'ADJUST') return 'warning';
  return 'default';
}

type TradeLogsProps = {
  logs: NonNullable<StrategyResearchReportData['sections']['tradeLogs']>['recentLogs'];
};

function TradeLogsTable({ logs }: TradeLogsProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          组合操作日志
        </Typography>
        <Scrollbar>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>发生时间</TableCell>
                  <TableCell>操作</TableCell>
                  <TableCell>代码</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell align="right">价格</TableCell>
                  <TableCell>原因</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={`${log.createdAt}-${log.tsCode}-${index}`} hover>
                    <TableCell>{log.createdAt}</TableCell>
                    <TableCell>
                      <Label color={actionColor(log.action)} variant="soft">
                        {actionLabel(log.action)}
                      </Label>
                    </TableCell>
                    <TableCell>{log.tsCode}</TableCell>
                    <TableCell>{log.stockName ?? '—'}</TableCell>
                    <TableCell align="right">{fNumber(log.quantity)}</TableCell>
                    <TableCell align="right">
                      {log.price == null ? '—' : log.price.toFixed(2)}
                    </TableCell>
                    <TableCell>{log.reason}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      暂无操作日志
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

type StrategyReportViewerProps = {
  data: StrategyResearchReportData;
};

export function StrategyReportViewer({ data }: StrategyReportViewerProps) {
  const { title, generatedAt, sections } = data;
  const { overview, backtestPerformance, holdingsAnalysis, riskAssessment, tradeLogs } = sections;

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            生成于 {generatedAt}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                策略名称
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {overview.strategyName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                策略类型
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {overview.strategyType}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                回测记录
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {overview.backtestRunId}
              </Typography>
            </Grid>
          </Grid>
          {overview.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {overview.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      {backtestPerformance ? (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="总收益率"
                value={pctStr(backtestPerformance.totalReturn, true)}
                color={pctColor(backtestPerformance.totalReturn)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="年化收益率"
                value={pctStr(backtestPerformance.annualReturn, true)}
                color={pctColor(backtestPerformance.annualReturn)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="夏普比率"
                value={
                  backtestPerformance.sharpe == null
                    ? '—'
                    : backtestPerformance.sharpe.toFixed(2)
                }
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard
                label="最大回撤"
                value={pctStr(backtestPerformance.maxDrawdown)}
                color="warning.main"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard label="胜率" value={pctStr(backtestPerformance.winRate)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <MetricCard label="年化波动率" value={pctStr(backtestPerformance.volatility)} />
            </Grid>
            {backtestPerformance.benchmarkComparison && (
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label={`基准收益${backtestPerformance.benchmarkTsCode ? ` · ${backtestPerformance.benchmarkTsCode}` : ''}`}
                  value={pctStr(backtestPerformance.benchmarkComparison.annualReturn, true)}
                />
              </Grid>
            )}
          </Grid>
          <Alert severity="info">后端策略研究报告暂未提供净值和回撤曲线。</Alert>
        </>
      ) : (
        <Alert severity="info">本报告未包含回测表现。</Alert>
      )}

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
                  color="warning.main"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard label="年化波动率" value={pctStr(riskAssessment.volatility)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="Beta"
                  value={riskAssessment.beta == null ? '—' : riskAssessment.beta.toFixed(2)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard label="VaR 95%" value={pctStr(riskAssessment.var95)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {holdingsAnalysis && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                持仓分析
              </Typography>
              <Typography variant="caption" color="text.secondary">
                快照日期 {holdingsAnalysis.snapshotDate}
              </Typography>
            </Stack>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>代码</TableCell>
                        <TableCell>名称</TableCell>
                        <TableCell align="right">权重</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {holdingsAnalysis.topHoldings.map((position) => (
                        <TableRow key={position.tsCode} hover>
                          <TableCell>{position.tsCode}</TableCell>
                          <TableCell>{position.stockName ?? '—'}</TableCell>
                          <TableCell align="right">{pctStr(position.weight)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>行业</TableCell>
                        <TableCell align="right">权重</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {holdingsAnalysis.industryDistribution.map((industry) => (
                        <TableRow key={industry.industry} hover>
                          <TableCell>{industry.industry}</TableCell>
                          <TableCell align="right">{pctStr(industry.weight)}</TableCell>
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

      {tradeLogs && <TradeLogsTable logs={tradeLogs.recentLogs} />}

      {!holdingsAnalysis && !riskAssessment && !tradeLogs && !backtestPerformance && (
        <Box sx={{ color: 'text.secondary' }}>本报告未选择其他分析章节。</Box>
      )}
    </Stack>
  );
}
