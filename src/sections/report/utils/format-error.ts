import type { ReportType } from 'src/api/report';

import { paths } from 'src/routes/paths';

// ─── Error code translation dictionary ─────────────────────────────────────
//
// Backend emits machine-readable codes alongside the raw `errorMessage`.
// The UI translates them into user-friendly Chinese with an optional
// "next-step action" (a label + a destination path the user can jump to).
//
// When the backend has not yet wired the new `errorCode` field, we fall
// back to a generic translation so users still see a friendly message
// instead of a raw stack trace.

export type ReportErrorAction = {
  label: string;
  /** Internal route path; clicked via router.push */
  href?: string;
  /** External-style hint when no concrete jump destination */
  hint?: string;
};

export type ReportErrorTranslation = {
  /** Friendly Chinese summary */
  title: string;
  /** Optional follow-up sentence */
  description?: string;
  /** Optional recommended action */
  action?: ReportErrorAction;
};

const DICT: Record<string, ReportErrorTranslation> = {
  REPORT_DEPENDENCY_MISSING: {
    title: '关联资源不存在',
    description: '生成报告所依赖的回测 / 组合 / 策略已被删除。',
    action: { label: '返回报告列表', href: paths.research.report.list },
  },
  REPORT_DATA_INSUFFICIENT: {
    title: '数据不足，无法生成完整报告',
    description: '区间内可用交易日 / 行情 / 财务数据过少，请扩大时间范围或补全数据。',
  },
  REPORT_BACKTEST_NOT_FINISHED: {
    title: '回测尚未跑完',
    description: '请等待回测进入「已完成」状态后再生成报告。',
  },
  REPORT_RENDER_FAILED: {
    title: '文件渲染失败',
    description: 'PDF / HTML 渲染过程出错。可改用 JSON 格式查看，或重新生成。',
  },
  REPORT_TIMEOUT: {
    title: '报告生成超时',
    description: '后台任务在限定时间内未完成。可重新生成；若反复失败请联系管理员。',
  },
  REPORT_INTERNAL_ERROR: {
    title: '后端内部错误',
    description: '请稍后重试；若反复失败请联系管理员。',
  },
};

/** Heuristic fall-back translation when no errorCode is supplied. */
function fallbackFromMessage(raw: string | null | undefined): ReportErrorTranslation {
  if (!raw) return { title: '生成失败', description: '未知错误。' };
  const text = raw.toLowerCase();
  if (text.includes('timeout') || text.includes('超时')) {
    return DICT.REPORT_TIMEOUT;
  }
  if (text.includes('not found') || text.includes('不存在')) {
    return DICT.REPORT_DEPENDENCY_MISSING;
  }
  if (text.includes('insufficient') || text.includes('数据不足')) {
    return DICT.REPORT_DATA_INSUFFICIENT;
  }
  return { title: '生成失败', description: raw };
}

export function translateReportError(
  errorCode: string | null | undefined,
  errorMessage: string | null | undefined
): ReportErrorTranslation {
  if (errorCode && DICT[errorCode]) return DICT[errorCode];
  return fallbackFromMessage(errorMessage);
}

// ─── Per-type "fix-it" actions ─────────────────────────────────────────────
//
// Even when there's no specific errorCode, we can suggest a sensible
// "next step" based on the report type. Used by the FAILED card.

export function defaultRetryHintByType(type: ReportType): ReportErrorAction | undefined {
  switch (type) {
    case 'BACKTEST':
      return { label: '检查回测任务', href: '/strategies/runs' };
    case 'STOCK':
      return { label: '检查股票数据', hint: '可在数据同步管理中触发补数' };
    case 'PORTFOLIO':
      return { label: '检查组合', href: '/portfolio' };
    case 'STRATEGY_RESEARCH':
      return { label: '检查策略与回测', href: '/strategies' };
    default:
      return undefined;
  }
}
