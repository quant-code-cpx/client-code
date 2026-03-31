import type { AreaItem, IndustryItem, ScreenerFilters } from 'src/api/screener';

import { memo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';

import { Iconify } from 'src/components/iconify';

import { MARKET_OPTIONS, EXCHANGE_OPTIONS } from './constants';
import { ScreenerFilterRangeInput } from './screener-filter-range-input';

// ----------------------------------------------------------------------
// 单个数字输入（本地 draft 状态，失焦时才提交父组件）
// ----------------------------------------------------------------------

type FilterNumberInputProps = {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  step?: number;
};

function FilterNumberInput({ label, value, onChange, unit, step }: FilterNumberInputProps) {
  const [local, setLocal] = useState(() => (value != null ? String(value) : ''));

  useEffect(() => {
    setLocal(value != null ? String(value) : '');
  }, [value]);

  const slotProps = unit
    ? { input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } }
    : undefined;

  return (
    <>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        type="number"
        value={local}
        placeholder="不限"
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onChange(local === '' ? undefined : Number(local))}
        slotProps={{ ...slotProps, ...(step != null ? { htmlInput: { step } } : {}) }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

type ScreenerFilterPanelProps = {
  filters: ScreenerFilters;
  industries: IndustryItem[];
  areas: AreaItem[];
  onChange: (newFilters: ScreenerFilters) => void;
  onSearch: () => void;
  onReset: () => void;
};

// ----------------------------------------------------------------------

export const ScreenerFilterPanel = memo(function ScreenerFilterPanel({
  filters,
  industries,
  areas,
  onChange,
  onSearch,
  onReset,
}: ScreenerFilterPanelProps) {
  const set = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const industryOptions = industries.map((i) => `${i.name}(${i.count})`);
  const areaOptions = areas.map((a) => `${a.name}(${a.count})`);

  const industryValue = filters.industry
    ? (industryOptions.find((o) => o.startsWith(filters.industry!)) ?? filters.industry)
    : null;

  const areaValue = filters.area
    ? (areaOptions.find((o) => o.startsWith(filters.area!)) ?? filters.area)
    : null;

  return (
    <Accordion defaultExpanded sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
        <Typography variant="subtitle1">筛选条件</Typography>
      </AccordionSummary>

      <AccordionDetails>
        {/* 第 1 行：基本面 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          基本面
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
            >
              交易所
            </Typography>
            <Select
              fullWidth
              size="small"
              value={filters.exchange ?? ''}
              onChange={(e) => set('exchange', e.target.value || undefined)}
            >
              {EXCHANGE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
            >
              板块
            </Typography>
            <Select
              fullWidth
              size="small"
              value={filters.market ?? ''}
              onChange={(e) => set('market', e.target.value || undefined)}
            >
              {MARKET_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
            >
              行业
            </Typography>
            <Autocomplete
              size="small"
              options={industryOptions}
              value={industryValue}
              onChange={(_, v) => {
                const raw = v ? v.replace(/\(\d+\)$/, '') : undefined;
                set('industry', raw);
              }}
              renderInput={(params) => <TextField {...params} placeholder="全部" />}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
            >
              地域
            </Typography>
            <Autocomplete
              size="small"
              options={areaOptions}
              value={areaValue}
              onChange={(_, v) => {
                const raw = v ? v.replace(/\(\d+\)$/, '') : undefined;
                set('area', raw);
              }}
              renderInput={(params) => <TextField {...params} placeholder="全部" />}
            />
          </Grid>
        </Grid>

        {/* 第 2 行：估值 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          估值
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="PE TTM"
              minValue={filters.minPeTtm}
              maxValue={filters.maxPeTtm}
              onMinChange={(v) => set('minPeTtm', v)}
              onMaxChange={(v) => set('maxPeTtm', v)}
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="PB"
              minValue={filters.minPb}
              maxValue={filters.maxPb}
              onMinChange={(v) => set('minPb', v)}
              onMaxChange={(v) => set('maxPb', v)}
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="股息率 TTM ≥ (%)"
              value={filters.minDvTtm}
              onChange={(v) => set('minDvTtm', v)}
              unit="%"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="总市值 (亿)"
              minValue={filters.minTotalMv != null ? filters.minTotalMv / 10000 : undefined}
              maxValue={filters.maxTotalMv != null ? filters.maxTotalMv / 10000 : undefined}
              onMinChange={(v) => set('minTotalMv', v != null ? v * 10000 : undefined)}
              onMaxChange={(v) => set('maxTotalMv', v != null ? v * 10000 : undefined)}
              unit="亿"
              step={1}
            />
          </Grid>
        </Grid>

        {/* 第 3 行：成长 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          成长
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="营收同比增速 (%)"
              minValue={filters.minRevenueYoy}
              maxValue={filters.maxRevenueYoy}
              onMinChange={(v) => set('minRevenueYoy', v)}
              onMaxChange={(v) => set('maxRevenueYoy', v)}
              unit="%"
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="净利润同比增速 (%)"
              minValue={filters.minNetprofitYoy}
              maxValue={filters.maxNetprofitYoy}
              onMinChange={(v) => set('minNetprofitYoy', v)}
              onMaxChange={(v) => set('maxNetprofitYoy', v)}
              unit="%"
              step={0.1}
            />
          </Grid>
        </Grid>

        {/* 第 4 行：盈利 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          盈利
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="ROE (%)"
              minValue={filters.minRoe}
              maxValue={filters.maxRoe}
              onMinChange={(v) => set('minRoe', v)}
              onMaxChange={(v) => set('maxRoe', v)}
              unit="%"
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="毛利率 ≥ (%)"
              value={filters.minGrossMargin}
              onChange={(v) => set('minGrossMargin', v)}
              unit="%"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="净利率 ≥ (%)"
              value={filters.minNetMargin}
              onChange={(v) => set('minNetMargin', v)}
              unit="%"
            />
          </Grid>
        </Grid>

        {/* 第 5 行：财务健康 + 现金流 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          财务健康 / 现金流
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="资产负债率 ≤ (%)"
              value={filters.maxDebtToAssets}
              onChange={(v) => set('maxDebtToAssets', v)}
              unit="%"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="流动比率 ≥"
              value={filters.minCurrentRatio}
              onChange={(v) => set('minCurrentRatio', v)}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="速动比率 ≥"
              value={filters.minQuickRatio}
              onChange={(v) => set('minQuickRatio', v)}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="经营现金流/净利润 ≥"
              value={filters.minOcfToNetprofit}
              onChange={(v) => set('minOcfToNetprofit', v)}
              step={0.01}
            />
          </Grid>
        </Grid>

        {/* 第 6 行：资金流向 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          资金流向
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="近5日主力净流入 ≥ (万元)"
              value={filters.minMainNetInflow5d}
              onChange={(v) => set('minMainNetInflow5d', v)}
              unit="万"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <FilterNumberInput
              label="近20日主力净流入 ≥ (万元)"
              value={filters.minMainNetInflow20d}
              onChange={(v) => set('minMainNetInflow20d', v)}
              unit="万"
            />
          </Grid>
        </Grid>

        {/* 第 7 行：行情 */}
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          行情
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="涨跌幅 (%)"
              minValue={filters.minPctChg}
              maxValue={filters.maxPctChg}
              onMinChange={(v) => set('minPctChg', v)}
              onMaxChange={(v) => set('maxPctChg', v)}
              unit="%"
              step={0.1}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <ScreenerFilterRangeInput
              label="换手率 (%)"
              minValue={filters.minTurnoverRate}
              maxValue={filters.maxTurnoverRate}
              onMinChange={(v) => set('minTurnoverRate', v)}
              onMaxChange={(v) => set('maxTurnoverRate', v)}
              unit="%"
              step={0.1}
            />
          </Grid>
        </Grid>

        {/* 底部按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
          <Button variant="outlined" onClick={onReset}>
            重置条件
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="eva:search-fill" />}
            onClick={onSearch}
          >
            开始选股
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
});
