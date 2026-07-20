import type { KlineBlock } from 'src/types/agent/generated';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockKline, normalizeKlineSeries } from '../stock-kline';

const chartCapture = vi.hoisted(() => ({ options: {} as Record<string, Record<string, unknown>> }));

vi.mock('src/components/chart/chart', () => ({
  Chart: ({ type, options }: { type: string; options: Record<string, unknown> }) => {
    chartCapture.options[type] = options;
    return <div data-testid={`chart-${type}`} />;
  },
}));

const block: KlineBlock = {
  blockId: 'kline_test',
  schemaVersion: 1,
  type: 'KLINE',
  tsCode: '600519.SH',
  frequency: 'DAILY',
  adjustment: 'NONE',
  priceUnit: '元',
  volumeUnit: '手',
  amountUnit: '千元',
  bars: [
    { tradeDate: '2026-07-18', open: 10, high: 12, low: 9, close: 11, volume: 2, amount: 22 },
    { tradeDate: '2026-07-17', open: 9, high: 11, low: 8, close: 10, volume: 1, amount: 10 },
    { tradeDate: '2026-07-18', open: 10, high: 13, low: 9, close: 12, volume: 3, amount: 36 },
    { tradeDate: '2026-07-19', open: null, high: null, low: null, close: null, volume: null, amount: null },
  ],
  provenance: {
    sourceType: 'DATABASE',
    citationIds: [],
    asOf: { tradeDate: '2026-07-19', retrievedAt: '2026-07-20T00:00:00.000Z' },
    timezone: 'Asia/Shanghai',
    currency: 'CNY',
    unit: '元',
    adjustment: 'NONE',
  },
};

describe('StockKline', () => {
  it('按交易日升序、去重，并保留缺失值 warning', () => {
    const series = normalizeKlineSeries(block);

    expect(series.bars.map((bar) => bar.tradeDate)).toEqual([
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ]);
    expect(series.bars[1].close).toBe(12);
    expect(series.warnings).toContain('重复交易日已去重');
    expect(series.warnings).toContain('1 条 OHLC 缺失或关系异常，未绘入主图');
  });

  it('提供图表与数据表替代，null 不显示成 0', () => {
    renderWithProviders(<StockKline series={normalizeKlineSeries(block)} />);

    expect(screen.getByRole('img', { name: /600519.SH K 线图/ })).toBeInTheDocument();
    expect(screen.getByTestId('chart-candlestick')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '600519.SH K 线数据' })).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/跨除权除息日比较需谨慎/)).toBeInTheDocument();

    const candleOptions = chartCapture.options.candlestick;
    const xaxis = candleOptions.xaxis as { labels: { formatter: (value: unknown) => string } };
    expect(xaxis.labels.formatter(undefined)).toBe('');
  });
});
