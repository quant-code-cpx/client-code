import type {
  AreaItem,
  IndustryItem,
  ScreenerFilters,
  ScreenerConceptItem,
} from 'src/api/screener';

import { memo, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

import { ScreenerFilterRangeInput } from './screener-filter-range-input';
import {
  MARKET_OPTIONS,
  EXCHANGE_OPTIONS,
  MA_TREND_OPTIONS,
  KDJ_SIGNAL_OPTIONS,
  RSI_SIGNAL_OPTIONS,
  BOLL_SIGNAL_OPTIONS,
  MACD_SIGNAL_OPTIONS,
} from './constants';

// ----------------------------------------------------------------------

type FilterGroupId =
  | 'basic'
  | 'concept'
  | 'valuation'
  | 'growth'
  | 'profitability'
  | 'financial'
  | 'flow'
  | 'market'
  | 'technical'
  | 'northbound';

type FilterGroup = {
  id: FilterGroupId;
  label: string;
  keys: (keyof ScreenerFilters)[];
};

export const FILTER_GROUPS: FilterGroup[] = [
  { id: 'basic', label: '基本面', keys: ['exchange', 'market', 'industries', 'areas'] },
  { id: 'concept', label: '概念板块', keys: ['conceptCodes'] },
  {
    id: 'valuation',
    label: '估值',
    keys: [
      'minPeTtm',
      'maxPeTtm',
      'minPb',
      'maxPb',
      'minPsTtm',
      'maxPsTtm',
      'minDvTtm',
      'minTotalMv',
      'maxTotalMv',
    ],
  },
  {
    id: 'growth',
    label: '成长',
    keys: ['minRevenueYoy', 'maxRevenueYoy', 'minNetprofitYoy', 'maxNetprofitYoy'],
  },
  {
    id: 'profitability',
    label: '盈利',
    keys: ['minRoe', 'maxRoe', 'minGrossMargin', 'minNetMargin'],
  },
  {
    id: 'financial',
    label: '财务 / 现金流',
    keys: ['maxDebtToAssets', 'minCurrentRatio', 'minQuickRatio', 'minOcfToNetprofit'],
  },
  {
    id: 'flow',
    label: '资金流向',
    keys: ['minMainNetInflow5d', 'minMainNetInflow20d'],
  },
  {
    id: 'market',
    label: '行情',
    keys: ['minPctChg', 'maxPctChg', 'minTurnoverRate', 'maxTurnoverRate'],
  },
  {
    id: 'technical',
    label: '技术信号',
    keys: [
      'macdSignal',
      'kdjSignal',
      'rsiSignal',
      'minRsi6',
      'maxRsi6',
      'bollSignal',
      'maTrend',
      'minBuySignalCount',
    ],
  },
  { id: 'northbound', label: '北向资金', keys: ['northboundOnly'] },
];

export const VISIBLE_FILTER_CONTROL_COUNT = FILTER_GROUPS.reduce(
  (total, group) => total + group.keys.length,
  0
);

function isFilterActive(value: ScreenerFilters[keyof ScreenerFilters]): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value === true;
  return value !== undefined && value !== null && value !== '';
}

export function countActiveFilters(filters: ScreenerFilters, keys?: (keyof ScreenerFilters)[]) {
  const targetKeys = keys ?? FILTER_GROUPS.flatMap((group) => group.keys);
  return targetKeys.reduce((count, key) => count + (isFilterActive(filters[key]) ? 1 : 0), 0);
}

// ----------------------------------------------------------------------

type FilterNumberInputProps = {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  unit?: string;
  step?: number;
};

function FilterNumberInput({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  step,
}: FilterNumberInputProps) {
  const [local, setLocal] = useState(() => (value != null ? String(value) : ''));

  useEffect(() => {
    setLocal(value != null ? String(value) : '');
  }, [value]);

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        type="number"
        value={local}
        placeholder="不限"
        onChange={(event) => setLocal(event.target.value)}
        onBlur={() => onChange(local === '' ? undefined : Number(local))}
        slotProps={{
          input: unit
            ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }
            : undefined,
          htmlInput: {
            'aria-label': label,
            ...(max != null ? { max } : {}),
            ...(min != null ? { min } : {}),
            ...(step != null ? { step } : {}),
          },
        }}
      />
    </Box>
  );
}

type SelectFilterProps = {
  label: string;
  value: string | undefined;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
};

function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Select
        fullWidth
        size="small"
        value={value ?? ''}
        inputProps={{ 'aria-label': label }}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

// ----------------------------------------------------------------------

type ScreenerFilterPanelProps = {
  filters: ScreenerFilters;
  industries: IndustryItem[];
  areas: AreaItem[];
  concepts?: ScreenerConceptItem[];
  onChange: (newFilters: ScreenerFilters) => void;
  onSearch?: () => void;
  onReset?: () => void;
  searchDisabled?: boolean;
};

export const ScreenerFilterPanel = memo(function ScreenerFilterPanel({
  filters,
  industries,
  areas,
  concepts = [],
  onChange,
  onSearch,
  onReset,
  searchDisabled = false,
}: ScreenerFilterPanelProps) {
  const [activeGroup, setActiveGroup] = useState<FilterGroupId>('basic');

  const set = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const activeDefinition = FILTER_GROUPS.find((group) => group.id === activeGroup)!;
  const industryOptions = useMemo(() => industries.map((item) => item.name), [industries]);
  const areaOptions = useMemo(() => areas.map((item) => item.name), [areas]);
  const conceptOptions = useMemo(
    () => concepts.map((item) => ({ tsCode: item.tsCode, label: `${item.name}(${item.count})` })),
    [concepts]
  );

  const renderEditor = () => {
    if (activeGroup === 'basic') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="交易所"
              value={filters.exchange}
              options={EXCHANGE_OPTIONS}
              onChange={(value) => set('exchange', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="板块"
              value={filters.market}
              options={MARKET_OPTIONS}
              onChange={(value) => set('market', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              multiple
              size="small"
              options={industryOptions}
              value={filters.industries ?? []}
              onChange={(_, value) => set('industries', value.length > 0 ? value : undefined)}
              renderInput={(params) => <TextField {...params} label="行业（多选）" placeholder="全部" />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    variant="outlined"
                  />
                ))
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              multiple
              size="small"
              options={areaOptions}
              value={filters.areas ?? []}
              onChange={(_, value) => set('areas', value.length > 0 ? value : undefined)}
              renderInput={(params) => <TextField {...params} label="地域（多选）" placeholder="全部" />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    variant="outlined"
                  />
                ))
              }
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'concept') {
      const selectedCodes = filters.conceptCodes ?? [];
      return (
        <Autocomplete
          multiple
          size="small"
          options={conceptOptions}
          getOptionLabel={(option) => option.label}
          value={conceptOptions.filter((option) => selectedCodes.includes(option.tsCode))}
          onChange={(_, value) => {
            const codes = value.map((option) => option.tsCode);
            set('conceptCodes', codes.length > 0 ? codes : undefined);
          }}
          isOptionEqualToValue={(option, value) => option.tsCode === value.tsCode}
          renderInput={(params) => <TextField {...params} label="概念多选" placeholder="选择概念板块" />}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.tsCode}
                label={option.label}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))
          }
        />
      );
    }

    if (activeGroup === 'valuation') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="PE TTM"
              minValue={filters.minPeTtm}
              maxValue={filters.maxPeTtm}
              onMinChange={(value) => set('minPeTtm', value)}
              onMaxChange={(value) => set('maxPeTtm', value)}
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="PB"
              minValue={filters.minPb}
              maxValue={filters.maxPb}
              onMinChange={(value) => set('minPb', value)}
              onMaxChange={(value) => set('maxPb', value)}
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="PS TTM"
              minValue={filters.minPsTtm}
              maxValue={filters.maxPsTtm}
              onMinChange={(value) => set('minPsTtm', value)}
              onMaxChange={(value) => set('maxPsTtm', value)}
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="股息率 TTM ≥"
              value={filters.minDvTtm}
              onChange={(value) => set('minDvTtm', value)}
              unit="%"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ScreenerFilterRangeInput
              label="总市值"
              minValue={filters.minTotalMv != null ? filters.minTotalMv / 10000 : undefined}
              maxValue={filters.maxTotalMv != null ? filters.maxTotalMv / 10000 : undefined}
              onMinChange={(value) => set('minTotalMv', value != null ? value * 10000 : undefined)}
              onMaxChange={(value) => set('maxTotalMv', value != null ? value * 10000 : undefined)}
              unit="亿"
              step={1}
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'growth') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="营收同比增速"
              minValue={filters.minRevenueYoy}
              maxValue={filters.maxRevenueYoy}
              onMinChange={(value) => set('minRevenueYoy', value)}
              onMaxChange={(value) => set('maxRevenueYoy', value)}
              unit="%"
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="净利润同比增速"
              minValue={filters.minNetprofitYoy}
              maxValue={filters.maxNetprofitYoy}
              onMinChange={(value) => set('minNetprofitYoy', value)}
              onMaxChange={(value) => set('maxNetprofitYoy', value)}
              unit="%"
              step={0.1}
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'profitability') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="ROE"
              minValue={filters.minRoe}
              maxValue={filters.maxRoe}
              onMinChange={(value) => set('minRoe', value)}
              onMaxChange={(value) => set('maxRoe', value)}
              unit="%"
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="毛利率 ≥"
              value={filters.minGrossMargin}
              onChange={(value) => set('minGrossMargin', value)}
              unit="%"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="净利率 ≥"
              value={filters.minNetMargin}
              onChange={(value) => set('minNetMargin', value)}
              unit="%"
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'financial') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="资产负债率 ≤"
              value={filters.maxDebtToAssets}
              onChange={(value) => set('maxDebtToAssets', value)}
              unit="%"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="流动比率 ≥"
              value={filters.minCurrentRatio}
              onChange={(value) => set('minCurrentRatio', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="速动比率 ≥"
              value={filters.minQuickRatio}
              onChange={(value) => set('minQuickRatio', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="经营现金流/净利润 ≥"
              value={filters.minOcfToNetprofit}
              onChange={(value) => set('minOcfToNetprofit', value)}
              step={0.01}
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'flow') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="近 5 日主力净流入 ≥"
              value={filters.minMainNetInflow5d}
              onChange={(value) => set('minMainNetInflow5d', value)}
              unit="万"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="近 20 日主力净流入 ≥"
              value={filters.minMainNetInflow20d}
              onChange={(value) => set('minMainNetInflow20d', value)}
              unit="万"
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'market') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="涨跌幅"
              minValue={filters.minPctChg}
              maxValue={filters.maxPctChg}
              onMinChange={(value) => set('minPctChg', value)}
              onMaxChange={(value) => set('maxPctChg', value)}
              unit="%"
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="换手率"
              minValue={filters.minTurnoverRate}
              maxValue={filters.maxTurnoverRate}
              onMinChange={(value) => set('minTurnoverRate', value)}
              onMaxChange={(value) => set('maxTurnoverRate', value)}
              unit="%"
              step={0.1}
            />
          </Grid>
        </Grid>
      );
    }

    if (activeGroup === 'technical') {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="MACD 信号"
              value={filters.macdSignal}
              options={MACD_SIGNAL_OPTIONS}
              onChange={(value) => set('macdSignal', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="KDJ 信号"
              value={filters.kdjSignal}
              options={KDJ_SIGNAL_OPTIONS}
              onChange={(value) => set('kdjSignal', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="RSI 信号"
              value={filters.rsiSignal}
              options={RSI_SIGNAL_OPTIONS}
              onChange={(value) => set('rsiSignal', value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ScreenerFilterRangeInput
              label="RSI 6 日"
              minValue={filters.minRsi6}
              maxValue={filters.maxRsi6}
              onMinChange={(value) => set('minRsi6', value)}
              onMaxChange={(value) => set('maxRsi6', value)}
              step={1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="布林带信号"
              value={filters.bollSignal}
              options={BOLL_SIGNAL_OPTIONS}
              onChange={(value) => set('bollSignal', value as ScreenerFilters['bollSignal'])}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectFilter
              label="均线趋势"
              value={filters.maTrend}
              options={MA_TREND_OPTIONS}
              onChange={(value) => set('maTrend', value as ScreenerFilters['maTrend'])}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FilterNumberInput
              label="至少命中偏多信号数"
              value={filters.minBuySignalCount}
              onChange={(value) => set('minBuySignalCount', value)}
              min={1}
              max={5}
              step={1}
            />
          </Grid>
        </Grid>
      );
    }

    return (
      <FormControlLabel
        control={
          <Switch
            checked={filters.northboundOnly ?? false}
            onChange={(event) => set('northboundOnly', event.target.checked || undefined)}
          />
        }
        label="仅显示北向持仓股"
      />
    );
  };

  return (
    <Box
      sx={{
        minHeight: 300,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '168px minmax(0, 1fr)' },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box
        component="nav"
        aria-label="选股条件分组"
        sx={{
          p: 1,
          borderRight: { xs: 0, sm: '1px solid' },
          borderBottom: { xs: '1px solid', sm: 0 },
          borderColor: 'divider',
          bgcolor: 'background.neutral',
        }}
      >
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ px: 1, py: 0.75 }}>
          <Typography variant="subtitle2">筛选条件</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {countActiveFilters(filters)} 条
          </Typography>
        </Stack>
        <List
          disablePadding
          sx={{
            display: { xs: 'flex', sm: 'block' },
            gap: { xs: 0.5, sm: 0 },
            overflowX: { xs: 'auto', sm: 'visible' },
          }}
        >
          {FILTER_GROUPS.map((group) => {
            const count = countActiveFilters(filters, group.keys);
            return (
              <ListItemButton
                key={group.id}
                selected={activeGroup === group.id}
                onClick={() => setActiveGroup(group.id)}
                sx={{ minHeight: 44, borderRadius: 1, flexShrink: 0 }}
              >
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{ variant: 'body2', whiteSpace: 'nowrap' }}
                />
                <Typography variant="caption" sx={{ color: count > 0 ? 'primary.main' : 'text.disabled', ml: 1 }}>
                  {count}
                </Typography>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {activeDefinition.label}
        </Typography>
        {renderEditor()}
        {onSearch && onReset ? (
          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 2.5 }}>
            <Button variant="outlined" onClick={onReset}>
              重置条件
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:search-fill" />}
              onClick={onSearch}
              disabled={searchDisabled}
            >
              开始选股
            </Button>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
});
