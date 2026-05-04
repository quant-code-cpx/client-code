import type { PatternScope, PatternAlgorithm } from 'src/api/pattern';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

import { PATTERN_INDEX_OPTIONS } from './pattern-template-meta';

export type PatternFiltersValue = {
  algorithm: PatternAlgorithm;
  scope: PatternScope;
  indexCode: string;
  lookbackYears: number;
  excludeSelf: boolean;
  topK: number;
};

export const DEFAULT_PATTERN_FILTERS: PatternFiltersValue = {
  algorithm: 'NED',
  scope: 'ALL',
  indexCode: '000300.SH',
  lookbackYears: 5,
  excludeSelf: true,
  topK: 20,
};

type Props = {
  value: PatternFiltersValue;
  onChange: (next: PatternFiltersValue) => void;
  /** 是否展示"排除查询股票本身"开关（仅 mode=range 有意义） */
  showExcludeSelf?: boolean;
};

const LOOKBACK_OPTIONS = [1, 3, 5, 10];
const TOPK_OPTIONS = [10, 20, 50, 100];

export function PatternAdvancedFilters({ value, onChange, showExcludeSelf = false }: Props) {
  const update = <K extends keyof PatternFiltersValue>(key: K, v: PatternFiltersValue[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        p: 2,
        bgcolor: 'background.neutral',
        borderRadius: 1.5,
      }}
    >
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel>算法</InputLabel>
        <Select
          label="算法"
          value={value.algorithm}
          onChange={(e) => update('algorithm', e.target.value as PatternAlgorithm)}
        >
          <MenuItem value="NED">NED（快速）</MenuItem>
          <MenuItem value="DTW">DTW（精确）</MenuItem>
        </Select>
      </FormControl>

      <Tooltip title="NED：归一化欧氏距离，快；DTW：动态时间弯曲，更精确容忍时间扭曲" arrow>
        <Iconify
          icon="solar:question-circle-bold"
          width={16}
          sx={{ color: 'text.disabled', ml: -1 }}
        />
      </Tooltip>

      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel>候选范围</InputLabel>
        <Select
          label="候选范围"
          value={value.scope}
          onChange={(e) => update('scope', e.target.value as PatternScope)}
        >
          <MenuItem value="ALL">全市场 A 股</MenuItem>
          <MenuItem value="INDEX">指数成分</MenuItem>
        </Select>
      </FormControl>

      {value.scope === 'INDEX' && (
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>指数</InputLabel>
          <Select
            label="指数"
            value={value.indexCode}
            onChange={(e) => update('indexCode', e.target.value)}
          >
            {PATTERN_INDEX_OPTIONS.map((opt) => (
              <MenuItem key={opt.code} value={opt.code}>
                {opt.label}（{opt.code}）
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>回溯年限</InputLabel>
        <Select
          label="回溯年限"
          value={value.lookbackYears}
          onChange={(e) => update('lookbackYears', Number(e.target.value))}
        >
          {LOOKBACK_OPTIONS.map((y) => (
            <MenuItem key={y} value={y}>
              {y} 年
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>返回条数</InputLabel>
        <Select
          label="返回条数"
          value={value.topK}
          onChange={(e) => update('topK', Number(e.target.value))}
        >
          {TOPK_OPTIONS.map((n) => (
            <MenuItem key={n} value={n}>
              {n} 条
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showExcludeSelf && (
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={value.excludeSelf}
              onChange={(e) => update('excludeSelf', e.target.checked)}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              排除查询股票本身
            </Typography>
          }
        />
      )}
    </Box>
  );
}
