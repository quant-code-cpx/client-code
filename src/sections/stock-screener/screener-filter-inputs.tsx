import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

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

export function FilterNumberInput({
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

export function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Select
        fullWidth
        size="small"
        value={value ?? ''}
        slotProps={{ input: { 'aria-label': label } }}
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
