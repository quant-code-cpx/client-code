import type {
  SubscriptionStatus,
  SubscriptionRuleType,
  SubscriptionFrequency,
} from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type SortKey = 'lastRunDesc' | 'lastRunAsc' | 'nameAsc' | 'createdDesc';

const STATUS_OPTIONS: { value: SubscriptionStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部状态' },
  { value: 'ACTIVE', label: '活跃' },
  { value: 'PAUSED', label: '已暂停' },
  { value: 'ERROR', label: 'ERROR' },
];

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部频率' },
  { value: 'DAILY', label: '每日' },
  { value: 'WEEKLY', label: '每周' },
  { value: 'MONTHLY', label: '每月' },
];

const RULE_TYPE_OPTIONS: { value: SubscriptionRuleType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部规则' },
  { value: 'STOCK_SCREENING', label: '基础选股' },
  { value: 'FACTOR_SCREENING', label: '因子选股' },
  { value: 'SIGNAL_EVENT', label: '技术信号' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'lastRunDesc', label: '最近执行 ↓' },
  { value: 'lastRunAsc', label: '最近执行 ↑' },
  { value: 'nameAsc', label: '名称 A→Z' },
  { value: 'createdDesc', label: '创建时间 ↓' },
];

type Props = {
  search: string;
  onSearchChange: (val: string) => void;
  status: SubscriptionStatus | 'ALL';
  onStatusChange: (val: SubscriptionStatus | 'ALL') => void;
  frequency: SubscriptionFrequency | 'ALL';
  onFrequencyChange: (val: SubscriptionFrequency | 'ALL') => void;
  ruleType: SubscriptionRuleType | 'ALL';
  onRuleTypeChange: (val: SubscriptionRuleType | 'ALL') => void;
  sort: SortKey;
  onSortChange: (val: SortKey) => void;
  total: number;
  filteredTotal: number;
};

export function SubscriptionListToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  frequency,
  onFrequencyChange,
  ruleType,
  onRuleTypeChange,
  sort,
  onSortChange,
  total,
  filteredTotal,
}: Props) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField
          size="small"
          placeholder="搜索订阅名称"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 240 }}
        />
        <TextField
          select
          size="small"
          label="状态"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SubscriptionStatus | 'ALL')}
          sx={{ minWidth: 140 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="规则类型"
          value={ruleType}
          onChange={(e) => onRuleTypeChange(e.target.value as SubscriptionRuleType | 'ALL')}
          sx={{ minWidth: 150 }}
        >
          {RULE_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="频率"
          value={frequency}
          onChange={(e) => onFrequencyChange(e.target.value as SubscriptionFrequency | 'ALL')}
          sx={{ minWidth: 140 }}
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="排序"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          sx={{ minWidth: 160 }}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {filteredTotal === total ? `共 ${total} 条` : `${filteredTotal} / ${total} 条`}
        </Typography>
      </Stack>
    </Box>
  );
}
