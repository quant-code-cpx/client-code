import dayjs from 'dayjs';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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
          <DatePicker
            label="起始日期"
            value={value.startDate ? dayjs(value.startDate, 'YYYYMMDD') : null}
            onChange={(v) => onChange({ ...value, startDate: v?.format('YYYYMMDD') ?? '' })}
            format="YYYY-MM-DD"
            maxDate={value.endDate ? dayjs(value.endDate, 'YYYYMMDD') : undefined}
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 190 } },
              field: { clearable: true },
            }}
          />

          <DatePicker
            label="结束日期"
            value={value.endDate ? dayjs(value.endDate, 'YYYYMMDD') : null}
            onChange={(v) => onChange({ ...value, endDate: v?.format('YYYYMMDD') ?? '' })}
            format="YYYY-MM-DD"
            minDate={value.startDate ? dayjs(value.startDate, 'YYYYMMDD') : undefined}
            maxDate={dayjs()}
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 190 } },
              field: { clearable: true },
            }}
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
