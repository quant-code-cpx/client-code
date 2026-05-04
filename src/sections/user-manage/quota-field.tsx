import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

// ----------------------------------------------------------------------

type QuotaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
};

export function QuotaField({ label, value, helperText, onChange }: QuotaFieldProps) {
  const unlimited = value === '-1';

  return (
    <Stack spacing={1}>
      <FormControl>
        <RadioGroup
          row
          value={unlimited ? 'unlimited' : 'limited'}
          onChange={(event) => onChange(event.target.value === 'unlimited' ? '-1' : '0')}
        >
          <FormControlLabel value="limited" control={<Radio size="small" />} label="具体数字" />
          <FormControlLabel value="unlimited" control={<Radio size="small" />} label="不限" />
        </RadioGroup>
      </FormControl>

      <TextField
        label={label}
        type="number"
        value={unlimited ? '' : value}
        disabled={unlimited}
        onChange={(event) => onChange(event.target.value)}
        helperText={
          helperText ?? (unlimited ? '提交值为 -1，表示不限制' : '请输入大于等于 0 的整数')
        }
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }}
      />
    </Stack>
  );
}
