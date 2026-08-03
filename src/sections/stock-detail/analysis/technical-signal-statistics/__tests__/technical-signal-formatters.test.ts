import type { SignalHorizonStatistics } from 'src/api/technical-signal';

import {
  formatRatio,
  formatPercent,
  primaryMetric,
  normalizeHorizons,
  toCompactTradeDate,
  findHorizonStatistics,
} from '../technical-signal-formatters';

const horizon = (overrides: Partial<SignalHorizonStatistics> = {}): SignalHorizonStatistics => ({
  horizon: 5,
  eligibleOutcomeCount: 10,
  validOutcomeCount: 8,
  immatureCount: 1,
  missingCount: 1,
  overlappingOccurrenceCount: 0,
  missingReasons: {},
  benchmarkMissingCount: 0,
  benchmarkMissingReasons: {},
  raw: {
    sampleCount: 8,
    upCount: 5,
    downCount: 2,
    flatCount: 1,
    upRatio: 0.625,
    downRatio: 0.25,
    flatRatio: 0.125,
    averageReturnPct: 1.25,
    medianReturnPct: 0.8,
    minimumReturnPct: -2,
    maximumReturnPct: 4,
    stdDevPct: 1,
    p25ReturnPct: -0.1,
    p75ReturnPct: 2,
    meanConfidenceLowerPct: 0.2,
    meanConfidenceUpperPct: 2.3,
  },
  directional: {
    sampleCount: 8,
    successCount: 5,
    failureCount: 2,
    flatCount: 1,
    successRatio: 0.625,
    averageDirectionalReturnPct: 1.25,
    medianDirectionalReturnPct: 0.8,
    minimumDirectionalReturnPct: -2,
    maximumDirectionalReturnPct: 4,
    stdDevDirectionalReturnPct: 1,
    p25DirectionalReturnPct: -0.1,
    p75DirectionalReturnPct: 2,
    meanDirectionalConfidenceLowerPct: 0.2,
    meanDirectionalConfidenceUpperPct: 2.3,
    successConfidenceLower: 0.31,
    successConfidenceUpper: 0.86,
  },
  excess: null,
  excursion: {
    completePathCount: 8,
    partialPathCount: 0,
    averageMfePct: 2,
    medianMfePct: 1.5,
    averageMaePct: -1,
    medianMaePct: -0.8,
    averageDirectionalMfePct: 2,
    averageDirectionalMaePct: -1,
  },
  minSampleDate: '20240101',
  maxSampleDate: '20241231',
  ...overrides,
});

describe('technical signal formatters', () => {
  it('distinguishes null from real zero percentage values', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(0)).toBe('0.00%');
    expect(formatRatio(0)).toBe('0.0%');
  });

  it('normalizes and sorts requested horizons', () => {
    expect(normalizeHorizons([20, 3, 3, 0, 61, 1.5, 1])).toEqual([1, 3, 20]);
  });

  it('keeps percentage values in their API unit and converts date inputs', () => {
    expect(formatPercent(1.25)).toBe('1.25%');
    expect(toCompactTradeDate('2024-01-05')).toBe('20240105');
  });

  it('uses raw upside and return metrics for contextual signals', () => {
    const metric = primaryMetric('CONTEXTUAL', horizon());

    expect(metric).toEqual({
      ratioLabel: '上涨率',
      ratio: 0.625,
      returnLabel: '平均收益',
      returnPct: 1.25,
    });
  });

  it('falls back to the first returned horizon when URL selection is stale', () => {
    const selected = findHorizonStatistics(
      {
        period: '1Y',
        requestedStartDate: '20240101',
        actualStartDate: '20240101',
        endDate: '20241231',
        signalKey: 'macd.golden-cross',
        semanticsVersion: 'macd.v1',
        definitionHash: 'hash',
        direction: 'BULLISH',
        evaluable: true,
        notEvaluableReason: null,
        requiredValidRows: 35,
        actualValidRows: 250,
        occurrenceCount: 10,
        horizons: [horizon()],
      },
      20
    );

    expect(selected?.horizon).toBe(5);
  });
});
