import type { ScreenerFilters } from 'src/api/screener';

import Grid from '@mui/material/Grid';

import { FilterNumberInput } from './screener-filter-inputs';
import { ScreenerFilterRangeInput } from './screener-filter-range-input';

// ----------------------------------------------------------------------

type FilterEditorProps = {
  filters: ScreenerFilters;
  setFilter: <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => void;
};

export function ValuationFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="PE TTM"
          minValue={filters.minPeTtm}
          maxValue={filters.maxPeTtm}
          onMinChange={(value) => setFilter('minPeTtm', value)}
          onMaxChange={(value) => setFilter('maxPeTtm', value)}
          step={0.1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="PB"
          minValue={filters.minPb}
          maxValue={filters.maxPb}
          onMinChange={(value) => setFilter('minPb', value)}
          onMaxChange={(value) => setFilter('maxPb', value)}
          step={0.1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="PS TTM"
          minValue={filters.minPsTtm}
          maxValue={filters.maxPsTtm}
          onMinChange={(value) => setFilter('minPsTtm', value)}
          onMaxChange={(value) => setFilter('maxPsTtm', value)}
          step={0.1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="股息率 TTM ≥"
          value={filters.minDvTtm}
          onChange={(value) => setFilter('minDvTtm', value)}
          unit="%"
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <ScreenerFilterRangeInput
          label="总市值"
          minValue={filters.minTotalMv != null ? filters.minTotalMv / 10000 : undefined}
          maxValue={filters.maxTotalMv != null ? filters.maxTotalMv / 10000 : undefined}
          onMinChange={(value) =>
            setFilter('minTotalMv', value != null ? value * 10000 : undefined)
          }
          onMaxChange={(value) =>
            setFilter('maxTotalMv', value != null ? value * 10000 : undefined)
          }
          unit="亿"
          step={1}
        />
      </Grid>
    </Grid>
  );
}

export function GrowthFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="营收同比增速"
          minValue={filters.minRevenueYoy}
          maxValue={filters.maxRevenueYoy}
          onMinChange={(value) => setFilter('minRevenueYoy', value)}
          onMaxChange={(value) => setFilter('maxRevenueYoy', value)}
          unit="%"
          step={0.1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="净利润同比增速"
          minValue={filters.minNetprofitYoy}
          maxValue={filters.maxNetprofitYoy}
          onMinChange={(value) => setFilter('minNetprofitYoy', value)}
          onMaxChange={(value) => setFilter('maxNetprofitYoy', value)}
          unit="%"
          step={0.1}
        />
      </Grid>
    </Grid>
  );
}

export function ProfitabilityFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <ScreenerFilterRangeInput
          label="ROE"
          minValue={filters.minRoe}
          maxValue={filters.maxRoe}
          onMinChange={(value) => setFilter('minRoe', value)}
          onMaxChange={(value) => setFilter('maxRoe', value)}
          unit="%"
          step={0.1}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="毛利率 ≥"
          value={filters.minGrossMargin}
          onChange={(value) => setFilter('minGrossMargin', value)}
          unit="%"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="净利率 ≥"
          value={filters.minNetMargin}
          onChange={(value) => setFilter('minNetMargin', value)}
          unit="%"
        />
      </Grid>
    </Grid>
  );
}

export function FinancialFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="资产负债率 ≤"
          value={filters.maxDebtToAssets}
          onChange={(value) => setFilter('maxDebtToAssets', value)}
          unit="%"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="流动比率 ≥"
          value={filters.minCurrentRatio}
          onChange={(value) => setFilter('minCurrentRatio', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="速动比率 ≥"
          value={filters.minQuickRatio}
          onChange={(value) => setFilter('minQuickRatio', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="经营现金流/净利润 ≥"
          value={filters.minOcfToNetprofit}
          onChange={(value) => setFilter('minOcfToNetprofit', value)}
          step={0.01}
        />
      </Grid>
    </Grid>
  );
}

export function FlowFilterEditor({ filters, setFilter }: FilterEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="近 5 日主力净流入 ≥"
          value={filters.minMainNetInflow5d}
          onChange={(value) => setFilter('minMainNetInflow5d', value)}
          unit="万"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FilterNumberInput
          label="近 20 日主力净流入 ≥"
          value={filters.minMainNetInflow20d}
          onChange={(value) => setFilter('minMainNetInflow20d', value)}
          unit="万"
        />
      </Grid>
    </Grid>
  );
}
