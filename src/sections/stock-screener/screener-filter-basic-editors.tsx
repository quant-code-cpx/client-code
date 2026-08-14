import type {
  AreaItem,
  IndustryItem,
  ScreenerFilters,
  ScreenerConceptItem,
} from 'src/api/screener';

import { useMemo } from 'react';

import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import { SelectFilter } from './screener-filter-inputs';
import { MARKET_OPTIONS, EXCHANGE_OPTIONS } from './constants';

// ----------------------------------------------------------------------

type FilterSetter = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => void;

type BasicFilterEditorProps = {
  filters: ScreenerFilters;
  industries: IndustryItem[];
  areas: AreaItem[];
  setFilter: FilterSetter;
};

export function BasicFilterEditor({
  filters,
  industries,
  areas,
  setFilter,
}: BasicFilterEditorProps) {
  const industryOptions = useMemo(() => industries.map((item) => item.name), [industries]);
  const areaOptions = useMemo(() => areas.map((item) => item.name), [areas]);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="交易所"
          value={filters.exchange}
          options={EXCHANGE_OPTIONS}
          onChange={(value) => setFilter('exchange', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SelectFilter
          label="板块"
          value={filters.market}
          options={MARKET_OPTIONS}
          onChange={(value) => setFilter('market', value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Autocomplete
          multiple
          size="small"
          options={industryOptions}
          value={filters.industries ?? []}
          onChange={(_, value) => setFilter('industries', value.length > 0 ? value : undefined)}
          renderInput={(params) => (
            <TextField {...params} label="行业（多选）" placeholder="全部" />
          )}
          renderValue={(value, getItemProps) =>
            value.map((option, index) => {
              const { key, ...itemProps } = getItemProps({ index });
              return (
                <Chip key={key} {...itemProps} label={option} size="small" variant="outlined" />
              );
            })
          }
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Autocomplete
          multiple
          size="small"
          options={areaOptions}
          value={filters.areas ?? []}
          onChange={(_, value) => setFilter('areas', value.length > 0 ? value : undefined)}
          renderInput={(params) => (
            <TextField {...params} label="地域（多选）" placeholder="全部" />
          )}
          renderValue={(value, getItemProps) =>
            value.map((option, index) => {
              const { key, ...itemProps } = getItemProps({ index });
              return (
                <Chip key={key} {...itemProps} label={option} size="small" variant="outlined" />
              );
            })
          }
        />
      </Grid>
    </Grid>
  );
}

type ConceptFilterEditorProps = {
  filters: ScreenerFilters;
  concepts: ScreenerConceptItem[];
  setFilter: FilterSetter;
};

export function ConceptFilterEditor({ filters, concepts, setFilter }: ConceptFilterEditorProps) {
  const conceptOptions = useMemo(
    () => concepts.map((item) => ({ tsCode: item.tsCode, label: `${item.name}(${item.count})` })),
    [concepts]
  );
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
        setFilter('conceptCodes', codes.length > 0 ? codes : undefined);
      }}
      isOptionEqualToValue={(option, value) => option.tsCode === value.tsCode}
      renderInput={(params) => (
        <TextField {...params} label="概念多选" placeholder="选择概念板块" />
      )}
      renderValue={(value, getItemProps) =>
        value.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return (
            <Chip
              key={key}
              {...itemProps}
              label={option.label}
              size="small"
              color="primary"
              variant="outlined"
            />
          );
        })
      }
    />
  );
}
