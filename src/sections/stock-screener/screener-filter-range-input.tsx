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
  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onMinChange(val === '' ? undefined : Number(val));
  };

  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onMaxChange(val === '' ? undefined : Number(val));
  };

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
          value={minValue ?? ''}
          placeholder={placeholder[0]}
          onChange={handleMin}
          slotProps={{ ...slotProps, htmlInput: { step } }}
          sx={{ flex: 1 }}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
          ~
        </Typography>
        <TextField
          size="small"
          type="number"
          value={maxValue ?? ''}
          placeholder={placeholder[1]}
          onChange={handleMax}
          slotProps={{ ...slotProps, htmlInput: { step } }}
          sx={{ flex: 1 }}
        />
      </Box>
    </Box>
  );
}
