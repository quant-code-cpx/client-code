import type { StockSDK as StockSdkInstance } from 'stock-sdk';
import type { Crosshair, DataLoader, Chart as KLineChartInstance } from 'klinecharts';

import { useRef, useMemo, useState, useEffect } from 'react';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { toSdkCode } from 'src/utils/stock-code';

import { stockDetailApi } from 'src/api/stock';

import { MarketKlinePanel } from './market-kline-panel';
import { createMarketKlineStyles } from './market-kline-styles';
import {
  mergeMarketBars,
  isAShareTradingSession,
  normalizeTodayTimeline,
  normalizeStockChartItems,
  previousShanghaiTradeDate,
} from './market-kline-data';
import {
  getMarketKlineWarning,
  MARKET_KLINE_PERIOD_MAP,
  fitLatestMarketViewport,
  MARKET_KLINE_MIN_BAR_SPACE,
  MARKET_KLINE_MAX_BAR_SPACE,
  MARKET_KLINE_INITIAL_LIMIT,
  MARKET_KLINE_FORWARD_LIMIT,
  getMarketKlineErrorMessage,
  MARKET_TIMELINE_REFRESH_MS,
  MARKET_TIMELINE_AVG_INDICATOR,
} from './market-kline-runtime';

import type {
  MarketPeriod,
  MarketKLineData,
  MarketAdjustType,
  MarketKlinePeriod,
  MarketChartStatus,
  MarketSubIndicator,
  MarketMainIndicator,
} from './market-kline.types';

type Props = {
  tsCode: string;
  period: MarketPeriod;
  adjustType: MarketAdjustType;
  mainIndicator: MarketMainIndicator;
  subIndicator: MarketSubIndicator;
  resetToken: number;
  retryToken: number;
  onRetry: () => void;
};

export function MarketKlineChart({
  tsCode,
  period,
  adjustType,
  mainIndicator,
  subIndicator,
  resetToken,
  retryToken,
  onRetry,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChartInstance | null>(null);
  const mainIndicatorIdRef = useRef<string | null>(null);
  const subIndicatorIdRef = useRef<string | null>(null);
  const loadersRef = useRef<{ historical: DataLoader; timeline: DataLoader } | null>(null);
  const loadGenerationRef = useRef(0);
  const appliedConfigRef = useRef<{
    tsCode: string;
    period: MarketPeriod;
    adjustType: MarketAdjustType;
  } | null>(null);
  const [chartVersion, setChartVersion] = useState(0);
  const [status, setStatus] = useState<MarketChartStatus>('loading');
  const [message, setMessage] = useState('');
  const [bars, setBars] = useState<MarketKLineData[]>([]);
  const barsRef = useRef<MarketKLineData[]>([]);
  const [legendBar, setLegendBar] = useState<MarketKLineData | null>(null);
  const styles = useMemo(() => createMarketKlineStyles(theme, period), [period, theme]);
  const stylesRef = useRef(styles);
  const configRef = useRef({ tsCode, period, adjustType });
  stylesRef.current = styles;
  configRef.current = { tsCode, period, adjustType };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    let chart: KLineChartInstance | null = null;
    let timelineTimer: ReturnType<typeof setInterval> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let animationFrame = 0;
    let viewportAnimationFrame = 0;
    let pendingLegendBar: MarketKLineData | null = null;
    let timelineBars: MarketKLineData[] = [];

    const scheduleViewportFit = (nextPeriod: MarketPeriod, nextBars: MarketKLineData[]) => {
      if (viewportAnimationFrame) window.cancelAnimationFrame(viewportAnimationFrame);
      viewportAnimationFrame = window.requestAnimationFrame(() => {
        viewportAnimationFrame = 0;
        if (!chart || cancelled) return;
    fitLatestMarketViewport(chart, nextPeriod, nextBars, host.clientWidth);
      });
    };

    setStatus('loading');
    setMessage('');
    setBars([]);
    barsRef.current = [];
    setLegendBar(null);

    const applyBars = (
      incoming: MarketKLineData[],
      loadType: 'init' | 'forward' | 'update',
      warning = ''
    ) => {
      if (cancelled) return;

      setBars((current) => {
        const next = loadType === 'init' ? incoming : mergeMarketBars(current, incoming);
        barsRef.current = next;
        return next;
      });
      setLegendBar((selected) => selected ?? incoming.at(-1) ?? null);

      if (loadType === 'init' && incoming.length === 0) {
        setMessage(warning);
        setStatus('empty');
      } else if (warning) {
        setMessage(warning);
        setStatus('partial');
      } else if (loadType === 'init') {
        setStatus(incoming.length > 0 ? 'ready' : 'empty');
      }

      if (loadType === 'init' || configRef.current.period === 'T') {
        scheduleViewportFit(
          configRef.current.period,
          (chart?.getDataList() ?? incoming) as MarketKLineData[]
        );
      }
    };

    const createHistoricalLoader = (): DataLoader => ({
      getBars: async ({ type, timestamp, callback }) => {
        const generation = loadGenerationRef.current;
        const config = configRef.current;
        if (type === 'backward' || type === 'update') {
          callback([], { backward: false, forward: false });
          return;
        }

          const limit = type === 'init' ? MARKET_KLINE_INITIAL_LIMIT : MARKET_KLINE_FORWARD_LIMIT;
        try {
          const data = await stockDetailApi.chart({
            tsCode: config.tsCode,
            period: config.period as MarketKlinePeriod,
            adjustType: config.adjustType,
            limit,
            ...(type === 'forward' && timestamp != null
              ? { endDate: previousShanghaiTradeDate(timestamp) }
              : {}),
          });
          const normalized = normalizeStockChartItems(data.items);
          const warning = getMarketKlineWarning(normalized.rejectedCount, normalized.duplicateCount);

          if (generation !== loadGenerationRef.current) return;

          callback(normalized.bars, {
            backward: false,
            forward: data.hasMore ?? data.items.length >= limit,
          });
          applyBars(normalized.bars, type, warning);
        } catch (error) {
          if (generation !== loadGenerationRef.current) return;
          callback([], { backward: false, forward: false });
          if (cancelled) return;
          setMessage(getMarketKlineErrorMessage(error, '获取 K 线数据失败'));
          setStatus(type === 'init' ? 'error' : 'partial');
        }
      },
    });

    const createTimelineLoader = (): DataLoader => {
      let sdkPromise: Promise<StockSdkInstance> | null = null;

      const getSdk = () => {
        if (!sdkPromise) {
          sdkPromise = import('stock-sdk').then(({ StockSDK }) => new StockSDK());
        }
        return sdkPromise;
      };

      const requestTimeline = async () => {
        const sdkCode = toSdkCode(configRef.current.tsCode);
        if (!sdkCode) throw new Error('无法识别股票代码');
        const sdk = await getSdk();
        return sdk.getTodayTimeline(sdkCode);
      };

      return {
        getBars: async ({ type, callback }) => {
          const generation = loadGenerationRef.current;
          if (type !== 'init') {
            callback([], { backward: false, forward: false });
            return;
          }

          try {
            const response = await requestTimeline();
            const normalized = normalizeTodayTimeline(response);
            timelineBars = normalized.bars;
          const warning = getMarketKlineWarning(normalized.rejectedCount, normalized.duplicateCount);
            if (generation !== loadGenerationRef.current) return;
            callback(normalized.bars, { backward: false, forward: false });
            applyBars(normalized.bars, 'init', warning);
          } catch (error) {
            if (generation !== loadGenerationRef.current) return;
            callback([], { backward: false, forward: false });
            if (cancelled) return;
          setMessage(getMarketKlineErrorMessage(error, '获取分时数据失败'));
            setStatus('error');
          }
        },
        subscribeBar: ({ callback }) => {
          const generation = loadGenerationRef.current;
          const refresh = async () => {
            if (
              cancelled ||
              generation !== loadGenerationRef.current ||
              !isAShareTradingSession()
            ) {
              return;
            }
            try {
              const response = await requestTimeline();
              const normalized = normalizeTodayTimeline(response);
              const latest = normalized.bars.at(-1);
              if (!latest || generation !== loadGenerationRef.current) return;
              timelineBars = normalized.bars;
              callback(latest);
              applyBars(timelineBars, 'update');
            } catch (error) {
              if (cancelled) return;
          setMessage(getMarketKlineErrorMessage(error, '分时刷新失败，当前展示最近一次成功数据'));
              setStatus('stale');
            }
          };

        timelineTimer = setInterval(() => void refresh(), MARKET_TIMELINE_REFRESH_MS);
        },
        unsubscribeBar: () => {
          if (timelineTimer) clearInterval(timelineTimer);
          timelineTimer = null;
        },
      };
    };

    const mount = async () => {
      const klinecharts = await import('klinecharts');
      if (cancelled) return;

      if (!klinecharts.getSupportedIndicators().includes(MARKET_TIMELINE_AVG_INDICATOR)) {
        klinecharts.registerIndicator<{ avgPrice: number | null }>({
          name: MARKET_TIMELINE_AVG_INDICATOR,
          shortName: '均价',
          series: 'price',
          figures: [{ key: 'avgPrice', title: '均价: ', type: 'line' }],
          calc: (dataList) =>
            dataList.map((item) => ({
              avgPrice: typeof item.avgPrice === 'number' ? item.avgPrice : null,
            })),
        });
      }

      chart = klinecharts.init(host, {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        styles: stylesRef.current,
        layout: {
          barSpaceLimit: {
            min: MARKET_KLINE_MIN_BAR_SPACE,
            max: MARKET_KLINE_MAX_BAR_SPACE,
          },
          pane: { minHeight: 96 },
        },
      });

      if (!chart) {
        setMessage('图表初始化失败');
        setStatus('error');
        return;
      }

      const config = configRef.current;
      const loaders = {
        historical: createHistoricalLoader(),
        timeline: createTimelineLoader(),
      };
      loadersRef.current = loaders;
      chartRef.current = chart;
      appliedConfigRef.current = config;
      chart.setSymbol({ ticker: config.tsCode, pricePrecision: 2, volumePrecision: 0 });
      chart.setPeriod(MARKET_KLINE_PERIOD_MAP[config.period]);
      chart.setDataLoader(config.period === 'T' ? loaders.timeline : loaders.historical);
      chart.setBarSpace(config.period === 'T' ? 3 : 8);
      chart.setOffsetRightDistance(0);
      host.firstElementChild?.setAttribute('tabindex', '0');

      const onCrosshairChange = (value?: unknown) => {
        const crosshair = value as Crosshair | undefined;
        pendingLegendBar = (crosshair?.kLineData as MarketKLineData | undefined) ?? null;
        if (animationFrame) return;
        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = 0;
          setLegendBar(
            pendingLegendBar ?? (chart?.getDataList().at(-1) as MarketKLineData | undefined) ?? null
          );
        });
      };

      chart.subscribeAction('onCrosshairChange', onCrosshairChange);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          chart?.resize();
          const activePeriod = configRef.current.period;
          if (activePeriod === 'T') {
            scheduleViewportFit(activePeriod, timelineBars);
          }
        });
        resizeObserver.observe(host);
      }

      setChartVersion((value) => value + 1);
    };

    void mount();

    return () => {
      cancelled = true;
      if (timelineTimer) clearInterval(timelineTimer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (viewportAnimationFrame) window.cancelAnimationFrame(viewportAnimationFrame);
      resizeObserver?.disconnect();
      chartRef.current = null;
      mainIndicatorIdRef.current = null;
      subIndicatorIdRef.current = null;
      loadersRef.current = null;
      appliedConfigRef.current = null;
      if (chart)
        void import('klinecharts').then(({ dispose }) => dispose(chart as KLineChartInstance));
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const previous = appliedConfigRef.current;
    if (!chart || !previous || chartVersion === 0) return;

    const next = { tsCode, period, adjustType };
    const symbolChanged = previous.tsCode !== next.tsCode;
    const periodChanged = previous.period !== next.period;
    const adjustChanged = previous.adjustType !== next.adjustType;
    if (!symbolChanged && !periodChanged && !adjustChanged) return;

    loadGenerationRef.current += 1;
    appliedConfigRef.current = next;
    setStatus('loading');
    setMessage('');
    setBars([]);
    barsRef.current = [];
    setLegendBar(null);

    if (symbolChanged) {
      chart.setSymbol({ ticker: next.tsCode, pricePrecision: 2, volumePrecision: 0 });
    }
    if (periodChanged) {
      chart.setPeriod(MARKET_KLINE_PERIOD_MAP[next.period]);
      loadGenerationRef.current += 1;
      const loaders = loadersRef.current;
      if (loaders) {
        chart.setDataLoader(next.period === 'T' ? loaders.timeline : loaders.historical);
      }
    } else if (!symbolChanged) {
      chart.resetData();
    }
    chart.setBarSpace(next.period === 'T' ? 3 : 8);
    chart.setOffsetRightDistance(0);
  }, [adjustType, chartVersion, period, tsCode]);

  useEffect(() => {
    if (retryToken === 0) return;
    loadGenerationRef.current += 1;
    setStatus('loading');
    setMessage('');
    chartRef.current?.resetData();
  }, [retryToken]);

  useEffect(() => {
    chartRef.current?.setStyles(styles);
  }, [styles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartVersion === 0) return;

    if (mainIndicatorIdRef.current) {
      chart.removeIndicator({ id: mainIndicatorIdRef.current });
      mainIndicatorIdRef.current = null;
    }

    if (period === 'T') {
      mainIndicatorIdRef.current = chart.createIndicator({
            name: MARKET_TIMELINE_AVG_INDICATOR,
        paneId: 'candle_pane',
        styles: { lines: [{ color: theme.palette.warning.main, size: 1.25 }] },
      });
    } else if (mainIndicator !== 'NONE') {
      mainIndicatorIdRef.current = chart.createIndicator(
        {
          name: mainIndicator,
          paneId: 'candle_pane',
          ...(mainIndicator === 'MA' ? { calcParams: [5, 10, 20, 60] } : {}),
        },
        true
      );
    }
  }, [chartVersion, mainIndicator, period, theme.palette.warning.main]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartVersion === 0) return;

    if (subIndicatorIdRef.current) {
      chart.removeIndicator({ id: subIndicatorIdRef.current });
      subIndicatorIdRef.current = null;
    }

    if (subIndicator !== 'NONE') {
      const paneId = `market_${subIndicator.toLowerCase()}_pane`;
      subIndicatorIdRef.current = chart.createIndicator({ name: subIndicator, paneId }, false);
      chart.setPaneOptions({ id: paneId, height: 128, minHeight: 96 });
    }
  }, [chartVersion, subIndicator]);

  useEffect(() => {
    if (resetToken === 0) return;
    const chart = chartRef.current;
    if (!chart) return;
    if (period === 'T') {
      fitLatestMarketViewport(chart, period, barsRef.current, hostRef.current?.clientWidth ?? 0);
    } else {
      chart.setBarSpace(8);
      chart.scrollToRealTime(reduceMotion ? 0 : 180);
    }
  }, [period, reduceMotion, resetToken]);

  return (
    <MarketKlinePanel
      tsCode={tsCode}
      period={period}
      status={status}
      message={message}
      bars={bars}
      legendBar={legendBar}
      hostRef={hostRef}
      focusColor={theme.palette.primary.main}
      onRetry={onRetry}
    />
  );
}
