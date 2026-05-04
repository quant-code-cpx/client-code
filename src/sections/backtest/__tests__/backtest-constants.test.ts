import {
  COST_PRESETS,
  getCostPresetId,
  buildDefaultForm,
  resolveRangePreset,
  getRecommendedBenchmark,
  buildDefaultStrategyConfig,
} from '../constants';

// ----------------------------------------------------------------------

describe('backtest constants · buildDefaultForm', () => {
  it('uses the reference date as endDate and defaults to a 3-year range', () => {
    const form = buildDefaultForm(new Date('2026-05-02T08:00:00+08:00'));

    expect(form.endDate).toBe('2026-05-02');
    expect(form.startDate).toBe('2023-05-02');
    expect(form.enableT1Restriction).toBe(true);
    expect(form.partialFillEnabled).toBe(true);
  });
});

// ----------------------------------------------------------------------

describe('backtest constants · range presets', () => {
  it('resolves 3Y against backend latest date in YYYYMMDD format', () => {
    expect(resolveRangePreset('3Y', '20260430')).toEqual({
      startDate: '2023-04-30',
      endDate: '2026-04-30',
    });
  });

  it('keeps the dedicated 2020 bull-market preset fixed', () => {
    expect(resolveRangePreset('BULL_2020', '20260430')).toEqual({
      startDate: '2020-01-01',
      endDate: '2020-12-31',
    });
  });
});

// ----------------------------------------------------------------------

describe('backtest constants · benchmark recommendation', () => {
  it('maps common universes to their matching index benchmark', () => {
    expect(getRecommendedBenchmark('HS300')).toBe('000300.SH');
    expect(getRecommendedBenchmark('CSI500')).toBe('000905.SH');
    expect(getRecommendedBenchmark('CSI1000')).toBe('000852.SH');
    expect(getRecommendedBenchmark('SSE50')).toBe('000016.SH');
  });

  it('falls back to HS300 for unknown universes', () => {
    expect(getRecommendedBenchmark('UNKNOWN')).toBe('000300.SH');
  });
});

// ----------------------------------------------------------------------

describe('backtest constants · cost presets', () => {
  it('detects the default cost preset', () => {
    expect(
      getCostPresetId({
        commissionRate: COST_PRESETS[0].commissionRate,
        stampDutyRate: COST_PRESETS[0].stampDutyRate,
        minCommission: COST_PRESETS[0].minCommission,
      })
    ).toBe('DEFAULT');
  });

  it('returns CUSTOM when rates do not match any preset', () => {
    expect(
      getCostPresetId({ commissionRate: 0.00021, stampDutyRate: 0.0005, minCommission: 3 })
    ).toBe('CUSTOM');
  });
});

// ----------------------------------------------------------------------

describe('backtest constants · strategy defaults', () => {
  it('merges backend template defaults over frontend safe defaults', () => {
    expect(buildDefaultStrategyConfig('SCREENING_ROTATION', { topN: 50 })).toMatchObject({
      rankBy: 'totalMv',
      rankOrder: 'desc',
      topN: 50,
    });
  });
});
