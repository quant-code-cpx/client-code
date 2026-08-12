import type { KlineBar, KlineBlock } from 'src/types/agent/generated';

import { useId, useMemo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fmtTradeDate } from 'src/utils/format-time';

import { Chart } from 'src/components/chart/chart';
import { useChart } from 'src/components/chart/use-chart';

import type { StockKlineProps, NormalizedKlineSeries } from './stock-kline.types';

const ADJUSTMENT_LABELS = {
  NONE: '不复权',
  FORWARD: '前复权',
  BACKWARD: '后复权',
} as const;

function finite(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function completeOhlc(bar: KlineBar): bar is KlineBar & {
  open: number;
  high: number;
  low: number;
  close: number;
} {
  return [bar.open, bar.high, bar.low, bar.close].every(finite);
}

function validOhlc(bar: KlineBar): boolean {
  if (!completeOhlc(bar)) return false;
  return (
    bar.high >= Math.max(bar.open, bar.close, bar.low) &&
    bar.low <= Math.min(bar.open, bar.close, bar.high)
  );
}

export function normalizeKlineSeries(block: KlineBlock): NormalizedKlineSeries {
  const byDate = new Map<string, KlineBar>();
  let invalidBars = 0;
  block.bars.forEach((bar) => {
    if (!validOhlc(bar)) invalidBars += 1;
    byDate.set(bar.tradeDate, bar);
  });
  const bars = [...byDate.values()].sort((left, right) =>
    left.tradeDate.localeCompare(right.tradeDate)
  );
  const warnings: string[] = [];
  if (byDate.size !== block.bars.length) warnings.push('重复交易日已去重');
  if (invalidBars > 0) warnings.push(`${invalidBars} 条 OHLC 缺失或关系异常，未绘入主图`);
  if (block.adjustment === 'NONE') warnings.push('当前为不复权口径，跨除权除息日比较需谨慎');
  if (block.provenance.adjustment && block.provenance.adjustment !== block.adjustment) {
    warnings.push('数据来源复权口径与图表声明不一致');
  }

  return {
    tsCode: block.tsCode,
    adjustment: block.adjustment,
    timezone: block.provenance.timezone,
    priceUnit: block.priceUnit,
    volumeUnit: block.volumeUnit,
    amountUnit: block.amountUnit,
    bars,
    provenance: block.provenance,
    warnings,
  };
}

function formatNumber(value: number | null, digits = 2): string {
  return value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(value);
}

export function StockKline({
  series,
  height = 480,
  chartContent,
  showHeader = true,
  onOpenStockDetail,
}: StockKlineProps) {
  const theme = useTheme();
  const reactId = useId().replace(/:/g, '');
  const chartBars = useMemo(() => series.bars.filter(validOhlc), [series.bars]);
  const tableBars = series.bars.slice(-200);
  const priceHeight = Math.max(240, height - 130);
  const categories = chartBars.map((bar) => fmtTradeDate(bar.tradeDate));

  const candleSeries = useMemo(
    () => [
      {
        name: '价格',
        data: chartBars.map((bar) => ({
          x: fmtTradeDate(bar.tradeDate),
          y: [bar.open, bar.high, bar.low, bar.close],
        })),
      },
    ],
    [chartBars]
  );
  const volumeSeries = useMemo(
    () => [
      {
        name: `成交量（${series.volumeUnit}）`,
        data: chartBars.map((bar, index) => ({
          x: index + 1,
          y: finite(bar.volume) ? bar.volume : null,
          fillColor:
            finite(bar.open) && finite(bar.close) && bar.close >= bar.open
              ? theme.palette.error.main
              : theme.palette.success.main,
        })),
      },
    ],
    [chartBars, series.volumeUnit, theme.palette.error.main, theme.palette.success.main]
  );

  const candleOptions = useChart({
    chart: {
      id: `agent-kline-${reactId}`,
      type: 'candlestick',
      animations: { enabled: false },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    plotOptions: {
      candlestick: {
        colors: { upward: theme.palette.error.main, downward: theme.palette.success.main },
        wick: { useFillColor: true },
      },
    },
    xaxis: {
      type: 'category',
      categories,
      tickAmount: 8,
      labels: {
        rotate: -45,
        formatter: (value: string) => {
          const label = String(value ?? '');
          return label.length >= 10 ? label.slice(5, 10) : label;
        },
        style: { fontSize: '12px' },
      },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { formatter: (value: number) => formatNumber(value) },
      title: { text: series.priceUnit },
    },
    tooltip: { shared: false },
  });

  const volumeOptions = useChart({
    chart: {
      id: `agent-kline-volume-${reactId}`,
      type: 'bar',
      animations: { enabled: false },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [theme.palette.primary.main],
    plotOptions: { bar: { columnWidth: '80%', borderRadius: 0 } },
    xaxis: {
      type: 'numeric',
      tickAmount: 8,
      labels: {
        formatter: (value: string | number) => {
          const date = categories[Math.round(Number(value)) - 1] ?? '';
          const label = String(date);
          return label.length >= 10 ? label.slice(5, 10) : label;
        },
        style: { fontSize: '12px' },
      },
    },
    yaxis: {
      min: 0,
      tickAmount: 3,
      labels: { formatter: (value: number) => formatNumber(value, 0) },
    },
    tooltip: {
      y: {
        formatter: (value: number | null) =>
          value == null ? '—' : `${formatNumber(value, 0)} ${series.volumeUnit}`,
      },
    },
    legend: { show: false },
  });

  if (chartBars.length === 0) {
    return <Alert severity="warning">无完整 OHLC 数据，K 线已降级为数据表。</Alert>;
  }

  return (
    <Stack spacing={1.25}>
      {showHeader ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Typography variant="subtitle2">{series.tsCode}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {ADJUSTMENT_LABELS[series.adjustment]} · {series.timezone}
          </Typography>
          {onOpenStockDetail ? (
            <Button size="small" onClick={() => onOpenStockDetail(series.tsCode)} sx={{ ml: 'auto' }}>
              打开股票详情
            </Button>
          ) : null}
        </Stack>
      ) : null}
      {series.warnings.map((warning) => (
        <Alert key={warning} severity="warning">
          {warning}
        </Alert>
      ))}
      {chartContent ?? (
        <Box role="img" aria-label={`${series.tsCode} K 线图，${ADJUSTMENT_LABELS[series.adjustment]}`}>
          <Chart
            type={'candlestick' as never}
            series={candleSeries as never}
            options={candleOptions}
            sx={{ height: priceHeight }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            成交量（{series.volumeUnit}）
          </Typography>
          <Chart type="bar" series={volumeSeries} options={volumeOptions} sx={{ height: 110 }} />
        </Box>
      )}
      <Box component="details">
        <Typography component="summary" variant="caption" sx={{ cursor: 'pointer', fontWeight: 700 }}>
          查看 K 线数据表{series.bars.length > tableBars.length ? '（最近 200 条）' : ''}
        </Typography>
        <TableContainer sx={{ mt: 1, maxHeight: 320 }}>
          <Table size="small" stickyHeader aria-label={`${series.tsCode} K 线数据`}>
            <TableHead>
              <TableRow>
                {['交易日', '开', '高', '低', '收', `成交量（${series.volumeUnit}）`].map(
                  (label) => (
                    <TableCell key={label} align={label === '交易日' ? 'left' : 'right'}>
                      {label}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableBars.map((bar) => (
                <TableRow key={bar.tradeDate}>
                  <TableCell>{fmtTradeDate(bar.tradeDate)}</TableCell>
                  {[bar.open, bar.high, bar.low, bar.close, bar.volume].map((value, index) => (
                    <TableCell key={index} align="right">
                      {formatNumber(value, index === 4 ? 0 : 2)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}
