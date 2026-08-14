import dayjs from 'dayjs';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import FormHelperText from '@mui/material/FormHelperText';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { BacktestExecutionConfig } from './backtest-execution-config';
import { BacktestStockAutocomplete } from './backtest-stock-autocomplete';
import {
  RANGE_PRESETS,
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  resolveRangePreset,
  normalizeDisplayDate,
  getRecommendedBenchmark,
} from './constants';

import type { BacktestRunForm } from './types';
import type { RangePresetId } from './constants';

// ----------------------------------------------------------------------

type DateBounds = {
  earliestAvailableDate?: string | null;
  latestAvailableDate?: string | null;
};

interface BacktestConfigFormProps {
  form: BacktestRunForm;
  dateBounds?: DateBounds;
  fieldErrors?: Record<string, string>;
  onChange: (updates: Partial<BacktestRunForm>) => void;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Typography
      variant="overline"
      sx={{ display: 'block', color: 'text.secondary', letterSpacing: 0.8, mb: 1.5 }}
    >
      {title}
    </Typography>
  );
}

// ----------------------------------------------------------------------

export function BacktestConfigForm({
  form,
  dateBounds,
  fieldErrors,
  onChange,
}: BacktestConfigFormProps) {
  const minDate = useMemo(
    () =>
      dateBounds?.earliestAvailableDate
        ? dayjs(normalizeDisplayDate(dateBounds.earliestAvailableDate))
        : undefined,
    [dateBounds?.earliestAvailableDate]
  );
  const maxDate = useMemo(
    () =>
      dateBounds?.latestAvailableDate
        ? dayjs(normalizeDisplayDate(dateBounds.latestAvailableDate))
        : undefined,
    [dateBounds?.latestAvailableDate]
  );

  const recommendedBenchmark = getRecommendedBenchmark(form.universe);
  const recommendedBenchmarkLabel =
    BENCHMARK_OPTIONS.find((option) => option.value === recommendedBenchmark)?.label ??
    recommendedBenchmark;

  const getFieldError = (path: string) => fieldErrors?.[path] ?? '';

  const handleRangePreset = (presetId: RangePresetId) => {
    onChange(resolveRangePreset(presetId, dateBounds?.latestAvailableDate ?? form.endDate));
  };

  const handleUniverseChange = (universe: string) => {
    onChange({ universe, benchmarkTsCode: getRecommendedBenchmark(universe) });
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <SectionTitle title="基础配置" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="回测名称"
              placeholder="例：沪深300 均线择时 2026…"
              fullWidth
              size="small"
              value={form.name}
              error={Boolean(getFieldError('name'))}
              helperText={getFieldError('name') || '不填则自动生成'}
              onChange={(event) => onChange({ name: event.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  size="small"
                  variant="outlined"
                  onClick={() => handleRangePreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label="起始日期"
              value={form.startDate ? dayjs(form.startDate) : null}
              minDate={minDate}
              maxDate={maxDate}
              sx={{ width: '100%' }}
              onChange={(value) => onChange({ startDate: value?.format('YYYY-MM-DD') ?? '' })}
              slotProps={{
                textField: {
                  error: Boolean(getFieldError('startDate')),
                  helperText: getFieldError('startDate') || '默认近 3 年，可一键切换区间',
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label="结束日期"
              value={form.endDate ? dayjs(form.endDate) : null}
              minDate={minDate}
              maxDate={maxDate}
              sx={{ width: '100%' }}
              onChange={(value) => onChange({ endDate: value?.format('YYYY-MM-DD') ?? '' })}
              slotProps={{
                textField: {
                  error: Boolean(getFieldError('endDate')),
                  helperText: getFieldError('endDate') || '上限优先使用后端最新可用交易日',
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="初始资金（元）"
              type="number"
              fullWidth
              size="small"
              value={form.initialCapital}
              error={Boolean(getFieldError('initialCapital'))}
              helperText={getFieldError('initialCapital') || '默认 100 万元'}
              onChange={(event) => onChange({ initialCapital: Number(event.target.value) })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" error={Boolean(getFieldError('benchmarkTsCode'))}>
              <InputLabel id="backtest-benchmark-label">基准指数</InputLabel>
              <Select
                id="backtest-benchmark"
                name="benchmarkTsCode"
                labelId="backtest-benchmark-label"
                label="基准指数"
                value={form.benchmarkTsCode}
                onChange={(event) => onChange({ benchmarkTsCode: event.target.value })}
              >
                {BENCHMARK_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {getFieldError('benchmarkTsCode') || `当前股票池推荐：${recommendedBenchmarkLabel}`}
              </FormHelperText>
            </FormControl>
          </Grid>

          {form.benchmarkTsCode !== recommendedBenchmark ? (
            <Grid size={{ xs: 12 }}>
              <Alert
                severity="info"
                action={
                  <Button
                    size="small"
                    onClick={() => onChange({ benchmarkTsCode: recommendedBenchmark })}
                  >
                    切换
                  </Button>
                }
              >
                当前股票池建议使用 {recommendedBenchmarkLabel} 作为基准。
              </Alert>
            </Grid>
          ) : null}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <SectionTitle title="股票池" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small" error={Boolean(getFieldError('universe'))}>
              <InputLabel id="backtest-universe-label">股票池范围</InputLabel>
              <Select
                id="backtest-universe"
                name="universe"
                labelId="backtest-universe-label"
                label="股票池范围"
                value={form.universe}
                onChange={(event) => handleUniverseChange(event.target.value)}
              >
                {UNIVERSE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {getFieldError('universe') || '决定回测中选股的候选范围'}
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Collapse in={form.universe === 'CUSTOM'} timeout={240} unmountOnExit>
              <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5 }}>
                <Stack spacing={1.5}>
                  <BacktestStockAutocomplete
                    value={form.customUniverseTsCodes}
                    error={Boolean(getFieldError('customUniverseTsCodes'))}
                    helperText={
                      getFieldError('customUniverseTsCodes') ||
                      `最多 100 只；当前 ${form.customUniverseTsCodes.length}/100 只`
                    }
                    onChange={(next) => onChange({ customUniverseTsCodes: next })}
                  />
                  <Button
                    size="small"
                    variant="text"
                    component={RouterLink}
                    href="/factor/screening"
                    startIcon={<Iconify icon="solar:filter-bold" width={16} />}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    去选股器生成股票池
                  </Button>
                </Stack>
              </Box>
            </Collapse>
          </Grid>
        </Grid>

        <BacktestExecutionConfig form={form} fieldErrors={fieldErrors} onChange={onChange} />
      </CardContent>
    </Card>
  );
}
