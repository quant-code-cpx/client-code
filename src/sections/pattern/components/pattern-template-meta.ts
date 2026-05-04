import type {
  PatternTemplate,
  PatternTemplateRaw,
  PatternTemplateType,
  PatternExpectedSignal,
} from 'src/api/pattern';

/**
 * 8 个经典 K 线形态的前端元数据。
 *
 * 与后端 `server-code/src/apps/pattern/utils/pattern-templates.ts` 保持同步。
 * 后端目前不返回 `series / type / expectedSignal`，故由前端维护。
 * 后端若后续在 `templates/list` 出参补齐这些字段，可移除本文件中对应字段并改用后端值。
 */

type Meta = {
  type: PatternTemplateType;
  expectedSignal: PatternExpectedSignal;
  series: number[];
};

export const PATTERN_TEMPLATE_META: Record<string, Meta> = {
  HEAD_SHOULDERS_TOP: {
    type: 'reversal_top',
    expectedSignal: 'bearish',
    series: [0.3, 0.5, 0.6, 0.5, 0.3, 0.5, 0.8, 1.0, 0.8, 0.5, 0.3, 0.5, 0.6, 0.5, 0.3, 0.2, 0.0],
  },
  HEAD_SHOULDERS_BOTTOM: {
    type: 'reversal_bottom',
    expectedSignal: 'bullish',
    series: [0.7, 0.5, 0.4, 0.5, 0.7, 0.5, 0.2, 0.0, 0.2, 0.5, 0.7, 0.5, 0.4, 0.5, 0.7, 0.8, 1.0],
  },
  DOUBLE_TOP: {
    type: 'reversal_top',
    expectedSignal: 'bearish',
    series: [0.0, 0.3, 0.6, 0.9, 1.0, 0.8, 0.5, 0.4, 0.5, 0.8, 1.0, 0.9, 0.6, 0.3, 0.0],
  },
  DOUBLE_BOTTOM: {
    type: 'reversal_bottom',
    expectedSignal: 'bullish',
    series: [1.0, 0.7, 0.4, 0.1, 0.0, 0.2, 0.5, 0.6, 0.5, 0.2, 0.0, 0.1, 0.4, 0.7, 1.0],
  },
  ASCENDING_TRIANGLE: {
    type: 'continuation',
    expectedSignal: 'bullish',
    series: [0.0, 0.5, 1.0, 0.6, 0.2, 0.6, 1.0, 0.65, 0.35, 0.7, 1.0, 0.7, 0.5, 0.75, 1.0],
  },
  DESCENDING_TRIANGLE: {
    type: 'continuation',
    expectedSignal: 'bearish',
    series: [1.0, 0.5, 0.0, 0.4, 0.8, 0.4, 0.0, 0.35, 0.65, 0.3, 0.0, 0.3, 0.5, 0.25, 0.0],
  },
  FLAG_BULLISH: {
    type: 'continuation',
    expectedSignal: 'bullish',
    series: [0.0, 0.1, 0.3, 0.6, 0.85, 1.0, 0.95, 0.9, 0.85, 0.8, 0.78, 0.82, 0.8, 0.78, 0.82],
  },
  V_REVERSAL: {
    type: 'reversal_bottom',
    expectedSignal: 'bullish',
    series: [1.0, 0.8, 0.6, 0.3, 0.1, 0.0, 0.1, 0.3, 0.6, 0.8, 1.0],
  },
};

const FALLBACK_META: Meta = {
  type: 'bilateral',
  expectedSignal: 'neutral',
  series: [],
};

/** 把后端 raw 模板与前端 meta 合并为完整 PatternTemplate */
export const enrichPatternTemplate = (raw: PatternTemplateRaw): PatternTemplate => {
  const meta = PATTERN_TEMPLATE_META[raw.id] ?? FALLBACK_META;
  return { ...raw, ...meta };
};

export const PATTERN_TYPE_LABELS: Record<PatternTemplateType, string> = {
  reversal_top: '顶部反转',
  reversal_bottom: '底部反转',
  continuation: '持续形态',
  bilateral: '双向形态',
};

export const PATTERN_TYPE_FILTERS: { value: 'all' | PatternTemplateType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'reversal_top', label: '顶部反转' },
  { value: 'reversal_bottom', label: '底部反转' },
  { value: 'continuation', label: '持续形态' },
  { value: 'bilateral', label: '双向形态' },
];

/** scope=INDEX 候选指数（A 股研究最常用 6 项） */
export const PATTERN_INDEX_OPTIONS: { code: string; label: string }[] = [
  { code: '000300.SH', label: '沪深 300' },
  { code: '000905.SH', label: '中证 500' },
  { code: '000852.SH', label: '中证 1000' },
  { code: '000016.SH', label: '上证 50' },
  { code: '399006.SZ', label: '创业板指' },
  { code: '000688.SH', label: '科创 50' },
];
