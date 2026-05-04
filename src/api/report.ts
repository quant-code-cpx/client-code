import { apiClient } from './client';

// ── Enums ─────────────────────────────────────────────────────

export type ReportType = 'BACKTEST' | 'STOCK' | 'PORTFOLIO' | 'STRATEGY_RESEARCH';

export type ReportFormat = 'JSON' | 'HTML' | 'PDF';

export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

// ── Report Model ──────────────────────────────────────────────

/**
 * Generation progress payload (v2). Only present while status is
 * `PENDING` / `GENERATING`. Backend emits stage transitions so the UI can
 * show fine-grained progress instead of a generic spinner.
 */
export type ReportProgress = {
  /** machine-readable stage key, e.g. 'loading' / 'computing' / 'rendering' / 'persisting' */
  stage: string;
  /** 0–100 (not 0–1) */
  percent: number;
  /** optional human-readable label, e.g. "渲染图表中" */
  label?: string | null;
  /** optional ETA seconds */
  etaSeconds?: number | null;
};

export type Report = {
  id: string;
  userId: number;
  type: ReportType;
  title: string;
  params: Record<string, unknown>;
  data: Record<string, unknown> | null;
  filePath: string | null;
  format: ReportFormat;
  status: ReportStatus;
  errorMessage: string | null;
  fileSize: number | null;
  createdAt: string;
  completedAt: string | null;
  // ── v2 optional fields (degrade gracefully if absent) ───────────
  /** Hash of canonicalised params, used for grouping versions of the same series */
  paramsHash?: string | null;
  /** Version number within the same (type, paramsHash) series, 1-indexed */
  version?: number | null;
  /** Machine-readable error code (see resources/format-error dictionary) */
  errorCode?: string | null;
  /** Generation progress, only when status is PENDING/GENERATING */
  progress?: ReportProgress | null;
  /** User markdown notes attached to this report */
  notes?: string | null;
  notesUpdatedAt?: string | null;
};

export type ReportListItem = {
  id: string;
  type: ReportType;
  title: string;
  format: ReportFormat;
  status: ReportStatus;
  fileSize: number | null;
  createdAt: string;
  completedAt: string | null;
  // v2 optional
  paramsHash?: string | null;
  version?: number | null;
  errorCode?: string | null;
};

// ── Report Data Types ─────────────────────────────────────────

export type BacktestReportData = {
  strategy: {
    name: string;
    description: string | null;
    params: Record<string, unknown>;
  };
  metrics: {
    totalReturn: number;
    annualReturn: number;
    sharpe: number;
    maxDrawdown: number;
    winRate: number;
    profitLossRatio: number;
    tradeCount: number;
    calmarRatio: number | null;
    sortinoRatio: number | null;
    // ── v2 optional risk / benchmark metrics (null when missing) ──
    volatility?: number | null;
    downsideDeviation?: number | null;
    informationRatio?: number | null;
    beta?: number | null;
    alpha?: number | null;
    benchmarkReturn?: number | null;
    benchmarkAnnualReturn?: number | null;
    turnover?: number | null;
    hhi?: number | null;
  };
  navCurve: { date: string; nav: number }[];
  drawdownCurve: { date: string; drawdown: number }[];
  monthlyReturns: { month: string; return: number }[];
  trades: {
    date: string;
    tsCode: string;
    name: string | null;
    direction: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    amount: number;
    pnl: number | null;
    // v2 optional
    commission?: number | null;
    slippage?: number | null;
    tax?: number | null;
    fillType?: 'OPEN' | 'CLOSE' | 'VWAP' | 'TWAP' | null;
  }[];
  endPositions: {
    tsCode: string;
    name: string | null;
    quantity: number;
    avgCost: number;
    marketValue: number;
    weight: number;
  }[];
  // ── v2 optional sections ─────────────────────────────────────
  benchmarkCurve?: { date: string; nav: number }[] | null;
  yearlyReturns?: { year: string; strategy: number; benchmark: number | null }[] | null;
};

export type StockReportData = {
  overview: {
    tsCode: string;
    name: string;
    industry: string | null;
    market: string | null;
    listDate: string | null;
    totalShare: number | null;
    floatShare: number | null;
    totalMv: number | null;
    circMv: number | null;
  };
  priceHistory: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
  }[];
  financialSummary: {
    period: string;
    revenue: number | null;
    netProfit: number | null;
    roe: number | null;
    eps: number | null;
    bps: number | null;
    debtRatio: number | null;
  }[];
  top10Holders: {
    holderName: string;
    holdAmount: number;
    holdRatio: number;
  }[];
  dividends: {
    exDate: string;
    cashDiv: number | null;
    stkDiv: number | null;
  }[];
  // ── v2 optional sections ─────────────────────────────────────
  valuation?: {
    history: { date: string; pe: number | null; pb: number | null; ps: number | null }[];
    industryPercentile: { pe: number | null; pb: number | null; ps: number | null };
  } | null;
  peerComparison?: {
    industry: string;
    peers: {
      tsCode: string;
      name: string;
      marketCap: number | null;
      pe: number | null;
      pb: number | null;
      revenueGrowthYoy: number | null;
      netProfitGrowthYoy: number | null;
      roe: number | null;
    }[];
  } | null;
};

export type PortfolioReportData = {
  overview: {
    name: string;
    description: string | null;
    initialCash: number;
    totalMarketValue: number | null;
    totalCost: number;
    unrealizedPnl: number | null;
    holdingCount: number;
    createdAt: string;
  };
  holdings: {
    tsCode: string;
    name: string;
    quantity: number;
    avgCost: number;
    currentPrice: number | null;
    marketValue: number | null;
    pnlPct: number | null;
    weight: number | null;
    industry: string | null;
  }[];
  industryDistribution: {
    industry: string;
    stockCount: number;
    totalMarketValue: number | null;
    weight: number | null;
  }[];
  // ── v2 optional sections ─────────────────────────────────────
  attribution?: {
    byIndustry: { industry: string; contribution: number }[];
    byStock: { tsCode: string; name: string; contribution: number }[];
    totalReturn: number;
    benchmarkReturn: number | null;
  } | null;
  tracking?: {
    benchmark: string | null;
    trackingError: number | null;
    informationRatio: number | null;
    maxRelativeDrawdown: number | null;
    relativeNavCurve: { date: string; relative: number }[] | null;
  } | null;
};

export type StrategyResearchReportData = {
  title: string;
  generatedAt: string;
  sections: {
    overview: {
      strategyName: string;
      description: string | null;
      backtestPeriod: string;
      benchmark: string | null;
    };
    backtestPerformance?: {
      totalReturn: number;
      annualReturn: number;
      sharpe: number;
      maxDrawdown: number;
      winRate: number;
      tradeCount: number;
      navCurve: { date: string; nav: number }[];
      drawdownCurve: { date: string; drawdown: number }[];
    };
    holdingsAnalysis?: {
      endPositions: {
        tsCode: string;
        name: string | null;
        quantity: number;
        weight: number;
        marketValue: number;
      }[];
      industryDistribution: {
        industry: string;
        weight: number;
      }[];
    };
    riskAssessment?: {
      maxDrawdown: number;
      volatility: number;
      beta: number | null;
      var95: number | null;
      calmarRatio: number | null;
      sortinoRatio: number | null;
    };
    tradeLogs?: {
      date: string;
      tsCode: string;
      name: string | null;
      direction: 'BUY' | 'SELL';
      price: number;
      quantity: number;
      amount: number;
      pnl: number | null;
    }[];
    // ── v2 optional sections ─────────────────────────────────────
    factorExposure?: {
      factors: { name: string; exposure: number; tStat: number | null }[];
    } | null;
    parameterSensitivity?: {
      metric: 'sharpe' | 'totalReturn' | 'maxDrawdown';
      axis: { paramName: string; values: (number | string)[] };
      series?: { paramName: string; values: (number | string)[]; matrix: number[][] } | null;
    } | null;
    rollingStability?: {
      windowDays: number;
      series: {
        end: string;
        sharpe: number | null;
        annualReturn: number | null;
        maxDrawdown: number | null;
      }[];
    } | null;
  };
};

// ── Request Params ────────────────────────────────────────────

export type CreateBacktestReportParams = {
  runId: string;
  title?: string;
  format?: ReportFormat;
};

export type CreateStockReportParams = {
  tsCode: string;
  title?: string;
  format?: ReportFormat;
};

export type CreatePortfolioReportParams = {
  portfolioId: string;
  title?: string;
  format?: ReportFormat;
};

export type CreateStrategyResearchReportParams = {
  backtestRunId: string;
  strategyId?: string;
  portfolioId?: string;
  title?: string;
  format?: ReportFormat;
  sections?: {
    performance?: boolean;
    holdings?: boolean;
    riskAssessment?: boolean;
    tradeLog?: boolean;
    // v2 optional sections
    factorExposure?: boolean;
    parameterSensitivity?: boolean;
    rollingStability?: boolean;
  };
};

export type ListReportsParams = {
  type?: ReportType;
  page?: number;
  pageSize?: number;
  // v2 optional server-side filters; UI degrades to client-side filtering when absent
  keyword?: string;
  statuses?: ReportStatus[];
  from?: string;
  to?: string;
  groupBy?: 'paramsHash';
};

export type ListReportsResult = {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
};

// ── API Functions ─────────────────────────────────────────────

/** 生成回测报告 */
export function createBacktestReport(params: CreateBacktestReportParams) {
  return apiClient.post<Report>('/api/report/backtest', params);
}

/** 生成个股研报 */
export function createStockReport(params: CreateStockReportParams) {
  return apiClient.post<Report>('/api/report/stock', params);
}

/** 生成组合报告 */
export function createPortfolioReport(params: CreatePortfolioReportParams) {
  return apiClient.post<Report>('/api/report/portfolio', params);
}

/** 生成策略研究报告 */
export function createStrategyResearchReport(params: CreateStrategyResearchReportParams) {
  return apiClient.post<Report>('/api/report/strategy-research', params);
}

/** 查询报告列表 */
export function listReports(params: ListReportsParams) {
  return apiClient.post<ListReportsResult>('/api/report/list', params);
}

/** 获取报告详情 */
export function getReportDetail(params: { reportId: string }) {
  return apiClient.post<Report>('/api/report/detail', params);
}

/** 删除报告 */
export function deleteReport(params: { reportId: string }) {
  return apiClient.post<{ deleted: true }>('/api/report/delete', params);
}

// ── v2 endpoints ──────────────────────────────────────────────

/** 保存报告批注（Markdown） */
export function saveReportNotes(params: { reportId: string; notes: string }) {
  return apiClient.post<{ notesUpdatedAt: string }>('/api/report/notes/save', params);
}

/** 重新生成（基于原 params 提交新版本） */
export function regenerateReport(params: { reportId: string }) {
  return apiClient.post<Report>('/api/report/regenerate', params);
}

export type ReportShareLink = {
  token: string;
  url: string;
  reportId: string;
  createdAt: string;
  expiresAt: string | null;
  allowDownload: boolean;
  revoked: boolean;
};

/** 创建只读分享链接 */
export function createReportShareLink(params: {
  reportId: string;
  ttlHours: number | null;
  allowDownload: boolean;
}) {
  return apiClient.post<ReportShareLink>('/api/report/share/create', params);
}

/** 查询本报告下的全部分享链接 */
export function listReportShareLinks(params: { reportId: string }) {
  return apiClient.post<ReportShareLink[]>('/api/report/share/list', params);
}

/** 吊销分享链接 */
export function revokeReportShareLink(params: { token: string }) {
  return apiClient.post<{ revoked: true }>('/api/report/share/revoke', params);
}

export type ReportDiffField = {
  key: string;
  label?: string;
  leftValue: number | string | null;
  rightValue: number | string | null;
  delta: number | null;
};

export type ReportDiffResult = {
  fields: ReportDiffField[];
  notes?: string;
};

/** 与另一份报告的对比 */
export function diffReports(params: { leftReportId: string; rightReportId: string }) {
  return apiClient.post<ReportDiffResult>('/api/report/diff', params);
}

// ── Scheduled Reports ─────────────────────────────────────────

export type ReportScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type ReportSchedule = {
  id: string;
  userId: number;
  type: ReportType;
  title: string;
  params: Record<string, unknown>;
  format: ReportFormat;
  frequency: ReportScheduleFrequency;
  /** cron 表达式，如 "0 18 * * 1-5" (工作日 18:00) */
  cronExpression: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
};

export type CreateScheduleBody = {
  type: ReportType;
  title: string;
  params: Record<string, unknown>;
  format: ReportFormat;
  frequency: ReportScheduleFrequency;
  cronExpression?: string;
};

export type UpdateScheduleBody = Partial<CreateScheduleBody> & {
  enabled?: boolean;
};

/** 查询定时报告列表 */
export function listSchedules() {
  return apiClient.post<ReportSchedule[]>('/api/report/schedules/list', {});
}

/** 创建定时报告 */
export function createSchedule(body: CreateScheduleBody) {
  return apiClient.post<ReportSchedule>('/api/report/schedules', body);
}

/** 更新定时报告 */
export function updateSchedule(id: string, body: UpdateScheduleBody) {
  return apiClient.post<ReportSchedule>('/api/report/schedules/update', { id, ...body });
}

/** 删除定时报告 */
export function deleteSchedule(id: string) {
  return apiClient.post<{ deleted: true }>('/api/report/schedules/delete', { id });
}

/** 立即运行一次 */
export function runScheduleNow(id: string) {
  return apiClient.post<Report>('/api/report/schedules/run-now', { id });
}
