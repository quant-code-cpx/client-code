import type { StockMoneyFlowData, StockTodayFlowData } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fmtTradeDate } from 'src/utils/format-time';
import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

function toSafeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatWanLabel(value: unknown): string {
  const numericValue = toSafeNumber(value);
  if (numericValue == null) return '—';
  if (Math.abs(numericValue) >= 10000) return `${(numericValue / 10000).toFixed(1)}亿`;
  return `${Math.round(numericValue)}万`;
}

function FlowBar({
  buyAmount,
  sellAmount,
}: {
  buyAmount: number | null;
  sellAmount: number | null;
}) {
  const buy = buyAmount ?? 0;
  const sell = sellAmount ?? 0;
  const total = buy + sell;
  const buyRatio = total > 0 ? (buy / total) * 100 : 50;
  const isPositive = buy >= sell;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 130 }}>
      <Box
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 1,
          bgcolor: 'success.lighter',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: 1,
            height: 1,
            transform: `scaleX(${buyRatio / 100})`,
            transformOrigin: 'left center',
            bgcolor: isPositive ? 'error.main' : 'error.light',
            borderRadius: 1,
            transition: 'transform 0.4s ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{ color: isPositive ? 'error.main' : 'success.main', minWidth: 38, textAlign: 'right' }}
      >
        {buyRatio.toFixed(1)}%
      </Typography>
    </Box>
  );
}

function FlowCell({ value, highlight = false }: { value: number | null; highlight?: boolean }) {
  const numericValue = value ?? 0;
  const color = highlight
    ? numericValue > 0
      ? 'error.main'
      : numericValue < 0
        ? 'success.main'
        : 'text.primary'
    : 'text.primary';

  return (
    <TableCell
      align="right"
      sx={{ color, fontWeight: highlight ? 'fontWeightBold' : 'fontWeightRegular' }}
    >
      {value == null ? '—' : `${highlight && numericValue > 0 ? '+' : ''}${fWanYuan(numericValue)}`}
    </TableCell>
  );
}

function TodayFlowTable({ data }: { data: StockTodayFlowData | null }) {
  if (!data) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
        暂无数据
      </Typography>
    );
  }

  const rows = [
    { label: '超大单', category: data.superLarge },
    { label: '大单', category: data.large },
    { label: '中单', category: data.medium },
    { label: '小单', category: data.small },
  ];

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>类型</TableCell>
            <TableCell align="right">净流入</TableCell>
            <TableCell align="right">流入额</TableCell>
            <TableCell align="right">流出额</TableCell>
            <TableCell align="right" sx={{ minWidth: 160 }}>
              流入占比
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ label, category }) => (
            <TableRow key={label} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="fontWeightMedium">
                  {label}
                </Typography>
              </TableCell>
              <FlowCell value={category.netAmount} highlight />
              <FlowCell value={category.buyAmount} />
              <FlowCell value={category.sellAmount} />
              <TableCell>
                <FlowBar buyAmount={category.buyAmount} sellAmount={category.sellAmount} />
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} sx={{ py: 0 }}>
              <Divider />
            </TableCell>
          </TableRow>
          <TableRow sx={{ bgcolor: 'background.neutral' }}>
            <TableCell>
              <Typography variant="body2" fontWeight="fontWeightBold">
                主力合计
              </Typography>
            </TableCell>
            <FlowCell value={data.mainForce.netAmount} highlight />
            <FlowCell value={data.mainForce.buyAmount} />
            <FlowCell value={data.mainForce.sellAmount} />
            <TableCell>
              <FlowBar
                buyAmount={data.mainForce.buyAmount}
                sellAmount={data.mainForce.sellAmount}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? 'error.main' : value < 0 ? 'success.main' : 'text.primary';

  return (
    <Box
      sx={{
        flex: 1,
        textAlign: 'center',
        p: 2,
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
        minWidth: 120,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight="fontWeightBold" sx={{ color }}>
        {fWanYuan(value)}
      </Typography>
    </Box>
  );
}

export function TodayFlowCard({
  data,
  loading,
  error,
}: {
  data: StockTodayFlowData | null;
  loading: boolean;
  error: string;
}) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
          <Typography variant="h6">今日资金流向</Typography>
          {data?.tradeDate ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {fmtTradeDate(String(data.tradeDate))}
            </Typography>
          ) : null}
        </Box>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1.5 }} />
        ) : (
          <TodayFlowTable data={data} />
        )}
      </CardContent>
    </Card>
  );
}

export function MoneyFlowCard({
  tsCode,
  data,
  loading,
  error,
}: {
  tsCode: string;
  data: StockMoneyFlowData | null;
  loading: boolean;
  error: string;
}) {
  const theme = useTheme();
  const items = data?.items ?? [];
  const summary = data?.summary;
  const net5d = summary?.netMfAmount5d ?? 0;
  const net20d = summary?.netMfAmount20d ?? 0;
  const net60d = summary?.netMfAmount60d ?? 0;
  const series = [
    {
      name: '净流入',
      type: 'bar',
      data: items.map((item) => {
        const value = item.netMfAmount ?? 0;
        return {
          x: fmtTradeDate(item.tradeDate),
          y: value,
          fillColor: value >= 0 ? theme.palette.error.main : theme.palette.success.main,
        };
      }),
    },
    {
      name: '涨跌幅',
      type: 'line',
      color: theme.palette.primary.main,
      data: items.map((item) => ({ x: fmtTradeDate(item.tradeDate), y: item.pctChg ?? 0 })),
    },
  ];
  const options = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { columnWidth: '70%', borderRadius: 0 } },
    stroke: { width: [0, 2], curve: 'smooth' },
    xaxis: {
      type: 'category',
      tickAmount: 10,
      labels: {
        rotate: -45,
        formatter: (value: string) => (value.length >= 10 ? value.slice(5, 10) : value),
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (value: unknown) => fmtTradeDate(String(value)) },
      y: {
        formatter: (value: number, context?: { seriesIndex?: number }) => {
          const numericValue = toSafeNumber(value);
          if (numericValue == null) return '—';
          return context?.seriesIndex === 1
            ? fPctChg(numericValue)
            : `${Math.round(numericValue)}万元`;
        },
        title: { formatter: (seriesName: string) => `${seriesName}: ` },
      },
    },
    yaxis: [
      {
        tickAmount: 4,
        labels: { formatter: formatWanLabel },
        title: { text: '净流入' },
      },
      {
        opposite: true,
        tickAmount: 4,
        labels: { formatter: (value: unknown) => fPctChg(toSafeNumber(value)) },
        title: { text: '涨跌幅' },
      },
    ],
    legend: { show: true },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          资金流向
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1.5, mb: 2 }} />
        ) : (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <SummaryCard label="5日净流入" value={net5d} />
            <SummaryCard label="20日净流入" value={net20d} />
            <SummaryCard label="60日净流入" value={net60d} />
          </Box>
        )}
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {loading ? (
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1.5 }} />
        ) : items.length === 0 ? (
          <Typography variant="body2" sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            暂无历史资金流数据
          </Typography>
        ) : (
          <Chart
            key={`mf-combined-${tsCode}`}
            type={'bar' as never}
            series={series as never}
            options={options}
            sx={{ height: 300 }}
          />
        )}
      </CardContent>
    </Card>
  );
}
