import type { ScreenerFilters } from 'src/api/screener';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const FILTER_LABELS: Record<string, string> = {
  minPeTtm: 'PE ≥',
  maxPeTtm: 'PE ≤',
  minPb: 'PB ≥',
  maxPb: 'PB ≤',
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
  minPctChg: '涨跌幅 ≥',
  maxPctChg: '涨跌幅 ≤',
  minTurnoverRate: '换手率 ≥',
  maxTurnoverRate: '换手率 ≤',
  exchange: '交易所',
  market: '市场',
  industry: '行业',
  area: '地区',
  isHs: '沪深港通',
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
};

// ----------------------------------------------------------------------

type SubscriptionFiltersSummaryProps = {
  filters: Partial<ScreenerFilters>;
  sortBy?: string | null;
  sortOrder?: string | null;
};

export function SubscriptionFiltersSummary({
  filters,
  sortBy,
  sortOrder,
}: SubscriptionFiltersSummaryProps) {
  const chips: { key: string; label: string }[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    const labelPrefix = FILTER_LABELS[key] ?? key;
    chips.push({ key, label: `${labelPrefix} ${value}` });
  }

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
        <Chip key={chip.key} label={chip.label} size="small" variant="outlined" />
      ))}
      {sortLabel && <Chip label={sortLabel} size="small" color="primary" variant="outlined" />}
    </Box>
  );
}
