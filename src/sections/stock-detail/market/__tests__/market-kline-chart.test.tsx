import type { DataLoader } from 'klinecharts';

import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MarketKlineChart } from '../market-kline-chart';

const mocks = vi.hoisted(() => {
  const holder = { loader: null as DataLoader | null, data: [] as unknown[] };
  const chart = {
    setSymbol: vi.fn(),
    setPeriod: vi.fn(),
    setDataLoader: vi.fn((loader: DataLoader) => {
      holder.loader = loader;
      void loader.getBars({
        type: 'init',
        timestamp: null,
        symbol: { ticker: '600519.SH', pricePrecision: 2, volumePrecision: 0 },
        period: { type: 'day', span: 1 },
        callback: vi.fn((data: unknown[]) => {
          holder.data = data;
        }),
      });
    }),
    setStyles: vi.fn(),
    setBarSpace: vi.fn(),
    setOffsetRightDistance: vi.fn(),
    subscribeAction: vi.fn(),
    getDataList: vi.fn(() => holder.data),
    getSize: vi.fn(() => ({ width: 1210, height: 400, left: 0, top: 0 })),
    createIndicator: vi.fn(({ name }: { name: string }) => `${name}-id`),
    removeIndicator: vi.fn(),
    setPaneOptions: vi.fn(),
    scrollToRealTime: vi.fn(),
    resize: vi.fn(),
  };

  return {
    holder,
    chart,
    apiChart: vi.fn(),
    apiTimeline: vi.fn(),
    init: vi.fn(() => chart),
    dispose: vi.fn(),
    registerIndicator: vi.fn(),
  };
});

vi.mock('klinecharts', () => ({
  init: mocks.init,
  dispose: mocks.dispose,
  getSupportedIndicators: () => ['MA', 'BOLL', 'VOL', 'MACD', 'KDJ', 'RSI'],
  registerIndicator: mocks.registerIndicator,
}));

vi.mock('src/api/stock', () => ({
  stockDetailApi: { chart: mocks.apiChart },
}));

vi.mock('stock-sdk', () => ({
  StockSDK: class {
    getTodayTimeline = mocks.apiTimeline;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.loader = null;
  mocks.holder.data = [];
  mocks.apiChart.mockResolvedValue({
    tsCode: '600519.SH',
    period: 'D',
    adjustType: 'qfq',
    hasMore: false,
    items: [
      {
        tradeDate: '2026-07-17',
        open: 1498,
        high: 1520,
        low: 1490,
        close: 1512,
        vol: 920,
        amount: 1390000,
        pctChg: 0.94,
        ma5: 1490,
        ma10: 1480,
        ma20: 1470,
        ma60: 1450,
      },
    ],
  });
  const sessionMinutes = [
    ...Array.from({ length: 121 }, (_, index) => 9 * 60 + 30 + index),
    ...Array.from({ length: 151 }, (_, index) => 13 * 60 + index),
  ];
  mocks.apiTimeline.mockResolvedValue({
    code: 'sh600519',
    date: '20260717',
    timestamp: Date.UTC(2026, 6, 17, 7),
    tz: 'Asia/Shanghai',
    preClose: 10,
    data: sessionMinutes.map((minutes, index) => ({
      time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
      timestamp: Date.UTC(2026, 6, 17, Math.floor(minutes / 60) - 8, minutes % 60),
      tz: 'Asia/Shanghai',
      price: 10 + index / 1000,
      avgPrice: 10,
      volume: 1000 + index * 100,
      amount: 10000 + index * 1000,
    })),
  });
});

describe('MarketKlineChart', () => {
  it('按 v10 顺序初始化，并通过 DataLoader 交付标准行情数据', async () => {
    renderWithProviders(
      <MarketKlineChart
        tsCode="600519.SH"
        period="D"
        adjustType="qfq"
        mainIndicator="MA"
        subIndicator="VOL"
        resetToken={0}
        retryToken={0}
        onRetry={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole('table', { name: '600519.SH 行情数据' })).toBeInTheDocument()
    );

    expect(mocks.chart.setSymbol).toHaveBeenCalledWith({
      ticker: '600519.SH',
      pricePrecision: 2,
      volumePrecision: 0,
    });
    expect(mocks.chart.setPeriod).toHaveBeenCalledWith({ type: 'day', span: 1 });
    expect(mocks.chart.setSymbol.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.chart.setPeriod.mock.invocationCallOrder[0]
    );
    expect(mocks.chart.setPeriod.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.chart.setDataLoader.mock.invocationCallOrder[0]
    );
    expect(mocks.apiChart).toHaveBeenCalledWith({
      tsCode: '600519.SH',
      period: 'D',
      adjustType: 'qfq',
      limit: 150,
    });
    expect(screen.getByText('920')).toBeInTheDocument();
    expect(screen.getByText('1,390,000')).toBeInTheDocument();
    expect(mocks.chart.setOffsetRightDistance).toHaveBeenLastCalledWith(0);
  });

  it('切换周期时复用同一图表实例，并重置 DataLoader', async () => {
    function Harness() {
      const [period, setPeriod] = useState<'D' | 'W'>('D');
      return (
        <>
          <button type="button" onClick={() => setPeriod('W')}>
            切换周线
          </button>
          <MarketKlineChart
            tsCode="600519.SH"
            period={period}
            adjustType="qfq"
            mainIndicator="MA"
            subIndicator="VOL"
            resetToken={0}
            retryToken={0}
            onRetry={vi.fn()}
          />
        </>
      );
    }

    const view = renderWithProviders(<Harness />);

    await waitFor(() => expect(mocks.apiChart).toHaveBeenCalledTimes(1));
    await view.user.click(screen.getByRole('button', { name: '切换周线' }));

    await waitFor(() =>
      expect(mocks.apiChart).toHaveBeenLastCalledWith({
        tsCode: '600519.SH',
        period: 'W',
        adjustType: 'qfq',
        limit: 150,
      })
    );
    expect(mocks.init).toHaveBeenCalledTimes(1);
    expect(mocks.chart.setPeriod).toHaveBeenLastCalledWith({ type: 'week', span: 1 });
  });

  it('分时按 09:30–15:30 铺满画布，覆盖盘后定价交易', async () => {
    renderWithProviders(
      <MarketKlineChart
        tsCode="600519.SH"
        period="T"
        adjustType="qfq"
        mainIndicator="NONE"
        subIndicator="VOL"
        resetToken={0}
        retryToken={0}
        onRetry={vi.fn()}
      />
    );

    await waitFor(() => expect(mocks.apiTimeline).toHaveBeenCalledTimes(1));
    const expectedBarSpace = (1210 - 48) / 271;
    await waitFor(() =>
      expect(mocks.chart.setBarSpace).toHaveBeenLastCalledWith(expectedBarSpace)
    );
    expect(mocks.chart.setOffsetRightDistance).toHaveBeenLastCalledWith(
      24 - expectedBarSpace / 2
    );
    expect(mocks.holder.data).toHaveLength(272);
  });
});
