import type { MessageBlock } from 'src/types/agent/generated';

import { parseMessageBlock } from 'src/types/agent/generated';

export type SupportedMessageBlock = MessageBlock;

export type MessageBlockParseResult =
  | { ok: true; block: SupportedMessageBlock }
  | { ok: false; reason: string };

const UI_LIMITS = {
  markdownCharacters: 60_000,
  tableColumns: 24,
  tableRows: 200,
  tableCellCharacters: 2_000,
  chartSeries: 8,
  chartPoints: 1_200,
  klineBars: 600,
  financialPeriods: 16,
  financialMetricsPerPeriod: 30,
  riskCharacters: 4_000,
} as const;

function rejectOversizedBlock(block: MessageBlock): string | null {
  if (block.type === 'MARKDOWN') {
    return block.text.length > UI_LIMITS.markdownCharacters ? 'Markdown 内容超过展示上限' : null;
  }

  if (block.type === 'TABLE') {
    if (block.columns.length > UI_LIMITS.tableColumns) return '表格列数超过展示上限';
    if (block.rows.length > UI_LIMITS.tableRows) return '表格行数超过展示上限';
    const hasLongCell = block.rows.some((row) =>
      Object.values(row).some(
        (value) => typeof value === 'string' && value.length > UI_LIMITS.tableCellCharacters
      )
    );
    return hasLongCell ? '表格单元格内容超过展示上限' : null;
  }

  if (block.type === 'CHART') {
    if (block.series.length > UI_LIMITS.chartSeries) return '图表系列数超过展示上限';
    const pointCount = block.series.reduce((total, series) => total + series.points.length, 0);
    return pointCount > UI_LIMITS.chartPoints ? '图表点数超过展示上限' : null;
  }

  if (block.type === 'KLINE') {
    return block.bars.length > UI_LIMITS.klineBars ? 'K 线点数超过展示上限' : null;
  }

  if (block.type === 'FINANCIAL_METRICS') {
    if (block.periods.length > UI_LIMITS.financialPeriods) return '财务报告期超过展示上限';
    const oversized = block.periods.some(
      (period) => period.metrics.length > UI_LIMITS.financialMetricsPerPeriod
    );
    return oversized ? '单期财务指标超过展示上限' : null;
  }

  return block.text.length > UI_LIMITS.riskCharacters ? '风险提示内容超过展示上限' : null;
}

export function parseSupportedMessageBlock(input: unknown): MessageBlockParseResult {
  try {
    const block = parseMessageBlock(input);
    const limitIssue = rejectOversizedBlock(block);
    if (limitIssue) return { ok: false, reason: limitIssue };
    return { ok: true, block };
  } catch {
    return { ok: false, reason: '内容块版本未知或结构不合法' };
  }
}

export function isSupportedMessageBlock(input: unknown): input is SupportedMessageBlock {
  return parseSupportedMessageBlock(input).ok;
}
