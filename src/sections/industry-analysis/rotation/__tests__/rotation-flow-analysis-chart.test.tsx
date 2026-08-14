import type { FlowAnalysisItem } from 'src/api/market';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationFlowAnalysisChart } from '../rotation-flow-analysis-chart';

type ChartMockProps = {
  series: Array<{ name: string; data: number[] }>;
};

const apiMock = vi.hoisted(() => ({
  fetchFlowAnalysis: vi.fn(),
}));

const chartMock = vi.hoisted(() =>
  vi.fn((_props: ChartMockProps) => <div data-testid="rotation-flow-analysis-chart" />)
);

vi.mock('src/api/market', () => ({
  fetchFlowAnalysis: apiMock.fetchFlowAnalysis,
}));

vi.mock('src/components/chart', () => ({
  Chart: chartMock,
  useChart: (options: unknown) => options,
}));

function flow(overrides: Partial<FlowAnalysisItem>): FlowAnalysisItem {
  return {
    name: '电子',
    netInflowYuan: 100_000_000,
    inflowAmountYuan: 100_000_000,
    outflowAmountYuan: 0,
    inflowRatio: 10,
    ...overrides,
  };
}

describe('RotationFlowAnalysisChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按元口径排序并统一换算为亿元图表数据', async () => {
    apiMock.fetchFlowAnalysis.mockResolvedValue({
      flows: [
        flow({
          name: '银行',
          netInflowYuan: -250_000_000,
          inflowAmountYuan: 0,
          outflowAmountYuan: 250_000_000,
        }),
        flow({ name: '电子', netInflowYuan: 100_000_000 }),
      ],
    });

    renderWithProviders(<RotationFlowAnalysisChart period="1m" />);

    await screen.findByTestId('rotation-flow-analysis-chart');
    const latestCall = chartMock.mock.calls.at(-1);

    expect(latestCall?.[0].series).toEqual([{ name: '净流入', data: [1, -2.5] }]);
  });
});
