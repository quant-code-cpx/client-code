/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { ValuationResult, IndexQuoteWithSparklineResult } from 'src/api/market';

import { useState } from 'react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { fetchValuation, fetchIndexQuoteWithSparkline } from 'src/api/market';

import { MarketQuickLinks } from '../market-quick-links';
import { MarketValuationCard } from '../market-valuation-card';
import { MarketDailySnapshotCard } from '../market-daily-snapshot-card';

vi.mock('src/api/market', () => ({
  fetchValuation: vi.fn(),
  fetchIndexQuoteWithSparkline: vi.fn(),
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/chart-sparkline', () => ({ ChartSparkline: () => null }));

describe('MarketDailySnapshotCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchIndexQuoteWithSparkline).mockReset();
  });

  it('请求指定交易日，保留默认指数顺序、null 占位并展开额外指数', async () => {
    const pending = deferred<IndexQuoteWithSparklineResult>();
    vi.mocked(fetchIndexQuoteWithSparkline).mockReturnValue(pending.promise);

    const { container, user } = renderWithProviders(
      <MarketDailySnapshotCard tradeDate="20260808" />
    );

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /上证指数/ })).not.toBeInTheDocument();
    expect(fetchIndexQuoteWithSparkline).toHaveBeenCalledWith({
      trade_date: '20260808',
      sparkline_period: '1m',
    });

    await act(async () => {
      pending.resolve(indexResponse());
      await pending.promise;
    });

    const indexLinks = screen.getAllByRole('link').filter((link) =>
      link.getAttribute('href')?.startsWith('/market/index?code=')
    );
    expect(indexLinks.slice(0, 3).map((link) => link.getAttribute('href'))).toEqual([
      '/market/index?code=000001.SH',
      '/market/index?code=399001.SZ',
      '/market/index?code=399006.SZ',
    ]);

    const nullQuote = screen.getByRole('link', { name: /创业板指/ });
    expect(within(nullQuote).getAllByText('-')).toHaveLength(3);
    expect(screen.getByText('红利指数')).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: '展开更多 1 个指数' }));
    await waitFor(() => expect(screen.getByText('红利指数')).toBeVisible());
    expect(screen.getByRole('button', { name: '收起' })).toBeInTheDocument();
  });

  it('失败后由 refreshKey 重试，且清除旧错误', async () => {
    vi.mocked(fetchIndexQuoteWithSparkline)
      .mockRejectedValueOnce(new Error('指数服务暂不可用'))
      .mockResolvedValueOnce(indexResponse());

    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => (
          <MarketDailySnapshotCard tradeDate="20260808" refreshKey={refreshKey} />
        )}
      </RefreshHarness>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('指数服务暂不可用');

    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    expect(await screen.findByRole('link', { name: /上证指数/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchIndexQuoteWithSparkline).toHaveBeenCalledTimes(2);
  });

  it('空指数响应显示明确空态', async () => {
    vi.mocked(fetchIndexQuoteWithSparkline).mockResolvedValue({
      tradeDate: '20260808',
      sparklinePeriod: '1m',
      indices: [],
    });

    renderWithProviders(<MarketDailySnapshotCard tradeDate="20260808" />);

    expect(await screen.findByText('暂无指数行情')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /指数/ })).not.toBeInTheDocument();
  });
});

describe('MarketValuationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchValuation).mockReset();
  });

  it('保留后端 null，不伪造成 0，并传递八位交易日', async () => {
    vi.mocked(fetchValuation).mockResolvedValue(nullValuation());

    const { container } = renderWithProviders(<MarketValuationCard tradeDate="20260808" />);

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(3);
    expect(await screen.findByText('PE_TTM 分位数')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(8);
    expect(screen.getAllByText('中性')).toHaveLength(2);
    expect(fetchValuation).toHaveBeenCalledWith({ trade_date: '20260808' });
  });

  it('展示低估/高估分位，并在 refreshKey 变化后重试失败请求', async () => {
    vi.mocked(fetchValuation)
      .mockRejectedValueOnce(new Error('估值加载失败'))
      .mockResolvedValueOnce(valuation());

    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => <MarketValuationCard tradeDate="20260808" refreshKey={refreshKey} />}
      </RefreshHarness>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('估值加载失败');

    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    expect(await screen.findByText('12.34')).toBeInTheDocument();
    expect(screen.getByText('1.23')).toBeInTheDocument();
    expect(screen.getByText('低估')).toBeInTheDocument();
    expect(screen.getByText('高估')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchValuation).toHaveBeenCalledTimes(2);
  });
});

describe('MarketQuickLinks', () => {
  it('六个工作台入口均保持正确深链', () => {
    renderWithProviders(<MarketQuickLinks />);

    expect(screen.getByRole('link', { name: /资金动态/ })).toHaveAttribute(
      'href',
      '/market/money-flow'
    );
    expect(screen.getByRole('link', { name: /行业分析/ })).toHaveAttribute(
      'href',
      '/market/industry'
    );
    expect(screen.getByRole('link', { name: /热力图全景/ })).toHaveAttribute(
      'href',
      '/market/industry?tab=0'
    );
    expect(screen.getByRole('link', { name: /选股器/ })).toHaveAttribute('href', '/stock');
    expect(screen.getByRole('link', { name: /回测工作台/ })).toHaveAttribute('href', '/backtest');
    expect(screen.getByRole('link', { name: /自选股/ })).toHaveAttribute(
      'href',
      '/research/watchlist'
    );
  });
});

function indexResponse(): IndexQuoteWithSparklineResult {
  return {
    tradeDate: '20260808',
    sparklinePeriod: '1m',
    indices: [
      indexItem('399006.SZ', null),
      indexItem('000001.SH', 3635.13),
      indexItem('000922.CSI', 7142.5, '红利指数'),
      indexItem('399001.SZ', 11228.31),
    ],
  };
}

function indexItem(tsCode: string, close: number | null, name = tsCode) {
  return {
    tsCode,
    name,
    tradeDate: '20260808',
    close,
    preClose: close,
    change: close == null ? null : 12.5,
    pctChg: close == null ? null : 0.34,
    vol: null,
    amount: close == null ? null : 1_200_000,
    baseDate: '20260708',
    basePoint: 100,
    sparkline: close == null ? [null] : [close - 10, close],
  };
}

function nullValuation(): ValuationResult {
  return {
    tradeDate: null,
    peTtmMedian: null,
    pbMedian: null,
    peTtmPercentile: { oneYear: null, threeYear: null, fiveYear: null },
    pbPercentile: { oneYear: null, threeYear: null, fiveYear: null },
  };
}

function valuation(): ValuationResult {
  return {
    tradeDate: '20260808',
    peTtmMedian: 12.34,
    pbMedian: 1.23,
    peTtmPercentile: { oneYear: 20, threeYear: 50, fiveYear: 70 },
    pbPercentile: { oneYear: 80, threeYear: 45, fiveYear: 25 },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function RefreshHarness({ children }: { children: (refreshKey: number) => ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
        触发刷新
      </button>
      {children(refreshKey)}
    </>
  );
}
