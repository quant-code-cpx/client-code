import type { FactorCorrelationResult } from 'src/api/factor';

// ----------------------------------------------------------------------

export type CorrelationPair = {
  /** 上三角索引 i < j */
  i: number;
  j: number;
  factorA: string;
  factorB: string;
  labelA: string;
  labelB: string;
  rho: number;
  abs: number;
  /** pairwise 有效样本数（缺失时为 null） */
  n: number | null;
};

export type CorrelationStats = {
  maxPositive: CorrelationPair | null;
  maxNegative: CorrelationPair | null;
  highCount: number;
  medianN: number | null;
  missingCellCount: number;
};

export type ValidationIssue = {
  level: 'error' | 'warning';
  message: string;
};

// ----------------------------------------------------------------------

/** 校验后端响应契约：维度一致、数值落在 [-1,1] 或 null */
export const validateCorrelationResult = (
  result: FactorCorrelationResult | null
): ValidationIssue[] => {
  if (!result) return [];

  const issues: ValidationIssue[] = [];
  const { factors, factorLabels, matrix, nMatrix, coverage } = result;
  const n = factors.length;

  if (!Array.isArray(matrix) || matrix.length !== n) {
    issues.push({
      level: 'error',
      message: `矩阵行数 ${matrix?.length ?? 0} 与因子数 ${n} 不一致，已停止渲染以避免误读。`,
    });
    return issues;
  }

  for (let i = 0; i < n; i += 1) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
      issues.push({
        level: 'error',
        message: `第 ${i + 1} 行长度异常，期望 ${n}，实际 ${matrix[i]?.length ?? 0}。`,
      });
      return issues;
    }
    for (let j = 0; j < n; j += 1) {
      const v = matrix[i][j];
      if (v !== null && (typeof v !== 'number' || v < -1.000001 || v > 1.000001)) {
        issues.push({
          level: 'error',
          message: `矩阵第 ${i + 1} 行第 ${j + 1} 列数值越界：${String(v)}。`,
        });
        return issues;
      }
    }
  }

  if (factorLabels && factorLabels.length !== n) {
    issues.push({
      level: 'warning',
      message: `factorLabels 长度 ${factorLabels.length} 与因子数 ${n} 不一致，已用因子名兜底。`,
    });
  }
  if (nMatrix && (nMatrix.length !== n || nMatrix.some((row) => row.length !== n))) {
    issues.push({
      level: 'warning',
      message: 'nMatrix 维度与因子数不一致，已忽略样本量信息。',
    });
  }
  if (coverage && coverage.length !== n) {
    issues.push({
      level: 'warning',
      message: 'coverage 长度与因子数不一致，已忽略覆盖率信息。',
    });
  }

  return issues;
};

// ----------------------------------------------------------------------

/** 派生上三角因子对列表，跳过对角线和 null */
export const buildCorrelationPairs = (
  result: FactorCorrelationResult,
  threshold: number
): { pairs: CorrelationPair[]; stats: CorrelationStats } => {
  const { factors, factorLabels, matrix, nMatrix } = result;
  const n = factors.length;
  const labels = factorLabels?.length === n ? factorLabels : factors;
  const pairs: CorrelationPair[] = [];
  const validNs: number[] = [];
  let missingCellCount = 0;

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const v = matrix[i]?.[j];
      if (v === null || v === undefined) {
        missingCellCount += 1;
        continue;
      }
      const sample = nMatrix?.[i]?.[j] ?? null;
      if (sample !== null) validNs.push(sample);
      pairs.push({
        i,
        j,
        factorA: factors[i],
        factorB: factors[j],
        labelA: labels[i] ?? factors[i],
        labelB: labels[j] ?? factors[j],
        rho: v,
        abs: Math.abs(v),
        n: sample,
      });
    }
  }

  pairs.sort((a, b) => b.abs - a.abs);

  const positives = pairs.filter((p) => p.rho > 0);
  const negatives = pairs.filter((p) => p.rho < 0);

  let medianN: number | null = null;
  if (validNs.length > 0) {
    const sorted = [...validNs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianN =
      sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
  }

  const stats: CorrelationStats = {
    maxPositive: positives.length > 0 ? positives.reduce((a, b) => (a.rho >= b.rho ? a : b)) : null,
    maxNegative: negatives.length > 0 ? negatives.reduce((a, b) => (a.rho <= b.rho ? a : b)) : null,
    highCount: pairs.filter((p) => p.abs >= threshold).length,
    medianN,
    missingCellCount,
  };

  return { pairs, stats };
};
