import type { ScreenerFilters } from 'src/api/screener';

import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

import { ScreenerFilterRangeInput } from './screener-filter-range-input';
import { SelectFilter, FilterNumberInput } from './screener-filter-inputs';
import {
  MA_TREND_OPTIONS,
  KDJ_SIGNAL_OPTIONS,
  RSI_SIGNAL_OPTIONS,
  BOLL_SIGNAL_OPTIONS,
  MACD_SIGNAL_OPTIONS,
} from './constants';

// ----------------------------------------------------------------------

type FilterEditorProps = {
  filters: ScreenerFilters;
  setFilter: <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => void;
};

export function MarketFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="涨跌幅"
          minValue={filters.minPctChg}
          maxValue={filters.maxPctChg}
          onMinChange={(value) => setFilter('minPctChg', value)}
          onMaxChange={(value) => setFilter('maxPctChg', value)}
          unit="%"
          step={0.1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="换手率"
          minValue={filters.minTurnoverRate}
          maxValue={filters.maxTurnoverRate}
          onMinChange={(value) => setFilter('minTurnoverRate', value)}
          onMaxChange={(value) => setFilter('maxTurnoverRate', value)}
          unit="%"
          step={0.1}
        />
      </Grid>
    </Grid>
  );
}

export function TechnicalFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="MACD 信号"
          value={filters.macdSignal}
          options={MACD_SIGNAL_OPTIONS}
          onChange={(value) => setFilter('macdSignal', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="KDJ 信号"
          value={filters.kdjSignal}
          options={KDJ_SIGNAL_OPTIONS}
          onChange={(value) => setFilter('kdjSignal', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="RSI 信号"
          value={filters.rsiSignal}
          options={RSI_SIGNAL_OPTIONS}
          onChange={(value) => setFilter('rsiSignal', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="RSI 6 日"
          minValue={filters.minRsi6}
          maxValue={filters.maxRsi6}
          onMinChange={(value) => setFilter('minRsi6', value)}
          onMaxChange={(value) => setFilter('maxRsi6', value)}
          step={1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="布林带信号"
          value={filters.bollSignal}
          options={BOLL_SIGNAL_OPTIONS}
          onChange={(value) => setFilter('bollSignal', value as ScreenerFilters['bollSignal'])}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="均线趋势"
          value={filters.maTrend}
          options={MA_TREND_OPTIONS}
          onChange={(value) => setFilter('maTrend', value as ScreenerFilters['maTrend'])}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="至少命中偏多信号数"
          value={filters.minBuySignalCount}
          onChange={(value) => setFilter('minBuySignalCount', value)}
          min={1}
          max={5}
          step={1}
        />
      </Grid>
    </Grid>
  );
}

export function NorthboundFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={filters.northboundOnly ?? false}
          onChange={(event) => setFilter('northboundOnly', event.target.checked || undefined)}
        />
      }
      label="仅显示北向持仓股"
    />
  );
}
