/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { SectorTopBottomResult } from 'src/api/market';

import { useState } from 'react';
import { act, screen } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { fetchSectorTopBottom } from 'src/api/market';
import { renderWithProviders } from 'src/test/test-utils';

import { MarketSectorPanel } from '../market-sector-panel';

vi.mock('src/api/market', () => ({ fetchSectorTopBottom: vi.fn() }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

describe('MarketSectorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSectorTopBottom).mockReset();
  });

  it('加载后保留 null，切换净流入维度时不重复请求', async () => {
    const pending = deferred<SectorTopBottomResult>();
    vi.mocked(fetchSectorTopBottom).mockReturnValue(pending.promise);

    const { container, user } = renderWithProviders(<MarketSectorPanel tradeDate="20260808" />);

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(10);
    expect(fetchSectorTopBottom).toHaveBeenCalledWith({ trade_date: '20260808', top_n: 5 });

    await act(async () => {
      pending.resolve(sectorResult());
      await pending.promise;
    });

    expect(screen.getByText('涨幅 Top 5')).toBeInTheDocument();
    expect(screen.getByText('今日全行业均上涨')).toBeInTheDocument();
    expect(screen.getByText('银行')).toBeInTheDocument();
    expect(screen.getByText('I_NULL')).toBeInTheDocument();
    expect(screen.getByText('+1.25%')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '净流入' }));

    expect(screen.getByText('净流入 Top 5')).toBeInTheDocument();
    expect(screen.getByText('净流出 Top 5')).toBeInTheDocument();
    expect(screen.getByText('+3.0亿')).toBeInTheDocument();
    expect(screen.getByText('-2.0亿')).toBeInTheDocument();
    expect(fetchSectorTopBottom).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /全部/ })).toHaveAttribute('href', '/market/industry');
  });

  it('失败后由 refreshKey 重试并恢复榜单', async () => {
    vi.mocked(fetchSectorTopBottom)
      .mockRejectedValueOnce(new Error('行业接口失败'))
      .mockResolvedValueOnce(sectorResult());

    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => <MarketSectorPanel tradeDate="20260808" refreshKey={refreshKey} />}
      </RefreshHarness>
    );

    expect(await screen.findByText('行业接口失败')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    expect(await screen.findByText('银行')).toBeInTheDocument();
    expect(screen.queryByText('行业接口失败')).not.toBeInTheDocument();
    expect(fetchSectorTopBottom).toHaveBeenCalledTimes(2);
  });

  it('四个榜单均为空时显示空态，不误报全行业上涨或净流入', async () => {
    vi.mocked(fetchSectorTopBottom).mockResolvedValue({
      ...sectorResult(),
      pctGainers: [],
      pctLosers: [],
      flowGainers: [],
      flowLosers: [],
      gainersCount: 0,
      totalCount: 0,
    });

    const { user } = renderWithProviders(<MarketSectorPanel tradeDate="20260808" />);

    expect(await screen.findByText('暂无行业数据')).toBeInTheDocument();
    expect(screen.queryByText('今日全行业均上涨')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '净流入' }));

    expect(screen.getByText('暂无行业数据')).toBeInTheDocument();
    expect(screen.queryByText('今日全行业均净流入')).not.toBeInTheDocument();
  });
});

function sectorResult(): SectorTopBottomResult {
  return {
    tradeDate: '20260808',
    pctGainers: [
      { tsCode: 'I_BANK', name: '银行', pctChange: 1.25, netAmount: 300_000_000 },
      { tsCode: 'I_NULL', name: null, pctChange: null, netAmount: null },
    ],
    pctLosers: [],
    flowGainers: [
      { tsCode: 'I_BANK', name: '银行', pctChange: 1.25, netAmount: 300_000_000 },
    ],
    flowLosers: [
      { tsCode: 'I_TECH', name: '电子', pctChange: -0.8, netAmount: -200_000_000 },
    ],
    gainersCount: 2,
    losersCount: 0,
    flatCount: 0,
    totalCount: 2,
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
