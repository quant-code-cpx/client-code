import type { ScreenerFilters } from 'src/api/screener';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const FILTER_LABELS: Record<string, string> = {
  pe: 'PE',
  pb: 'PB',
  ps: 'PS',
  roe: 'ROE',
  pe_ttm: 'PE',
  pb_lf: 'PB',
  ps_ttm: 'PS',
  conditions: '条件',
  minPeTtm: 'PE ≥',
  maxPeTtm: 'PE ≤',
  minPb: 'PB ≥',
  maxPb: 'PB ≤',
  minPsTtm: 'PS ≥',
  maxPsTtm: 'PS ≤',
  minRoe: 'ROE ≥',
  maxRoe: 'ROE ≤',
  minRevenueYoy: '营收增速 ≥',
  maxRevenueYoy: '营收增速 ≤',
  minNetprofitYoy: '净利增速 ≥',
  maxNetprofitYoy: '净利增速 ≤',
  minTotalMv: '市值 ≥',
  maxTotalMv: '市值 ≤',
  minCircMv: '流通市值 ≥',
  maxCircMv: '流通市值 ≤',
  minDvTtm: '股息率 ≥',
  minGrossMargin: '毛利率 ≥',
  maxGrossMargin: '毛利率 ≤',
  minNetMargin: '净利率 ≥',
  maxNetMargin: '净利率 ≤',
  maxDebtToAssets: '资产负债率 ≤',
  minCurrentRatio: '流动比率 ≥',
  minQuickRatio: '速动比率 ≥',
  minOcfToNetprofit: '经营现金流/净利润 ≥',
  minPctChg: '涨跌幅 ≥',
  maxPctChg: '涨跌幅 ≤',
  minTurnoverRate: '换手率 ≥',
  maxTurnoverRate: '换手率 ≤',
  minAmount: '成交额 ≥',
  maxAmount: '成交额 ≤',
  minMainNetInflow5d: '5日主力净流入 ≥',
  minMainNetInflow20d: '20日主力净流入 ≥',
  minBuySignalCount: '偏多信号数 ≥',
  exchange: '交易所',
  market: '市场',
  industry: '行业',
  area: '地区',
  isHs: '沪深港通',
  industries: '行业',
  areas: '地区',
  conceptCodes: '概念',
  macdSignal: 'MACD',
  kdjSignal: 'KDJ',
  rsiSignal: 'RSI',
  minRsi6: 'RSI6 ≥',
  maxRsi6: 'RSI6 ≤',
  bollSignal: 'BOLL',
  maTrend: '均线趋势',
  northboundOnly: '仅北向资金',
};

const SORT_FIELD_LABELS: Record<string, string> = {
  peTtm: 'PE',
  pb: 'PB',
  roe: 'ROE',
  revenueYoy: '营收增速',
  netprofitYoy: '净利增速',
  totalMv: '市值',
  circMv: '流通市值',
  pctChg: '涨跌幅',
  turnoverRate: '换手率',
  amount: '成交额',
  dvTtm: '股息率',
  grossMargin: '毛利率',
  netMargin: '净利率',
  buySignalCount: '偏多信号数',
};

const NESTED_FIELD_LABELS: Record<string, string> = {
  field: '字段',
  factorName: '因子',
  max: '最大值',
  min: '最小值',
  operator: '条件',
  percent: '百分比',
  value: '值',
};

const OPERATOR_LABELS: Record<string, string> = {
  between: '介于',
  bottom_pct: '后',
  eq: '=',
  gt: '>',
  gte: '≥',
  in: '包含',
  lt: '<',
  lte: '≤',
  top_pct: '前',
};

// ----------------------------------------------------------------------

type FilterRecord = Record<string, unknown>;
type FilterValue = Partial<ScreenerFilters> | FilterRecord | unknown[] | null | undefined;

type SubscriptionFiltersSummaryProps = {
  filters: FilterValue;
  sortBy?: string | null;
  sortOrder?: string | null;
};

type FilterChip = {
  key: string;
  label: string;
};

const isRecord = (value: unknown): value is FilterRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0 || value.every((item) => isEmptyValue(item));
  if (isRecord(value)) return Object.values(value).every((item) => isEmptyValue(item));
  return false;
};

const getFieldLabel = (key: string): string => {
  if (/^\d+$/.test(key)) return `条件 ${Number(key) + 1}`;
  return FILTER_LABELS[key] ?? NESTED_FIELD_LABELS[key] ?? key;
};

const getRecordString = (record: FilterRecord, keys: string[]): string | null => {
  const found = keys.map((key) => record[key]).find((value) => typeof value === 'string');
  return typeof found === 'string' && found.trim() ? found : null;
};

const formatScalarValue = (value: unknown): string => {
  if (isEmptyValue(value)) return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
};

const formatConditionRecord = (record: FilterRecord, fallbackKey: string): string => {
  const factorName = getRecordString(record, ['factorName', 'field', 'name']);
  const operator = getRecordString(record, ['operator', 'op']);

  if (!factorName && !operator) return '';

  const factorLabel = getFieldLabel(factorName ?? fallbackKey);

  if (operator === 'between') {
    const minText = formatFilterValue(record.min);
    const maxText = formatFilterValue(record.max);
    const rangeText = [minText, maxText].filter(Boolean).join(' ~ ');
    return [factorLabel, OPERATOR_LABELS[operator], rangeText].filter(Boolean).join(' ');
  }

  if (operator === 'top_pct' || operator === 'bottom_pct') {
    const percentText = formatFilterValue(record.percent ?? record.value);
    const suffix = percentText ? `${percentText}%` : '';
    return [factorLabel, OPERATOR_LABELS[operator], suffix].filter(Boolean).join(' ');
  }

  const compareValue = record.value ?? record.max ?? record.min ?? record.percent;
  const compareText = formatFilterValue(compareValue);
  const operatorText = operator ? OPERATOR_LABELS[operator] ?? operator : '';

  return [factorLabel, operatorText, compareText].filter(Boolean).join(' ');
};

function formatRecordValue(record: FilterRecord): string {
  return Object.entries(record)
    .map(([key, value]) => {
      if (isEmptyValue(value)) return '';
      const valueText = formatFilterValue(value, key);
      if (!valueText) return '';
      return `${getFieldLabel(key)} ${valueText}`;
    })
    .filter(Boolean)
    .join('，');
}

function formatFilterValue(value: unknown, fallbackKey = ''): string {
  if (isEmptyValue(value)) return '';

  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (isRecord(item)) {
          return formatConditionRecord(item, `${index}`) || formatRecordValue(item);
        }
        return formatFilterValue(item);
      })
      .filter(Boolean)
      .join('、');
  }

  if (isRecord(value)) {
    return formatConditionRecord(value, fallbackKey) || formatRecordValue(value);
  }

  return formatScalarValue(value);
}

function buildArrayChips(key: string, value: unknown[]): FilterChip[] {
  const prefix = getFieldLabel(key);

  if (!value.some((item) => isRecord(item))) {
    const valueText = formatFilterValue(value);
    return valueText ? [{ key, label: `${prefix} ${valueText}` }] : [];
  }

  return value
    .map((item, index) => {
      if (isEmptyValue(item)) return null;
      const valueText = formatFilterValue(item, `${index}`);
      if (!valueText) return null;
      const itemPrefix = prefix === '条件' ? `条件 ${index + 1}` : `${prefix} ${index + 1}`;
      return { key: `${key}-${index}`, label: `${itemPrefix} ${valueText}` };
    })
    .filter((chip): chip is FilterChip => chip !== null);
}

function buildFilterChips(filters: FilterValue): FilterChip[] {
  if (isEmptyValue(filters)) return [];

  const sourceEntries = Array.isArray(filters)
    ? filters.map((value, index) => [`${index}`, value] as const)
    : Object.entries(filters as FilterRecord);

  return sourceEntries.flatMap(([key, value]) => {
    if (isEmptyValue(value)) return [];
    if (Array.isArray(value)) return buildArrayChips(key, value);

    const labelPrefix = getFieldLabel(key);
    const valueText = formatFilterValue(value, key);
    if (!valueText) return [];

    return [{ key, label: `${labelPrefix} ${valueText}` }];
  });
}

export function SubscriptionFiltersSummary({
  filters,
  sortBy,
  sortOrder,
}: SubscriptionFiltersSummaryProps) {
  const chips = buildFilterChips(filters);

  if (chips.length === 0 && !sortBy) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        无条件限制
      </Typography>
    );
  }

  const sortLabel = sortBy
    ? `排序：${SORT_FIELD_LABELS[sortBy] ?? sortBy} ${sortOrder === 'asc' ? '升序' : '降序'}`
    : null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          size="small"
          title={chip.label}
          variant="outlined"
          sx={{ maxWidth: '100%' }}
        />
      ))}
      {sortLabel && (
        <Chip
          label={sortLabel}
          size="small"
          title={sortLabel}
          color="primary"
          variant="outlined"
          sx={{ maxWidth: '100%' }}
        />
      )}
    </Box>
  );
}
