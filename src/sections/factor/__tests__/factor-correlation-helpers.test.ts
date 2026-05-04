import type { FactorCorrelationResult } from 'src/api/factor';

import {
  formatCorrelationCsv,
  buildCorrelationPairs,
  validateCorrelationResult,
} from '../factor-correlation-helpers';

// ----------------------------------------------------------------------

const baseResult: FactorCorrelationResult = {
  tradeDate: '20260430',
  method: 'spearman',
  factors: ['pb', 'pe_ttm', 'roe'],
  factorLabels: ['市净率', '市盈率TTM', 'ROE'],
  matrix: [
    [1, 0.72, -0.18],
    [0.72, 1, null],
    [-0.18, null, 1],
  ],
  nMatrix: [
    [3110, 3098, 2180],
    [3098, 3120, 0],
    [2180, 0, 2201],
  ],
  coverage: [0.97, 0.98, 0.69],
  meta: {
    universe: '000300.SH',
    matrixMode: 'pairwise',
    minSampleForCorr: 3,
    rankTiesMethod: 'ordinal',
    computedAt: '2026-04-30T19:05:00+08:00',
  },
};

// ----------------------------------------------------------------------

describe('validateCorrelationResult', () => {
  it('returns no issues for valid result', () => {
    expect(validateCorrelationResult(baseResult)).toEqual([]);
  });

  it('flags matrix dimension mismatch as fatal', () => {
    const bad: FactorCorrelationResult = {
      ...baseResult,
      matrix: [[1, 0.5]],
    };
    const issues = validateCorrelationResult(bad);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].level).toBe('error');
  });

  it('flags out-of-range values as fatal', () => {
    const bad: FactorCorrelationResult = {
      ...baseResult,
      matrix: [
        [1, 1.5, 0],
        [1.5, 1, 0],
        [0, 0, 1],
      ],
    };
    const issues = validateCorrelationResult(bad);
    expect(issues.some((i) => i.level === 'error')).toBe(true);
  });

  it('warns when factorLabels length mismatches', () => {
    const bad: FactorCorrelationResult = { ...baseResult, factorLabels: ['只有一个'] };
    const issues = validateCorrelationResult(bad);
    expect(issues.some((i) => i.level === 'warning')).toBe(true);
  });
});

// ----------------------------------------------------------------------

describe('buildCorrelationPairs', () => {
  it('returns upper-triangle pairs sorted by |rho|', () => {
    const { pairs } = buildCorrelationPairs(baseResult, 0.5);
    expect(pairs).toHaveLength(2); // (pb,pe_ttm) and (pb,roe); (pe_ttm,roe) is null
    expect(pairs[0].abs).toBeGreaterThanOrEqual(pairs[1].abs);
  });

  it('skips null cells in pair derivation', () => {
    const { pairs, stats } = buildCorrelationPairs(baseResult, 0.5);
    expect(pairs.find((p) => p.factorA === 'pe_ttm' && p.factorB === 'roe')).toBeUndefined();
    expect(stats.missingCellCount).toBe(1);
  });

  it('counts high-correlation pairs by threshold', () => {
    const { stats } = buildCorrelationPairs(baseResult, 0.7);
    expect(stats.highCount).toBe(1); // only |0.72|
  });

  it('finds max positive and negative correctly', () => {
    const { stats } = buildCorrelationPairs(baseResult, 0.5);
    expect(stats.maxPositive?.rho).toBeCloseTo(0.72);
    expect(stats.maxNegative?.rho).toBeCloseTo(-0.18);
  });

  it('falls back to factor names when factorLabels mismatches', () => {
    const noLabels = { ...baseResult, factorLabels: [] };
    const { pairs } = buildCorrelationPairs(noLabels, 0.5);
    expect(pairs[0].labelA).toBe(pairs[0].factorA);
  });

  it('reports null medianN when nMatrix is missing', () => {
    const noN = { ...baseResult, nMatrix: undefined };
    const { stats } = buildCorrelationPairs(noN, 0.5);
    expect(stats.medianN).toBeNull();
  });
});

// ----------------------------------------------------------------------

describe('formatCorrelationCsv', () => {
  it('contains meta, matrix and nMatrix sections', () => {
    const csv = formatCorrelationCsv(baseResult);
    expect(csv).toContain('# tradeDate,20260430');
    expect(csv).toContain('# matrixMode,pairwise');
    expect(csv).toContain('相关系数矩阵');
    expect(csv).toContain('有效样本数矩阵');
    expect(csv).toContain('单因子覆盖率');
  });

  it('renders null cells as empty', () => {
    const csv = formatCorrelationCsv(baseResult);
    const lines = csv.split('\n');
    const peRow = lines.find((l) => l.startsWith('"pe_ttm'));
    expect(peRow).toBeDefined();
    // pe_ttm × roe is null → should produce empty cell at end
    expect(peRow).toMatch(/,$/);
  });
});
