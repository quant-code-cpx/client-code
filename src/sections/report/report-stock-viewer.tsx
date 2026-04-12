import type { StockReportData } from 'src/api/report';

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

import { fNumber, fWanYuan } from 'src/utils/format-number';

import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';

// ─── Overview info cards ──────────────────────────────────────

type InfoRowProps = { label: string; value: string };
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

// ─── Candlestick / close-line chart ──────────────────────────

type PriceChartProps = { history: StockReportData['priceHistory'] };
function PriceChart({ history }: PriceChartProps) {
  const theme = useTheme();
  const series = [{ name: '收盘价', data: history.map((p) => Number(p.close.toFixed(2))) }];
  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    colors: [theme.palette.primary.main],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories: history.map((p) => p.date), tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => v.toFixed(2) } },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          行情走势（收盘价）
        </Typography>
        {history.length === 0 ? (
          <Box
            sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无行情数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 280 }} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Financial summary table ──────────────────────────────────

type FinancialTableProps = { rows: StockReportData['financialSummary'] };
function FinancialTable({ rows }: FinancialTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          财务摘要
        </Typography>
        <Scrollbar>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>报告期</TableCell>
                  <TableCell align="right">营收（万元）</TableCell>
                  <TableCell align="right">净利润（万元）</TableCell>
                  <TableCell align="right">ROE (%)</TableCell>
                  <TableCell align="right">EPS（元）</TableCell>
                  <TableCell align="right">每股净资产</TableCell>
                  <TableCell align="right">资产负债率 (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.period} hover>
                    <TableCell>
                      <Typography variant="caption">{r.period}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {r.revenue != null ? fNumber(Math.round(r.revenue)) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            r.netProfit != null && r.netProfit >= 0 ? 'error.main' : 'success.main',
                          fontWeight: 600,
                        }}
                      >
                        {r.netProfit != null ? fNumber(Math.round(r.netProfit)) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {r.roe != null ? `${r.roe.toFixed(2)}%` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {r.eps != null ? r.eps.toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {r.bps != null ? r.bps.toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {r.debtRatio != null ? `${r.debtRatio.toFixed(2)}%` : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        暂无财务数据
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

// ─── Top 10 holders ───────────────────────────────────────────

type HoldersTableProps = { holders: StockReportData['top10Holders'] };
function HoldersTable({ holders }: HoldersTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          十大股东
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>股东名称</TableCell>
                <TableCell align="right">持股数量（万股）</TableCell>
                <TableCell align="right">持股比例 (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holders.map((h, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {idx + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{h.holderName}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fNumber(h.holdAmount.toFixed(2))}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {h.holdRatio.toFixed(2)}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {holders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      暂无股东数据
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

// ─── Dividends table ──────────────────────────────────────────

type DividendsTableProps = { dividends: StockReportData['dividends'] };
function DividendsTable({ dividends }: DividendsTableProps) {
  if (dividends.length === 0) return null;
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          分红记录
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>除权除息日</TableCell>
                <TableCell align="right">每股派息（元）</TableCell>
                <TableCell align="right">每股送转</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dividends.map((d, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="caption">{d.exDate}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">
                      {d.cashDiv != null ? d.cashDiv.toFixed(4) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">
                      {d.stkDiv != null ? d.stkDiv.toFixed(4) : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────

type StockReportViewerProps = {
  data: StockReportData;
};

export function StockReportViewer({ data }: StockReportViewerProps) {
  const { overview, priceHistory, financialSummary, top10Holders, dividends } = data;

  return (
    <Stack spacing={3}>
      {/* Basic info */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {overview.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {overview.tsCode}
            </Typography>
            {overview.industry && (
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                  px: 1,
                  py: 0.25,
                  borderRadius: 0.5,
                }}
              >
                {overview.industry}
              </Typography>
            )}
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow label="市场" value={overview.market ?? '-'} />
              <InfoRow label="上市日期" value={overview.listDate ?? '-'} />
              <InfoRow
                label="总股本（万股）"
                value={overview.totalShare != null ? fNumber(overview.totalShare) : '-'}
              />
              <InfoRow
                label="流通股本（万股）"
                value={overview.floatShare != null ? fNumber(overview.floatShare) : '-'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow
                label="总市值"
                value={overview.totalMv != null ? fWanYuan(overview.totalMv) : '-'}
              />
              <InfoRow
                label="流通市值"
                value={overview.circMv != null ? fWanYuan(overview.circMv) : '-'}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Price chart */}
      <PriceChart history={priceHistory} />

      {/* Financial summary */}
      <FinancialTable rows={financialSummary} />

      {/* Holders */}
      <HoldersTable holders={top10Holders} />

      {/* Dividends */}
      <DividendsTable dividends={dividends} />
    </Stack>
  );
}
