import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fmtTradeDate as fmtDate } from 'src/utils/format-time';

import { fetchHsgtTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const PERIODS: Array<{ value: string; label: string }> = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

/** 百万元 → 亿元 */
function toYi(v: number | null | undefined): number {
  return +((v ?? 0) / 100).toFixed(2);
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function HsgtTrendChart({ tradeDate }: Props) {
  const [period, setPeriod] = useState('3m');
  const [tabIndex, setTabIndex] = useState(0); // 0=北向, 1=南向
  const [viewMode, setViewMode] = useState<'total' | 'split'>('total');
  const [data, setData] = useState<HsgtTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtTrend({ period, trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载沪深港通趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, tradeDate]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const isNorth = tabIndex === 0;

  // 合计：单条柱
  const totalValues = data.map((d) => toYi(isNorth ? d.northMoney : d.southMoney));

  // 通道拆分：沪股通+深股通（北向），港股通沪+港股通深（南向）
  const channelA = data.map((d) => toYi(isNorth ? d.hgt : d.ggtSs));
  const channelB = data.map((d) => toYi(isNorth ? d.sgt : d.ggtSz));
  const channelALabel = isNorth ? '沪股通' : '港股通(沪)';
  const channelBLabel = isNorth ? '深股通' : '港股通(深)';

  const totalSeries = [
    {
      name: `${isNorth ? '北向' : '南向'}成交额`,
      type: 'column' as const,
      data: totalValues,
    },
  ];

  const splitSeries = [
    { name: channelALabel, type: 'column' as const, data: channelA },
    { name: channelBLabel, type: 'column' as const, data: channelB },
  ];

  const baseChartOpts = {
    chart: { stacked: false },
    stroke: { width: [0], curve: 'smooth' as const },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
      },
    },
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: [
      {
        title: { text: '每日成交额(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}亿` },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
  };

  const totalOptions = useChart({
    ...baseChartOpts,
    chart: { type: 'bar' as const, stacked: false },
  });
  const splitOptions = useChart({
    ...baseChartOpts,
    chart: { type: 'bar' as const, stacked: true },
    stroke: { width: [0, 0] },
  });

  const activeSeries = viewMode === 'split' ? splitSeries : totalSeries;
  const activeOptions = viewMode === 'split' ? splitOptions : totalOptions;

  return (
    <Card>
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">沪深港通成交额趋势</Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              exclusive
              value={viewMode}
              size="small"
              onChange={(_, v) => {
                if (v) setViewMode(v);
              }}
            >
              <ToggleButton value="total">合计</ToggleButton>
              <ToggleButton value="split">通道拆分</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              exclusive
              value={period}
              size="small"
              onChange={(_, v) => {
                if (v) setPeriod(v);
              }}
            >
              {PERIODS.map((p) => (
                <ToggleButton key={p.value} value={p.value}>
                  {p.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
          <Tab label="北向资金" />
          <Tab label="南向资金" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="bar" series={activeSeries} options={activeOptions} sx={{ height: 320 }} />
        )}
      </CardContent>
    </Card>
  );
}
