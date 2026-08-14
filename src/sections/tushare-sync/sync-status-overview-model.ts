import type {
  SyncLogItem,
  OperationsFreshnessItem,
} from 'src/api/tushare-sync';

export type SyncLogNavigationHandler = (filters?: {
  task?: string;
  status?: SyncLogItem['status'];
  startDate?: string;
  endDate?: string;
}) => void;

export const SYNC_FRESHNESS_STATUS_META = {
  READY: { label: '已就绪', color: 'success' as const },
  SYNCING: { label: '同步中', color: 'info' as const },
  WAITING: { label: '待同步', color: 'default' as const },
  LATE: { label: '已延迟', color: 'warning' as const },
  FAILED: { label: '失败', color: 'error' as const },
  BLOCKED: { label: '阻塞', color: 'error' as const },
  EMPTY: { label: '无数据', color: 'warning' as const },
  UNKNOWN: { label: '未知', color: 'default' as const },
};

export const SYNC_RUNTIME_META = {
  IDLE: { label: '当前空闲', color: 'success' as const, icon: 'solar:check-circle-bold' as const },
  QUEUED: { label: '任务排队中', color: 'warning' as const, icon: 'solar:history-bold' as const },
  RUNNING: { label: '正在同步', color: 'info' as const, icon: 'solar:refresh-circle-bold' as const },
  STALE: { label: '运行态失联', color: 'error' as const, icon: 'solar:danger-triangle-bold' as const },
  UNKNOWN: { label: '状态未知', color: 'default' as const, icon: 'solar:question-circle-bold' as const },
};

export const EXACT_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const DATASET_LABELS: Record<string, string> = {
  STOCK_DAILY: 'A股日线行情',
  STOCK_DAILY_BASIC: '每日行情指标',
  STOCK_ADJ_FACTOR: '复权因子',
  STOCK_TECHNICAL_FACTOR: '技术因子',
  STOCK_MONEYFLOW: '个股资金流向',
  FINANCIAL_INDICATOR: '财务指标',
  INCOME_STATEMENT: '利润表',
  BALANCE_SHEET: '资产负债表',
  CASHFLOW: '现金流量表',
  INDEX_DAILY: '核心指数日线',
  SECTOR_DAILY: '同花顺板块日线',
  MARKET_MONEYFLOW: '市场资金流向',
  HSGT: '沪深港通资金流',
  MARGIN_DETAIL: '融资融券明细',
  CYQ_PERF: '筹码获利比例',
  CYQ_CHIPS: '筹码分布',
};

const SYNC_LOG_STATUS_META: Record<
  string,
  { label: string; color: 'success' | 'error' | 'default' }
> = {
  SUCCESS: { label: '同步成功', color: 'success' },
  FAILED: { label: '同步失败', color: 'error' },
  SKIPPED: { label: '已跳过', color: 'default' },
};

export function formatSyncTradeDate(value: string | null): string {
  if (!value || value.length !== 8) return '—';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
}

export function formatSyncDuration(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / 60000);
  return minutes < 60
    ? `${minutes} 分钟`
    : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

export function resolveSyncDatasetLabel(dataset: string, fallback?: string): string {
  return DATASET_LABELS[dataset] ?? fallback ?? '未命名数据接口';
}

export function formatSyncAttentionDetail(
  fallback: string,
  lagTradingDays: number | null,
  freshnessItem?: OperationsFreshnessItem
): string {
  if (freshnessItem?.status === 'LATE') {
    const lagText =
      lagTradingDays === null ? '数据未按期更新' : `落后 ${lagTradingDays} 个交易日`;
    return `${lagText} · 当前至 ${formatSyncTradeDate(freshnessItem.dataThrough)}`;
  }
  if (freshnessItem?.status === 'FAILED') return '最近一次同步失败，请查看日志定位原因';
  if (freshnessItem?.status === 'EMPTY') return '尚无可用数据，请检查同步计划';
  if (freshnessItem?.status === 'SYNCING') return '同步任务正在执行，可查看实时进度';
  return (
    fallback.replace(/\b(?:LATE|FAILED|EMPTY|SYNCING|UNKNOWN)\b/g, '').trim() ||
    '需要检查数据状态'
  );
}

export function resolveRecentSyncTaskLabel(
  task: string,
  freshness: OperationsFreshnessItem[]
): string {
  const item = freshness.find((entry) => entry.sourceTask === task);
  return item ? resolveSyncDatasetLabel(item.dataset, item.displayName) : '最近同步任务';
}

export function resolveSyncLogStatus(status: string) {
  return SYNC_LOG_STATUS_META[status] ?? { label: '状态未知', color: 'default' as const };
}
