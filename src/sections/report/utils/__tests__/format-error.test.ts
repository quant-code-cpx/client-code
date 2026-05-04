import { it, expect, describe } from 'vitest';

import { translateReportError } from '../format-error';

describe('translateReportError', () => {
  it('uses dictionary for known errorCode', () => {
    const r = translateReportError('REPORT_TIMEOUT', 'irrelevant raw text');
    expect(r.title).toContain('超时');
  });

  it('falls back to heuristic when no errorCode', () => {
    const r = translateReportError(null, 'Connection timeout after 30s');
    expect(r.title).toContain('超时');
  });

  it('falls back to dependency-missing for "not found"', () => {
    const r = translateReportError(null, 'BacktestRun not found');
    expect(r.title).toContain('关联资源');
  });

  it('returns generic for unknown', () => {
    const r = translateReportError(null, 'something weird');
    expect(r.title).toBe('生成失败');
  });

  it('returns "未知错误" when both are nullish', () => {
    const r = translateReportError(null, null);
    expect(r.title).toBe('生成失败');
  });
});
