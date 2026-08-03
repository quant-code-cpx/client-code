import type { SignalPeriodStatistics } from 'src/api/technical-signal';

import { ThemeProvider } from '@mui/material/styles';

import { render } from 'src/test/test-utils';
import { createTheme } from 'src/theme/create-theme';

import { TechnicalSignalPerformanceChart } from '../technical-signal-performance-chart';

const chartMocks = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock('src/components/chart', () => ({
  Chart: (props: unknown) => {
    chartMocks.render(props);
    return <div data-testid="technical-signal-chart" />;
  },
  useChart: <T,>(options: T) => options,
}));

const group: SignalPeriodStatistics = {
  period: '1Y',
  requestedStartDate: '20250801',
  actualStartDate: '20250801',
  endDate: '20260731',
  signalKey: 'macd.golden-cross',
  semanticsVersion: 'macd.v1',
  definitionHash: 'definition-hash',
  direction: 'BULLISH',
  evaluable: true,
  notEvaluableReason: null,
  requiredValidRows: 35,
  actualValidRows: 251,
  occurrenceCount: 12,
  horizons: [
    {
      horizon: 1,
      eligibleOutcomeCount: 12,
      validOutcomeCount: 10,
      immatureCount: 1,
      missingCount: 1,
      overlappingOccurrenceCount: 0,
      missingReasons: {},
      benchmarkMissingCount: 0,
      benchmarkMissingReasons: {},
      raw: {
        sampleCount: 10,
        upCount: 6,
        downCount: 4,
        flatCount: 0,
        upRatio: 0.6,
        downRatio: 0.4,
        flatRatio: 0,
        averageReturnPct: 1.2,
        medianReturnPct: 0.8,
        minimumReturnPct: -2,
        maximumReturnPct: 4,
        stdDevPct: 1.5,
        p25ReturnPct: -0.5,
        p75ReturnPct: 2.1,
        meanConfidenceLowerPct: 0.2,
        meanConfidenceUpperPct: 2.2,
      },
      directional: {
        sampleCount: 10,
        successCount: 6,
        failureCount: 4,
        flatCount: 0,
        successRatio: 0.6,
        averageDirectionalReturnPct: 1.2,
        medianDirectionalReturnPct: 0.8,
        minimumDirectionalReturnPct: -2,
        maximumDirectionalReturnPct: 4,
        stdDevDirectionalReturnPct: 1.5,
        p25DirectionalReturnPct: -0.5,
        p75DirectionalReturnPct: 2.1,
        meanDirectionalConfidenceLowerPct: 0.2,
        meanDirectionalConfidenceUpperPct: 2.2,
        successConfidenceLower: 0.31,
        successConfidenceUpper: 0.83,
      },
      excess: null,
      excursion: {
        completePathCount: 10,
        partialPathCount: 0,
        averageMfePct: 2.3,
        medianMfePct: 1.8,
        averageMaePct: -1.1,
        medianMaePct: -0.7,
        averageDirectionalMfePct: 2.3,
        averageDirectionalMaePct: -1.1,
      },
      minSampleDate: '20250808',
      maxSampleDate: '20260720',
    },
  ],
};

describe('TechnicalSignalPerformanceChart', () => {
  beforeEach(() => {
    chartMocks.render.mockReset();
  });

  it('renders a mean-confidence range band before the primary return line', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <TechnicalSignalPerformanceChart group={group} />
      </ThemeProvider>
    );

    const props = chartMocks.render.mock.calls.at(-1)?.[0] as {
      series: Array<{ data: unknown[]; name: string; type: string }>;
      type: string;
    };

    expect(props.type).toBe('rangeArea');
    expect(props.series[0]).toEqual({
      name: '平均方向收益 95% 置信区间',
      type: 'rangeArea',
      data: [{ x: 'T+1', y: [0.2, 2.2] }],
    });
    expect(props.series[1]).toMatchObject({ name: '平均方向收益', type: 'line' });
  });
});
