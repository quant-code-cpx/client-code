import type { ReactNode } from 'react';
import type {
  TierFlow,
  SentimentResult,
  HsgtFlowHistoryItem,
  MarketBreadthResult,
  MarketMoneyFlowDetail,
} from 'src/api/market';

import { useState } from 'react';
import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MarketHeroNarrative } from '../market-hero-narrative';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const apiMock = vi.hoisted(() => ({
  fetchMoneyFlow: vi.fn(),
  fetchSentiment: vi.fn(),
  fetchMarketBreadth: vi.fn(),
}));

vi.mock('src/api/market', () => ({
  fetchMoneyFlow: apiMock.fetchMoneyFlow,
  fetchSentiment: apiMock.fetchSentiment,
  fetchMarketBreadth: apiMock.fetchMarketBreadth,
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function tier(): TierFlow {
  return {
    buyAmount: null,
    sellAmount: null,
    netAmount: null,
    buyRate: null,
    sellRate: null,
    netRate: null,
  };
}

function moneyFlow(netMfAmount: number | null): MarketMoneyFlowDetail {
  return {
    tradeDate: '20260808',
    closeSh: null,
    pctChangeSh: null,
    closeSz: null,
    pctChangeSz: null,
    totalAmount: null,
    netMfAmount,
    main: tier(),
    retail: tier(),
    elg: tier(),
    lg: tier(),
    md: tier(),
    sm: tier(),
  };
}

function breadth(overrides: Partial<MarketBreadthResult> = {}): MarketBreadthResult {
  return {
    tradeDate: '20260808',
    limitUp: 81,
    limitDown: 2,
    bigRise: 10,
    rise: 60,
    flat: 10,
    fall: 15,
    bigFall: 5,
    total: 100,
    limitUpBroken: 1,
    consecutiveLimitGroups: [],
    ...overrides,
  };
}

function neutralBreadth(): MarketBreadthResult {
  return breadth({
    limitUp: 10,
    bigRise: 10,
    rise: 35,
    flat: 10,
    fall: 35,
    bigFall: 10,
  });
}

function sentiment(): SentimentResult {
  return {
    tradeDate: '20260808',
    total: 100,
    bigRise: 10,
    rise: 60,
    flat: 10,
    fall: 15,
    bigFall: 5,
  };
}

const hsgtHistory: HsgtFlowHistoryItem[] = [
  {
    tradeDate: '20260808',
    northMoney: 1_234,
    southMoney: null,
    hgt: null,
    sgt: null,
    ggtSs: null,
    ggtSz: null,
  },
];

function RefreshHarness({ children }: { children: (refreshKey: number) => ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
        触发刷新
      </button>
      {children(refreshKey)}
    </>
  );
}

describe('MarketHeroNarrative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.fetchMoneyFlow.mockResolvedValue(moneyFlow(20_000_000_000));
    apiMock.fetchSentiment.mockResolvedValue(sentiment());
    apiMock.fetchMarketBreadth.mockResolvedValue(breadth());
  });

  it('等待必需宽度数据后合并三接口，展示格式化日期、亿元和情绪分数', async () => {
    const pendingBreadth = deferred<MarketBreadthResult>();
    apiMock.fetchMarketBreadth.mockReturnValue(pendingBreadth.promise);
    const onTradeDateResolved = vi.fn();
    const { container } = renderWithProviders(
      <MarketHeroNarrative
        tradeDate="20260808"
        hsgtHistory={hsgtHistory}
        onTradeDateResolved={onTradeDateResolved}
      />
    );

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(apiMock.fetchMarketBreadth).toHaveBeenCalledWith({ trade_date: '20260808' });
    expect(apiMock.fetchMoneyFlow).toHaveBeenCalledWith({ trade_date: '20260808' });
    expect(apiMock.fetchSentiment).toHaveBeenCalledWith({ trade_date: '20260808' });

    await act(async () => {
      pendingBreadth.resolve(breadth());
      await pendingBreadth.promise;
    });

    expect(screen.getByText('做多格局')).toBeInTheDocument();
    expect(
      screen.getByText('全面普涨，多头情绪占优 · 涨停潮 81 家 · 主力大幅流入')
    ).toBeInTheDocument();
    expect(screen.getByText('2026-08-08')).toBeInTheDocument();
    expect(screen.getByText('+200.00 亿')).toBeInTheDocument();
    expect(screen.getByText('12.34 亿')).toBeInTheDocument();
    expect(screen.getByText('75 · 偏贪婪')).toBeInTheDocument();
    expect(screen.getByText('70 涨')).toBeInTheDocument();
    expect(screen.getByText('20 跌')).toBeInTheDocument();
    expect(onTradeDateResolved).not.toHaveBeenCalled();
  });

  it('资金和情绪接口局部失败仍保留市场宽度，并仅在自动日期时回填父视图', async () => {
    apiMock.fetchMarketBreadth.mockResolvedValue(neutralBreadth());
    apiMock.fetchMoneyFlow.mockRejectedValue(new Error('资金流失败'));
    apiMock.fetchSentiment.mockRejectedValue(new Error('情绪失败'));
    const onTradeDateResolved = vi.fn();
    renderWithProviders(
      <MarketHeroNarrative hsgtHistory={null} onTradeDateResolved={onTradeDateResolved} />
    );

    expect(await screen.findByText('震荡整理')).toBeInTheDocument();
    expect(screen.getByText('震荡整理，方向待明')).toBeInTheDocument();
    expect(screen.getAllByText('暂无数据')).toHaveLength(2);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(apiMock.fetchMarketBreadth).toHaveBeenCalledWith({ trade_date: undefined });
    await waitFor(() => expect(onTradeDateResolved).toHaveBeenCalledWith('20260808'));
  });

  it('必需宽度接口失败时显示错误，并由 refreshKey 清错重试', async () => {
    apiMock.fetchMarketBreadth
      .mockRejectedValueOnce(new Error('宽度接口不可用'))
      .mockResolvedValueOnce(breadth());
    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => <MarketHeroNarrative refreshKey={refreshKey} />}
      </RefreshHarness>
    );

    expect(
      await screen.findByText('市场叙事数据加载失败，请点击刷新重试')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    expect(await screen.findByText('做多格局')).toBeInTheDocument();
    expect(
      screen.queryByText('市场叙事数据加载失败，请点击刷新重试')
    ).not.toBeInTheDocument();
    expect(apiMock.fetchMarketBreadth).toHaveBeenCalledTimes(2);
    expect(apiMock.fetchMoneyFlow).toHaveBeenCalledTimes(2);
    expect(apiMock.fetchSentiment).toHaveBeenCalledTimes(2);
  });

  it('净流入 null/0 为中性、正数红、负数绿，不把缺失或零误判为下跌', async () => {
    apiMock.fetchMarketBreadth.mockResolvedValue(neutralBreadth());
    apiMock.fetchSentiment.mockResolvedValue(sentiment());

    async function expectMoneyColor(
      netMfAmount: number | null,
      text: string,
      color: string
    ) {
      apiMock.fetchMoneyFlow.mockResolvedValue(moneyFlow(netMfAmount));
      const rendered = renderWithProviders(<MarketHeroNarrative />);
      const value = await within(rendered.container).findByText(text);
      expect(value).toHaveStyle({ color });
      rendered.unmount();
    }

    await expectMoneyColor(null, '暂无数据', 'var(--palette-text-secondary)');
    await expectMoneyColor(0, '0.00 亿', 'var(--palette-text-secondary)');
    await expectMoneyColor(100_000_000, '+1.00 亿', 'var(--palette-error-main)');
    await expectMoneyColor(-100_000_000, '-1.00 亿', 'var(--palette-success-main)');
  });
});
