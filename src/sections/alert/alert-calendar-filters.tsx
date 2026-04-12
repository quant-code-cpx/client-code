import type { EventType } from 'src/api/alert';

import dayjs from 'dayjs';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// ----------------------------------------------------------------------

const EVENT_TYPE_OPTIONS: Array<{
  value: EventType;
  label: string;
  color: 'info' | 'warning' | 'success' | 'error';
}> = [
  { value: 'DISCLOSURE', label: '财报披露', color: 'info' },
  { value: 'FLOAT', label: '限售解禁', color: 'warning' },
  { value: 'DIVIDEND', label: '除权除息', color: 'success' },
  { value: 'FORECAST', label: '业绩预告', color: 'error' },
];

type Props = {
  startDate: string;
  endDate: string;
  selectedTypes: EventType[];
  tsCode: string | undefined;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onTypesChange: (v: EventType[]) => void;
  onTsCodeChange: (v: string | undefined) => void;
};

/** 将 YYYYMMDD ↔ yyyy-MM-dd */
function toInputDate(yyyymmdd: string): string {
  if (yyyymmdd.length === 8) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }
  return yyyymmdd;
}
function fromInputDate(input: string): string {
  return input.replace(/-/g, '');
}

export function AlertCalendarFilters({
  startDate,
  endDate,
  selectedTypes,
  tsCode,
  onStartDateChange,
  onEndDateChange,
  onTypesChange,
  onTsCodeChange,
}: Props) {
  const toggleType = (type: EventType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <DatePicker
          label="开始日期"
          value={startDate ? dayjs(startDate, 'YYYYMMDD') : null}
          onChange={(v) => onStartDateChange(v?.format('YYYYMMDD') ?? '')}
          format="YYYY-MM-DD"
          slotProps={{
            textField: { size: 'small', sx: { minWidth: 190 } },
            field: { clearable: true },
          }}
        />
        <DatePicker
          label="结束日期"
          value={endDate ? dayjs(endDate, 'YYYYMMDD') : null}
          onChange={(v) => onEndDateChange(v?.format('YYYYMMDD') ?? '')}
          format="YYYY-MM-DD"
          slotProps={{
            textField: { size: 'small', sx: { minWidth: 190 } },
            field: { clearable: true },
          }}
        />
        <TextField
          label="股票代码（可选）"
          size="small"
          value={tsCode ?? ''}
          onChange={(e) => onTsCodeChange(e.target.value || undefined)}
          placeholder="如 000001.SZ"
          sx={{ width: 200 }}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" color="text.secondary">
          事件类型：
        </Typography>
        {EVENT_TYPE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            color={selectedTypes.includes(opt.value) ? opt.color : 'default'}
            variant={selectedTypes.includes(opt.value) ? 'filled' : 'outlined'}
            onClick={() => toggleType(opt.value)}
            size="small"
          />
        ))}
      </Stack>
    </Stack>
  );
}
