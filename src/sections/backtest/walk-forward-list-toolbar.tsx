import type { WalkForwardRunListQuery } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';

import { Iconify } from 'src/components/iconify';

import { STATUS_OPTIONS, STRATEGY_TYPE_OPTIONS } from './constants';

// ----------------------------------------------------------------------

export type WalkForwardListFilter = {
  q: string;
  statuses: string[];
  strategyTypes: string[];
  sortBy: NonNullable<WalkForwardRunListQuery['sortBy']>;
  sortDir: NonNullable<WalkForwardRunListQuery['sortDir']>;
};

const SORT_OPTIONS: Array<{
  label: string;
  value: NonNullable<WalkForwardRunListQuery['sortBy']>;
}> = [
  { label: '创建时间', value: 'createdAt' },
  { label: 'OOS 夏普', value: 'oosSharpeRatio' },
  { label: 'OOS 年化', value: 'oosAnnualizedReturn' },
  { label: 'OOS 回撤', value: 'oosMaxDrawdown' },
  { label: 'WFE', value: 'wfe' },
];

const STATUS_FILTER_OPTIONS = STATUS_OPTIONS.filter((item) => item.value !== '');
const STRATEGY_FILTER_OPTIONS = STRATEGY_TYPE_OPTIONS.filter((item) => item.value !== '');

// ----------------------------------------------------------------------

type Props = {
  filter: WalkForwardListFilter;
  onChange: (patch: Partial<WalkForwardListFilter>) => void;
  onReset: () => void;
  onRefresh: () => void;
};

export function WalkForwardListToolbar({ filter, onChange, onReset, onRefresh }: Props) {
  return (
    <Stack spacing={1.5} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <TextField
          size="small"
          label="搜索任务"
          placeholder="名称 / WF ID"
          value={filter.q}
          onChange={(event) => onChange({ q: event.target.value })}
          sx={{ minWidth: { xs: '100%', md: 240 } }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>状态</InputLabel>
          <Select
            multiple
            label="状态"
            value={filter.statuses}
            input={<OutlinedInput label="状态" />}
            renderValue={(selected) =>
              selected
                .map(
                  (value) =>
                    STATUS_FILTER_OPTIONS.find((option) => option.value === value)?.label ?? value
                )
                .join('、')
            }
            onChange={(event) => {
              const value = event.target.value;
              onChange({ statuses: typeof value === 'string' ? value.split(',') : value });
            }}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={filter.statuses.includes(option.value)} />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>策略类型</InputLabel>
          <Select
            multiple
            label="策略类型"
            value={filter.strategyTypes}
            input={<OutlinedInput label="策略类型" />}
            renderValue={(selected) =>
              selected
                .map(
                  (value) =>
                    STRATEGY_FILTER_OPTIONS.find((option) => option.value === value)?.label ?? value
                )
                .join('、')
            }
            onChange={(event) => {
              const value = event.target.value;
              onChange({ strategyTypes: typeof value === 'string' ? value.split(',') : value });
            }}
          >
            {STRATEGY_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={filter.strategyTypes.includes(option.value)} />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>排序</InputLabel>
          <Select
            label="排序"
            value={filter.sortBy}
            onChange={(event) =>
              onChange({ sortBy: event.target.value as WalkForwardListFilter['sortBy'] })
            }
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={
            <Iconify
              icon={
                filter.sortDir === 'desc' ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'
              }
              width={16}
            />
          }
          onClick={() => onChange({ sortDir: filter.sortDir === 'desc' ? 'asc' : 'desc' })}
        >
          {filter.sortDir === 'desc' ? '降序' : '升序'}
        </Button>

        <Box sx={{ flex: 1 }} />

        <Button color="inherit" variant="text" onClick={onReset}>
          重置
        </Button>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          onClick={onRefresh}
        >
          刷新
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        筛选与排序会同步到 URL，复制链接或浏览器返回都能保留当前视图。
      </Typography>
    </Stack>
  );
}
