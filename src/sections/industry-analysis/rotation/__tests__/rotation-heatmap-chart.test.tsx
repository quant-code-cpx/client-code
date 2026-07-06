import type { FlowAnalysisResult, RotationHeatmapResult } from 'src/api/market';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationHeatmapChart } from '../rotation-heatmap-chart';

type ChartMockProps = {
  series: Array<{ data: Array<{ x: string; y: number; netYuan: number }> }>;
  options: {
    tooltip?: {
      custom?: (input: { seriesIndex: number; dataPointIndex: number; w: unknown }) => string;
    };
  };
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const apiMock = vi.hoisted(() => ({
  fetchFlowAnalysis: vi.fn(),
  fetchRotationHeatmap: vi.fn(),
}));

const chartMock = vi.hoisted(() =>
  vi.fn((_props: ChartMockProps) => <div data-testid="rotation-heatmap-chart" />)
);

vi.mock('src/api/market', () => ({
  fetchFlowAnalysis: apiMock.fetchFlowAnalysis,
  fetchRotationHeatmap: apiMock.fetchRotationHeatmap,
}));

vi.mock('src/components/chart', () => ({
  Chart: chartMock,
  useChart: (options: unknown) => options,
}));

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function latestChartProps(): ChartMockProps {
  const latestCall = chartMock.mock.calls[chartMock.mock.calls.length - 1];
  if (!latestCall) throw new Error('Chart not rendered');
  return latestCall[0];
}

describe('RotationHeatmapChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('资金流数据后返回时，tooltip 仍展示真实区间净流入', async () => {
    const heatmapDeferred = createDeferred<RotationHeatmapResult>();
    const flowDeferred = createDeferred<FlowAnalysisResult>();

    apiMock.fetchRotationHeatmap.mockReturnValueOnce(heatmapDeferred.promise);
    apiMock.fetchFlowAnalysis.mockReturnValueOnce(flowDeferred.promise);

    renderWithProviders(<RotationHeatmapChart period="1m" />);

    heatmapDeferred.resolve({
      tradeDate: '20260703',
      sectors: [{ name: '半导体设备', pctChange: 40.03, amount: 0, netAmount: 0 }],
    });

    await screen.findByTestId('rotation-heatmap-chart');
    expect(latestChartProps().series[0].data[0]).toMatchObject({ y: 40.03, netYuan: 0 });

    flowDeferred.resolve({
      tradeDate: '20260703',
      period: '20',
      topInflowSectors: [],
      topOutflowSectors: [],
      flows: [
        {
          name: '半导体设备',
          inflowRatio: 0,
          outflowAmount: 0,
          netInflow: 3089290144,
          inflowAmount: 3089290144,
        },
      ],
    });

    await waitFor(() => {
      expect(latestChartProps().series[0].data[0].netYuan).toBe(3089290144);
    });

    const tooltipHtml = latestChartProps().options.tooltip?.custom?.({
      seriesIndex: 0,
      dataPointIndex: 0,
      w: null,
    });

    expect(tooltipHtml).toContain('+30.89 亿');
  });
});
