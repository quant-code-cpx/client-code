import type { WalkForwardRunDetail } from 'src/api/backtest';

import {
  getEnabledParamKeys,
  computeWalkForwardWfe,
  computeRobustnessStats,
  computeTotalParamCombinations,
  generateWalkForwardWindowPreview,
} from '../walk-forward-utils';

// ----------------------------------------------------------------------

function buildDetail(patch: Partial<WalkForwardRunDetail> = {}): WalkForwardRunDetail {
  return {
    wfRunId: 'wf-1',
    jobId: 'job-1',
    name: 'WF sample',
    baseStrategyType: 'SCREENING_ROTATION',
    status: 'COMPLETED',
    progress: 100,
    failedReason: null,
    fullStartDate: '20240101',
    fullEndDate: '20241231',
    inSampleDays: 60,
    outOfSampleDays: 20,
    stepDays: 20,
    optimizeMetric: 'sharpeRatio',
    windowCount: 2,
    completedWindows: 2,
    oosAnnualizedReturn: 0.12,
    oosSharpeRatio: 1.2,
    oosMaxDrawdown: -0.08,
    isOosReturnVsIs: 0.04,
    windows: [
      {
        windowIndex: 0,
        isStartDate: '20240101',
        isEndDate: '20240331',
        oosStartDate: '20240401',
        oosEndDate: '20240430',
        optimizedParams: { topN: 10, factor: 'quality' },
        isReturn: 0.18,
        isSharpe: 1.5,
        oosReturn: 0.1,
        oosSharpe: 1.1,
        oosMaxDrawdown: -0.04,
        status: 'OK',
        oosTrades: 12,
      },
      {
        windowIndex: 1,
        isStartDate: '20240201',
        isEndDate: '20240430',
        oosStartDate: '20240501',
        oosEndDate: '20240531',
        optimizedParams: { topN: 20, factor: 'quality' },
        isReturn: 0.14,
        isSharpe: 1.2,
        oosReturn: -0.02,
        oosSharpe: -0.1,
        oosMaxDrawdown: -0.09,
        status: 'OK',
        oosTrades: 8,
      },
    ],
    createdAt: '2026-05-02T00:00:00Z',
    completedAt: '2026-05-02T00:10:00Z',
    ...patch,
  };
}

// ----------------------------------------------------------------------

describe('walk forward utils · window preview', () => {
  it('generates rolling windows with purge and embargo gaps', () => {
    const windows = generateWalkForwardWindowPreview({
      fullStartDate: '2024-01-01',
      fullEndDate: '2024-03-31',
      inSampleDays: 30,
      outOfSampleDays: 10,
      stepDays: 10,
      purgeDays: 2,
      embargoDays: 3,
    });

    expect(windows[0]).toEqual({
      windowIndex: 0,
      isStartDate: '20240101',
      isEndDate: '20240130',
      oosStartDate: '20240205',
      oosEndDate: '20240214',
    });
    expect(windows.length).toBeGreaterThan(1);
  });
});

// ----------------------------------------------------------------------

describe('walk forward utils · parameter budget', () => {
  it('counts range and enum combinations', () => {
    expect(
      computeTotalParamCombinations({
        topN: { type: 'range', min: 5, max: 15, step: 5 },
        factor: { type: 'enum', values: ['quality', 'value'] },
      })
    ).toBe(6);
  });

  it('returns sorted optimized parameter keys from windows', () => {
    expect(getEnabledParamKeys(buildDetail().windows)).toEqual(['factor', 'topN']);
  });
});

// ----------------------------------------------------------------------

describe('walk forward utils · robustness diagnostics', () => {
  it('uses backend WFE when available', () => {
    expect(computeWalkForwardWfe(buildDetail({ wfe: 0.82 }))).toEqual({
      value: 0.82,
      estimated: false,
    });
  });

  it('estimates WFE from OOS and average IS returns when backend field is missing', () => {
    const result = computeWalkForwardWfe(buildDetail({ wfe: null, oosAnnualizedReturn: 0.08 }));

    expect(result.estimated).toBe(true);
    expect(result.value).toBeCloseTo(0.5, 4);
  });

  it('marks healthy results as GREEN and fragile results as RED', () => {
    const healthy = buildDetail({
      wfe: 0.82,
      windows: buildDetail().windows.map((window) => ({ ...window, oosReturn: 0.08 })),
    });

    expect(computeRobustnessStats(healthy).level).toBe('GREEN');
    expect(
      computeRobustnessStats(
        buildDetail({ wfe: 0.3, oosSharpeRatio: -0.2, oosAnnualizedReturn: -0.03 })
      ).level
    ).toBe('RED');
  });
});
