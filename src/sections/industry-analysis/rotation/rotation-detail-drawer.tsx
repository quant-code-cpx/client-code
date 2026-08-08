import { memo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';

import { periodToDays, fmtTradeDate as fmtDate } from 'src/utils/format-time';

import { fetchRotationDetail, type RotationDetailResult } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function yuanToYi(value: number | null | undefined): number | null {
  return value == null ? null : +(value / 1e8).toFixed(2);
}

function wanToYi(value: number | null | undefined): number | null {
  return value == null ? null : +(value / 10000).toFixed(2);
}

function formatYi(value: number | null): string {
  return value == null ? '--' : `${value} 亿`;
}

function formatNumber(value: number | null): string {
  return value == null ? '--' : value.toFixed(2);
}

function percentileLabel(
  p: number | null
): { label: string; color: 'success' | 'warning' | 'error' } | null {
  if (p == null) return null;
  if (p <= 30) return { label: '低估', color: 'success' };
  if (p <= 70) return { label: '中性', color: 'warning' };
  return { label: '高估', color: 'error' };
}

// ----------------------------------------------------------------------

type DrawerTab = 'return' | 'flow' | 'stocks' | 'kline';

type Props = {
  open: boolean;
  onClose: () => void;
  sectorName: string | null;
  tsCode?: string;
  period?: string;
};

// Sub-component: return trend mini chart
const ReturnTrendChart = memo(function ReturnTrendChart({
  data,
}: {
  data: RotationDetailResult['returnTrend'];
}) {
  const categories = data.map((d) => fmtDate(d.tradeDate));
  const sectorSeries = data.map((d) => d.cumReturn);
  const benchmarkSeries = data.map((d) => d.benchmarkReturn);

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: [2, 2], dashArray: [0, 4] },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: { labels: { formatter: (v: number) => `${v.toFixed(2)}%` } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    legend: { position: 'top', fontSize: '12px' },
  });

  const series = [
    { name: '行业', data: sectorSeries },
    { name: '沪深300', data: benchmarkSeries },
  ];

  if (data.length === 0) {
    return (
      <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled">暂无数据</Typography>
      </Box>
    );
  }

  return <Chart type="line" series={series} options={chartOptions} sx={{ height: 240 }} />;
});

// Sub-component: flow trend chart
const FlowTrendChart = memo(function FlowTrendChart({
  data,
}: {
  data: RotationDetailResult['flowTrend'];
}) {
  const theme = useTheme();
  const categories = data.map((d) => fmtDate(d.tradeDate));
  const dailyNet = data.map((d) => yuanToYi(d.netInflow) ?? 0);
  const cumulative = data.map((d) => yuanToYi(d.cumulativeInflow) ?? 0);

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false, toolbar: { show: false } },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -1e9, to: 0, color: theme.palette.success.main },
            { from: 0, to: 1e9, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: [
      {
        title: { text: '每日净流入(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(1)}亿` },
      },
      {
        opposite: true,
        title: { text: '累计净流入(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(1)}亿` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}亿` },
    },
    legend: { position: 'top', fontSize: '12px' },
  });

  const series = [
    { name: '每日净流入', type: 'column', data: dailyNet },
    { name: '累计净流入', type: 'line', data: cumulative },
  ];

  if (data.length === 0) {
    return (
      <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled">暂无数据</Typography>
      </Box>
    );
  }

  return <Chart type="line" series={series} options={chartOptions} sx={{ height: 240 }} />;
});

// ----------------------------------------------------------------------

// Sub-component: sector price trend from the existing detail endpoint.
const SectorKlineChart = memo(function SectorKlineChart({
  sectorName: name,
  data,
}: {
  sectorName: string;
  data: RotationDetailResult['returnTrend'];
}) {
  const theme = useTheme();
  const categories = data.map((d) => fmtDate(d.tradeDate));
  const closeSeries = data.map((d) => d.close);
  const pctSeries = data.map((d) => d.pctChange);

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: [2, 0], curve: 'smooth' },
    colors: [theme.palette.primary.main, theme.palette.error.main],
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -100, to: 0, color: theme.palette.success.main },
            { from: 0, to: 100, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: [
      {
        title: { text: '收盘点位' },
        labels: { formatter: (v: number) => v.toFixed(2) },
      },
      {
        opposite: true,
        title: { text: '日涨跌幅' },
        labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        { formatter: (v: number) => v.toFixed(2) },
        { formatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%` },
      ],
    },
    legend: { position: 'top', fontSize: '12px' },
  });

  const series = [
    { name: `${name}收盘`, type: 'line', data: closeSeries },
    { name: '日涨跌幅', type: 'column', data: pctSeries },
  ];

  if (data.length === 0) {
    return (
      <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled">暂无板块行情数据</Typography>
      </Box>
    );
  }

  return <Chart type="line" series={series} options={chartOptions} sx={{ height: 260 }} />;
});

// ----------------------------------------------------------------------

export function RotationDetailDrawer({ open, onClose, sectorName, tsCode, period }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DrawerTab>('return');
  const [detail, setDetail] = useState<RotationDetailResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !sectorName) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');
    setDetail(null);

    fetchRotationDetail({
      tsCode: tsCode ?? undefined,
      industry: sectorName ?? undefined,
        days: period ? periodToDays(period) : undefined,
    })
      .then((res) => {
        if (!cancelled) setDetail(res ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载行业详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sectorName, tsCode, period]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, val: DrawerTab) => {
    setActiveTab(val);
  }, []);

  const handleStockKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, stockCode: string) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      router.push(`/stock/detail?code=${encodeURIComponent(stockCode)}`);
    },
    [router]
  );

  const pctSign = detail && detail.pctChange > 0 ? '+' : '';
  const pctColor = detail
    ? detail.pctChange > 0
      ? theme.palette.error.main
      : detail.pctChange < 0
        ? theme.palette.success.main
        : theme.palette.text.secondary
    : undefined;

  const peInfo = detail ? percentileLabel(detail.pePercentile) : null;
  const pbInfo = detail ? percentileLabel(detail.pbPercentile) : null;
  const latestReturnPoint = detail?.returnTrend.at(-1) ?? null;
  const periodReturn = latestReturnPoint?.cumReturn ?? null;

  const metrics = detail
    ? [
        { label: '涨跌幅', value: `${pctSign}${detail.pctChange.toFixed(2)}%`, color: pctColor },
        { label: '最新点位', value: formatNumber(latestReturnPoint?.close ?? null) },
        {
          label: '净流入',
          value: formatYi(yuanToYi(detail.netAmount)),
          color: detail.netAmount >= 0 ? theme.palette.error.main : theme.palette.success.main,
        },
        {
          label: '区间收益',
          value:
            periodReturn == null
              ? '--'
              : `${periodReturn > 0 ? '+' : ''}${periodReturn.toFixed(2)}%`,
          color:
            periodReturn == null
              ? undefined
              : periodReturn > 0
                ? theme.palette.error.main
                : periodReturn < 0
                  ? theme.palette.success.main
                  : theme.palette.text.secondary,
        },
        {
          label: 'PE分位',
          value: detail.pePercentile == null ? '--' : `${detail.pePercentile.toFixed(1)}%`,
          chip: peInfo,
        },
        {
          label: 'PB分位',
          value: detail.pbPercentile == null ? '--' : `${detail.pbPercentile.toFixed(1)}%`,
          chip: pbInfo,
        },
      ]
    : [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 640 } } }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5">{sectorName ?? '—'}</Typography>
          {detail && (
            <Typography variant="h6" sx={{ color: pctColor, fontWeight: 600 }}>
              {pctSign}
              {detail.pctChange.toFixed(2)}%
            </Typography>
          )}
        </Box>
        <Tooltip title="关闭行业详情">
          <IconButton onClick={onClose} size="small" aria-label="关闭行业详情">
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Tooltip>
      </Box>

      <Scrollbar sx={{ flex: 1 }}>
        <Box sx={{ p: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Metrics grid */}
          {loading ? (
            <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
          ) : detail ? (
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              {metrics.map(({ label, value, color, chip }) => (
                <Grid key={label} size={{ xs: 6, sm: 4 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'background.neutral',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      {label}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color, fontWeight: 600 }}>
                      {value}
                    </Typography>
                    {chip && (
                      <Chip
                        label={chip.label}
                        color={chip.color}
                        size="small"
                        sx={{ mt: 0.5, height: 18, fontSize: 12 }}
                      />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : null}

          <Divider sx={{ mb: 2 }} />

          {/* Tabs */}
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2, minHeight: 40 }}>
            <Tab label="收益走势" value="return" sx={{ minHeight: 40, py: 0 }} />
            <Tab label="资金流向" value="flow" sx={{ minHeight: 40, py: 0 }} />
            <Tab label="成分股" value="stocks" sx={{ minHeight: 40, py: 0 }} />
            <Tab label="板块行情" value="kline" sx={{ minHeight: 40, py: 0 }} />
          </Tabs>

          {loading ? (
            <Skeleton variant="rectangular" height={240} />
          ) : (
            <>
              {activeTab === 'return' && detail && <ReturnTrendChart data={detail.returnTrend} />}
              {activeTab === 'flow' && detail && <FlowTrendChart data={detail.flowTrend} />}
              {activeTab === 'kline' && detail && (
                <SectorKlineChart
                  sectorName={detail.sectorName || sectorName || '行业'}
                  data={detail.returnTrend}
                />
              )}
              {activeTab === 'stocks' && detail && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>名称</TableCell>
                        <TableCell align="right">涨跌幅</TableCell>
                        <TableCell align="right">PE_TTM</TableCell>
                        <TableCell align="right">PB</TableCell>
                        <TableCell align="right">总市值</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.topStocks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 3 }}>
                            <Typography variant="body2" color="text.disabled" align="center">
                              暂无成分股数据，请检查行业成分同步或行业字典映射
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {detail.topStocks.map((s) => {
                        const pctColor2 =
                          (s.pctChg ?? 0) > 0
                            ? theme.palette.error.main
                            : (s.pctChg ?? 0) < 0
                              ? theme.palette.success.main
                              : theme.palette.text.secondary;
                        return (
                          <TableRow
                            key={s.tsCode}
                            hover
                            tabIndex={0}
                            aria-label={`查看 ${s.name} 股票详情`}
                            sx={{
                              height: 40,
                              cursor: 'pointer',
                              '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: -2,
                              },
                            }}
                            onKeyDown={(event) => handleStockKeyDown(event, s.tsCode)}
                            onClick={() =>
                              router.push(`/stock/detail?code=${encodeURIComponent(s.tsCode)}`)
                            }
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {s.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {s.tsCode}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ color: pctColor2 }}>
                                {(s.pctChg ?? 0) > 0 ? '+' : ''}
                                {s.pctChg == null ? '--' : `${s.pctChg.toFixed(2)}%`}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{formatNumber(s.peTtm)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{formatNumber(s.pb)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatYi(wanToYi(s.totalMv))}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Box>
      </Scrollbar>
    </Drawer>
  );
}
