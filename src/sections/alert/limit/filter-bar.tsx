import type { Dayjs } from 'dayjs';
import type { LimitSealPattern } from 'src/api/alert';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import type {
  MvBucket,
  PctChgLimit,
  LimitTypeFilter,
  LimitFilterState,
} from './hooks/use-limit-filters';

// ----------------------------------------------------------------------

type Props = {
  state: LimitFilterState;
  onChange: (patch: Partial<LimitFilterState>) => void;
  onReset: () => void;
  onRefresh: () => void;
  industries: string[];
  concepts: string[];
};

const MV_BUCKETS: Array<{ value: MvBucket; label: string }> = [
  { value: 'UNDER_50', label: '< 50 亿' },
  { value: '50_200', label: '50-200 亿' },
  { value: '200_500', label: '200-500 亿' },
  { value: '500_1000', label: '500-1000 亿' },
  { value: 'ABOVE_1000', label: '> 1000 亿' },
];

const PCT_LIMITS: PctChgLimit[] = [10, 20, 30, 5];

const SEAL_PATTERNS: Array<{ value: LimitSealPattern; label: string }> = [
  { value: 'ONE_WORD', label: '一字' },
  { value: 'T_SHAPE', label: 'T 字' },
  { value: 'NORMAL', label: '普通' },
  { value: 'WEAK', label: '烂板' },
];

export function AlertLimitFilterBar({
  state,
  onChange,
  onReset,
  onRefresh,
  industries,
  concepts,
}: Props) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      spacing={1.5}
      rowGap={1.5}
      alignItems="center"
      sx={{ mb: 3 }}
    >
      <DatePicker
        label="交易日期"
        value={state.tradeDate}
        onChange={(v: Dayjs | null) => onChange({ tradeDate: v })}
        format="YYYY-MM-DD"
        slotProps={{
          textField: { size: 'small', sx: { width: 180 } },
          field: { clearable: true },
        }}
      />

      <ToggleButtonGroup
        value={state.limitType}
        exclusive
        size="small"
        onChange={(_e, v: LimitTypeFilter | null) => onChange({ limitType: v ?? 'ALL' })}
      >
        <ToggleButton value="ALL">全部</ToggleButton>
        <ToggleButton value="UP">涨停</ToggleButton>
        <ToggleButton value="DOWN">跌停</ToggleButton>
      </ToggleButtonGroup>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>行业</InputLabel>
        <Select
          value={state.industry}
          label="行业"
          onChange={(e) => onChange({ industry: String(e.target.value) })}
        >
          <MenuItem value="">全部</MenuItem>
          {industries.map((ind) => (
            <MenuItem key={ind} value={ind}>
              {ind}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>概念</InputLabel>
        <Select
          value={state.concept}
          label="概念"
          onChange={(e) => onChange({ concept: String(e.target.value) })}
        >
          <MenuItem value="">全部</MenuItem>
          {concepts.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>市值</InputLabel>
        <Select
          value={state.mvBucket}
          label="市值"
          onChange={(e) => onChange({ mvBucket: (e.target.value || '') as MvBucket | '' })}
        >
          <MenuItem value="">全部</MenuItem>
          {MV_BUCKETS.map((b) => (
            <MenuItem key={b.value} value={b.value}>
              {b.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>板高度</InputLabel>
        <Select
          value={state.pctChgLimit === '' ? '' : String(state.pctChgLimit)}
          label="板高度"
          onChange={(e) => {
            const v = e.target.value;
            onChange({ pctChgLimit: v === '' ? '' : (Number(v) as PctChgLimit) });
          }}
        >
          <MenuItem value="">全部</MenuItem>
          {PCT_LIMITS.map((p) => (
            <MenuItem key={p} value={String(p)}>
              {p}cm
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>封板形态</InputLabel>
        <Select
          value={state.sealPattern}
          label="封板形态"
          onChange={(e) =>
            onChange({ sealPattern: (e.target.value || '') as LimitSealPattern | '' })
          }
        >
          <MenuItem value="">全部</MenuItem>
          {SEAL_PATTERNS.map((sp) => (
            <MenuItem key={sp.value} value={sp.value}>
              {sp.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="最低连板"
        value={state.minStreak === '' ? '' : String(state.minStreak)}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange({ minStreak: Number.isFinite(n) && n > 0 ? Math.floor(n) : '' });
        }}
        type="number"
        size="small"
        sx={{ width: 120 }}
        slotProps={{ htmlInput: { min: 0 } }}
      />

      <Button variant="outlined" size="small" onClick={onRefresh}>
        刷新
      </Button>
      <Button variant="text" size="small" onClick={onReset}>
        重置
      </Button>
    </Stack>
  );
}
