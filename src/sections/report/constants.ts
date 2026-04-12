import type { ReportType, ReportFormat, ReportStatus } from 'src/api/report';

// ── 报告类型中文标签 ──────────────────────────────────────────

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  BACKTEST: '回测报告',
  STOCK: '个股研报',
  PORTFOLIO: '组合报告',
  STRATEGY_RESEARCH: '策略研究',
};

// ── 报告类型颜色 ──────────────────────────────────────────────

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  BACKTEST: 'primary',
  STOCK: 'info',
  PORTFOLIO: 'warning',
  STRATEGY_RESEARCH: 'secondary',
};

// ── 报告格式选项 ──────────────────────────────────────────────

export const REPORT_FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: 'JSON', label: 'JSON（在线查看）' },
  { value: 'HTML', label: 'HTML（网页）' },
  { value: 'PDF', label: 'PDF（文档）' },
];

// ── 报告状态配置 ──────────────────────────────────────────────

export const REPORT_STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  PENDING: { label: '等待中', color: 'default' },
  GENERATING: { label: '生成中', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  FAILED: { label: '失败', color: 'error' },
};

// ── 文件大小格式化 ────────────────────────────────────────────

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
