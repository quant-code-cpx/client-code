import type { FactorCondition } from 'src/api/factor';

// ----------------------------------------------------------------------

export type ConditionRowError = {
  /** 影响输入的字段（多个用 'value' / 'min' / 'max' / 'percent' / 'factor'） */
  field: 'factor' | 'value' | 'min' | 'max' | 'percent';
  message: string;
};

export type ConditionValidation = {
  /** 行级错误（每条条件可能多条） */
  rows: ConditionRowError[][];
  /** 全局错误（如：未填任何条件） */
  global: string[];
  /** 是否可提交 */
  ok: boolean;
};

const isNumber = (v: number | undefined | null): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export function validateCondition(c: FactorCondition): ConditionRowError[] {
  const errs: ConditionRowError[] = [];

  if (!c.factorName) {
    errs.push({ field: 'factor', message: '请选择因子' });
    // 没有因子时其他校验跳过
    return errs;
  }

  switch (c.operator) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      if (!isNumber(c.value)) {
        errs.push({ field: 'value', message: '请输入比较值' });
      }
      break;

    case 'between': {
      if (!isNumber(c.min)) {
        errs.push({ field: 'min', message: '请输入最小值' });
      }
      if (!isNumber(c.max)) {
        errs.push({ field: 'max', message: '请输入最大值' });
      }
      if (isNumber(c.min) && isNumber(c.max) && c.min > c.max) {
        errs.push({ field: 'max', message: '最大值需大于等于最小值' });
      }
      break;
    }

    case 'top_pct':
    case 'bottom_pct': {
      if (!isNumber(c.percent)) {
        errs.push({ field: 'percent', message: '请输入百分比 (1~100)' });
      } else if (c.percent <= 0 || c.percent > 100) {
        errs.push({ field: 'percent', message: '百分比必须在 1~100 之间' });
      }
      break;
    }

    default:
      break;
  }

  return errs;
}

export function validateConditions(conditions: FactorCondition[]): ConditionValidation {
  const rows = conditions.map(validateCondition);
  const global: string[] = [];

  const validCount = conditions.filter((c, idx) => c.factorName && rows[idx].length === 0).length;

  if (validCount === 0) {
    global.push('请至少添加一条已完整填写的有效条件');
  }

  // 重复因子检测
  const dupMap = new Map<string, number>();
  conditions.forEach((c) => {
    if (!c.factorName) return;
    dupMap.set(c.factorName, (dupMap.get(c.factorName) ?? 0) + 1);
  });
  conditions.forEach((c, idx) => {
    if (c.factorName && (dupMap.get(c.factorName) ?? 0) > 1) {
      rows[idx].push({
        field: 'factor',
        message: '同一因子出现多次（可保留，但建议合并为 between）',
      });
    }
  });

  const hasRowError = rows.some((rs) => rs.some((e) => e.message !== ''));

  return {
    rows,
    global,
    ok: global.length === 0 && !hasRowError,
  };
}

/** 仅返回结构完整、可下发后端的条件 */
export function pickValidConditions(conditions: FactorCondition[]): FactorCondition[] {
  return conditions.filter((c) => c.factorName && validateCondition(c).length === 0);
}
