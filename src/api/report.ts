import { apiClient } from './client';

// ── Enums ─────────────────────────────────────────────────────

export type ReportType = 'BACKTEST' | 'STOCK' | 'PORTFOLIO' | 'STRATEGY_RESEARCH';

export type ReportFormat = 'JSON' | 'HTML' | 'PDF';

export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

// ── Report Model ──────────────────────────────────────────────

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
  }[];
  endPositions: {
    tsCode: string;
    name: string | null;
    quantity: number;
    avgCost: number;
    marketValue: number;
    weight: number;
  }[];
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
