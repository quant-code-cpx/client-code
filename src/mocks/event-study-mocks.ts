/**
 * Rich mock data for event-study v2 endpoints.
 * Built lazily from a deterministic seed so the demo experience feels alive.
 */
import type {
  EventType,
  AnalysisPlan,
  ScanJobResult,
  SignalRuleStats,
  EventSchemaResult,
  EventAnalyzeResult,
  EventCalendarResult,
  AnalyzeBySegmentResult,
  AnalysisPlanListResult,
  SignalRulePreviewResult,
  SignalRuleBacktestResult,
} from 'src/api/event-study';

// ── deterministic pseudo-random helpers ─────────────────────────────────────

/* eslint-disable no-bitwise */
function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function shiftDate(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

const MOCK_EVENT_TYPES: EventType[] = [
  'FORECAST',
  'DIVIDEND_EX',
  'HOLDER_INCREASE',
  'HOLDER_DECREASE',
  'SHARE_FLOAT',
  'REPURCHASE',
  'AUDIT_QUALIFIED',
  'DISCLOSURE',
];

const MOCK_INDUSTRIES = ['半导体', '银行', '医药生物', '电力设备', '食品饮料', '机械'];
const MOCK_STOCKS = [
  { tsCode: '600519.SH', name: '贵州茅台' },
  { tsCode: '000858.SZ', name: '五粮液' },
  { tsCode: '601318.SH', name: '中国平安' },
  { tsCode: '300750.SZ', name: '宁德时代' },
  { tsCode: '600036.SH', name: '招商银行' },
  { tsCode: '002594.SZ', name: '比亚迪' },
  { tsCode: '300059.SZ', name: '东方财富' },
  { tsCode: '601012.SH', name: '隆基绿能' },
  { tsCode: '600276.SH', name: '恒瑞医药' },
  { tsCode: '000333.SZ', name: '美的集团' },
];

// ── event schemas ───────────────────────────────────────────────────────────

const SCHEMAS: Record<EventType, EventSchemaResult> = {
  FORECAST: {
    eventType: 'FORECAST',
    fields: [
      {
        name: 'p_change_min',
        label: '预计变动幅度下限',
        type: 'number',
        unit: '%',
        hint: '业绩预告下限同比变动百分比',
      },
      {
        name: 'p_change_max',
        label: '预计变动幅度上限',
        type: 'number',
        unit: '%',
        hint: '业绩预告上限同比变动百分比',
      },
      {
        name: 'type',
        label: '预告类型',
        type: 'enum',
        enumValues: [
          { value: '预增', label: '预增' },
          { value: '预减', label: '预减' },
          { value: '扭亏', label: '扭亏' },
          { value: '续亏', label: '续亏' },
          { value: '首亏', label: '首亏' },
          { value: '略增', label: '略增' },
          { value: '略减', label: '略减' },
        ],
      },
    ],
  },
  HOLDER_INCREASE: {
    eventType: 'HOLDER_INCREASE',
    fields: [
      { name: 'change_vol', label: '变动数量', type: 'number', unit: '万股' },
      { name: 'change_ratio', label: '变动比例', type: 'number', unit: '%' },
      { name: 'holder_name', label: '股东名称', type: 'string' },
    ],
  },
  HOLDER_DECREASE: {
    eventType: 'HOLDER_DECREASE',
    fields: [
      { name: 'change_vol', label: '变动数量', type: 'number', unit: '万股' },
      { name: 'change_ratio', label: '变动比例', type: 'number', unit: '%' },
      { name: 'holder_name', label: '股东名称', type: 'string' },
    ],
  },
  DIVIDEND_EX: {
    eventType: 'DIVIDEND_EX',
    fields: [
      { name: 'cash_div', label: '每股派息', type: 'number', unit: '元' },
      { name: 'stk_div', label: '每股送转', type: 'number' },
    ],
  },
  SHARE_FLOAT: {
    eventType: 'SHARE_FLOAT',
    fields: [
      { name: 'float_share', label: '解禁数量', type: 'number', unit: '万股' },
      { name: 'float_ratio', label: '解禁比例', type: 'number', unit: '%' },
    ],
  },
  REPURCHASE: {
    eventType: 'REPURCHASE',
    fields: [
      { name: 'vol', label: '回购数量', type: 'number', unit: '万股' },
      { name: 'amount', label: '回购金额', type: 'number', unit: '万元' },
    ],
  },
  AUDIT_QUALIFIED: {
    eventType: 'AUDIT_QUALIFIED',
    fields: [
      {
        name: 'audit_result',
        label: '审计结果',
        type: 'enum',
        enumValues: [
          { value: '保留意见', label: '保留意见' },
          { value: '无法表示意见', label: '无法表示意见' },
          { value: '否定意见', label: '否定意见' },
        ],
      },
    ],
  },
  DISCLOSURE: {
    eventType: 'DISCLOSURE',
    fields: [
      {
        name: 'report_type',
        label: '报告类型',
        type: 'enum',
        enumValues: [
          { value: '一季报', label: '一季报' },
          { value: '中报', label: '中报' },
          { value: '三季报', label: '三季报' },
          { value: '年报', label: '年报' },
        ],
      },
    ],
  },
};

export function getMockEventSchema(eventType: EventType): EventSchemaResult {
  return SCHEMAS[eventType] ?? { eventType, fields: [] };
}

// ── event calendar ──────────────────────────────────────────────────────────

export function getMockCalendar(): EventCalendarResult {
  const rand = mulberry(20260430);
  const today = new Date();
  const cells: EventCalendarResult['cells'] = [];
  for (let i = 0; i < 30; i += 1) {
    const date = shiftDate(today, i);
    MOCK_EVENT_TYPES.forEach((eventType) => {
      const count = Math.floor(rand() * 8);
      cells.push({
        date,
        eventType,
        count,
        significantCount: count > 0 ? Math.floor(rand() * Math.max(1, count - 1)) : 0,
      });
    });
  }
  return { cells };
}

// ── analyze result ──────────────────────────────────────────────────────────

export function getMockAnalyze(
  eventType: EventType,
  preDays = 10,
  postDays = 30
): EventAnalyzeResult {
  const rand = mulberry(eventType.length * 31 + preDays + postDays);
  const len = preDays + postDays + 1;
  const aar: number[] = [];
  const aarStd: number[] = [];
  let caar = 0;
  const caarSeries: number[] = [];
  for (let i = 0; i < len; i += 1) {
    const offset = i - preDays;
    const drift = offset >= 0 ? 0.0006 + (rand() - 0.4) * 0.004 : (rand() - 0.5) * 0.0035;
    aar.push(Number(drift.toFixed(6)));
    aarStd.push(Number((0.008 + rand() * 0.005).toFixed(6)));
    caar += drift;
    caarSeries.push(Number(caar.toFixed(6)));
  }
  const significantSegments =
    eventType === 'FORECAST'
      ? [{ from: preDays, to: preDays + 5, direction: 'pos' as const }]
      : eventType === 'HOLDER_DECREASE'
        ? [{ from: preDays, to: preDays + 8, direction: 'neg' as const }]
        : [];

  const today = new Date();
  const sample = (delta: number, idx: number) => {
    const stock = MOCK_STOCKS[idx % MOCK_STOCKS.length];
    return {
      tsCode: stock.tsCode,
      name: stock.name,
      eventDate: shiftDate(today, -10 - idx * 3),
      car: Number((delta + (rand() - 0.5) * 0.01).toFixed(6)),
      arSeries: Array.from({ length: len }, (_, k) => Number(((rand() - 0.45) * 0.012).toFixed(6))),
    };
  };

  return {
    eventType,
    eventLabel: eventType,
    sampleCount: 213,
    window: `${preDays}/${postDays}`,
    benchmark: '沪深300',
    aarSeries: aar,
    caarSeries,
    aarStdSeries: aarStd,
    significantSegments,
    caar: Number(caar.toFixed(6)),
    tStatistic: Number((caar / (Math.max(...aarStd) / Math.sqrt(213))).toFixed(3)),
    pValue: significantSegments.length > 0 ? 0.001 : 0.182,
    significantSampleRatio: 0.182,
    topSamples: Array.from({ length: 8 }, (_, i) => sample(0.06, i)),
    bottomSamples: Array.from({ length: 8 }, (_, i) => sample(-0.05, i + 10)),
  };
}

// ── analyze by segment ──────────────────────────────────────────────────────

export function getMockSegment(
  groupBy: 'industry' | 'marketCapBucket' | 'stFlag'
): AnalyzeBySegmentResult {
  const rand = mulberry(groupBy.length * 71);
  if (groupBy === 'industry') {
    return {
      groupBy,
      segments: MOCK_INDUSTRIES.map((label) => ({
        key: label,
        label,
        sampleCount: 8 + Math.floor(rand() * 60),
        caar: Number(((rand() - 0.4) * 0.05).toFixed(6)),
        tStatistic: Number(((rand() - 0.3) * 4).toFixed(3)),
        pValue: Number(rand().toFixed(4)),
      })),
    };
  }
  if (groupBy === 'marketCapBucket') {
    const buckets = [
      { key: 'small', label: '小盘' },
      { key: 'mid', label: '中盘' },
      { key: 'large', label: '大盘' },
    ];
    return {
      groupBy,
      segments: buckets.map((b) => ({
        key: b.key,
        label: b.label,
        sampleCount: 30 + Math.floor(rand() * 80),
        caar: Number(((rand() - 0.4) * 0.04).toFixed(6)),
        tStatistic: Number(((rand() - 0.3) * 3).toFixed(3)),
        pValue: Number(rand().toFixed(4)),
      })),
    };
  }
  return {
    groupBy,
    segments: [
      {
        key: 'normal',
        label: '正常',
        sampleCount: 198,
        caar: 0.018,
        tStatistic: 3.21,
        pValue: 0.001,
      },
      {
        key: 'st',
        label: 'ST 股',
        sampleCount: 15,
        caar: -0.012,
        tStatistic: -1.62,
        pValue: 0.11,
      },
    ],
  };
}

// ── signal rule stats / preview / backtest / scan job ───────────────────────

export function getMockRuleStats(id: number): SignalRuleStats {
  const rand = mulberry(id * 17 + 3);
  return {
    hitCount30d: Math.floor(rand() * 30),
    hitRate: Number((rand() * 0.5 + 0.2).toFixed(3)),
    avgCar: Number(((rand() - 0.4) * 0.05).toFixed(6)),
    lastTriggered: shiftDate(new Date(), -Math.floor(rand() * 7)),
  };
}

export function getMockPreview(): SignalRulePreviewResult {
  const rand = mulberry(2026);
  return {
    matchCount: 17,
    distribution: { FORECAST: 17 },
    samples: Array.from({ length: 10 }, (_, i) => {
      const stock = MOCK_STOCKS[i % MOCK_STOCKS.length];
      return {
        tsCode: stock.tsCode,
        name: stock.name,
        eventDate: shiftDate(new Date(), -Math.floor(rand() * 30)),
      };
    }),
  };
}

export function getMockBacktest(): SignalRuleBacktestResult {
  return {
    totalHits: 142,
    winRate: 0.586,
    avgWin: 0.041,
    avgLoss: -0.028,
    profitFactor: 1.78,
    carStats: { mean: 0.0156, median: 0.0098, std: 0.0432, p95: 0.092 },
  };
}

const scanJobs = new Map<string, { startedAt: number; total: number }>();

export function startMockScanJob(): { jobId: string; status: 'PENDING' } {
  const jobId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  scanJobs.set(jobId, { startedAt: Date.now(), total: 50 });
  return { jobId, status: 'PENDING' };
}

export function getMockScanJob(jobId: string): ScanJobResult {
  const job = scanJobs.get(jobId);
  if (!job) {
    return {
      jobId,
      status: 'COMPLETED',
      progress: { processed: 50, total: 50 },
      signalsGenerated: 7,
    };
  }
  const elapsed = (Date.now() - job.startedAt) / 1000;
  const processed = Math.min(job.total, Math.floor(elapsed * 12));
  if (processed >= job.total) {
    return {
      jobId,
      status: 'COMPLETED',
      progress: { processed: job.total, total: job.total },
      signalsGenerated: 7,
    };
  }
  return {
    jobId,
    status: 'RUNNING',
    progress: { processed, total: job.total },
  };
}

// ── analysis plans (in-memory) ──────────────────────────────────────────────

let planSeq = 1;
const planStore: AnalysisPlan[] = [
  {
    id: planSeq++,
    name: '业绩预告 · 半导体 · 默认',
    description: '聚焦半导体行业，pre10/post30，沪深300 基准',
    params: {
      eventType: 'FORECAST',
      preDays: 10,
      postDays: 30,
      benchmarkCode: '000300.SH',
      filters: { industry: '半导体', marketCapBucket: 'mid', excludeSt: true, minListingDays: 180 },
      clusterWindow: 10,
    },
    ownerId: 1,
    ownerName: 'Demo Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function listMockAnalysisPlans(): AnalysisPlanListResult {
  return { items: planStore.slice(), total: planStore.length };
}

export function createMockAnalysisPlan(
  name: string,
  description: string | undefined,
  params: AnalysisPlan['params']
): AnalysisPlan {
  const now = new Date().toISOString();
  const plan: AnalysisPlan = {
    id: planSeq++,
    name,
    description: description ?? null,
    params,
    ownerId: 1,
    ownerName: 'Demo Admin',
    createdAt: now,
    updatedAt: now,
  };
  planStore.unshift(plan);
  return plan;
}

export function deleteMockAnalysisPlan(id: number) {
  const idx = planStore.findIndex((p) => p.id === id);
  if (idx >= 0) planStore.splice(idx, 1);
  return { success: true };
}

// ── events query (richer items so the table renders something) ──────────────

export function getMockEvents(eventType: EventType, page: number, pageSize: number) {
  const rand = mulberry(eventType.length * 23 + page);
  const items = Array.from({ length: pageSize }, (_, i) => {
    const stock = MOCK_STOCKS[(i + page) % MOCK_STOCKS.length];
    const annDate = shiftDate(new Date(), -i - 1);
    const base: Record<string, unknown> = {
      ts_code: stock.tsCode,
      name: stock.name,
      ann_date: annDate,
      industry: MOCK_INDUSTRIES[i % MOCK_INDUSTRIES.length],
    };
    if (eventType === 'FORECAST') {
      base.end_date = shiftDate(new Date(), -90);
      base.type = ['预增', '扭亏', '略增'][i % 3];
      base.p_change_min = Number((20 + rand() * 80).toFixed(2));
      base.p_change_max = Number((40 + rand() * 100).toFixed(2));
      base.summary = `${stock.name} 业绩预告同比增长`;
    } else if (eventType === 'HOLDER_INCREASE' || eventType === 'HOLDER_DECREASE') {
      base.holder_name = `${stock.name} 股东 ${(i % 3) + 1}`;
      base.change_vol = Number((rand() * 1000).toFixed(2));
      base.change_ratio = Number((rand() * 5).toFixed(3));
    } else if (eventType === 'DIVIDEND_EX') {
      base.ex_date = annDate;
      base.cash_div = Number((rand() * 2).toFixed(2));
      base.stk_div = Number((rand() * 0.5).toFixed(2));
    } else if (eventType === 'SHARE_FLOAT') {
      base.float_date = annDate;
      base.float_share = Number((rand() * 5000).toFixed(2));
      base.float_ratio = Number((rand() * 8).toFixed(3));
    } else if (eventType === 'REPURCHASE') {
      base.exp_date = shiftDate(new Date(), 90);
      base.vol = Number((rand() * 800).toFixed(2));
      base.amount = Number((rand() * 30000).toFixed(2));
    } else if (eventType === 'AUDIT_QUALIFIED') {
      base.end_date = shiftDate(new Date(), -90);
      base.audit_result = ['保留意见', '无法表示意见', '否定意见'][i % 3];
      base.audit_agency = '安永华明会计师事务所';
    } else if (eventType === 'DISCLOSURE') {
      base.end_date = shiftDate(new Date(), -90);
      base.report_type = ['一季报', '中报', '三季报', '年报'][i % 4];
    }
    return base;
  });
  return { total: 200, items };
}

// ── signal history (richer) ─────────────────────────────────────────────────

export function getMockSignalHistory(page: number, pageSize: number) {
  const items = Array.from({ length: pageSize }, (_, i) => {
    const stock = MOCK_STOCKS[(i + page) % MOCK_STOCKS.length];
    const id = page * pageSize + i + 1;
    return {
      id,
      ruleId: 1,
      tsCode: stock.tsCode,
      stockName: stock.name,
      eventDate: shiftDate(new Date(), -i - 1),
      signalType: (['BUY', 'SELL', 'WATCH'] as const)[i % 3],
      eventDetail: {
        type: '预增',
        p_change_min: 30 + i,
        p_change_max: 60 + i,
        summary: `${stock.name} 业绩预增 ${30 + i}%-${60 + i}%`,
      },
      triggeredAt: new Date(Date.now() - i * 3600_000).toISOString(),
      rule: { name: '业绩预增 BUY', eventType: 'FORECAST' },
    };
  });
  return { items, total: 80, page: page + 1, pageSize };
}
