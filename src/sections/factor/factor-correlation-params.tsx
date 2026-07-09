import type { FactorDef } from 'src/api/factor';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

// ----------------------------------------------------------------------

export const MAX_FACTORS = 20;
export const MIN_FACTORS = 2;

const UNIVERSE_OPTIONS = [
  { label: '全市场', value: '' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '上证50', value: '000016.SH' },
];

type Props = {
  libraryLoading: boolean;
  allFactors: FactorDef[];
  selectedFactors: string[];
  onChangeFactors: (factors: string[]) => void;
  factorLabelMap: Record<string, string>;
  tradeDate: string;
  onChangeTradeDate: (value: string) => void;
  universe: string;
  onChangeUniverse: (value: string) => void;
  method: 'spearman' | 'pearson';
  onChangeMethod: (value: 'spearman' | 'pearson') => void;
  threshold: number;
  onChangeThreshold: (value: number) => void;
  loading: boolean;
  paramsDirty: boolean;
  onCalculate: () => void;
  hasResult: boolean;
};

export function FactorCorrelationParams({
  libraryLoading,
  allFactors,
  selectedFactors,
  onChangeFactors,
  factorLabelMap,
  tradeDate,
  onChangeTradeDate,
  universe,
  onChangeUniverse,
  method,
  onChangeMethod,
  threshold,
  onChangeThreshold,
  loading,
  paramsDirty,
  onCalculate,
  hasResult,
}: Props) {
  const allFactorNames = allFactors.map((f) => f.name);
  const reachedLimit = selectedFactors.length >= MAX_FACTORS;
  const tooFew = selectedFactors.length < MIN_FACTORS;

  return (
    <Box sx={{ p: 2 }}>
      {libraryLoading ? (
        <Skeleton height={56} sx={{ mb: 2 }} />
      ) : (
        <Autocomplete
          multiple
          value={selectedFactors}
          onChange={(_, newValue) => {
            const next = newValue as string[];
            if (next.length > MAX_FACTORS) return;
            onChangeFactors(next);
          }}
          options={allFactorNames}
          getOptionLabel={(name) =>
            factorLabelMap[name] ? `${name} · ${factorLabelMap[name]}` : name
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={`选择因子（${MIN_FACTORS}~${MAX_FACTORS} 个）`}
              size="small"
              helperText={
                reachedLimit
                  ? '已达到后端上限 20 个'
                  : tooFew
                    ? `请至少再选 ${MIN_FACTORS - selectedFactors.length} 个因子`
                    : `已选 ${selectedFactors.length} 个`
              }
              error={tooFew}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((name, index) => (
              <Chip
                label={factorLabelMap[name] ?? name}
                {...getTagProps({ index })}
                key={name}
                size="small"
              />
            ))
          }
          isOptionEqualToValue={(a, b) => a === b}
          getOptionDisabled={(option) =>
            reachedLimit && !selectedFactors.includes(option as string)
          }
          limitTags={8}
          sx={{ mb: 2 }}
        />
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <DatePicker
          label="分析日期"
          value={tradeDate ? dayjs(tradeDate) : null}
          onChange={(v) => onChangeTradeDate(v?.format('YYYY-MM-DD') ?? '')}
          maxDate={dayjs()}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>股票池</InputLabel>
          <Select
            label="股票池"
            value={universe}
            onChange={(e) => onChangeUniverse(e.target.value)}
          >
            {UNIVERSE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>相关性方法</InputLabel>
          <Select
            label="相关性方法"
            value={method}
            onChange={(e) => onChangeMethod(e.target.value as 'spearman' | 'pearson')}
          >
            <MenuItem value="spearman">Spearman（秩相关）</MenuItem>
            <MenuItem value="pearson">Pearson（线性相关）</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ minWidth: 200, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            高相关阈值：|ρ| ≥ {threshold.toFixed(2)}
          </Typography>
          <Slider
            size="small"
            value={threshold}
            min={0.3}
            max={0.95}
            step={0.05}
            onChange={(_, v) => onChangeThreshold(v as number)}
            valueLabelDisplay="auto"
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
        <Button
          variant="contained"
          onClick={onCalculate}
          disabled={loading === true || tooFew}
          startIcon={<Iconify icon="solar:play-bold" />}
        >
          {paramsDirty && hasResult ? '重新计算' : '计算相关性'}
        </Button>
        {paramsDirty && hasResult ? (
          <Typography variant="caption" color="warning.main">
            参数已变更，需重新计算
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
