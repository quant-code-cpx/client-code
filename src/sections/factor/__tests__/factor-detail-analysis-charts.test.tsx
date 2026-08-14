/** @vitest-environment jsdom */

import type { ReactElement } from 'react';
import type { FactorIcResult, FactorDecayResult, FactorQuantileResult } from 'src/api/factor';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { factorApi } from 'src/api/factor';
import { renderWithProviders } from 'src/test/test-utils';

import { FactorDetailIcChart } from '../factor-detail-ic-chart';
import { FactorDetailDecayChart } from '../factor-detail-decay-chart';
import { FactorDetailQuantileChart } from '../factor-detail-quantile-chart';

const chartSpy = vi.hoisted(() => vi.fn());

vi.mock('src/api/factor', () => ({
  factorApi: { ic: vi.fn(), quantile: vi.fn(), decay: vi.fn() },
}));

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({
    type,
    series,
    options,
  }: {
    type: string;
    series: Array<{ name: string; data: unknown[] }>;
    options: unknown;
  }) => {
    chartSpy({ type, series, options });
    return (
      <div>
        图表：{type} / {series.map((item) => `${item.name}:${item.data.length}`).join(',')}
      </div>
    );
  },
}));

const params = { startDate: '2026-01-01', endDate: '2026-08-12', universe: '000300.SH' };

const icResult: FactorIcResult = {
  factorName: 'roe',
  forwardDays: 5,
  icMethod: 'rank',
  startDate: '20260101',
  endDate: '20260812',
  summary: {
    icMean: 0.035,
    icStd: 0.04,
    icIr: 0.875,
    icPositiveRate: 0.65,
    icAboveThreshold: 12,
    tStat: 2.4,
  },
  series: Array.from({ length: 21 }, (_, index) => ({
    tradeDate: `202601${String(index + 1).padStart(2, '0')}`,
    ic: index % 2 === 0 ? 0.04 : -0.01,
    stockCount: 280,
  })),
};

const quantileResult: FactorQuantileResult = {
  factorName: 'roe',
  quantiles: 5,
  rebalanceDays: 20,
  startDate: '20260101',
  endDate: '20260812',
  groups: [
    {
      group: 'Q1',
      label: '低分组',
      totalReturn: -0.05,
      annualizedReturn: -0.08,
      maxDrawdown: -0.2,
      sharpeRatio: -0.3,
      series: [
        { tradeDate: '20260105', cumReturn: 0 },
        { tradeDate: '20260812', cumReturn: -0.05 },
      ],
    },
    {
      group: 'Q5',
      label: '高分组',
      totalReturn: 0.18,
      annualizedReturn: 0.25,
      maxDrawdown: -0.1,
      sharpeRatio: 1.4,
      series: [
        { tradeDate: '20260105', cumReturn: 0 },
        { tradeDate: '20260812', cumReturn: 0.18 },
      ],
    },
  ],
  longShort: {
    totalReturn: 0.23,
    annualizedReturn: 0.33,
    maxDrawdown: -0.08,
    sharpeRatio: 1.8,
    series: [
      { tradeDate: '20260105', cumReturn: 0 },
      { tradeDate: '20260812', cumReturn: 0.23 },
    ],
  },
  benchmark: {
    totalReturn: 0.06,
    series: [
      { tradeDate: '20260105', cumReturn: 0 },
      { tradeDate: '20260812', cumReturn: 0.06 },
    ],
  },
};

const decayResult: FactorDecayResult = {
  factorName: 'roe',
  results: [
    { period: 1, icMean: 0.05, icIr: 0.9, icPositiveRate: 0.64 },
    { period: 5, icMean: 0.03, icIr: 0.6, icPositiveRate: 0.58 },
    { period: 20, icMean: -0.01, icIr: -0.2, icPositiveRate: 0.45 },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('factor detail analysis charts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('IC 请求使用明确日期/股票池，计算 20 日均线和累计 IC', async () => {
    const pending = deferred<FactorIcResult>();
    vi.mocked(factorApi.ic).mockReturnValue(pending.promise);
    renderWithProviders(<FactorDetailIcChart factorName="roe" params={params} />);

    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);
    expect(factorApi.ic).toHaveBeenCalledWith({
      factorName: 'roe',
      startDate: '2026-01-01',
      endDate: '2026-08-12',
      universe: '000300.SH',
    });
    pending.resolve(icResult);

    expect(await screen.findByText('0.0350')).toBeInTheDocument();
    expect(screen.getByText('0.8750')).toBeInTheDocument();
    expect(screen.getByText('65.0%')).toBeInTheDocument();
    expect(screen.getByText('Rank IC · 预测期 5 日')).toBeInTheDocument();
    expect(screen.getByText('图表：bar / IC值:21,20日均线:21')).toBeInTheDocument();
    expect(screen.getByText('图表：area / IC 累计:21')).toBeInTheDocument();
    expect(chartSpy.mock.calls[0][0].options.xaxis.categories[0]).toBe('2026-01-01');
  });

  it('分层回测展示涨红跌绿语义所需的正负值、null-free 指标与双图', async () => {
    vi.mocked(factorApi.quantile).mockResolvedValue(quantileResult);
    renderWithProviders(<FactorDetailQuantileChart factorName="roe" params={params} />);

    expect(await screen.findByText('分 5 组 · 调仓周期 20 日')).toBeInTheDocument();
    expect(factorApi.quantile).toHaveBeenCalledWith({
      factorName: 'roe',
      startDate: '2026-01-01',
      endDate: '2026-08-12',
      universe: '000300.SH',
    });
    expect(screen.getByText('-8.00%')).toBeInTheDocument();
    expect(screen.getByText('25.00%')).toBeInTheDocument();
    expect(screen.getByText('图表：line / 低分组:2,高分组:2,多空组合:2,基准:2')).toBeInTheDocument();
    expect(screen.getByText('图表：bar / 年化收益:2')).toBeInTheDocument();
    expect(chartSpy.mock.calls[0][0].series[0].data[0].x).toBe('2026-01-05');
  });

  it('衰减请求和正负 IC 序列完整传给图表', async () => {
    vi.mocked(factorApi.decay).mockResolvedValue(decayResult);
    renderWithProviders(<FactorDetailDecayChart factorName="roe" params={params} />);

    expect(await screen.findByText('因子衰减分析')).toBeInTheDocument();
    expect(factorApi.decay).toHaveBeenCalledWith({
      factorName: 'roe',
      startDate: '2026-01-01',
      endDate: '2026-08-12',
      universe: '000300.SH',
    });
    expect(screen.getByText('图表：bar / IC均值:3,ICIR:3')).toBeInTheDocument();
  });

  it.each([
    ['IC', () => <FactorDetailIcChart factorName="roe" params={params} />, factorApi.ic],
    [
      '分层',
      () => <FactorDetailQuantileChart factorName="roe" params={params} />,
      factorApi.quantile,
    ],
    ['衰减', () => <FactorDetailDecayChart factorName="roe" params={params} />, factorApi.decay],
  ] as Array<[string, () => ReactElement, ReturnType<typeof vi.fn>]>)('%s 分析保留 API 错误', async (
    _label,
    createView,
    apiMock
  ) => {
    apiMock.mockRejectedValue(new Error('分析数据暂不可用'));
    renderWithProviders(createView());
    expect(await screen.findByText('分析数据暂不可用')).toBeInTheDocument();
  });

  it('空因子名不发送请求并保持明确空态', async () => {
    renderWithProviders(<FactorDetailIcChart factorName="" params={params} />);
    expect(screen.getByText('请设置参数后点击"开始分析"')).toBeInTheDocument();
    await waitFor(() => expect(factorApi.ic).not.toHaveBeenCalled());
  });
});
