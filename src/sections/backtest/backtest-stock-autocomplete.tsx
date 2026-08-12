import { useMemo, useState, useCallback } from 'react';

import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import { stockApi } from 'src/api/stock';

// ----------------------------------------------------------------------

type StockOption = {
  tsCode: string;
  label: string;
};

type BacktestStockAutocompleteProps = {
  value: string[];
  label?: string;
  maxItems?: number;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  onChange: (next: string[]) => void;
};

function uniqueCodes(options: StockOption[]) {
  return Array.from(new Set(options.map((option) => option.tsCode).filter(Boolean)));
}

export function BacktestStockAutocomplete({
  value,
  label = '股票池',
  maxItems = 100,
  error = false,
  helperText,
  disabled = false,
  onChange,
}: BacktestStockAutocompleteProps) {
  const [options, setOptions] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [limitWarning, setLimitWarning] = useState('');

  const selectedOptions = useMemo(
    () => value.map((code) => ({ tsCode: code, label: code })),
    [value]
  );

  const search = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await stockApi.list({ keyword, pageSize: 20 });
      setOptions(
        (res.items ?? []).map((stock) => ({
          tsCode: stock.tsCode,
          label: `${stock.tsCode} ${stock.name ?? ''}`.trim(),
        }))
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <Autocomplete
        multiple
        disabled={disabled}
        options={options}
        loading={loading}
        value={selectedOptions}
        inputValue={inputValue}
        filterOptions={(items) => items}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, selected) => option.tsCode === selected.tsCode}
        onInputChange={(_, nextInput) => {
          setInputValue(nextInput);
          search(nextInput);
        }}
        onChange={(_, nextOptions) => {
          const nextCodes = uniqueCodes(nextOptions);
          if (nextCodes.length > maxItems) {
            setLimitWarning(`自定义股票池最多支持 ${maxItems} 只，已保留前 ${maxItems} 只。`);
            onChange(nextCodes.slice(0, maxItems));
            return;
          }
          setLimitWarning('');
          onChange(nextCodes);
        }}
        renderValue={(tagValue, getItemProps) =>
          tagValue.map((option, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return <Chip key={key} {...itemProps} size="small" label={option.tsCode} />;
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            error={error}
            helperText={
              helperText ?? `输入代码或名称搜索并添加，当前 ${value.length}/${maxItems} 只`
            }
          />
        )}
      />

      {limitWarning ? (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {limitWarning}
        </Alert>
      ) : null}
    </>
  );
}
