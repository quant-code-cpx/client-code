/** @vitest-environment jsdom */

import { useState } from 'react';
import { screen } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';

import { ComparisonEquityChart } from '../comparison-equity-chart';
import { WalkForwardEquityChart } from '../walk-forward-equity-chart';

const chartSpy = vi.hoisted(() => vi.fn());

vi.mock('src/components/chart', () => ({
  Chart: (props: unknown) => {
    chartSpy(props);
    return null;
  },
  useChart: (options: unknown) => options,
}));

type ChartCall = {
  type: string;
  series: Array<{ name: string; data: Array<number | null> }>;
  options: { xaxis?: { categories?: string[] } };
  sx: { height: number };
};

function ComparisonRerenderHarness({ series }: { series: Parameters<typeof ComparisonEquityChart>[0]['series'] }) {
  const [, setRenderCount] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setRenderCount((count) => count + 1)}>
        无关重渲染
      </button>
      <ComparisonEquityChart series={series} />
    </>
  );
}

describe('backtest equity charts', () => {
  beforeEach(() => {
    chartSpy.mockClear();
  });

  it('routes comparison data through the shared Chart with CSS height', () => {
    renderWithProviders(
      <ComparisonEquityChart
        series={[
          {
            runId: 'run-1',
            label: '策略一',
            points: [{ tradeDate: '20260102', nav: 1.123456 }],
          },
        ]}
      />
    );

    const props = chartSpy.mock.calls[0][0] as ChartCall;
    expect(props.type).toBe('line');
    expect(props.series).toEqual([{ name: '策略一', data: [1.1235] }]);
    expect(props.options.xaxis?.categories).toEqual(['2026-01-02']);
    expect(props.sx).toEqual({ height: 320 });
  });

  it('routes walk-forward benchmark data through the shared Chart', () => {
    renderWithProviders(
      <WalkForwardEquityChart
        points={[
          { tradeDate: '20260102', nav: 1, benchmarkNav: 1, windowIndex: 0 },
          { tradeDate: '20260103', nav: 1.01, benchmarkNav: 0.99, windowIndex: 0 },
        ]}
      />
    );

    const props = chartSpy.mock.calls[0][0] as ChartCall;
    expect(props.type).toBe('area');
    expect(props.series.map((item) => item.name)).toEqual(['OOS 净值', '基准净值']);
    expect(props.options.xaxis?.categories).toEqual(['2026-01-02', '2026-01-03']);
    expect(props.sx).toEqual({ height: 280 });
  });

  it('keeps derived comparison inputs stable when data has not changed', async () => {
    const series = [
      {
        runId: 'run-1',
        label: '策略一',
        points: [{ tradeDate: '20260102', nav: 1 }],
      },
    ];
    const { user } = renderWithProviders(<ComparisonRerenderHarness series={series} />);
    const firstProps = chartSpy.mock.calls[0][0] as ChartCall;

    await user.click(screen.getByRole('button', { name: '无关重渲染' }));

    const nextProps = chartSpy.mock.calls[1][0] as ChartCall;
    expect(nextProps.options).toBe(firstProps.options);
    expect(nextProps.series).toBe(firstProps.series);
  });
});
