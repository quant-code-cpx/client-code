import type { StockChartData, StockMoneyFlowData, StockDetailOverviewData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fPctChg, fQianYuan } from 'src/utils/format-number';

import { stockDetailApi } from 'src/api/stock';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Period = 'D' | 'W' | 'M';
type AdjustType = 'none' | 'qfq' | 'hfq';

type Props = {
  tsCode: string;
  overview: StockDetailOverviewData | null;
};

// ----------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean | null;
}) {
  const color =
    positive === true ? 'error.main' : positive === false ? 'success.main' : 'text.primary';

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
        {value}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function StockDetailMarketTab({ tsCode, overview }: Props) {
  const [period, setPeriod] = useState<Period>('D');
  const [adjustType, setAdjustType] = useState<AdjustType>('qfq');

  const [chartData, setChartData] = useState<StockChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  const [moneyFlow, setMoneyFlow] = useState<StockMoneyFlowData | null>(null);
  const [moneyFlowLoading, setMoneyFlowLoading] = useState(false);
  const [moneyFlowError, setMoneyFlowError] = useState('');

  // ── K 线数据 ──────────────────────────────────────────────────────────
  const fetchChart = useCallback(async () => {
    if (!tsCode) return;
    setChartLoading(true);
    setChartError('');
    try {
      const data = await stockDetailApi.chart({ tsCode, period, adjustType });
      setChartData(data);
    } catch (err) {
      setChartError(err instanceof Error ? err.message : '获取K线数据失败');
    } finally {
      setChartLoading(false);
    }
  }, [tsCode, period, adjustType]);

  // ── 资金流数据 ────────────────────────────────────────────────────────
  const fetchMoneyFlow = useCallback(async () => {
    if (!tsCode) return;
    setMoneyFlowLoading(true);
    setMoneyFlowError('');
    try {
      const data = await stockDetailApi.moneyFlow(tsCode, 60);
      setMoneyFlow(data);
    } catch (err) {
      setMoneyFlowError(err instanceof Error ? err.message : '获取资金流向失败');
    } finally {
      setMoneyFlowLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  useEffect(() => {
    fetchMoneyFlow();
  }, [fetchMoneyFlow]);

  // ── 图表配置 (all hooks must be top-level) ────────────────────────────
  const candleItems = chartData?.items ?? [];

  const candleSeries = [
    {
      name: '价格',
      type: 'candlestick',
      data: candleItems.map((item) => ({
        x: new Date(item.tradeDate).getTime(),
        y: [item.open ?? 0, item.high ?? 0, item.low ?? 0, item.close ?? 0],
      })),
    },
  ];

  const toMaSeries = (key: 'ma5' | 'ma10' | 'ma20') =>
    candleItems
      .filter((item) => item[key] != null)
      .map((item) => ({ x: new Date(item.tradeDate).getTime(), y: item[key] as number }));

  const lineSeries = [
    { name: 'MA5', data: toMaSeries('ma5') },
    { name: 'MA10', data: toMaSeries('ma10') },
    { name: 'MA20', data: toMaSeries('ma20') },
  ];

  const candleChartOptions = useChart({
    chart: { id: 'candle', type: 'candlestick' },
    plotOptions: {
      candlestick: {
        colors: { upward: '#EF5350', downward: '#26A69A' },
        wick: { useFillColor: true },
      },
    },
    xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
    yaxis: { tooltip: { enabled: true }, tickAmount: 6 },
    tooltip: { shared: true, x: { format: 'yyyy-MM-dd' } },
    stroke: { width: [1, 1.5, 1.5, 1.5], curve: 'straight' },
    legend: { show: true },
  });

  const lineChartOptions = useChart({
    chart: { id: 'line-ma', type: 'line' },
    colors: ['#2196F3', '#FF9800', '#9C27B0'],
    stroke: { width: 1.5, curve: 'straight' },
    xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
    yaxis: { tickAmount: 6 },
    tooltip: { shared: true, x: { format: 'yyyy-MM-dd' } },
    legend: { show: true },
  });

  const volumeSeries = [
    {
      name: '成交量(手)',
      data: candleItems.map((item) => ({
        x: new Date(item.tradeDate).getTime(),
        y: item.vol != null ? Math.round(item.vol / 100) : 0,
      })),
    },
  ];

  const volumeChartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { columnWidth: '80%', borderRadius: 0 } },
    xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
    yaxis: { tickAmount: 3 },
    tooltip: { x: { format: 'yyyy-MM-dd' } },
    legend: { show: false },
  });

  const mfItems = moneyFlow?.items ?? [];
  const mfDates = mfItems.map((item) =>
    new Date(item.tradeDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  );
  const mfNetAmounts = mfItems.map((item) =>
    item.netAmount != null ? Math.round(item.netAmount / 10000) : 0
  );

  const moneyFlowChartOptions = useChart({
    chart: { type: 'bar' },
    colors: ['#EF5350'],
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 0,
        colors: {
          ranges: [
            { from: -999999999, to: -1, color: '#26A69A' },
            { from: 0, to: 999999999, color: '#EF5350' },
          ],
        },
      },
    },
    xaxis: { categories: mfDates, tickAmount: 10, labels: { rotate: -45 } },
    yaxis: { tickAmount: 4, labels: { formatter: (v: number) => `${v}万` } },
    tooltip: { y: { formatter: (v: number) => `${v}万元` } },
    legend: { show: false },
  });

  const mfTrendSeries = [
    {
      name: '涨跌幅',
      data: mfItems.map((item) => ({
        x: new Date(item.tradeDate).getTime(),
        y: item.pctChange ?? 0,
      })),
    },
  ];

  const mfTrendChartOptions = useChart({
    chart: { type: 'line' },
    colors: ['#1877F2'],
    stroke: { width: 1.5, curve: 'smooth' },
    xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
    yaxis: {
      tickAmount: 4,
      labels: { formatter: (v: number) => fPctChg(v) },
    },
    tooltip: { x: { format: 'yyyy-MM-dd' } },
    legend: { show: false },
  });

  // ── 所属行业 / 地域 ────────────────────────────────────────────────────
  const basic = overview?.basic as Record<string, unknown> | null | undefined;
  const industryL1 = (basic?.sector ?? basic?.industry ?? '-') as string;
  const industryL2 = (basic?.industry ?? '-') as string;
  const area = (basic?.area ?? '-') as string;

  // ── 资金流汇总 ────────────────────────────────────────────────────────
  const summary = moneyFlow?.summary;
  const net5d = summary?.netAmount5d ?? 0;
  const net20d = summary?.netAmount20d ?? 0;
  const net60d = summary?.netAmount60d ?? 0;

  return (
    <Stack spacing={3}>
      {/* ── K 线图区 ───────────────────────────────────────────── */}
      <Card>
        <CardContent>
          {/* 控制栏 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2,
            }}
          >
            <ToggleButtonGroup
              value={period}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) setPeriod(v as Period);
              }}
            >
              <ToggleButton value="realtime" disabled sx={{ fontSize: 12 }}>
                实时（暂不支持）
              </ToggleButton>
              <ToggleButton value="D" sx={{ fontSize: 12 }}>
                日
              </ToggleButton>
              <ToggleButton value="W" sx={{ fontSize: 12 }}>
                周
              </ToggleButton>
              <ToggleButton value="M" sx={{ fontSize: 12 }}>
                月
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              select
              size="small"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as AdjustType)}
              sx={{ minWidth: 110 }}
              label="复权方式"
            >
              <MenuItem value="qfq">前复权</MenuItem>
              <MenuItem value="hfq">后复权</MenuItem>
              <MenuItem value="none">不复权</MenuItem>
            </TextField>
          </Box>

          {chartError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {chartError}
            </Alert>
          )}

          {chartLoading ? (
            <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1.5 }} />
          ) : (
            <>
              {/* K 线图 */}
              <Chart
                type="candlestick"
                series={candleSeries}
                options={candleChartOptions}
                sx={{ height: 300 }}
              />

              {/* MA 均线图 */}
              <Chart type="line" series={lineSeries} options={lineChartOptions} sx={{ height: 100 }} />

              {/* 成交量 */}
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                成交量（手）
              </Typography>
              <Chart
                type="bar"
                series={volumeSeries}
                options={volumeChartOptions}
                sx={{ height: 100 }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 资金流向 ──────────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            资金流向
          </Typography>

          {/* 汇总数据（5/20/60日净流入） */}
          {moneyFlowLoading ? (
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1.5, mb: 2 }} />
          ) : (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <SummaryCard
                label="5日净流入"
                value={fQianYuan(net5d / 10)}
                positive={net5d > 0 ? true : net5d < 0 ? false : null}
              />
              <SummaryCard
                label="20日净流入"
                value={fQianYuan(net20d / 10)}
                positive={net20d > 0 ? true : net20d < 0 ? false : null}
              />
              <SummaryCard
                label="60日净流入"
                value={fQianYuan(net60d / 10)}
                positive={net60d > 0 ? true : net60d < 0 ? false : null}
              />
            </Box>
          )}

          {moneyFlowError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {moneyFlowError}
            </Alert>
          )}

          {/* 资金净流入柱状图 */}
          {moneyFlowLoading ? (
            <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1.5 }} />
          ) : (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                日净流入（万元）
              </Typography>
              <Chart
                type="bar"
                series={[{ name: '净流入(万元)', data: mfNetAmounts }]}
                options={moneyFlowChartOptions}
                sx={{ height: 240 }}
              />

              {/* 涨跌幅走势（折线） */}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                涨跌幅（%）
              </Typography>
              <Chart
                type="line"
                series={mfTrendSeries}
                options={mfTrendChartOptions}
                sx={{ height: 120 }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 所属行业与地域 ────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            所属行业与地域
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                一级行业
              </Typography>
              <Typography variant="body2" fontWeight="fontWeightMedium">
                {industryL1}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                二级行业
              </Typography>
              <Typography variant="body2" fontWeight="fontWeightMedium">
                {industryL2}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                地域
              </Typography>
              <Typography variant="body2" fontWeight="fontWeightMedium">
                {area}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
