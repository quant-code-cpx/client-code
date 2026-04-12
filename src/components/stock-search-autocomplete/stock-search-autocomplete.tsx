import type { SxProps } from '@mui/material/styles';
import type { StockSearchItem } from 'src/api/stock';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { searchStocks } from 'src/api/stock';

// ----------------------------------------------------------------------

type Props = {
  onChange: (item: StockSearchItem | null) => void;
  value?: StockSearchItem | null;
  placeholder?: string;
  fullWidth?: boolean;
  sx?: SxProps;
};

export function StockSearchAutocomplete({
  onChange,
  value = null,
  placeholder = '输入股票代码或名称...',
  fullWidth = false,
  sx,
}: Props) {
  const [options, setOptions] = useState<StockSearchItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced fetch — use ref so the object reference is stable
  const debounceRef = useRef<{ timer: ReturnType<typeof setTimeout> | null }>({ timer: null });

  // Clear pending timer on unmount to avoid state updates on unmounted component
  useEffect(
    () => () => {
      if (debounceRef.current.timer) clearTimeout(debounceRef.current.timer);
    },
    []
  );

  const handleInputChange = useCallback(
    (_: React.SyntheticEvent, newInput: string) => {
      setInputValue(newInput);

      if (debounceRef.current.timer) clearTimeout(debounceRef.current.timer);

      if (!newInput || newInput.length < 1) {
        setOptions([]);
        return;
      }

      debounceRef.current.timer = setTimeout(async () => {
        setLoading(true);
        try {
          const result = await searchStocks({ keyword: newInput, limit: 20 });
          setOptions(result.items ?? []);
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [] // debounceRef is a stable ref; setters are stable
  );

  return (
    <Autocomplete
      value={value}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={(_, newValue) => onChange(newValue)}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(option) => `${option.tsCode} ${option.name}`}
      isOptionEqualToValue={(option, val) => option.tsCode === val.tsCode}
      fullWidth={fullWidth}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder={placeholder}
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
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.tsCode}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" fontWeight={500}>
                {option.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
              >
                {option.tsCode}
              </Typography>
            </Box>
            {option.industry && (
              <Typography variant="caption" color="text.secondary">
                {option.market ?? ''} · {option.industry}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    />
  );
}
