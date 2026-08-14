/** @vitest-environment jsdom */

import type { Chart } from 'src/components/chart';
import type { ReactNode, ComponentProps } from 'react';

import { useState } from 'react';
import { screen } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';
import { fetchVolumeOverview, fetchChangeDistribution } from 'src/api/market';

import { MarketVolumeChart } from '../market-volume-chart';
import { MarketChangeDistributionChart } from '../market-change-distribution-chart';

const chartSpy = vi.hoisted(() => vi.fn());

vi.mock('src/api/market', () => ({
  fetchVolumeOverview: vi.fn(),
  fetchChangeDistribution: vi.fn(),
}));

vi.mock('src/components/chart', () => ({
  Chart: (props: ComponentProps<typeof Chart>) => {
    chartSpy(props);
    return <div data-testid="market-overview-chart" />;
  },
  useChart: (options: unknown) => options,
}));

describe('MarketChangeDistributionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchChangeDistribution).mockReset();
  });

  it('以 Skeleton 等待请求；null 响应进入明确空态且不伪造涨跌停', async () => {
    vi.mocked(fetchChangeDistribution).mockResolvedValue(null);

    const { container } = renderWithProviders(
      <MarketChangeDistributionChart tradeDate="20260808" />
    );

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(await screen.findByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByText(/涨停/)).not.toBeInTheDocument();
    expect(screen.queryByText(/跌停/)).not.toBeInTheDocument();
    expect(fetchChangeDistribution).toHaveBeenCalledWith({ trade_date: '20260808' });
  });

  it('失败后由 refreshKey 重试，按服务端顺序生成分布序列', async () => {
    vi.mocked(fetchChangeDistribution)
      .mockRejectedValueOnce(new Error('分布接口失败'))
      .mockResolvedValueOnce({
        tradeDate: '20260808',
        limitUp: 2,
        limitDown: 1,
        distribution: [
          { label: '-1~0', count: 8 },
          { label: '0~1', count: 1 },
          { label: '1~2', count: 12 },
        ],
      });

    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => (
          <MarketChangeDistributionChart tradeDate="20260808" refreshKey={refreshKey} />
        )}
      </RefreshHarness>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('分布接口失败');

    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    expect(await screen.findByTestId('market-overview-chart')).toBeInTheDocument();
    expect(screen.getByText(/涨停\s*2\s*家/)).toBeInTheDocument();
    expect(screen.getByText(/跌停\s*1\s*家/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(lastChartProps().series).toEqual([{ name: '家数', data: [8, 1, 12] }]);
    expect(lastChartProps().options.xaxis.categories).toEqual(['-1~0', '0~1', '1~2']);
    expect(fetchChangeDistribution).toHaveBeenCalledTimes(2);
  });
});

describe('MarketVolumeChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchVolumeOverview).mockReset();
  });

  it('空列表进入明确空态，并传递日期和 60 日窗口', async () => {
    vi.mocked(fetchVolumeOverview).mockResolvedValue({ data: [] });

    renderWithProviders(<MarketVolumeChart tradeDate="20260808" />);

    expect(await screen.findByText('暂无数据')).toBeInTheDocument();
    expect(fetchVolumeOverview).toHaveBeenCalledWith({ trade_date: '20260808', days: 60 });
  });

  it('格式化 YYYYMMDD 横轴并独立计算 20 日均额', async () => {
    const data = Array.from({ length: 20 }, (_, index) => ({
      tradeDate: `202607${String(index + 1).padStart(2, '0')}`,
      totalAmount: index + 1,
      shAmount: 0,
      szAmount: 0,
    }));
    vi.mocked(fetchVolumeOverview).mockResolvedValue({ data });

    renderWithProviders(<MarketVolumeChart tradeDate="20260720" />);

    expect(await screen.findByTestId('market-overview-chart')).toBeInTheDocument();
    const props = lastChartProps();
    expect(props.options.xaxis.categories[0]).toBe('2026-07-01');
    expect(props.options.xaxis.categories.at(-1)).toBe('2026-07-20');
    expect(props.series[0]).toEqual({
      name: '全A成交额(亿)',
      type: 'bar',
      data: Array.from({ length: 20 }, (_, index) => index + 1),
    });
    expect(props.series[1].data.slice(0, 19)).toEqual(Array(19).fill(null));
    expect(props.series[1].data[19]).toBe(10.5);
  });
});

type ChartProps = {
  series: Array<{ name: string; type?: string; data: Array<number | null> }>;
  options: {
    xaxis: { categories: string[] };
  };
};

function lastChartProps(): ChartProps {
  return chartSpy.mock.lastCall?.[0] as ChartProps;
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
