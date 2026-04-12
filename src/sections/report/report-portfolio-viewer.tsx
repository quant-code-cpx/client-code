import type { PortfolioReportData } from 'src/api/report';

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

import { fNumber, fPercent, fWanYuan } from 'src/utils/format-number';

import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';

// ─── Overview cards ───────────────────────────────────────────

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

// ─── Industry distribution pie chart ─────────────────────────

type IndustryPieProps = { rows: PortfolioReportData['industryDistribution'] };
function IndustryPie({ rows }: IndustryPieProps) {
  const theme = useTheme();
  const labels = rows.map((r) => r.industry);
  const values = rows.map((r) => +(r.weight != null ? (r.weight * 100).toFixed(2) : 0));

  const chartOptions = useChart({
    chart: { type: 'pie', toolbar: { show: false } },
    labels,
    colors: [
      theme.palette.primary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.success.main,
      theme.palette.secondary.main,
      theme.palette.primary.light,
      theme.palette.info.dark,
    ],
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
    dataLabels: { enabled: true, formatter: (v: unknown) => `${Number(v).toFixed(1)}%` },
  });

  if (rows.length === 0) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          暂无行业分布数据
        </Typography>
      </Box>
    );
  }

  return <Chart type="pie" series={values} options={chartOptions} sx={{ height: 360 }} />;
}

// ─── Holdings table ───────────────────────────────────────────

type HoldingsTableProps = { holdings: PortfolioReportData['holdings'] };
function HoldingsTable({ holdings }: HoldingsTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          持仓明细
        </Typography>
        <Scrollbar>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>代码</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>行业</TableCell>
                  <TableCell align="right">数量（股）</TableCell>
                  <TableCell align="right">成本价</TableCell>
                  <TableCell align="right">现价</TableCell>
                  <TableCell align="right">市值</TableCell>
                  <TableCell align="right">盈亏 (%)</TableCell>
                  <TableCell align="right">权重</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holdings.map((h, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Typography variant="caption">{h.tsCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{h.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {h.industry ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{fNumber(h.quantity)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{h.avgCost.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {h.currentPrice != null ? h.currentPrice.toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {h.marketValue != null ? fWanYuan(h.marketValue) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {h.pnlPct != null ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: h.pnlPct >= 0 ? 'error.main' : 'success.main',
                            fontWeight: 600,
                          }}
                        >
                          {h.pnlPct >= 0 ? '+' : ''}
                          {fPercent(h.pnlPct)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {h.weight != null ? fPercent(h.weight) : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {holdings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        暂无持仓
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

type PortfolioReportViewerProps = {
  data: PortfolioReportData;
};

export function PortfolioReportViewer({ data }: PortfolioReportViewerProps) {
  const { overview, holdings, industryDistribution } = data;
  const pnlColor =
    overview.unrealizedPnl == null
      ? undefined
      : overview.unrealizedPnl >= 0
        ? 'error.main'
        : 'success.main';

  return (
    <Stack spacing={3}>
      {/* Portfolio info */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {overview.name}
          </Typography>
          {overview.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {overview.description}
            </Typography>
          )}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            创建于 {overview.createdAt}
          </Typography>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="初始资金" value={fWanYuan(overview.initialCash)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard
            label="总市值"
            value={overview.totalMarketValue != null ? fWanYuan(overview.totalMarketValue) : '-'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="总成本" value={fWanYuan(overview.totalCost)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard
            label="浮盈亏"
            value={
              overview.unrealizedPnl != null
                ? `${overview.unrealizedPnl >= 0 ? '+' : ''}${fWanYuan(overview.unrealizedPnl)}`
                : '-'
            }
            color={pnlColor}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <MetricCard label="持仓数量" value={`${overview.holdingCount} 只`} />
        </Grid>
      </Grid>

      {/* Industry distribution */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            行业分布
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <IndustryPie rows={industryDistribution} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>行业</TableCell>
                      <TableCell align="right">股票数</TableCell>
                      <TableCell align="right">市值</TableCell>
                      <TableCell align="right">权重</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {industryDistribution.map((r, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="caption">{r.industry}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{r.stockCount}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            {r.totalMarketValue != null ? fWanYuan(r.totalMarketValue) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {r.weight != null ? fPercent(r.weight) : '-'}
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

      {/* Holdings table */}
      <HoldingsTable holdings={holdings} />
    </Stack>
  );
}
