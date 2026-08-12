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
    totalReturn: number | null;
    annualReturn: number | null;
    sharpe: number | null;
    maxDrawdown: number | null;
    winRate: number | null;
    profitLossRatio: number | null;
    tradeCount: number | null;
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
    avgCost: number | null;
    marketValue: number | null;
    weight: number | null;
  }[];
  // ── v2 optional sections ─────────────────────────────────────
  benchmarkCurve?: { date: string; nav: number }[] | null;
  yearlyReturns?: { year: string; strategy: number; benchmark: number | null }[] | null;
};

export type StockReportData = {
  overview: {
    tsCode: string;
    name: string | null;
    industry: string | null;
    listDate: string | null;
    area: string | null;
  };
  priceHistory: {
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }[];
  financialSummary: {
    period: string;
    roe: number | null;
    netProfitMargin: number | null;
    revenueYoyGrowth: number | null;
  }[];
  top10Holders: {
    holderName: string | null;
    holdAmount: number | null;
    holdRatio: number | null;
  }[];
  dividends: {
    endDate: string | null;
    divProc: string | null;
    cashDivTax: number | null;
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
    initialCash: number | null;
    totalMarketValue: number | null;
    totalCost: number | null;
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
      strategyType: string;
      description: string | null;
      backtestRunId: string;
      portfolioId: string | null;
      createdAt: string;
    };
    /** 策略研究采集器返回百分点（20 表示 20%），不是 0–1 比例。 */
    backtestPerformance: {
      totalReturn: number | null;
      annualReturn: number | null;
      sharpe: number | null;
      maxDrawdown: number | null;
      informationRatio: number | null;
      winRate: number | null;
      volatility: number | null;
      benchmarkTsCode: string | null;
      benchmarkComparison: {
        annualReturn: number | null;
        volatility: number | null;
        excessReturn: number | null;
      } | null;
    } | null;
    holdingsAnalysis: {
      topHoldings: {
        tsCode: string;
        stockName: string | null;
        /** 百分点。 */
        weight: number | null;
      }[];
      industryDistribution: {
        industry: string;
        /** 百分点。 */
        weight: number;
      }[];
      snapshotDate: string;
    } | null;
    riskAssessment: {
      maxDrawdown: number | null;
      volatility: number | null;
      beta: number | null;
      var95: number | null;
      concentrationHHI: number | null;
      violations: unknown[];
    } | null;
    tradeLogs: {
      recentLogs: {
        tsCode: string;
        stockName: string | null;
        action: string;
        quantity: number;
        price: number | null;
        reason: string;
        createdAt: string;
      }[];
      summary: Array<{
        action: string;
        reason: string;
        tsCode: string;
        stockName: string | null;
        _count: { id: number };
      }>;
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
  return apiClient
    .post<Report>('/api/report/detail', params)
    .then((report) => normalizeReportDetail(report));
}

type BackendBacktestReportData = {
  strategy: {
    name: string;
    params: Record<string, unknown>;
    startDate: string;
    endDate: string;
    benchmark: string;
    initialCapital: number;
  };
  metrics: {
    totalReturn: number | null;
    annualizedReturn: number | null;
    benchmarkReturn: number | null;
    excessReturn: number | null;
    maxDrawdown: number | null;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    calmarRatio: number | null;
    winRate: number | null;
    tradeCount: number | null;
    volatility: number | null;
    alpha: number | null;
    beta: number | null;
  };
  navCurve: { dates: string[]; navValues: number[]; benchmarkValues: number[] };
  drawdownCurve: { dates: string[]; values: number[] };
  monthlyReturns: Array<{ year: number; month: number; return: number }>;
  trades: Array<{
    date: string;
    tsCode: string;
    side: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    amount: number;
  }>;
  endPositions: Array<{
    tsCode: string;
    quantity: number;
    weight: number | null;
    unrealizedPnl: number | null;
  }>;
};

type BackendPortfolioReportData = {
  overview: {
    id: string;
    name: string;
    description: string | null;
    totalMarketValue: number;
    totalCost: number;
    totalPnl: number;
    createdAt: string;
  };
  holdings: Array<{
    tsCode: string;
    name: string | null;
    quantity: number;
    costPrice: number;
    currentPrice: number | null;
    marketValue: number | null;
    weight: number | null;
    pnl: number | null;
    pnlPct: number | null;
  }>;
  industryDistribution: Array<{ industry: string; weight: number; count: number }>;
};

type BackendStockReportData = {
  overview: {
    tsCode: string;
    name: string | null;
    industry: string | null;
    listDate: string | null;
    area: string | null;
  };
  priceHistory: {
    dates: string[];
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
  };
  financialSummary: {
    periods: string[];
    roe: Array<number | null>;
    netProfitMargin: Array<number | null>;
    revenueYoyGrowth: Array<number | null>;
  } | null;
  top10Holders: Array<{
    holderName: string | null;
    holdAmount: number | null;
    holdRatio: number | null;
  }>;
  dividends: Array<{
    endDate: string | null;
    divProc: string | null;
    cashDivTax: number | null;
    stkDiv: number | null;
  }>;
};

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeReportDetail(report: Report): Report {
  if (!report.data) return report;

  if (report.type === 'BACKTEST') {
    if (Array.isArray(report.data.navCurve)) return report;
    const raw = report.data as unknown as BackendBacktestReportData;
    const dates = raw.navCurve?.dates ?? [];
    const drawdownDates = raw.drawdownCurve?.dates ?? [];
    const normalized: BacktestReportData = {
      strategy: {
        name: raw.strategy?.name ?? '未命名策略',
        description: null,
        params: raw.strategy?.params ?? {},
      },
      metrics: {
        totalReturn: raw.metrics?.totalReturn ?? null,
        annualReturn: raw.metrics?.annualizedReturn ?? null,
        sharpe: raw.metrics?.sharpeRatio ?? null,
        maxDrawdown: raw.metrics?.maxDrawdown ?? null,
        winRate: raw.metrics?.winRate ?? null,
        profitLossRatio: null,
        tradeCount: raw.metrics?.tradeCount ?? null,
        calmarRatio: raw.metrics?.calmarRatio ?? null,
        sortinoRatio: raw.metrics?.sortinoRatio ?? null,
        volatility: raw.metrics?.volatility ?? null,
        informationRatio: null,
        beta: raw.metrics?.beta ?? null,
        alpha: raw.metrics?.alpha ?? null,
        benchmarkReturn: raw.metrics?.benchmarkReturn ?? null,
      },
      navCurve: dates.flatMap((date, index) => {
        const nav = raw.navCurve?.navValues[index];
        return Number.isFinite(nav) ? [{ date, nav }] : [];
      }),
      drawdownCurve: drawdownDates.flatMap((date, index) => {
        const drawdown = raw.drawdownCurve?.values[index];
        return Number.isFinite(drawdown) ? [{ date, drawdown }] : [];
      }),
      monthlyReturns: (raw.monthlyReturns ?? []).map((item) => ({
        month: `${item.year}-${String(item.month).padStart(2, '0')}`,
        return: item.return,
      })),
      trades: (raw.trades ?? []).map((item) => ({
        date: item.date,
        tsCode: item.tsCode,
        name: null,
        direction: item.side,
        price: item.price,
        quantity: item.quantity,
        amount: item.amount,
        pnl: null,
      })),
      endPositions: (raw.endPositions ?? []).map((item) => ({
        tsCode: item.tsCode,
        name: null,
        quantity: item.quantity,
        avgCost: null,
        marketValue: null,
        weight: item.weight,
      })),
    };

    return { ...report, data: normalized as unknown as Record<string, unknown> };
  }

  if (report.type === 'PORTFOLIO') {
    if (
      report.data.overview &&
      typeof report.data.overview === 'object' &&
      'initialCash' in report.data.overview
    ) {
      return report;
    }
    const raw = report.data as unknown as BackendPortfolioReportData;
    const normalized: PortfolioReportData = {
      overview: {
        name: raw.overview?.name ?? '未命名组合',
        description: raw.overview?.description ?? null,
        initialCash: null,
        totalMarketValue: raw.overview?.totalMarketValue ?? null,
        totalCost: raw.overview?.totalCost ?? null,
        unrealizedPnl: raw.overview?.totalPnl ?? null,
        holdingCount: raw.holdings?.length ?? 0,
        createdAt: raw.overview?.createdAt ?? '',
      },
      holdings: (raw.holdings ?? []).map((item) => ({
        tsCode: item.tsCode,
        name: item.name ?? item.tsCode,
        quantity: item.quantity,
        avgCost: item.costPrice,
        currentPrice: item.currentPrice,
        marketValue: item.marketValue,
        pnlPct: item.pnlPct,
        weight: item.weight,
        industry: null,
      })),
      industryDistribution: (raw.industryDistribution ?? []).map((item) => ({
        industry: item.industry,
        stockCount: item.count,
        totalMarketValue: null,
        weight: item.weight,
      })),
    };

    return { ...report, data: normalized as unknown as Record<string, unknown> };
  }

  if (report.type === 'STOCK') {
    if (Array.isArray(report.data.priceHistory)) return report;

    const raw = report.data as unknown as BackendStockReportData;
    const priceHistory = raw.priceHistory;
    const financialSummary = raw.financialSummary;
    const normalized: StockReportData = {
      overview: {
        tsCode: raw.overview?.tsCode ?? '',
        name: raw.overview?.name ?? null,
        industry: raw.overview?.industry ?? null,
        listDate: raw.overview?.listDate ?? null,
        area: raw.overview?.area ?? null,
      },
      priceHistory: (priceHistory?.dates ?? []).map((date, index) => ({
        date,
        open: finiteNumberOrNull(priceHistory?.opens[index]),
        high: finiteNumberOrNull(priceHistory?.highs[index]),
        low: finiteNumberOrNull(priceHistory?.lows[index]),
        close: finiteNumberOrNull(priceHistory?.closes[index]),
        volume: finiteNumberOrNull(priceHistory?.volumes[index]),
      })),
      financialSummary: (financialSummary?.periods ?? []).map((period, index) => ({
        period,
        roe: finiteNumberOrNull(financialSummary?.roe[index]),
        netProfitMargin: finiteNumberOrNull(financialSummary?.netProfitMargin[index]),
        revenueYoyGrowth: finiteNumberOrNull(financialSummary?.revenueYoyGrowth[index]),
      })),
      top10Holders: (raw.top10Holders ?? []).map((holder) => ({
        holderName: holder.holderName ?? null,
        holdAmount: finiteNumberOrNull(holder.holdAmount),
        holdRatio: finiteNumberOrNull(holder.holdRatio),
      })),
      dividends: (raw.dividends ?? []).map((dividend) => ({
        endDate: dividend.endDate ?? null,
        divProc: dividend.divProc ?? null,
        cashDivTax: finiteNumberOrNull(dividend.cashDivTax),
        stkDiv: finiteNumberOrNull(dividend.stkDiv),
      })),
    };

    return { ...report, data: normalized as unknown as Record<string, unknown> };
  }

  return report;
}

/** 删除报告 */
export function deleteReport(params: { reportId: string }) {
  return apiClient.post<{ deleted: true }>('/api/report/delete', params);
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

export type ReportScheduleListResult = {
  items: ReportSchedule[];
  total: number;
};

/** 查询定时报告列表 */
export async function listSchedules(): Promise<ReportSchedule[]> {
  const result = await apiClient.post<ReportSchedule[] | ReportScheduleListResult>(
    '/api/report/schedules/list',
    {}
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;

  throw new Error('定时报告列表响应格式错误');
}
