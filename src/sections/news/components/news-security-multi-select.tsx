import type { StockSearchItem } from 'src/api/stock';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { searchStocks } from 'src/api/stock';

const MAX_SECURITY_CODES = 20;
const SEARCH_DEBOUNCE_MS = 300;

export type NewsSecurityMultiSelectProps = {
  value: string[];
  error?: string;
  onChange: (securityCodes: string[]) => void;
};

export function NewsSecurityMultiSelect({ value, error, onChange }: NewsSecurityMultiSelectProps) {
  const [options, setOptions] = useState<StockSearchItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGenerationRef = useRef(0);

  const selected = useMemo(
    () =>
      value.map(
        (tsCode) => options.find((option) => option.tsCode === tsCode) ?? stockItemFromCode(tsCode)
      ),
    [options, value]
  );

  const availableOptions = useMemo(() => {
    const unique = new Map<string, StockSearchItem>();
    selected.forEach((option) => unique.set(option.tsCode, option));
    options.forEach((option) => unique.set(option.tsCode, option));
    return [...unique.values()];
  }, [options, selected]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      searchGenerationRef.current += 1;
    },
    []
  );

  const handleInputChange = useCallback(
    (_: React.SyntheticEvent, nextInput: string, reason: string) => {
      setInputValue(nextInput);
      if (timerRef.current) clearTimeout(timerRef.current);

      const generation = searchGenerationRef.current + 1;
      searchGenerationRef.current = generation;
      if (reason === 'reset' || nextInput.trim().length === 0) {
        setLoading(false);
        return;
      }

      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const result = await searchStocks({ keyword: nextInput.trim(), limit: 20 });
          if (searchGenerationRef.current === generation) setOptions(result.items ?? []);
        } catch {
          if (searchGenerationRef.current === generation) setOptions([]);
        } finally {
          if (searchGenerationRef.current === generation) setLoading(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  return (
    <Autocomplete<StockSearchItem, true, false, false>
      multiple
      limitTags={3}
      value={selected}
      inputValue={inputValue}
      options={availableOptions}
      loading={loading}
      filterOptions={(items) => items}
      getOptionLabel={(option) => [option.name, option.tsCode].filter(Boolean).join(' ')}
      isOptionEqualToValue={(option, selectedOption) => option.tsCode === selectedOption.tsCode}
      getOptionDisabled={(option) =>
        value.length >= MAX_SECURITY_CODES && !value.includes(option.tsCode)
      }
      onInputChange={handleInputChange}
      onChange={(_, nextOptions) =>
        onChange(
          [...new Set(nextOptions.map((option) => option.tsCode))].slice(0, MAX_SECURITY_CODES)
        )
      }
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={key} label={option.name || option.tsCode} size="small" {...tagProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="证券代码"
          placeholder={value.length === 0 ? '输入代码或名称搜索' : undefined}
          error={Boolean(error)}
          helperText={error ?? `已选 ${value.length}/${MAX_SECURITY_CODES}`}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box component="li" key={key} {...optionProps}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" fontWeight={500}>
                {option.name || option.tsCode} · {option.tsCode}
              </Typography>
              {option.industry ? (
                <Typography variant="caption" color="text.secondary">
                  {[option.market, option.industry].filter(Boolean).join(' · ')}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      }}
    />
  );
}

function stockItemFromCode(tsCode: string): StockSearchItem {
  return {
    tsCode,
    symbol: tsCode.split('.')[0] ?? tsCode,
    name: '',
    market: null,
    industry: null,
    listStatus: null,
  };
}
