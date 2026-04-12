import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type StockListItem = {
  tsCode: string;
  symbol: string | null;
  name: string | null;
  fullname: string | null;
  exchange: string | null;
  currType: string | null;
  market: string | null;
  industry: string | null;
  area: string | null;
  listStatus: string | null;
  listDate: string | null;
  latestTradeDate: string | null;
  isHs: string | null;
  cnspell: string | null;
  peTtm: number | null;
  pb: number | null;
  dvTtm: number | null;
  totalMv: number | null;
  circMv: number | null;
  turnoverRate: number | null;
  pctChg: number | null;
  amount: number | null;
  close: number | null;
  vol: number | null;
};

export type StockListResult = {
  page: number;
  pageSize: number;
  total: number;
  items: StockListItem[];
};

export type StockListQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  /** 交易所：SSE / SZSE / BSE */
  exchange?: string;
  /** 上市状态：L / D / P，默认 L */
  listStatus?: string;
  /** 行业（模糊匹配） */
  industry?: string;
  /** 地域（模糊匹配） */
  area?: string;
  /** 板块（模糊匹配） */
  market?: string;
  /** 沪深港通：N / H / S */
  isHs?: string;
  /** 排序字段，对应后端 StockSortBy 枚举值 */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

// ----------------------------------------------------------------------
// 股票详情 — 类型定义
// ----------------------------------------------------------------------

export type StockDetailBasic = {
  tsCode: string;
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  industry: string | null;
  market: string | null;
  area: string | null;
  listStatus: string | null;
  listDate: string | null;
  isHs: string | null;
};

export type StockDetailCompany = {
  chairman: string | null;
  manager: string | null;
  mainBusiness: string | null;
  introduction: string | null;
  province: string | null;
  city: string | null;
  website: string | null;
  employees: number | null;
  regCapital: number | null;
};

export type StockDetailLatestQuote = {
  tradeDate: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  preClose: number | null;
  change: number | null;
  pctChg: number | null;
  vol: number | null;
  amount: number | null;
};

export type StockDetailLatestValuation = {
  tradeDate: string | null;
  turnoverRate: number | null;
  turnoverRateF: number | null;
  volumeRatio: number | null;
  pe: number | null;
  peTtm: number | null;
  pb: number | null;
  ps: number | null;
  psTtm: number | null;
  dvRatio: number | null;
  dvTtm: number | null;
  totalShare: number | null;
  floatShare: number | null;
  freeShare: number | null;
  totalMv: number | null;
  circMv: number | null;
  limitStatus: number | null;
};

export type StockDetailLatestExpress = {
  annDate: string | null;
  endDate: string | null;
  revenue: number | null;
  nIncome: number | null;
  dilutedEps: number | null;
  dilutedRoe: number | null;
  yoyNetProfit: number | null;
  yoySales: number | null;
};

/** 股票详情 - 总览（基础信息 + 公司简介 + 最新行情 + 最新估值） */
export type StockDetailOverviewData = {
  basic: StockDetailBasic | null;
  company: StockDetailCompany | null;
  latestQuote: StockDetailLatestQuote | null;
  latestValuation: StockDetailLatestValuation | null;
  latestExpress: StockDetailLatestExpress | null;
};

/** K 线图单条数据 */
export type StockChartItem = {
  tradeDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  vol: number | null;
  amount: number | null;
  pctChg: number | null;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
};

/** K 线图数据 */
export type StockChartData = {
  tsCode: string;
  period: string;
  adjustType: string;
  items: StockChartItem[];
  /** 是否还有更早的历史数据（用于前端分页加载） */
  hasMore?: boolean;
};

/** 资金流向汇总 */
export type StockMoneyFlowSummary = {
  /** 5日净流入累计（万元） */
  netMfAmount5d: number;
  /** 20日净流入累计（万元） */
  netMfAmount20d: number;
  /** 60日净流入累计（万元） */
  netMfAmount60d: number;
};

/** 资金流向单日数据 */
export type StockMoneyFlowItem = {
  tradeDate: string;
  close: number | null;
  /** 涨跌幅（%） */
  pctChg: number | null;
  /** 净流入额（万元，Tushare net_mf_amount） */
  netMfAmount: number | null;
  /** 特大单买入（万元） */
  buyElgAmount: number | null;
  /** 特大单卖出（万元） */
  sellElgAmount: number | null;
  /** 大单买入（万元） */
  buyLgAmount: number | null;
  /** 大单卖出（万元） */
  sellLgAmount: number | null;
  /** 中单买入（万元） */
  buyMdAmount: number | null;
  /** 中单卖出（万元） */
  sellMdAmount: number | null;
  /** 小单买入（万元） */
  buySmAmount: number | null;
  /** 小单卖出（万元） */
  sellSmAmount: number | null;
};

/** 资金流向数据 */
export type StockMoneyFlowData = {
  tsCode: string;
  summary: StockMoneyFlowSummary;
  items: StockMoneyFlowItem[];
};

/** 今日资金流向 — 单笔规格分级 */
export type StockTodayFlowCategory = {
  /** 买入额（万元） */
  buyAmount: number | null;
  /** 卖出额（万元） */
  sellAmount: number | null;
  /** 净流入 = 买入 - 卖出（万元） */
  netAmount: number | null;
};

/** 今日资金流向数据 */
export type StockTodayFlowData = {
  tsCode: string;
  /** 最新交易日（ISO datetime，后端 Date 类型） */
  tradeDate: string;
  /** 超大单（≥100 万元/笔） */
  superLarge: StockTodayFlowCategory;
  /** 大单（20–100 万元/笔） */
  large: StockTodayFlowCategory;
  /** 中单（5–20 万元/笔） */
  medium: StockTodayFlowCategory;
  /** 小单（＜5 万元/笔，散户） */
  small: StockTodayFlowCategory;
  /** 主力合计 = 超大单 + 大单 */
  mainForce: StockTodayFlowCategory;
  /** 全市场净流入额（万元，Tushare net_mf_amount） */
  netMfAmount: number | null;
};

/** 财务指标数据 */
export type StockFinancialsData = {
  tsCode: string;
  latest: Record<string, unknown> | null;
  history: Record<string, unknown>[];
  recentExpress: Record<string, unknown>[];
};

/** 股本股东数据 */
export type StockShareholdersData = {
  tsCode: string;
  dividendHistory: Record<string, unknown>[];
  top10Holders: Record<string, unknown>;
  top10FloatHolders: Record<string, unknown>;
};

/** 分红记录条目 */
export type StockDividendItem = {
  annDate: string | null;
  endDate: string | null;
  divProc: string | null;
  stkDiv: number | null;
  stkBoRate: number | null;
  stkCoRate: number | null;
  cashDiv: number | null;
  cashDivTax: number | null;
  recordDate: string | null;
  exDate: string | null;
  payDate: string | null;
  divListdate: string | null;
  impAnnDate: string | null;
  baseDate: string | null;
  baseShare: number | null;
};

/** 配股记录条目 */
export type StockAllotmentItem = {
  annDate: string | null;
  baseDate: string | null;
  baseEnddate: string | null;
  raiseFonds: number | null;
  allotmentRatio: number | null;
  allotmentPrice: number | null;
  allotmentVol: number | null;
  marketDate: string | null;
  stateDesc: string | null;
};

/** 分红与配股数据 */
export type StockDividendFinancingData = {
  tsCode: string;
  dividends: StockDividendItem[];
  allotments: StockAllotmentItem[];
};

/** 融资记录条目 */
export type StockFinancingItem = {
  eventType: string;
  announceDate: string | null;
  amount: number | null;
  price: number | null;
  shares: number | null;
  status: string | null;
};

/** 融资记录数据 */
export type StockFinancingData = {
  tsCode: string;
  items: StockFinancingItem[];
};

// ========== 分析 Tab — 技术指标 ==========

export type TechnicalDataPoint = {
  tradeDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  vol: number | null;
  amount: number | null;
  pctChg: number | null;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
  ma250: number | null;
  ema12: number | null;
  ema26: number | null;
  macdDif: number | null;
  macdDea: number | null;
  macdHist: number | null;
  kdjK: number | null;
  kdjD: number | null;
  kdjJ: number | null;
  rsi6: number | null;
  rsi12: number | null;
  rsi24: number | null;
  bollUpper: number | null;
  bollMid: number | null;
  bollLower: number | null;
  wr6: number | null;
  wr10: number | null;
  cci: number | null;
  dmiPdi: number | null;
  dmiMdi: number | null;
  dmiAdx: number | null;
  dmiAdxr: number | null;
  trix: number | null;
  trixMa: number | null;
  dma: number | null;
  dmaMa: number | null;
  bias6: number | null;
  bias12: number | null;
  bias24: number | null;
  obv: number | null;
  obvMa: number | null;
  vr: number | null;
  emv: number | null;
  emvMa: number | null;
  roc: number | null;
  rocMa: number | null;
  psy: number | null;
  psyMa: number | null;
  br: number | null;
  ar: number | null;
  cr: number | null;
  sar: number | null;
  sarBullish: boolean | null;
  volMa5: number | null;
  volMa10: number | null;
  volMa20: number | null;
  volumeRatio: number | null;
  atr14: number | null;
  hv20: number | null;
};

export type MaStatusSummary = {
  bullishAlign: boolean | null;
  bearishAlign: boolean | null;
  aboveMa20: boolean | null;
  aboveMa60: boolean | null;
  aboveMa250: boolean | null;
  latestCross: string | null;
};

export type SignalSummary = {
  macd: string | null;
  kdj: string | null;
  rsi: string | null;
  boll: string | null;
  wr: string | null;
  cci: string | null;
  dmi: string | null;
  sar: string | null;
  volumePrice: string | null;
};

export type StockTechnicalData = {
  tsCode: string;
  period: string;
  dataDate: string | null;
  maStatus: MaStatusSummary;
  signals: SignalSummary;
  history: TechnicalDataPoint[];
};

// ========== 分析 Tab — 择时信号 ==========

export type TimingSignalItem = {
  tradeDate: string;
  type: string;
  strength: number;
  source: string;
  description: string;
  closePrice: number | null;
};

export type TimingScoreDetail = {
  indicator: string;
  signal: string;
  score: number;
  reason: string;
};

export type TimingScoreSummary = {
  score: number;
  rating: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  details: TimingScoreDetail[];
};

export type StockTimingSignalsData = {
  tsCode: string;
  scoreSummary: TimingScoreSummary;
  signals: TimingSignalItem[];
};

// ========== 分析 Tab — 筹码分布 ==========

export type ChipConcentration = {
  range90Low: number | null;
  range90High: number | null;
  range70Low: number | null;
  range70High: number | null;
  score: number | null;
  profitRatio: number | null;
  avgCost: number | null;
};

export type ChipDistributionBin = {
  priceLow: number;
  priceHigh: number;
  percent: number;
  isProfit: boolean;
};

export type ChipKeyLevels = {
  peakPrice: number | null;
  resistanceHigh: number | null;
  resistanceLow: number | null;
  supportHigh: number | null;
  supportLow: number | null;
};

export type ChipDistributionData = {
  tsCode: string;
  tradeDate: string;
  currentPrice: number | null;
  concentration: ChipConcentration;
  distribution: ChipDistributionBin[];
  keyLevels: ChipKeyLevels;
  isEstimated: boolean;
};

// ========== 分析 Tab — 融资融券 ==========

export type MarginDailyItem = {
  tradeDate: string;
  rzye: number | null;
  rzmre: number | null;
  rzche: number | null;
  rzjmre: number | null;
  rqye: number | null;
  rqmcl: number | null;
  rqchl: number | null;
  rzrqye: number | null;
  close: number | null;
};

export type MarginSummary = {
  latestRzye: number | null;
  latestRqye: number | null;
  latestRzrqye: number | null;
  rzNetBuy5d: number | null;
  rzNetBuy20d: number | null;
  rzye5dChgPct: number | null;
  rzye20dChgPct: number | null;
  trend: string;
};

export type StockMarginData = {
  tsCode: string;
  summary: MarginSummary;
  history: MarginDailyItem[];
  available: boolean;
};

// ========== 分析 Tab — 相对强弱 ==========

export type RelativeStrengthPoint = {
  tradeDate: string;
  stockCumReturn: number;
  benchmarkCumReturn: number;
  excessReturn: number;
  rsRatio: number;
};

export type RelativeStrengthSummary = {
  stockTotalReturn: number | null;
  benchmarkTotalReturn: number | null;
  excessReturn: number | null;
  excess20d: number | null;
  annualizedVol: number | null;
  maxDrawdown: number | null;
  beta: number | null;
  informationRatio: number | null;
};

export type StockRelativeStrengthData = {
  tsCode: string;
  benchmarkCode: string;
  benchmarkName: string;
  summary: RelativeStrengthSummary;
  history: RelativeStrengthPoint[];
};

// ----------------------------------------------------------------------
// 三大财务报表类型
// ----------------------------------------------------------------------

/** 利润表单期数据（Tushare income 表，金额单位: 元） */
export type IncomeStatementItem = {
  endDate: string;
  annDate: string | null;
  reportType: string | null;
  totalRevenue: number | null;
  revenue: number | null;
  operateProfit: number | null;
  totalProfit: number | null;
  nIncome: number | null;
  nIncomeAttrP: number | null;
  basicEps: number | null;
  sellExp: number | null;
  adminExp: number | null;
  finExp: number | null;
  rdExp: number | null;
  ebit: number | null;
  ebitda: number | null;
  totalRevenueYoy: number | null;
  nIncomeYoy: number | null;
  operateProfitYoy: number | null;
};

/** 资产负债表单期数据（Tushare balancesheet 表，金额单位: 元） */
export type BalanceSheetItem = {
  endDate: string;
  annDate: string | null;
  reportType: string | null;
  totalAssets: number | null;
  totalCurAssets: number | null;
  totalNca: number | null;
  moneyCap: number | null;
  inventories: number | null;
  accountsReceiv: number | null;
  totalLiab: number | null;
  totalCurLiab: number | null;
  totalNcl: number | null;
  stBorr: number | null;
  ltBorr: number | null;
  totalHldrEqyExcMinInt: number | null;
  totalHldrEqyIncMinInt: number | null;
  totalAssetsYoy: number | null;
  equityYoy: number | null;
};

/** 现金流量表单期数据（Tushare cashflow 表，金额单位: 元） */
export type CashflowItem = {
  endDate: string;
  annDate: string | null;
  reportType: string | null;
  nCashflowAct: number | null;
  nCashflowInvAct: number | null;
  nCashFlowsFncAct: number | null;
  freeCashflow: number | null;
  nIncrCashCashEqu: number | null;
  cFrSaleSg: number | null;
  cPaidGoodsS: number | null;
  nCashflowActYoy: number | null;
  freeCashflowYoy: number | null;
};

/** 三大财务报表数据 */
export type StockFinancialStatementsData = {
  tsCode: string;
  income: IncomeStatementItem[];
  balanceSheet: BalanceSheetItem[];
  cashflow: CashflowItem[];
};

// ----------------------------------------------------------------------
// API 封装
// ----------------------------------------------------------------------

export const stockApi = {
  /** 股票列表（分页 + 多维筛选 + 排序） */
  list: (query: StockListQuery): Promise<StockListResult> =>
    apiClient.post<StockListResult>('/api/stock/list', query),
};

export const stockDetailApi = {
  /** 股票详情 - 总览（基础信息 + 公司简介 + 最新行情 + 最新估值） */
  overview: (code: string): Promise<StockDetailOverviewData> =>
    apiClient.post<StockDetailOverviewData>('/api/stock/detail/overview', { code }),

  /** 股票详情 - K 线图（支持日/周/月 + 前/后复权） */
  chart: (params: {
    tsCode: string;
    period?: 'D' | 'W' | 'M';
    adjustType?: 'none' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
    /** 返回条数上限，用于分段加载，不传则由后端决定默认值 */
    limit?: number;
  }): Promise<StockChartData> => apiClient.post<StockChartData>('/api/stock/detail/chart', params),

  /** 股票详情 - 资金流向（最近 N 个交易日） */
  moneyFlow: (tsCode: string, days?: number): Promise<StockMoneyFlowData> =>
    apiClient.post<StockMoneyFlowData>('/api/stock/detail/money-flow', { tsCode, days }),

  /** 股票详情 - 今日资金流向（按单笔规格分级：超大/大/中/小单） */
  todayFlow: (tsCode: string): Promise<StockTodayFlowData> =>
    apiClient.post<StockTodayFlowData>('/api/stock/detail/today-flow', { code: tsCode }),

  /** 股票详情 - 财务指标（最近 N 个报告期） */
  financials: (tsCode: string, periods?: number): Promise<StockFinancialsData> =>
    apiClient.post<StockFinancialsData>('/api/stock/detail/financials', { tsCode, periods }),

  /** 股票详情 - 股东与分红历史 */
  shareholders: (tsCode: string): Promise<StockShareholdersData> =>
    apiClient.post<StockShareholdersData>('/api/stock/detail/shareholders', { tsCode }),

  /** 股票详情 - 分红与配股记录 */
  dividendFinancing: (tsCode: string): Promise<StockDividendFinancingData> =>
    apiClient.post<StockDividendFinancingData>('/api/stock/detail/dividend-financing', { tsCode }),

  /** 股票详情 - 融资记录（增发/配股/可转债等） */
  financing: (tsCode: string): Promise<StockFinancingData> =>
    apiClient.post<StockFinancingData>('/api/stock/detail/financing', { tsCode }),

  /** 股票详情 - 三大财务报表（利润表/资产负债表/现金流量表，含同比） */
  financialStatements: (tsCode: string, periods?: number): Promise<StockFinancialStatementsData> =>
    apiClient.post<StockFinancialStatementsData>('/api/stock/detail/financial-statements', {
      tsCode,
      periods,
    }),

  /** 分析 - 技术指标 */
  technicalIndicators: (
    tsCode: string,
    period?: string,
    days?: number
  ): Promise<StockTechnicalData> =>
    apiClient.post<StockTechnicalData>('/api/stock/detail/analysis/technical', {
      tsCode,
      period,
      days,
    }),

  /** 分析 - 择时信号 */
  timingSignals: (tsCode: string, days?: number): Promise<StockTimingSignalsData> =>
    apiClient.post<StockTimingSignalsData>('/api/stock/detail/analysis/timing-signals', {
      tsCode,
      days,
    }),

  /** 分析 - 筹码分布 */
  chipDistribution: (tsCode: string, tradeDate?: string): Promise<ChipDistributionData> =>
    apiClient.post<ChipDistributionData>('/api/stock/detail/analysis/chip-distribution', {
      tsCode,
      tradeDate,
    }),

  /** 分析 - 融资融券 */
  marginData: (tsCode: string, days?: number): Promise<StockMarginData> =>
    apiClient.post<StockMarginData>('/api/stock/detail/analysis/margin', { tsCode, days }),

  /** 分析 - 相对强弱 */
  relativeStrength: (
    tsCode: string,
    benchmarkCode?: string,
    days?: number
  ): Promise<StockRelativeStrengthData> =>
    apiClient.post<StockRelativeStrengthData>('/api/stock/detail/analysis/relative-strength', {
      tsCode,
      benchmarkCode,
      days,
    }),
};

// ─── 股票搜索 ──────────────────────────────────

export type StockSearchItem = {
  tsCode: string;
  symbol: string;
  name: string;
  market: string | null;
  industry: string | null;
  listStatus: string | null;
};

export type StockSearchResult = {
  items: StockSearchItem[];
  total: number;
};

// ─── 主力资金流向 ──────────────────────────────────

export type MainMoneyFlowItem = {
  tradeDate: string;
  close: number | null;
  pctChg: number | null;
  /** 主力净流入（万元） */
  mainNetInflow: number | null;
  /** 超大单净流入（万元） */
  superLargeNetInflow: number | null;
  /** 大单净流入（万元） */
  largeNetInflow: number | null;
  /** 主力净流入占比 */
  mainNetInflowRate: number | null;
};

export type MainMoneyFlowSummary = {
  /** 5日主力净流入累计 */
  mainNetInflow5d: number | null;
  /** 10日主力净流入累计 */
  mainNetInflow10d: number | null;
  /** 20日主力净流入累计 */
  mainNetInflow20d: number | null;
  /** 主力控盘度 */
  controlDegree: string | null;
  /** 趋势判断 */
  trend: string | null;
};

export type StockMainMoneyFlowData = {
  tsCode: string;
  summary: MainMoneyFlowSummary;
  history: MainMoneyFlowItem[];
};

// ─── 股本结构 ──────────────────────────────────

export type ShareCapitalItem = {
  endDate: string;
  /** 总股本（万股） */
  totalShare: number | null;
  /** 流通股本（万股） */
  floatShare: number | null;
  /** 自由流通股本（万股） */
  freeShare: number | null;
  /** 限售股（万股） */
  restrictedShare: number | null;
  /** 总市值（万元） */
  totalMv: number | null;
  /** 流通市值（万元） */
  circMv: number | null;
};

export type ShareCapitalChangeItem = {
  annDate: string | null;
  changeReason: string | null;
  totalShareBefore: number | null;
  totalShareAfter: number | null;
  changeAmount: number | null;
};

export type StockShareCapitalData = {
  tsCode: string;
  latest: ShareCapitalItem | null;
  history: ShareCapitalItem[];
  changes: ShareCapitalChangeItem[];
};

// ─── 个股所属概念板块 ──────────────────────────────────

export type StockConceptItem = {
  conceptCode: string;
  conceptName: string;
  /** 概念板块当日涨跌幅 */
  pctChange: number | null;
  /** 概念板块成分股数 */
  memberCount: number | null;
};

export type StockConceptsData = {
  tsCode: string;
  concepts: StockConceptItem[];
};

// ─── 扩展 stockApi / stockDetailApi ──────────────────────────────────

export function searchStocks(query: { keyword: string; limit?: number }) {
  return apiClient.post<StockSearchResult>('/api/stock/search', query);
}

export const stockDetailApiExtra = {
  mainMoneyFlow: (tsCode: string, days?: number): Promise<StockMainMoneyFlowData> =>
    apiClient.post<StockMainMoneyFlowData>('/api/stock/detail/main-money-flow', { tsCode, days }),

  shareCapital: (tsCode: string): Promise<StockShareCapitalData> =>
    apiClient.post<StockShareCapitalData>('/api/stock/detail/share-capital', { tsCode }),

  concepts: (tsCode: string): Promise<StockConceptsData> =>
    apiClient.post<StockConceptsData>('/api/stock/detail/concepts', { tsCode }),
};
