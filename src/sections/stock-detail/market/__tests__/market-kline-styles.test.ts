import type { CandleStyle, CandleTooltipLegendsCustomCallback } from 'klinecharts';

import { createTheme } from '@mui/material/styles';

import { createMarketKlineStyles } from '../market-kline-styles';

import type { MarketKLineData } from '../market-kline.types';

const theme = createTheme();

function getTooltipTemplate(period: 'T' | 'D'): CandleTooltipLegendsCustomCallback {
  const styles = createMarketKlineStyles(theme, period);
  const template = styles.candle?.tooltip?.legend?.template;
  if (typeof template !== 'function') throw new Error('行情 hover 详情回调未配置');
  return template as CandleTooltipLegendsCustomCallback;
}

describe('createMarketKlineStyles', () => {
  it('十字光标移入时展示价格和指标详情', () => {
    const styles = createMarketKlineStyles(theme, 'D');

    expect(styles.candle?.tooltip).toMatchObject({
      showRule: 'follow_cross',
      showType: 'rect',
      rect: { position: 'pointer' },
    });
    expect(styles.indicator?.tooltip).toMatchObject({
      showRule: 'follow_cross',
      showType: 'standard',
    });
  });

  it('日线 hover 按业务单位展示 OHLC、涨跌幅、手和千元', () => {
    const template = getTooltipTemplate('D');
    const previous: MarketKLineData = {
      timestamp: 1785340800000,
      tradeDate: '2026-07-30',
      open: 7.85,
      high: 7.95,
      low: 7.8,
      close: 7.9,
    };
    const current: MarketKLineData = {
      timestamp: 1785427200000,
      tradeDate: '2026-07-31',
      open: 7.9,
      high: 8.01,
      low: 7.79,
      close: 7.99,
      pctChg: 1.14,
      volumeHands: 6044834,
      amountThousands: 4761790,
    };

    const legends = template(
      { prev: previous, current, next: null },
      createMarketKlineStyles(theme, 'D').candle as CandleStyle
    );

    expect(legends).toEqual(
      expect.arrayContaining([
        { title: '日期', value: { text: '2026-07-31', color: theme.palette.text.primary } },
        { title: '开盘', value: { text: '7.90', color: theme.palette.text.secondary } },
        { title: '最高', value: { text: '8.01', color: theme.palette.error.main } },
        { title: '最低', value: { text: '7.79', color: theme.palette.success.main } },
        { title: '收盘', value: { text: '7.99', color: theme.palette.error.main } },
        { title: '涨跌幅', value: { text: '+1.14%', color: theme.palette.error.main } },
        {
          title: '成交量',
          value: { text: '6,044,834 手', color: theme.palette.text.primary },
        },
        {
          title: '成交额',
          value: { text: '4,761,790 千元', color: theme.palette.text.primary },
        },
      ])
    );
  });

  it('分时 hover 展示时间、价格、涨跌、均价和当分钟成交数据', () => {
    const template = getTooltipTemplate('T');
    const current: MarketKLineData = {
      timestamp: 1785461400000,
      tradeDate: '2026-07-31',
      time: '15:30',
      preClose: 8,
      open: 7.99,
      high: 7.99,
      low: 7.99,
      close: 7.99,
      avgPrice: 8.02,
      volumeHands: 144,
      amountThousands: 115,
    };

    const legends = template(
      { prev: null, current, next: null },
      createMarketKlineStyles(theme, 'T').candle as CandleStyle
    );

    expect(legends).toEqual([
      { title: '时间', value: { text: '2026-07-31 15:30', color: theme.palette.text.primary } },
      { title: '价格', value: { text: '7.99', color: theme.palette.success.main } },
      { title: '涨跌额', value: { text: '-0.01', color: theme.palette.success.main } },
      { title: '涨跌幅', value: { text: '-0.13%', color: theme.palette.success.main } },
      { title: '均价', value: { text: '8.02', color: theme.palette.error.main } },
      { title: '成交量', value: { text: '144 手', color: theme.palette.text.primary } },
      { title: '成交额', value: { text: '115 千元', color: theme.palette.text.primary } },
    ]);
  });

  it('极小涨跌幅舍入为 0.00% 时使用中性色，不用颜色暗示隐藏方向', () => {
    const template = getTooltipTemplate('T');
    const current: MarketKLineData = {
      timestamp: 1785461400000,
      tradeDate: '2026-07-31',
      time: '15:30',
      preClose: 1000,
      open: 1000.01,
      high: 1000.01,
      low: 1000.01,
      close: 1000.01,
    };

    const legends = template(
      { prev: null, current, next: null },
      createMarketKlineStyles(theme, 'T').candle as CandleStyle
    );

    expect(legends).toEqual(
      expect.arrayContaining([
        { title: '涨跌额', value: { text: '+0.01', color: theme.palette.error.main } },
        { title: '涨跌幅', value: { text: '0.00%', color: theme.palette.text.secondary } },
      ])
    );
  });
});
