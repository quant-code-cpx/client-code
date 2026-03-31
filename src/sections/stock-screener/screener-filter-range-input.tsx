import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

// ----------------------------------------------------------------------

type ScreenerFilterRangeInputProps = {
  label: string;
  minValue: number | undefined;
  maxValue: number | undefined;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
  unit?: string;
  step?: number;
  placeholder?: [string, string];
};

// ----------------------------------------------------------------------

export function ScreenerFilterRangeInput({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  unit,
  step = 1,
  placeholder = ['不限', '不限'],
}: ScreenerFilterRangeInputProps) {
  const [localMin, setLocalMin] = useState(() => (minValue != null ? String(minValue) : ''));
  const [localMax, setLocalMax] = useState(() => (maxValue != null ? String(maxValue) : ''));

  // 当父组件（预设加载、重置）修改该字段值时同步到本地
  useEffect(() => {
    setLocalMin(minValue != null ? String(minValue) : '');
  }, [minValue]);

  useEffect(() => {
    setLocalMax(maxValue != null ? String(maxValue) : '');
  }, [maxValue]);

  const slotProps = unit
    ? { input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } }
    : undefined;

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          size="small"
          type="number"
          value={localMin}
          placeholder={placeholder[0]}
          onChange={(e) => setLocalMin(e.target.value)}
          onBlur={() => onMinChange(localMin === '' ? undefined : Number(localMin))}
          slotProps={{ ...slotProps, htmlInput: { step } }}
          sx={{ flex: 1 }}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
          ~
        </Typography>
        <TextField
          size="small"
          type="number"
          value={localMax}
          placeholder={placeholder[1]}
          onChange={(e) => setLocalMax(e.target.value)}
          onBlur={() => onMaxChange(localMax === '' ? undefined : Number(localMax))}
          slotProps={{ ...slotProps, htmlInput: { step } }}
          sx={{ flex: 1 }}
        />
      </Box>
    </Box>
  );
}
