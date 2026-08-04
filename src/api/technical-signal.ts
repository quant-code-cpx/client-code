import { apiClient } from './client';

// ----------------------------------------------------------------------
// 个股技术信号统计 API
//
// 说明：后端契约来自 `server-code/docs/design/个股技术信号统计-后端设计.md`。
// 该模块不复用 legacy 的 `/technical` 或 `/timing-signals` 数据。
// ----------------------------------------------------------------------

export type TechnicalSignalDirection = 'BULLISH' | 'BEARISH' | 'CONTEXTUAL';

export type TechnicalSignalSource = 'LOCAL_QFQ_OHLCV';

export type TechnicalSignalPeriod = '1Y' | '3Y' | 'CUSTOM';

export type TechnicalSignalEntryMode = 'SIGNAL_CLOSE' | 'NEXT_OPEN';

export type TechnicalSignalWarningCode =
  | 'OVERLAPPING_OUTCOMES'
  | 'BENCHMARK_PRE_INCEPTION_SAMPLES'
  | 'PARTIAL_EXCURSION_PATHS';

export type OutcomeQualityStatus = 'VALID' | 'IMMATURE' | 'MISSING';

export type PathCoverageStatus = 'COMPLETE' | 'PARTIAL' | 'NOT_APPLICABLE';

export type OutcomeMissingReason = 'ENTRY_QUOTE_MISSING' | 'TARGET_QUOTE_MISSING';

export type BenchmarkMissingReason = 'BENCHMARK_NOT_LISTED';

export type TechnicalSignalDefinition = {
  signalKey: string;
  semanticsVersion: string;
  definitionHash: string;
  displayName: string;
  direction: TechnicalSignalDirection;
  source: TechnicalSignalSource;
  description: string;
  parameters: Record<string, boolean | number | string | null>;
  stable: boolean;
  deprecatedAt: string | null;
};

export type TechnicalSignalDefinitionListRequest = {
  signalKeys?: string[];
  includeDeprecated?: boolean;
};

export type TechnicalSignalDefinitionListResponse = {
  definitions: TechnicalSignalDefinition[];
};

export type TechnicalSignalSelector = {
  signalKey: string;
  semanticsVersion?: string;
};

export type TechnicalSignalStatisticsRequest = {
  tsCode: string;
  signals?: TechnicalSignalSelector[];
  periods?: TechnicalSignalPeriod[];
  customStartDate?: string;
  customEndDate?: string;
  horizons?: number[];
  asOfTradeDate?: string;
  entryMode?: TechnicalSignalEntryMode;
  includeBenchmark?: boolean;
  benchmarkTsCode?: string;
};

export type TechnicalSignalDataVersions = {
  tradeCal: string;
  daily: string;
  adjFactor: string;
  suspendD: string;
  indexDaily: string | null;
};

export type TechnicalSignalStatisticsMeta = {
  tsCode: string;
  stockName: string | null;
  dataAsOf: string;
  computedAt: string;
  servedAt: string;
  timezone: 'Asia/Shanghai';
  signalSource: TechnicalSignalSource;
  indicatorAlgorithmVersion: string;
  entryMode: TechnicalSignalEntryMode;
  adjustment: string;
  dataVersions: TechnicalSignalDataVersions;
  statisticsAlgorithmVersion: string;
  returnPolicyVersion: string;
  confidenceIntervalVersion: string;
  confidenceLevel: number;
  benchmarkTsCode: string | null;
  cacheHit: boolean;
  warnings: TechnicalSignalWarningCode[];
};

export type ReturnDistribution = {
  sampleCount: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  upRatio: number | null;
  downRatio: number | null;
  flatRatio: number | null;
  averageReturnPct: number | null;
  medianReturnPct: number | null;
  minimumReturnPct: number | null;
  maximumReturnPct: number | null;
  stdDevPct: number | null;
  p25ReturnPct: number | null;
  p75ReturnPct: number | null;
  meanConfidenceLowerPct: number | null;
  meanConfidenceUpperPct: number | null;
};

export type DirectionalDistribution = {
  sampleCount: number;
  successCount: number;
  failureCount: number;
  flatCount: number;
  successRatio: number | null;
  averageDirectionalReturnPct: number | null;
  medianDirectionalReturnPct: number | null;
  minimumDirectionalReturnPct: number | null;
  maximumDirectionalReturnPct: number | null;
  stdDevDirectionalReturnPct: number | null;
  p25DirectionalReturnPct: number | null;
  p75DirectionalReturnPct: number | null;
  meanDirectionalConfidenceLowerPct: number | null;
  meanDirectionalConfidenceUpperPct: number | null;
  successConfidenceLower: number | null;
  successConfidenceUpper: number | null;
};

export type ExcursionDistribution = {
  completePathCount: number;
  partialPathCount: number;
  averageMfePct: number | null;
  medianMfePct: number | null;
  averageMaePct: number | null;
  medianMaePct: number | null;
  averageDirectionalMfePct: number | null;
  averageDirectionalMaePct: number | null;
};

export type SignalHorizonStatistics = {
  horizon: number;
  eligibleOutcomeCount: number;
  validOutcomeCount: number;
  immatureCount: number;
  missingCount: number;
  overlappingOccurrenceCount: number;
  missingReasons: Partial<Record<OutcomeMissingReason, number>>;
  benchmarkMissingCount: number;
  benchmarkMissingReasons: Partial<Record<BenchmarkMissingReason, number>>;
  raw: ReturnDistribution;
  directional: DirectionalDistribution;
  excess: ReturnDistribution | null;
  excursion: ExcursionDistribution;
  minSampleDate: string | null;
  maxSampleDate: string | null;
};

export type SignalPeriodStatistics = {
  period: TechnicalSignalPeriod;
  requestedStartDate: string;
  actualStartDate: string | null;
  endDate: string;
  signalKey: string;
  semanticsVersion: string;
  definitionHash: string;
  direction: TechnicalSignalDirection;
  evaluable: boolean;
  notEvaluableReason: 'INSUFFICIENT_HISTORY' | null;
  requiredValidRows: number;
  actualValidRows: number;
  occurrenceCount: number;
  horizons: SignalHorizonStatistics[];
};

export type TechnicalSignalStatisticsResponse = {
  meta: TechnicalSignalStatisticsMeta;
  groups: SignalPeriodStatistics[];
};

export type TechnicalSignalEvidence = {
  previous: Record<string, boolean | number | string | null>;
  current: Record<string, boolean | number | string | null>;
  parameters: Record<string, boolean | number | string | null>;
};

export type TechnicalSignalOutcome = {
  horizon: number;
  expectedEntryDate: string;
  expectedTargetDate: string;
  qualityStatus: OutcomeQualityStatus;
  missingReason: OutcomeMissingReason | null;
  entryRawPrice: number | null;
  entryAdjFactor: number | null;
  targetRawPrice: number | null;
  targetAdjFactor: number | null;
  rawReturnPct: number | null;
  directionalReturnPct: number | null;
  benchmarkReturnPct: number | null;
  excessReturnPct: number | null;
  benchmarkMissingReason: BenchmarkMissingReason | null;
  pathCoverageStatus: PathCoverageStatus;
  pathMissingDates: string[];
  rawMfePct: number | null;
  rawMaePct: number | null;
  directionalMfePct: number | null;
  directionalMaePct: number | null;
};

export type TechnicalSignalOccurrence = {
  signalId: string;
  tsCode: string;
  signalKey: string;
  semanticsVersion: string;
  definitionHash: string;
  source: TechnicalSignalSource;
  indicatorAlgorithmVersion: string;
  signalDate: string;
  direction: TechnicalSignalDirection;
  evidence: TechnicalSignalEvidence;
  outcomes: TechnicalSignalOutcome[];
};

export type TechnicalSignalOccurrenceListRequest = {
  tsCode: string;
  signalKey: string;
  semanticsVersion?: string;
  startDate: string;
  endDate: string;
  horizons?: number[];
  asOfTradeDate?: string;
  entryMode?: TechnicalSignalEntryMode;
  includeBenchmark?: boolean;
  benchmarkTsCode?: string;
  qualityStatuses?: OutcomeQualityStatus[];
  page?: number;
  pageSize?: number;
};

export type TechnicalSignalOccurrenceListResponse = {
  items: TechnicalSignalOccurrence[];
  page: number;
  pageSize: number;
  total: number;
};

export const technicalSignalApi = {
  listDefinitions: (
    request: TechnicalSignalDefinitionListRequest = {},
    signal?: AbortSignal
  ): Promise<TechnicalSignalDefinition[]> =>
    apiClient
      .post<TechnicalSignalDefinitionListResponse>(
        '/api/stock/detail/analysis/signal-definitions/list',
        request,
        signal
      )
      .then((response) => response.definitions),

  queryStatistics: (
    request: TechnicalSignalStatisticsRequest,
    signal?: AbortSignal
  ): Promise<TechnicalSignalStatisticsResponse> =>
    apiClient.post<TechnicalSignalStatisticsResponse>(
      '/api/stock/detail/analysis/signal-statistics/query',
      request,
      signal
    ),

  listOccurrences: (
    request: TechnicalSignalOccurrenceListRequest,
    signal?: AbortSignal
  ): Promise<TechnicalSignalOccurrenceListResponse> =>
    apiClient.post<TechnicalSignalOccurrenceListResponse>(
      '/api/stock/detail/analysis/signal-occurrences/list',
      request,
      signal
    ),
};
