import type { TodayTimelineResponse } from 'stock-sdk';
import type { StockChartItem, StockMoneyFlowData, StockTodayFlowData } from 'src/api/stock';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { toSdkCode } from 'src/utils/stock-code';
import { fPctChg, fWanYuan } from 'src/utils/format-number';
import { fmtTradeDate as fmtD } from 'src/utils/format-time';

import { stockDetailApi } from 'src/api/stock';

import { Chart, useChart } from 'src/components/chart';

// Augment Window with ApexCharts exec API
declare global {
  interface Window {
    ApexCharts?: { exec(chartId: string, fn: string, ...args: unknown[]): unknown };
  }
}

/** Safe wrapper for ApexCharts.exec (chart may not be mounted yet) */
function apexExec(chartId: string, fn: string, ...args: unknown[]) {
  try {
    window.ApexCharts?.exec(chartId, fn, ...args);
  } catch {
    // ignore
  }
}

function toSafeNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatPriceAxisLabel(value: unknown): string {
  const numericValue = toSafeNumber(value);
  return numericValue == null ? '--' : numericValue.toFixed(2);
}

function formatVolumeAxisLabel(value: unknown): string {
  const numericValue = toSafeNumber(value);

  if (numericValue == null) {
    return '--';
  }

  if (numericValue >= 100000000) return `${(numericValue / 100000000).toFixed(1)}亿`;
  if (numericValue >= 10000) return `${(numericValue / 10000).toFixed(1)}万`;

  return String(Math.round(numericValue));
}

/** Y 轴标签：万元单位（简短显示，用于资金流向左轴） */
function formatWanLabel(value: unknown): string {
  const numericValue = toSafeNumber(value);
  if (numericValue == null) return '--';
  if (Math.abs(numericValue) >= 10000) return `${(numericValue / 10000).toFixed(1)}亿`;
  return `${Math.round(numericValue)}万`;
}

/** Y 轴标签：涨跌幅（用于资金流向右轴） */
function formatPctLabel(value: unknown): string {
  const numericValue = toSafeNumber(value);
  return numericValue == null ? '--' : fPctChg(numericValue);
}

// ----------------------------------------------------------------------

type Period = 'D' | 'W' | 'M' | 'T';
type AdjustType = 'none' | 'qfq' | 'hfq';

type Props = {
  tsCode: string;
};

// ----------------------------------------------------------------------
// 今日资金流向子组件
// ----------------------------------------------------------------------

/** 流入占比进度条（买入 / (买入+卖出)） */
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
      {/* 进度条 */}
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
            width: `${buyRatio.toFixed(1)}%`,
            height: '100%',
            bgcolor: isPositive ? 'error.main' : 'error.light',
            borderRadius: 1,
            transition: 'width 0.4s ease',
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

/** 单行资金流数据格式化 */
function FlowCell({ value, highlight }: { value: number | null; highlight?: boolean }) {
  const v = value ?? 0;
  const color = highlight
    ? v > 0
      ? 'error.main'
      : v < 0
        ? 'success.main'
        : 'text.primary'
    : 'text.primary';
  const prefix = highlight && v > 0 ? '+' : '';
  return (
    <TableCell
      align="right"
      sx={{ color, fontWeight: highlight ? 'fontWeightBold' : 'fontWeightRegular' }}
    >
      {value == null ? '--' : `${prefix}${fWanYuan(v)}`}
    </TableCell>
  );
}

/** 今日资金流向明细表 */
function TodayFlowTable({ data }: { data: StockTodayFlowData | null }) {
  if (!data) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
        暂无数据
      </Typography>
    );
  }

  const rows: { label: string; cat: typeof data.superLarge; bold?: boolean }[] = [
    { label: '超大单', cat: data.superLarge },
    { label: '大单', cat: data.large },
    { label: '中单', cat: data.medium },
    { label: '小单', cat: data.small },
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
          {rows.map(({ label, cat }) => (
            <TableRow key={label} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="fontWeightMedium">
                  {label}
                </Typography>
              </TableCell>
              <FlowCell value={cat.netAmount} highlight />
              <FlowCell value={cat.buyAmount} />
              <FlowCell value={cat.sellAmount} />
              <TableCell>
                <FlowBar buyAmount={cat.buyAmount} sellAmount={cat.sellAmount} />
              </TableCell>
            </TableRow>
          ))}

          {/* 分隔线 */}
          <TableRow>
            <TableCell colSpan={5} sx={{ py: 0 }}>
              <Divider />
            </TableCell>
          </TableRow>

          {/* 主力合计（超大单+大单）*/}
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

export function StockDetailMarketTab({ tsCode }: Props) {
  const theme = useTheme();

  const [period, setPeriod] = useState<Period>('D');
  const [adjustType, setAdjustType] = useState<AdjustType>('qfq');

  const riseColor = theme.palette.error.main;
  const fallColor = theme.palette.success.main;
  const primaryColor = theme.palette.primary.main;
  const warningColor = theme.palette.warning.main;
  const secondaryColor = theme.palette.secondary.main;

  // ── K 线：所有已加载的 bar（从旧到新） ──────────────────────────────
  const [allItems, setAllItems] = useState<StockChartItem[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  // ── 懒加载 refs（在图表事件回调中使用 ref，避免闭包捕获旧值）────────
  const allItemsRef = useRef<StockChartItem[]>([]);
  const isFetchingMore = useRef(false);
  const hasMore = useRef(true);
  const currentZoom = useRef<{ min: number; max: number } | null>(null);
  const pendingZoom = useRef<{ min: number; max: number } | null>(null);
  const initialZoomDone = useRef(false);

  // 保持 ref 与 state 同步
  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  // ── 唯一图表 ID（period/adjustType 变化时 key 变化，图表重新挂载）────
  const candleId = `c-${tsCode}-${period}-${adjustType}`;
  const volId = `v-${tsCode}-${period}-${adjustType}`;

  // ── 分时图 ────────────────────────────────────────────────────────────
  const [timelineData, setTimelineData] = useState<TodayTimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const timelineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 今日资金流（按单笔规格分级）────────────────────────────────────────
  const [todayFlow, setTodayFlow] = useState<StockTodayFlowData | null>(null);
  const [todayFlowLoading, setTodayFlowLoading] = useState(false);
  const [todayFlowError, setTodayFlowError] = useState('');

  // ── 历史资金流 ────────────────────────────────────────────────────────
  const [moneyFlow, setMoneyFlow] = useState<StockMoneyFlowData | null>(null);
  const [moneyFlowLoading, setMoneyFlowLoading] = useState(false);
  const [moneyFlowError, setMoneyFlowError] = useState('');

  // ── 加载更早的历史数据（向左滚动触发） ──────────────────────────────
  const loadMore = useCallback(async () => {
    if (isFetchingMore.current || !hasMore.current) return;
    const items = allItemsRef.current;
    if (!items.length) return;

    isFetchingMore.current = true;
    try {
      // endDate = 最旧一条数据日期的前一天（YYYYMMDD 格式）
      // 后端返回 ISO 字符串（如 "2026-02-25T00:00:00.000Z"），直接用 dayjs() 解析；
      // 不能传 'YYYYMMDD' format，否则 customParseFormat 会严格匹配失败返回 Invalid Date
      const oldest = items[0].tradeDate;
      const endDate = dayjs(oldest).subtract(1, 'day').format('YYYYMMDD');

      const data = await stockDetailApi.chart({
        tsCode,
        period: period as 'D' | 'W' | 'M',
        adjustType,
        limit: 100,
        endDate,
      });
      if (!data.items.length) {
        hasMore.current = false;
        return;
      }

      const cnt = data.items.length;
      hasMore.current = data.hasMore ?? cnt >= 100;

      // 前插后，把当前可视区域的索引平移 cnt 位，保持视图不跳动
      const cz = currentZoom.current;
      if (cz) {
        pendingZoom.current = { min: cz.min + cnt, max: cz.max + cnt };
      }

      setAllItems((prev) => [...data.items, ...prev]);
    } catch {
      // 静默失败，不影响主流程
    } finally {
      isFetchingMore.current = false;
    }
  }, [tsCode, period, adjustType]);

  // ── 初始加载（最近 150 条） ────────────────────────────────────────────
  const fetchChart = useCallback(async () => {
    if (!tsCode || period === 'T') return; // 分时模式下不走 K 线接口
    setChartLoading(true);
    setChartError('');
    // 重置所有懒加载状态
    initialZoomDone.current = false;
    isFetchingMore.current = false;
    hasMore.current = true;
    currentZoom.current = null;
    pendingZoom.current = null;
    setAllItems([]);
    try {
      const data = await stockDetailApi.chart({
        tsCode,
        period: period as 'D' | 'W' | 'M',
        adjustType,
        limit: 150,
      });
      allItemsRef.current = data.items;
      hasMore.current = data.hasMore ?? data.items.length >= 150;
      setAllItems(data.items);
    } catch (err) {
      setChartError(err instanceof Error ? err.message : '获取K线数据失败');
    } finally {
      setChartLoading(false);
    }
  }, [tsCode, period, adjustType]);

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

  const fetchTodayFlow = useCallback(async () => {
    if (!tsCode) return;
    setTodayFlowLoading(true);
    setTodayFlowError('');
    try {
      const data = await stockDetailApi.todayFlow(tsCode);
      setTodayFlow(data);
    } catch (err) {
      setTodayFlowError(err instanceof Error ? err.message : '获取今日资金流向失败');
    } finally {
      setTodayFlowLoading(false);
    }
  }, [tsCode]);

  const fetchTimeline = useCallback(async () => {
    const sdkCode = toSdkCode(tsCode);
    if (!sdkCode) return;
    setTimelineLoading(true);
    setTimelineError('');
    try {
      const { StockSDK } = await import('stock-sdk');
      const sdk = new StockSDK();
      const data = await sdk.getTodayTimeline(sdkCode);
      setTimelineData(data);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : '获取分时数据失败');
    } finally {
      setTimelineLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    if (period !== 'T') {
      if (timelineTimerRef.current) {
        clearInterval(timelineTimerRef.current);
        timelineTimerRef.current = null;
      }
      return undefined;
    }
    setTimelineData(null);
    void fetchTimeline();
    // 交易时段内每 15s 自动刷新
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const inSession =
      (mins >= 9 * 60 + 30 && mins <= 11 * 60 + 30) || (mins >= 13 * 60 && mins <= 15 * 60);
    if (inSession) {
      timelineTimerRef.current = setInterval(() => void fetchTimeline(), 15_000);
    }
    return () => {
      if (timelineTimerRef.current) {
        clearInterval(timelineTimerRef.current);
        timelineTimerRef.current = null;
      }
    };
  }, [period, tsCode, fetchTimeline]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  useEffect(() => {
    fetchMoneyFlow();
  }, [fetchMoneyFlow]);

  useEffect(() => {
    fetchTodayFlow();
  }, [fetchTodayFlow]);

  // ── 鼠标滚轮缩放（附加到图表容器） ──────────────────────────────────
  const chartContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return undefined;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cz = currentZoom.current;
      if (!cz) return;

      const { min, max } = cz;
      const range = max - min;
      const center = (min + max) / 2;
      // 向上滚 = 放大（显示更少的 bar），向下滚 = 缩小
      const factor = e.deltaY > 0 ? 1.25 : 0.8;
      const newRange = Math.max(10, range * factor);
      const newMin = Math.max(1, Math.round(center - newRange / 2));
      const newMax = Math.min(allItemsRef.current.length, Math.round(center + newRange / 2));
      currentZoom.current = { min: newMin, max: newMax };
      apexExec(candleId, 'zoomX', newMin, newMax);
      apexExec(volId, 'zoomX', newMin, newMax);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [candleId, volId]);

  // ── 图表 Series ───────────────────────────────────────────────────────
  // Use canonical strings for series x values and categories
  const categories = allItems.map((item) => fmtD(String(item.tradeDate)));
  const maUnit = period === 'W' ? '周' : period === 'M' ? '月' : '日';

  // ── 分时图 Series ─────────────────────────────────────────────────────
  const timelineId = `tl-${tsCode}`;
  const tlVolId = `tlvol-${tsCode}`;
  const tlPoints = timelineData?.data ?? [];
  const tlPreClose = timelineData?.preClose ?? 0;
  const tlCategories = tlPoints.map((p) => p.time);
  const tlLastPrice = tlPoints.at(-1)?.price ?? tlPreClose;
  const tlNeutral = theme.palette.text.primary;
  const tlColor =
    tlPreClose > 0
      ? tlLastPrice > tlPreClose
        ? riseColor
        : tlLastPrice < tlPreClose
          ? fallColor
          : tlNeutral
      : primaryColor;
  const timelineSeries = [
    {
      name: '当前价',
      data: tlPoints.map((p, i) => ({ x: tlCategories[i], y: p.price })),
    },
    {
      name: '均价',
      data: tlPoints.map((p, i) => ({ x: tlCategories[i], y: p.avgPrice })),
    },
  ];
  const tlVolSeries = [
    {
      name: '成交量(手)',
      data: tlPoints.map((p, i) => ({ x: i + 1, y: Math.round(p.volume / 100) })),
    },
  ];

  // 混合图：K 线 + MA 均线（均在同一图表，点击图例可控制显隐）
  // 均线系列使用 color 属性直接指定颜色，而非依赖 colors 数组（混合图下 colors 数组不可靠）
  const mixedSeries = [
    {
      name: '价格',
      type: 'candlestick',
      data: allItems.map((item, i) => ({
        x: categories[i],
        y: [item.open ?? 0, item.high ?? 0, item.low ?? 0, item.close ?? 0],
      })),
    },
    {
      name: `5${maUnit}均线`,
      type: 'line',
      color: primaryColor,
      data: allItems.map((item, i) => ({ x: categories[i], y: item.ma5 ?? null })),
    },
    {
      name: `10${maUnit}均线`,
      type: 'line',
      color: warningColor,
      data: allItems.map((item, i) => ({ x: categories[i], y: item.ma10 ?? null })),
    },
    {
      name: `20${maUnit}均线`,
      type: 'line',
      color: secondaryColor,
      data: allItems.map((item, i) => ({ x: categories[i], y: item.ma20 ?? null })),
    },
    {
      name: `60${maUnit}均线`,
      type: 'line',
      color: riseColor,
      data: allItems.map((item, i) => ({ x: categories[i], y: item.ma60 ?? null })),
    },
  ];

  // 成交量图使用数值型 x（1-based 索引）而非 category 字符串，
  // 使 isXNumeric=true，确保 apexExec(volId, 'zoomX', min, max) 能走数值路径正常生效。
  const volumeSeries = [
    {
      name: '成交量(手)',
      data: allItems.map((item, i) => ({ x: i + 1, y: item.vol ?? 0 })),
    },
  ];

  // ── 图表配置 ─────────────────────────────────────────────────────────
  // 注：事件处理函数仅读取 ref，无闭包旧值问题
  const candleChartOptions = useChart({
    chart: {
      id: candleId,
      // mixed 图（candlestick + line）以 candlestick 作为 base type
      // 这是 ApexCharts 官方推荐的混合图写法；以 line 为 base 时会触发内部 null-prototype 对象问题
      toolbar: {
        // 隐藏工具栏；autoSelected:'pan' 使鼠标拖动默认为平移而非框选缩放
        show: false,
        autoSelected: 'pan' as never,
      },
      zoom: {
        enabled: true,
        type: 'x',
        // Y 轴跟随可视区域内的最低/最高价自动缩放，不强制以 0 为基准
        autoScaleYaxis: true,
      },
      events: {
        mounted: () => {
          // 首次渲染完成后，将视口定位到最近 30 个交易日
          const n = allItemsRef.current.length;
          if (!initialZoomDone.current && n > 30) {
            initialZoomDone.current = true;
            apexExec(candleId, 'zoomX', n - 29, n);
            apexExec(volId, 'zoomX', n - 29, n);
          }
        },
        zoomed: (_ctx: unknown, { xaxis }: { xaxis: { min: number; max: number } }) => {
          currentZoom.current = { min: xaxis.min, max: xaxis.max };
          // 成交量图手动同步（不用 chart.group，避免跨图表订阅导致的 StrictMode 清理队异常）
          apexExec(volId, 'zoomX', xaxis.min, xaxis.max);
          // 距左边缘 ≤ 50 条时触发懒加载
          if (typeof xaxis.min === 'number' && xaxis.min <= 50) {
            loadMore();
          }
        },
        scrolled: (_ctx: unknown, { xaxis }: { xaxis: { min: number; max: number } }) => {
          currentZoom.current = { min: xaxis.min, max: xaxis.max };
          apexExec(volId, 'zoomX', xaxis.min, xaxis.max);
          if (typeof xaxis.min === 'number' && xaxis.min <= 50) {
            loadMore();
          }
        },
        updated: () => {
          // 前插数据后恢复视口位置（pendingZoom 已将索引平移）
          if (pendingZoom.current) {
            const { min, max } = pendingZoom.current;
            pendingZoom.current = null;
            apexExec(candleId, 'zoomX', min, max);
            apexExec(volId, 'zoomX', min, max);
            return;
          }
          // 数据首次到达时（mounted 可能比数据先触发）补做初始缩放
          const n = allItemsRef.current.length;
          if (!initialZoomDone.current && n > 30) {
            initialZoomDone.current = true;
            apexExec(candleId, 'zoomX', n - 29, n);
            apexExec(volId, 'zoomX', n - 29, n);
          }
        },
      },
    },
    plotOptions: {
      candlestick: {
        colors: { upward: riseColor, downward: fallColor },
        wick: { useFillColor: true },
      },
    },
    // Category x 轴：只渲染实际交易日，自动跳过非交易日（周末/节假日）
    xaxis: {
      type: 'category',
      categories,
      labels: {
        rotate: -45,
        rotateAlways: false,
        formatter: (val: string) => {
          if (!val) return val;
          // Normalize to YYYYMMDD digits
          const dateStr = fmtD(String(val));
          const digits = dateStr.replace(/[^0-9]/g, '');
          if (digits.length === 8) return `${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
          // Fallback: if already YYYY-MM-DD, take MM-DD
          if (dateStr.length >= 10) return dateStr.slice(5, 10);
          return dateStr;
        },
        style: { fontSize: '12px' },
      },
      tickAmount: 10,
    },
    yaxis: {
      tooltip: { enabled: true },
      tickAmount: 6,
      labels: { formatter: formatPriceAxisLabel },
    },
    tooltip: {
      shared: true,
      custom: ({
        dataPointIndex,
        w,
      }: {
        seriesIndex: number;
        dataPointIndex: number;
        w: { globals: Record<string, unknown[][]> };
      }) => {
        const g = w.globals as Record<string, unknown>;
        // 直接从 allItemsRef 取 tradeDate，避免 w.globals.categoryLabels 在首次挂载时
        // 尚未填充导致回退到 w.globals.labels（candlestick 混合图下可能存储内部数值）
        const item = allItemsRef.current[dataPointIndex];
        const date = item?.tradeDate ?? '';
        const o = (g.seriesCandleO as number[][])?.[0]?.[dataPointIndex];
        const h = (g.seriesCandleH as number[][])?.[0]?.[dataPointIndex];
        const l = (g.seriesCandleL as number[][])?.[0]?.[dataPointIndex];
        const c = (g.seriesCandleC as number[][])?.[0]?.[dataPointIndex];
        const pctChg = item?.pctChg ?? null;

        const up = (c ?? 0) >= (o ?? 0);
        const clr = up ? riseColor : fallColor;
        const pctChgColor =
          pctChg == null || pctChg === 0 ? theme.palette.text.primary : pctChg > 0 ? riseColor : fallColor;
        const dateLabel = fmtD(String(date));
        const lines: string[] = [
          `<div style="font-weight:600;margin-bottom:4px">${dateLabel}</div>`,
          `开: ${o?.toFixed(2) ?? '--'}`,
          `高: ${h?.toFixed(2) ?? '--'}`,
          `低: ${l?.toFixed(2) ?? '--'}`,
          `收: <span style="color:${clr};font-weight:600">${c?.toFixed(2) ?? '--'}</span>`,
          `涨跌幅: <span style="color:${pctChgColor};font-weight:600">${fPctChg(pctChg)}</span>`,
        ];

        const maNames = [`5${maUnit}均线`, `10${maUnit}均线`, `20${maUnit}均线`, `60${maUnit}均线`];
        const maColors = [primaryColor, warningColor, secondaryColor, riseColor];
        const series = g.series as number[][];
        for (let i = 1; i <= 4; i += 1) {
          const val = series?.[i]?.[dataPointIndex];
          if (val != null && !Number.isNaN(val)) {
            lines.push(
              `<span style="color:${maColors[i - 1]}">${maNames[i - 1]}: ${val.toFixed(2)}</span>`
            );
          }
        }

        return `<div style="padding:6px 10px;font-size:12px;line-height:1.6">${lines.join('<br/>')}</div>`;
      },
    },
    stroke: {
      width: [0, 1.5, 1.5, 1.5, 1.5], // [candlestick, ma5, ma10, ma20, ma60]
      curve: 'straight',
    },
    colors: [
      'transparent', // K 线颜色由 plotOptions 控制
      primaryColor, // 5日均线
      warningColor, // 10日均线
      secondaryColor, // 20日均线
      riseColor, // 60日均线
    ],
    legend: {
      show: true,
      onItemClick: { toggleDataSeries: true }, // 点击图例切换显隐
    },
  });

  const volumeChartOptions = useChart({
    chart: {
      id: volId,
      // 不使用 chart.group，避免跨图表订阅导致的 StrictMode 中 el.node 异常
      // 缩放同步通过主图表的事件回调手动触发 apexExec
      type: 'bar',
      toolbar: { show: false },
      // zoom.enabled 必须为 true，否则 ApexCharts 会在 zoomX() 内部拦截 exec 调用，
      // 导致主图 zoomed/scrolled/updated 事件中通过 apexExec 对成交量图发出的同步缩放全部静默失效。
      zoom: { enabled: true },
      events: {
        // 成交量图挂载后，主动同步当前已缩放到的 K 线范围
        // （K 线 mounted 早于成交量 mounted，彼时成交量图尚未注册，exec 会静默失败）
        mounted: () => {
          const cz = currentZoom.current;
          if (cz && cz.max > 0) {
            setTimeout(() => apexExec(volId, 'zoomX', cz.min, cz.max), 0);
          }
        },
      },
    },
    plotOptions: { bar: { columnWidth: '80%', borderRadius: 0 } },
    xaxis: {
      // 必须用 numeric 类型，使 isXNumeric=true。
      // category 类型会使 zoomX 走字符串查找路径，导致数值索引同步失效。
      type: 'numeric',
      labels: {
        rotate: -45,
        rotateAlways: false,
        formatter: (val: string | number) => {
          const idx = Math.round(Number(val)) - 1;
          const cat = categories[idx];
          if (!cat) return '';
          const dateStr = fmtD(String(cat));
          const digits = dateStr.replace(/[^0-9]/g, '');
          if (digits.length === 8) return `${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
          if (dateStr.length >= 10) return dateStr.slice(5, 10);
          return dateStr;
        },
        style: { fontSize: '12px' },
      },
      tickAmount: 10,
    },
    yaxis: {
      min: 0,
      tickAmount: 3,
      labels: {
        formatter: formatVolumeAxisLabel,
      },
    },
    tooltip: {
      x: {
        formatter: (val: unknown) => {
          const idx = Math.round(Number(val)) - 1;
          const cat = categories[idx];
          return cat ? fmtD(String(cat)) : '';
        },
      },
      y: {
        formatter: (val: number) => formatVolumeAxisLabel(val),
        title: { formatter: () => '成交量: ' },
      },
    },
    legend: { show: false },
  });

  // ── 资金流图表 ────────────────────────────────────────────────────────
  const mfItems = moneyFlow?.items ?? [];

  // 用 {x, y, fillColor} 对象格式传入每根柱子的颜色（避免 plotOptions.bar.colors.ranges 的 null-prototype bug）
  // 后端 netMfAmount 已经是万元，直接使用
  const mfSeriesData = mfItems.map((item) => {
    const val = item.netMfAmount ?? 0;
    return {
      x: fmtD(item.tradeDate),
      y: val,
      fillColor: val >= 0 ? riseColor : fallColor,
      strokeColor: 'transparent',
    };
  });

  // 涨跌幅线系列，x 轴与柱子保持一致（字符串日期，category 轴）
  const mfLineSeries = mfItems.map((item) => ({
    x: fmtD(item.tradeDate),
    y: item.pctChg ?? 0,
  }));

  // 合并图：净流入柱（左轴）+ 涨跌幅线（右轴）
  const mfMixedSeries = [
    { name: '净流入', type: 'bar', data: mfSeriesData },
    { name: '涨跌幅', type: 'line', color: primaryColor, data: mfLineSeries },
  ];

  const moneyFlowChartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { columnWidth: '70%', borderRadius: 0 } },
    // stroke.width 数组分别对应 [柱(bar), 线(line)]；柱不需要描边所以为 0
    stroke: { width: [0, 2], curve: 'smooth' },
    xaxis: {
      type: 'category',
      tickAmount: 10,
      labels: {
        rotate: -45,
        // 只显示 MM-DD，避免 x 轴空间不足时日期被截断
        formatter: (val: string) => {
          if (!val) return val;
          const dateStr = val.includes('T') ? val.slice(0, 10) : val;
          // YYYY-MM-DD → MM-DD
          return dateStr.length >= 10 ? dateStr.slice(5) : dateStr;
        },
      },
    },
    // tooltip x 展示完整 YYYY-MM-DD；shared + intersect:false 解决混合图冲突
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (val: unknown) => fmtD(String(val)) },
      y: {
        formatter: (val: number, opts?: { seriesIndex?: number }) => {
          const n = toSafeNumber(val);
          if (n == null) return '--';
          return opts?.seriesIndex === 1 ? fPctChg(n) : `${Math.round(n)}万元`;
        },
        title: {
          formatter: (seriesName: string) => `${seriesName}: `,
        },
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
        labels: { formatter: formatPctLabel },
        title: { text: '涨跌幅' },
      },
    ],
    legend: { show: true },
  });

  // ── 分时图表配置 ──────────────────────────────────────────────────────
  const timelineChartOptions = useChart({
    chart: {
      id: timelineId,
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    colors: [tlColor, warningColor],
    stroke: { width: [1.5, 1], curve: 'straight', dashArray: [0, 4] },
    xaxis: {
      type: 'category',
      categories: tlCategories,
      tickAmount: 8,
      labels: { style: { fontSize: '12px' }, rotate: 0 },
    },
    yaxis: {
      tickAmount: 5,
      decimalsInFloat: 2,
      labels: { formatter: formatPriceAxisLabel },
    },
    annotations:
      tlPreClose > 0
        ? {
            yaxis: [
              {
                y: tlPreClose,
                borderColor: theme.palette.text.disabled,
                strokeDashArray: 4,
                label: {
                  text: `昨收 ${tlPreClose.toFixed(2)}`,
                  style: {
                    fontSize: '12px',
                    background: 'transparent',
                    color: theme.palette.text.secondary,
                  },
                },
              },
            ],
          }
        : {},
    tooltip: {
      shared: true,
      x: { formatter: (val: unknown) => String(val) },
      y: {
        formatter: (val: number) => val.toFixed(2),
        title: { formatter: (s: string) => `${s}: ` },
      },
    },
    legend: { show: true },
  });

  const tlVolChartOptions = useChart({
    chart: {
      id: tlVolId,
      type: 'bar',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    colors: [primaryColor],
    plotOptions: { bar: { columnWidth: '90%', borderRadius: 0 } },
    xaxis: {
      type: 'numeric',
      tickAmount: 8,
      labels: {
        style: { fontSize: '12px' },
        rotate: 0,
        formatter: (val: string | number) => {
          const idx = Math.round(Number(val)) - 1;
          return tlCategories[idx] ?? '';
        },
      },
    },
    yaxis: { min: 0, tickAmount: 3, labels: { formatter: formatVolumeAxisLabel } },
    tooltip: {
      x: { formatter: (val: unknown) => tlCategories[Math.round(Number(val)) - 1] ?? '' },
      y: {
        formatter: (val: number) => formatVolumeAxisLabel(val),
        title: { formatter: () => '成交量(手): ' },
      },
    },
    legend: { show: false },
  });

  const summary = moneyFlow?.summary;
  const net5d = summary?.netMfAmount5d ?? 0;
  const net20d = summary?.netMfAmount20d ?? 0;
  const net60d = summary?.netMfAmount60d ?? 0;

  return (
    <Stack spacing={3}>
      {/* ── K 线图区 ───────────────────────────────────────────── */}
      <Card>
        <CardContent>
          {/* 控制栏 */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <ToggleButtonGroup
              value={period}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) setPeriod(v as Period);
              }}
            >
              <ToggleButton value="T" sx={{ fontSize: 12 }}>
                分时
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
              sx={{ minWidth: 110, display: period === 'T' ? 'none' : undefined }}
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

          {period === 'T' ? (
            // ── 分时图 ───────────────────────────────────────────────────
            timelineError ? (
              <Alert severity="error">{timelineError}</Alert>
            ) : timelineLoading || tlPoints.length === 0 ? (
              <Skeleton variant="rectangular" height={540} sx={{ borderRadius: 1.5 }} />
            ) : (
              <Box>
                <Chart
                  key={`tl-${tsCode}`}
                  type="line"
                  series={timelineSeries}
                  options={timelineChartOptions}
                  sx={{ height: 360 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                  成交量（手）
                </Typography>
                <Chart
                  key={`tlvol-${tsCode}`}
                  type="bar"
                  series={tlVolSeries}
                  options={tlVolChartOptions}
                  sx={{ height: 140 }}
                />
              </Box>
            )
          ) : chartLoading || allItems.length === 0 ? (
            // 未加载完成或无数据时统一显示骨架屏，避免以空数据创建 ApexCharts 实例后
            // 在数据到达时触发 destroy → recreate 循环，导致 Apex 内部
            // null-prototype 残留状态引发 hasOwnProperty 崩溃
            <Skeleton variant="rectangular" height={540} sx={{ borderRadius: 1.5 }} />
          ) : (
            // chartContainerRef 用于绑定滚轮缩放事件
            <Box ref={chartContainerRef}>
              {/* K 线 + 均线混合图（点击图例可切换显隐） */}
              <Chart
                key={`candle-${tsCode}-${period}-${adjustType}`}
                type={'candlestick' as never}
                series={mixedSeries as never}
                options={candleChartOptions}
                sx={{ height: 360 }}
              />

              {/* 成交量（与主图联动缩放平移） */}
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                成交量（手）
              </Typography>
              <Chart
                key={`vol-${tsCode}-${period}-${adjustType}`}
                type="bar"
                series={volumeSeries}
                options={volumeChartOptions}
                sx={{ height: 140 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── 今日资金流向 ──────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
            <Typography variant="h6">今日资金流向</Typography>
            {todayFlow?.tradeDate && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {fmtD(String(todayFlow.tradeDate))}
              </Typography>
            )}
          </Box>

          {todayFlowError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {todayFlowError}
            </Alert>
          )}

          {todayFlowLoading ? (
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1.5 }} />
          ) : (
            <TodayFlowTable data={todayFlow} />
          )}
        </CardContent>
      </Card>

      {/* ── 历史资金流向 ────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            资金流向
          </Typography>

          {moneyFlowLoading ? (
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1.5, mb: 2 }} />
          ) : (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <SummaryCard
                label="5日净流入"
                value={fWanYuan(net5d)}
                positive={net5d > 0 ? true : net5d < 0 ? false : null}
              />
              <SummaryCard
                label="20日净流入"
                value={fWanYuan(net20d)}
                positive={net20d > 0 ? true : net20d < 0 ? false : null}
              />
              <SummaryCard
                label="60日净流入"
                value={fWanYuan(net60d)}
                positive={net60d > 0 ? true : net60d < 0 ? false : null}
              />
            </Box>
          )}

          {moneyFlowError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {moneyFlowError}
            </Alert>
          )}

          {moneyFlowLoading || mfItems.length === 0 ? (
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1.5 }} />
          ) : (
            <Chart
              key={`mf-combined-${tsCode}`}
              type={'bar' as never}
              series={mfMixedSeries as never}
              options={moneyFlowChartOptions}
              sx={{ height: 300 }}
            />
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
