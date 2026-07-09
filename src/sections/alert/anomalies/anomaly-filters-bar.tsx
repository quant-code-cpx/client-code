import type { AnomalyType, AnomalyScope, AnomalySortBy } from 'src/api/alert';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { ANOMALY_TYPE_LIST } from './anomaly-type-config';
import { type AnomalyFilterState } from './use-anomaly-monitor-state';

// ----------------------------------------------------------------------

const SCOPE_OPTIONS: Array<{ value: AnomalyScope; label: string }> = [
  { value: 'ALL', label: '全市场' },
  { value: 'WATCHLIST', label: '我的自选股' },
  { value: 'PORTFOLIO', label: '我的组合' },
];

const SORT_OPTIONS: Array<{ value: AnomalySortBy; label: string }> = [
  { value: 'strength', label: '强度' },
  { value: 'value', label: '检测值' },
  { value: 'scannedAt', label: '扫描时间' },
  { value: 'tsCode', label: '股票代码' },
  { value: 'anomalyType', label: '异动类型' },
];

type Props = {
  filter: AnomalyFilterState;
  onChange: (patch: Partial<AnomalyFilterState>) => void;
  onReset: () => void;
};

export function AnomalyFiltersBar({ filter, onChange, onReset }: Props) {
  const handleToggleType = (type: AnomalyType) => {
    const exists = filter.types.includes(type);
    const types = exists ? filter.types.filter((t) => t !== type) : [...filter.types, type];
    onChange({ types });
  };

  const dateValue = filter.tradeDate ? dayjs(filter.tradeDate) : null;

  return (
    <Stack spacing={1.5} sx={{ mb: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <DatePicker
          label="交易日"
          value={dateValue}
          maxDate={dayjs()}
          onChange={(v) => onChange({ tradeDate: v ? v.format('YYYY-MM-DD') : '' })}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>范围</InputLabel>
          <Select
            label="范围"
            value={filter.scope}
            onChange={(e) => onChange({ scope: e.target.value as AnomalyScope })}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="关键词 / 股票代码"
          placeholder="名称或代码"
          value={filter.keyword}
          onChange={(e) => onChange({ keyword: e.target.value })}
          sx={{ minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>排序</InputLabel>
          <Select
            label="排序"
            value={filter.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value as AnomalySortBy })}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip
          title={
            filter.sortOrder === 'desc' ? '当前降序，点击切换为升序' : '当前升序，点击切换为降序'
          }
        >
          <IconButton
            size="small"
            onClick={() => onChange({ sortOrder: filter.sortOrder === 'desc' ? 'asc' : 'desc' })}
          >
            <Iconify
              icon={
                filter.sortOrder === 'desc'
                  ? 'solar:alt-arrow-down-bold'
                  : 'solar:alt-arrow-up-bold'
              }
              width={18}
            />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="清空筛选">
          <IconButton size="small" onClick={onReset}>
            <Iconify icon="solar:restart-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {ANOMALY_TYPE_LIST.map((cfg) => {
          const active = filter.types.includes(cfg.type);
          return (
            <Tooltip key={cfg.type} title={cfg.ruleDesc} placement="top">
              <Chip
                size="small"
                color={active ? cfg.color : 'default'}
                variant={active ? 'filled' : 'outlined'}
                label={cfg.label}
                onClick={() => handleToggleType(cfg.type)}
                icon={<Iconify icon={cfg.icon} width={14} />}
              />
            </Tooltip>
          );
        })}

        <Box sx={{ width: 12 }} />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={filter.isNewOnly}
              onChange={(e) => onChange({ isNewOnly: e.target.checked })}
            />
          }
          label={
            <Tooltip title="仅展示当日首次出现的异动（需后端支持 isNew 字段，未上线时按 scannedAt 兜底）">
              <Box component="span" sx={{ fontSize: 13 }}>
                仅看新发
              </Box>
            </Tooltip>
          }
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={filter.multiTypeOnly}
              onChange={(e) => onChange({ multiTypeOnly: e.target.checked })}
            />
          }
          label={
            <Tooltip title="仅看同股同日命中 ≥2 类异动的共振股票（需后端支持）">
              <Box component="span" sx={{ fontSize: 13 }}>
                仅看共振
              </Box>
            </Tooltip>
          }
        />
      </Stack>
    </Stack>
  );
}
