// 工具函数集合：日期默认、CSV 导出、错误信息提取

import dayjs from 'dayjs';

// ----------------------------------------------------------------------
// 默认交易日（周末回退到周五）
// ----------------------------------------------------------------------

export function defaultTradeDate(): dayjs.Dayjs {
  let d = dayjs();
  // 周日 → 周五；周六 → 周五
  while (d.day() === 0 || d.day() === 6) {
    d = d.subtract(1, 'day');
  }
  return d;
}

// ----------------------------------------------------------------------
// 时间窗预设
// ----------------------------------------------------------------------

export function presetToRange(preset: '1M' | '3M' | '6M' | '1Y'): {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
} {
  const end = defaultTradeDate();
  const map = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 } as const;
  return { start: end.subtract(map[preset], 'month'), end };
}

// ----------------------------------------------------------------------
// 错误信息提取（apiClient 把 backend message 抛成 Error）
// ----------------------------------------------------------------------

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

// ----------------------------------------------------------------------
// CSV 导出（≤30 行；不引入 papaparse）
// ----------------------------------------------------------------------

function escapeCsvField(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(v) : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null>>
): void {
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((r) => r.map(escapeCsvField).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------
// 格式化数字
// ----------------------------------------------------------------------

export function fPct(v: number | null | undefined): string {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

export function f4(v: number | null | undefined): string {
  if (v == null) return '--';
  return v.toFixed(4);
}

// ----------------------------------------------------------------------
// 校验 ts_code 列表（6 位数字 + . + 交易所）
// ----------------------------------------------------------------------

const TS_CODE_RE = /^\d{6}\.(SH|SZ|BJ)$/i;

export function parseTsCodes(text: string): { valid: string[]; invalid: string[] } {
  const tokens = text
    .split(/[\n,;，；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const upper = t.toUpperCase();
    if (TS_CODE_RE.test(upper)) {
      if (!seen.has(upper)) {
        valid.push(upper);
        seen.add(upper);
      }
    } else {
      invalid.push(t);
    }
  }
  return { valid, invalid };
}
