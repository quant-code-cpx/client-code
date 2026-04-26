import type { MoneyFlowTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fmtTradeDate as fmtDate } from 'src/utils/format-time';

import { fetchMoneyFlowTrend } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10, label: '10日' },
  { value: 20, label: '20日' },
  { value: 40, label: '40日' },
  { value: 60, label: '60日' },
];

type ChartMode = 'overview' | 'tier' | 'rate';

const MODE_OPTIONS: Array<{ value: ChartMode; label: string }> = [
  { value: 'overview', label: '总览' },
  { value: 'tier', label: '资金分层' },
  { value: 'rate', label: '主力占比' },
];

const HINT_TEXT =
  '逐笔资金净流入 ≠ 主力资金。\n计算口径：超大/大/中/小单各档净流入按代数相加。\n主力占比 = (超大单净+大单净) ÷ 四档绝对值之和，\n正值表示主力主动买入占优，负值表示主力主动卖出占优。\n取值范围 -100% ~ +100%，数值越大表示主力买入意愿越强。';

/** 元 → 亿元 */
function toYi(yuan: number): number {
  return +(yuan / 1e8).toFixed(2);
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function CapitalFlowTrendChart({ tradeDate }: Props) {
  const theme = useTheme();
  const [days, setDays] = useState(20);
  const [mode, setMode] = useState<ChartMode>('overview');
  const [data, setData] = useState<MoneyFlowTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMoneyFlowTrend({ trade_date: tradeDate, days })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载大盘资金流趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, days]);

  const categories = data.map((d) => fmtDate(d.tradeDate));

  // ── 总览：每日净流入柱 + 累计净流入线 ──
  const overviewSeries = [
    { name: '每日净流入', type: 'column' as const, data: data.map((d) => toYi(d.netAmount)) },
    { name: '累计净流入', type: 'line' as const, data: data.map((d) => toYi(d.cumulativeNet)) },
  ];

  const overviewOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: theme.palette.success.main },
            { from: 0, to: 9999999, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: [
      {
        title: { text: '每日净流入(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}亿` },
      },
      {
        opposite: true,
        title: { text: '累计(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}亿` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        { formatter: (v: number) => `${v.toFixed(2)}亿` },
        { formatter: (v: number) => `${v.toFixed(2)}亿` },
      ],
    },
    legend: { show: true },
  });

  // ── 资金分层：四档净流入折线 ──
  const tierSeries = [
    { name: '超大单', type: 'line' as const, data: data.map((d) => toYi(d.buyElgAmount)) },
    { name: '大单', type: 'line' as const, data: data.map((d) => toYi(d.buyLgAmount)) },
    { name: '中单', type: 'line' as const, data: data.map((d) => toYi(d.buyMdAmount)) },
    { name: '小单', type: 'line' as const, data: data.map((d) => toYi(d.buySmAmount)) },
  ];

  const tierOptions = useChart({
    chart: { type: 'line' },
    stroke: { width: [2, 2, 2, 2], curve: 'smooth' },
    colors: [
      theme.palette.error.dark,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
    ],
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: { labels: { formatter: (v: number) => `${v.toFixed(0)}亿` } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}亿` },
    },
    legend: { show: true },
  });

  // ── 主力占比：(超大单净+大单净) ÷ 四档绝对值之和 ──
  // 分子仅取主力资金（超大+大单），分母为四档绝对值之和（> 0）。
  // 由三角不等式：|主力净| ≤ |超大| + |大单| ≤ absSum，结果恒在 -100%~+100%。
  const rateSeries = [
    {
      name: '主力净占比(%)',
      type: 'bar' as const,
      data: data.map((d) => {
        const absSum =
          Math.abs(d.buyElgAmount ?? 0) +
          Math.abs(d.buyLgAmount ?? 0) +
          Math.abs(d.buyMdAmount ?? 0) +
          Math.abs(d.buySmAmount ?? 0);
        if (absSum === 0) return 0;
        const mainNet = (d.buyElgAmount ?? 0) + (d.buyLgAmount ?? 0);
        return +((mainNet / absSum) * 100).toFixed(2);
      }),
    },
  ];

  const rateOptions = useChart({
    chart: { type: 'bar' },
    stroke: { width: [0] },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: -0.001, color: theme.palette.success.main },
            { from: -0.001, to: 9999999, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: {
      title: { text: '主力净占比(%)' },
      labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    legend: { show: false },
  });

  const activeSeries = mode === 'tier' ? tierSeries : mode === 'rate' ? rateSeries : overviewSeries;
  const activeOptions =
    mode === 'tier' ? tierOptions : mode === 'rate' ? rateOptions : overviewOptions;

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="h6">大盘资金流向趋势</Typography>
            <Tooltip
              placement="top"
              title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HINT_TEXT}</Box>}
            >
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
              >
                <Iconify
                  icon="solar:question-circle-bold"
                  width={16}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                />
              </Box>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              exclusive
              value={mode}
              size="small"
              onChange={(_, v) => {
                if (v != null) setMode(v);
              }}
            >
              {MODE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <ToggleButtonGroup
              exclusive
              value={days}
              size="small"
              onChange={(_, v) => {
                if (v != null) setDays(v);
              }}
            >
              {DAY_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={360} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 360,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="line" series={activeSeries} options={activeOptions} sx={{ height: 360 }} />
        )}

        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.disabled', mt: 1.5, lineHeight: 1.5 }}
        >
          数据口径：逐笔成交方向汇总买卖金额差额。主力占比 = (超大单净+大单净) ÷
          四档绝对值之和，取值 -100%~+100%。
        </Typography>
      </CardContent>
    </Card>
  );
}
