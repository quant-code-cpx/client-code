import type { Theme } from '@mui/material/styles';
import type {
  Styles,
  DeepPartial,
  TooltipLegend,
  CandleTooltipLegendsCustomCallback,
} from 'klinecharts';

import { calculatePriceChange } from './market-kline-data';

import type { MarketPeriod, MarketKLineData } from './market-kline.types';

const PRICE_FORMATTER = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const INTEGER_FORMATTER = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatPrice(value: unknown): string {
  const number = finiteNumber(value);
  return number == null ? '—' : PRICE_FORMATTER.format(number);
}

function formatQuantity(value: unknown, unit: string): string {
  const number = finiteNumber(value);
  return number == null ? '—' : `${INTEGER_FORMATTER.format(number)} ${unit}`;
}

function formatSignedNumber(value: number | null, suffix = ''): string {
  if (value == null) return '—';
  const normalized = normalizeSignedDisplayValue(value);
  return `${normalized > 0 ? '+' : ''}${PRICE_FORMATTER.format(normalized)}${suffix}`;
}

function normalizeSignedDisplayValue(value: number): number {
  const stabilized = Number(value.toFixed(10));
  return Math.abs(stabilized) < 0.005 ? 0 : stabilized;
}

function tooltipValue(text: string, color: string): TooltipLegend['value'] {
  return { text, color };
}

function comparedPriceColor(theme: Theme, value: unknown, reference: number | null): string {
  const price = finiteNumber(value);
  if (price == null || reference == null) return theme.palette.text.primary;
  if (price === reference) return theme.palette.text.secondary;
  return price > reference ? theme.palette.error.main : theme.palette.success.main;
}

function directionColor(theme: Theme, value: number | null): string {
  if (value == null) return theme.palette.text.secondary;
  const normalized = normalizeSignedDisplayValue(value);
  if (normalized === 0) return theme.palette.text.secondary;
  return normalized > 0 ? theme.palette.error.main : theme.palette.success.main;
}

function numericBorderRadius(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createTooltipLegends(
  theme: Theme,
  period: MarketPeriod
): CandleTooltipLegendsCustomCallback {
  return ({ prev, current }) => {
    if (current == null) return [];

    const bar = current as MarketKLineData;
    const previousBar = prev as MarketKLineData | null;
    const textColor = theme.palette.text.primary;
    const volume = finiteNumber(bar.volume);
    const turnover = finiteNumber(bar.turnover);
    const volumeHands = finiteNumber(bar.volumeHands) ?? (volume == null ? null : volume / 100);
    const amountThousands =
      finiteNumber(bar.amountThousands) ?? (turnover == null ? null : turnover / 1000);
    const dateLabel = period === 'T' ? `${bar.tradeDate} ${bar.time ?? ''}`.trim() : bar.tradeDate;

    if (period === 'T') {
      const preClose = finiteNumber(bar.preClose);
      const priceChange = calculatePriceChange(bar.close, preClose);
      const amountChangeColor = directionColor(theme, priceChange?.amount ?? null);
      const percentChangeColor = directionColor(theme, priceChange?.percent ?? null);
      return [
        { title: '时间', value: tooltipValue(dateLabel, textColor) },
        {
          title: '价格',
          value: tooltipValue(
            formatPrice(bar.close),
            comparedPriceColor(theme, bar.close, preClose)
          ),
        },
        {
          title: '涨跌额',
          value: tooltipValue(formatSignedNumber(priceChange?.amount ?? null), amountChangeColor),
        },
        {
          title: '涨跌幅',
          value: tooltipValue(
            formatSignedNumber(priceChange?.percent ?? null, '%'),
            percentChangeColor
          ),
        },
        {
          title: '均价',
          value: tooltipValue(
            formatPrice(bar.avgPrice),
            comparedPriceColor(theme, bar.avgPrice, preClose)
          ),
        },
        { title: '成交量', value: tooltipValue(formatQuantity(volumeHands, '手'), textColor) },
        {
          title: '成交额',
          value: tooltipValue(formatQuantity(amountThousands, '千元'), textColor),
        },
      ];
    }

    const reportedChange = finiteNumber(bar.pctChg);
    const inferredPreviousClose =
      reportedChange == null || reportedChange <= -100
        ? null
        : bar.close / (1 + reportedChange / 100);
    const previousClose = finiteNumber(previousBar?.close) ?? inferredPreviousClose;
    const calculatedChange =
      previousClose == null || previousClose === 0
        ? null
        : ((bar.close - previousClose) / previousClose) * 100;
    const pctChange = reportedChange ?? calculatedChange;
    const changeColor =
      pctChange == null || pctChange === 0
        ? theme.palette.text.secondary
        : pctChange > 0
          ? theme.palette.error.main
          : theme.palette.success.main;
    const changeText =
      pctChange == null ? '—' : `${pctChange > 0 ? '+' : ''}${PRICE_FORMATTER.format(pctChange)}%`;

    return [
      { title: '日期', value: tooltipValue(dateLabel, textColor) },
      {
        title: '开盘',
        value: tooltipValue(
          formatPrice(bar.open),
          comparedPriceColor(theme, bar.open, previousClose)
        ),
      },
      {
        title: '最高',
        value: tooltipValue(
          formatPrice(bar.high),
          comparedPriceColor(theme, bar.high, previousClose)
        ),
      },
      {
        title: '最低',
        value: tooltipValue(
          formatPrice(bar.low),
          comparedPriceColor(theme, bar.low, previousClose)
        ),
      },
      {
        title: '收盘',
        value: tooltipValue(
          formatPrice(bar.close),
          comparedPriceColor(theme, bar.close, previousClose)
        ),
      },
      { title: '涨跌幅', value: tooltipValue(changeText, changeColor) },
      { title: '成交量', value: tooltipValue(formatQuantity(volumeHands, '手'), textColor) },
      {
        title: '成交额',
        value: tooltipValue(formatQuantity(amountThousands, '千元'), textColor),
      },
    ];
  };
}

export function createMarketKlineStyles(theme: Theme, period: MarketPeriod): DeepPartial<Styles> {
  return {
    grid: {
      horizontal: { color: theme.palette.divider, size: 1, style: 'dashed', dashedValue: [3, 3] },
      vertical: { color: theme.palette.divider, size: 1, style: 'dashed', dashedValue: [3, 3] },
    },
    candle: {
      type: period === 'T' ? 'area' : 'candle_solid',
      bar: {
        upColor: theme.palette.error.main,
        downColor: theme.palette.success.main,
        noChangeColor: theme.palette.text.disabled,
        upBorderColor: theme.palette.error.main,
        downBorderColor: theme.palette.success.main,
        noChangeBorderColor: theme.palette.text.disabled,
        upWickColor: theme.palette.error.main,
        downWickColor: theme.palette.success.main,
        noChangeWickColor: theme.palette.text.disabled,
      },
      area: {
        lineColor: theme.palette.primary.main,
        lineSize: 1.5,
        smooth: false,
        backgroundColor: [
          { offset: 0, color: theme.palette.primary.light },
          { offset: 1, color: theme.palette.background.paper },
        ],
        point: {
          color: theme.palette.primary.main,
          rippleColor: theme.palette.primary.light,
          animation: false,
        },
      },
      tooltip: {
        showRule: 'follow_cross',
        showType: 'rect',
        rect: {
          position: 'pointer',
          color: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          borderSize: 1,
          borderRadius: numericBorderRadius(theme.shape.borderRadius),
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 6,
          paddingBottom: 6,
          offsetLeft: 10,
          offsetRight: 10,
          offsetTop: 10,
          offsetBottom: 10,
        },
        title: {
          show: true,
          color: theme.palette.text.primary,
          size: 12,
          weight: 600,
        },
        legend: {
          color: theme.palette.text.secondary,
          size: 12,
          defaultValue: '—',
          template: createTooltipLegends(theme, period),
        },
      },
      priceMark: {
        high: { textSize: 12, color: theme.palette.text.secondary },
        low: { textSize: 12, color: theme.palette.text.secondary },
        last: {
          upColor: theme.palette.error.main,
          downColor: theme.palette.success.main,
          noChangeColor: theme.palette.text.disabled,
        },
      },
    },
    indicator: {
      ohlc: {
        upColor: theme.palette.error.main,
        downColor: theme.palette.success.main,
        noChangeColor: theme.palette.text.disabled,
      },
      tooltip: {
        showRule: 'follow_cross',
        showType: 'standard',
        title: { color: theme.palette.text.primary, size: 12 },
        legend: { color: theme.palette.text.secondary, size: 12 },
      },
      lines: [
        { color: theme.palette.primary.main, size: 1.25 },
        { color: theme.palette.warning.main, size: 1.25 },
        { color: theme.palette.secondary.main, size: 1.25 },
        { color: theme.palette.info.main, size: 1.25 },
      ],
      bars: [
        {
          upColor: theme.palette.error.main,
          downColor: theme.palette.success.main,
          noChangeColor: theme.palette.text.disabled,
        },
      ],
    },
    xAxis: {
      axisLine: { color: theme.palette.divider },
      tickLine: { color: theme.palette.divider },
      tickText: { color: theme.palette.text.secondary, size: 12 },
    },
    yAxis: {
      axisLine: { color: theme.palette.divider },
      tickLine: { color: theme.palette.divider },
      tickText: { color: theme.palette.text.secondary, size: 12 },
    },
    separator: {
      color: theme.palette.divider,
      activeBackgroundColor: theme.palette.action.hover,
    },
    crosshair: {
      horizontal: {
        line: { color: theme.palette.text.disabled },
        text: {
          color: theme.palette.background.paper,
          backgroundColor: theme.palette.text.primary,
          size: 12,
        },
      },
      vertical: {
        line: { color: theme.palette.text.disabled },
        text: {
          color: theme.palette.background.paper,
          backgroundColor: theme.palette.text.primary,
          size: 12,
        },
      },
    },
  };
}
