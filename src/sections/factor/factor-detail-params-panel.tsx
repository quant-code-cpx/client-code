import dayjs from 'dayjs';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';

// ----------------------------------------------------------------------

const UNIVERSE_OPTIONS = [
  { label: '全市场', value: '' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '上证50', value: '000016.SH' },
];

// ----------------------------------------------------------------------

type ParamsPanelValue = {
  startDate: string;
  endDate: string;
  universe?: string;
};

type FactorDetailParamsPanelProps = {
  value: ParamsPanelValue;
  onChange: (value: ParamsPanelValue) => void;
  onAnalyze: () => void;
  loading?: boolean;
};

export function FactorDetailParamsPanel({
  value,
  onChange,
  onAnalyze,
  loading,
}: FactorDetailParamsPanelProps) {
  // Convert YYYYMMDD <-> YYYY-MM-DD for HTML date input
  const toInputDate = (d: string) => dayjs(d, 'YYYYMMDD').format('YYYY-MM-DD');
  const fromInputDate = (d: string) => dayjs(d).format('YYYYMMDD');

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          分析参数
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
          <TextField
            label="起始日期"
            type="date"
            size="small"
            value={toInputDate(value.startDate)}
            onChange={(e) => onChange({ ...value, startDate: fromInputDate(e.target.value) })}
            inputProps={{ max: toInputDate(value.endDate) }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />

          <TextField
            label="结束日期"
            type="date"
            size="small"
            value={toInputDate(value.endDate)}
            onChange={(e) => onChange({ ...value, endDate: fromInputDate(e.target.value) })}
            inputProps={{ min: toInputDate(value.startDate), max: dayjs().format('YYYY-MM-DD') }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>股票池</InputLabel>
            <Select
              label="股票池"
              value={value.universe ?? ''}
              onChange={(e) => onChange({ ...value, universe: e.target.value || undefined })}
            >
              {UNIVERSE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={onAnalyze}
            disabled={loading === true}
            sx={{ minWidth: 100 }}
          >
            开始分析
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
