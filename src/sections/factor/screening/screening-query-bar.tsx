import type { FactorScreeningTradeConstraints } from 'src/api/factor';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { UNIVERSE_OPTIONS, SORT_MODE_OPTIONS } from './screening-constants';

import type { SortMode } from './use-screening-state';

// ----------------------------------------------------------------------

type ScreeningQueryBarProps = {
  tradeDate: string; // YYYYMMDD
  universe: string;
  sortMode: SortMode;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  tradeConstraints: FactorScreeningTradeConstraints;
  factorOptions: { name: string; label: string }[];
  loading: boolean;
  isStale: boolean;
  onChange: (
    patch: Partial<{
      tradeDate: string;
      universe: string;
      sortMode: SortMode;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
      tradeConstraints: FactorScreeningTradeConstraints;
    }>
  ) => void;
  onRun: () => void;
  onReset: () => void;
};

export function ScreeningQueryBar({
  tradeDate,
  universe,
  sortMode,
  sortBy,
  sortOrder,
  tradeConstraints,
  factorOptions,
  loading,
  isStale,
  onChange,
  onRun,
  onReset,
}: ScreeningQueryBarProps) {
  const dateValue = tradeDate ? dayjs(tradeDate, 'YYYYMMDD') : null;

  const handleConstraintChange = (
    key: keyof FactorScreeningTradeConstraints,
    value: boolean | number
  ) => {
    onChange({ tradeConstraints: { ...tradeConstraints, [key]: value } });
  };

  return (
    <Card
      sx={{
        mb: 3,
        position: 'sticky',
        top: 64,
        zIndex: 5,
        backdropFilter: 'blur(6px)',
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
            <DatePicker
              label="选股日期"
              value={dateValue}
              onChange={(v) => onChange({ tradeDate: v?.format('YYYYMMDD') ?? '' })}
              maxDate={dayjs()}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>股票池</InputLabel>
              <Select
                label="股票池"
                value={universe}
                onChange={(e) => onChange({ universe: e.target.value })}
              >
                {UNIVERSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>排序模式</InputLabel>
              <Select
                label="排序模式"
                value={sortMode}
                onChange={(e) => onChange({ sortMode: e.target.value as SortMode })}
              >
                {SORT_MODE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {sortMode === 'single' && (
              <>
                <FormControl
                  size="small"
                  sx={{ minWidth: 160 }}
                  disabled={factorOptions.length === 0}
                >
                  <InputLabel>排序因子</InputLabel>
                  <Select
                    label="排序因子"
                    value={sortBy}
                    onChange={(e) => onChange({ sortBy: e.target.value })}
                  >
                    <MenuItem value="">无</MenuItem>
                    {factorOptions.map((opt) => (
                      <MenuItem key={opt.name} value={opt.name}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>排序方向</InputLabel>
                  <Select
                    label="排序方向"
                    value={sortOrder}
                    onChange={(e) => onChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
                  >
                    <MenuItem value="desc">降序</MenuItem>
                    <MenuItem value="asc">升序</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {sortMode === 'composite' && (
              <Typography variant="caption" sx={{ color: 'warning.dark', alignSelf: 'center' }}>
                综合分依赖后端 BE-8，未上线前回退为单因子排序。
              </Typography>
            )}

            <Box sx={{ flexGrow: 1 }} />

            <Button
              variant="contained"
              size="medium"
              startIcon={<Iconify icon="solar:play-bold" width={18} />}
              onClick={onRun}
              disabled={loading}
              color={isStale ? 'warning' : 'primary'}
            >
              {loading ? '运行中…' : isStale ? '条件已变更，重新运行' : '运行选股'}
            </Button>
            <Button variant="outlined" size="medium" onClick={onReset} disabled={loading}>
              重置
            </Button>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
              交易约束：
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={tradeConstraints.excludeSt === true}
                  onChange={(_, v) => handleConstraintChange('excludeSt', v)}
                />
              }
              label="排除 ST"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={tradeConstraints.excludeSuspended === true}
                  onChange={(_, v) => handleConstraintChange('excludeSuspended', v)}
                />
              }
              label="排除停牌"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={tradeConstraints.excludeBse === true}
                  onChange={(_, v) => handleConstraintChange('excludeBse', v)}
                />
              }
              label="排除北交所"
            />
            <TextField
              size="small"
              type="number"
              label="最小上市天数"
              value={tradeConstraints.minListDays ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                handleConstraintChange('minListDays', Number.isFinite(n) && n >= 0 ? n : 0);
              }}
              sx={{ width: 140 }}
              inputProps={{ min: 0, step: 10 }}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
