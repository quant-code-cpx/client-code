import { it, expect, describe } from 'vitest';

import { __screeningStateInternals } from 'src/sections/factor/screening/use-screening-state';
import {
  validateCondition,
  validateConditions,
  pickValidConditions,
} from 'src/sections/factor/screening/screening-validation';

const { encodeConditions, decodeConditions } = __screeningStateInternals;

// ----------------------------------------------------------------------

describe('screening-validation · validateCondition', () => {
  it('未选因子应返回因子错误', () => {
    const errs = validateCondition({ factorName: '', operator: 'gt' });
    expect(errs).toHaveLength(1);
    expect(errs[0].field).toBe('factor');
  });

  it('gt/gte/lt/lte 缺少 value 应报错', () => {
    const errs = validateCondition({ factorName: 'pe', operator: 'gt' });
    expect(errs.some((e) => e.field === 'value')).toBe(true);
  });

  it('between 必须填 min 与 max', () => {
    const noMin = validateCondition({ factorName: 'pe', operator: 'between', max: 10 });
    expect(noMin.some((e) => e.field === 'min')).toBe(true);
    const noMax = validateCondition({ factorName: 'pe', operator: 'between', min: 1 });
    expect(noMax.some((e) => e.field === 'max')).toBe(true);
  });

  it('between min > max 时应报错于 max', () => {
    const errs = validateCondition({
      factorName: 'pe',
      operator: 'between',
      min: 10,
      max: 5,
    });
    expect(errs.some((e) => e.field === 'max')).toBe(true);
  });

  it('top_pct 百分比必须在 1~100', () => {
    expect(
      validateCondition({ factorName: 'pe', operator: 'top_pct', percent: 0 }).length
    ).toBeGreaterThan(0);
    expect(
      validateCondition({ factorName: 'pe', operator: 'top_pct', percent: 101 }).length
    ).toBeGreaterThan(0);
    expect(validateCondition({ factorName: 'pe', operator: 'top_pct', percent: 20 })).toEqual([]);
  });
});

describe('screening-validation · validateConditions', () => {
  it('全部为空时给出 global 提示', () => {
    const v = validateConditions([{ factorName: '', operator: 'gt' }]);
    expect(v.ok).toBe(false);
    expect(v.global.length).toBeGreaterThan(0);
  });

  it('合法条件应通过', () => {
    const v = validateConditions([{ factorName: 'pe', operator: 'gt', value: 5 }]);
    expect(v.ok).toBe(true);
    expect(v.global).toEqual([]);
  });

  it('重复因子应在行级提示但不阻塞 ok', () => {
    const v = validateConditions([
      { factorName: 'pe', operator: 'gt', value: 5 },
      { factorName: 'pe', operator: 'lt', value: 50 },
    ]);
    expect(v.rows[0].some((e) => e.message.includes('多次'))).toBe(true);
    expect(v.rows[1].some((e) => e.message.includes('多次'))).toBe(true);
  });
});

describe('screening-validation · pickValidConditions', () => {
  it('仅返回结构完整的条件', () => {
    const list = pickValidConditions([
      { factorName: 'pe', operator: 'gt', value: 5 },
      { factorName: '', operator: 'gt' },
      { factorName: 'pb', operator: 'between', min: 1 },
      { factorName: 'roe', operator: 'top_pct', percent: 20 },
    ]);
    expect(list.map((c) => c.factorName)).toEqual(['pe', 'roe']);
  });
});

describe('use-screening-state · encode/decode 往返', () => {
  it('encode + decode 应保持等价', () => {
    const conds = [
      { factorName: 'pe', operator: 'gt' as const, value: 5 },
      {
        factorName: 'pb',
        operator: 'between' as const,
        min: 1,
        max: 10,
      },
      { factorName: 'roe', operator: 'top_pct' as const, percent: 20 },
    ];
    const enc = encodeConditions(conds);
    expect(enc).not.toBe('');
    const dec = decodeConditions(enc);
    expect(dec).toEqual(conds);
  });

  it('decode 空串返回空数组', () => {
    expect(decodeConditions('')).toEqual([]);
    expect(decodeConditions(null)).toEqual([]);
  });

  it('encode 跳过 factorName 为空的条目', () => {
    const enc = encodeConditions([
      { factorName: '', operator: 'gt' },
      { factorName: 'pe', operator: 'gt', value: 5 },
    ]);
    expect(enc).toBe('pe:gt:v5');
  });

  it('decode 忽略非法 operator', () => {
    expect(decodeConditions('pe:bogus:v1')).toEqual([]);
  });
});
