import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { WalkForwardWindowPreview } from './walk-forward-window-preview';
import { WalkForwardAdvancedFields } from './walk-forward-advanced-fields';
import {
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  OPTIMIZE_METRIC_OPTIONS,
  REBALANCE_FREQUENCY_OPTIONS,
} from './constants';

import type { CreateWalkForwardFormState } from './types';

// ----------------------------------------------------------------------

type Props = {
  form: CreateWalkForwardFormState;
  submitting: boolean;
  onChange: (patch: Partial<CreateWalkForwardFormState>) => void;
  onSubmit: () => void;
};

export function WalkForwardRunSettings({ form, submitting, onChange, onSubmit }: Props) {
  const isRollingMode = form.mode === 'ROLLING';
  const hasSearchSpace = Object.keys(form.paramSearchSpace).length > 0;

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            {isRollingMode ? 'Rolling 窗口设置' : 'WF 窗口设置'}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="全量开始日期"
                value={form.fullStartDate ? dayjs(form.fullStartDate) : null}
                onChange={(value) =>
                  onChange({ fullStartDate: value?.format('YYYY-MM-DD') ?? '' })
                }
                sx={{ width: '100%' }}
              />
              <DatePicker
                label="全量结束日期"
                value={form.fullEndDate ? dayjs(form.fullEndDate) : null}
                onChange={(value) => onChange({ fullEndDate: value?.format('YYYY-MM-DD') ?? '' })}
                sx={{ width: '100%' }}
              />
            </Box>

            <TextField
              fullWidth
              size="small"
              label={isRollingMode ? '回看天数' : '样本内天数'}
              type="number"
              value={form.inSampleDays}
              onChange={(event) => onChange({ inSampleDays: Number(event.target.value) })}
              helperText={isRollingMode ? 'Rolling 优化回看窗口' : '60–2520 交易日'}
            />
            <TextField
              fullWidth
              size="small"
              label={isRollingMode ? '持有期天数' : '样本外天数'}
              type="number"
              value={form.outOfSampleDays}
              onChange={(event) => onChange({ outOfSampleDays: Number(event.target.value) })}
              helperText={isRollingMode ? 'Rolling 每段持有/评估周期' : '20–504 交易日'}
            />
            <TextField
              fullWidth
              size="small"
              label="步进天数"
              type="number"
              value={form.stepDays}
              onChange={(event) => onChange({ stepDays: Number(event.target.value) })}
              helperText="20–504 交易日"
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="walk-forward-optimize-metric-label">优化指标</InputLabel>
              <Select
                id="walk-forward-optimize-metric"
                name="optimizeMetric"
                labelId="walk-forward-optimize-metric-label"
                label="优化指标"
                value={form.optimizeMetric}
                onChange={(event) => onChange({ optimizeMetric: event.target.value })}
              >
                {OPTIMIZE_METRIC_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {!isRollingMode && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <WalkForwardAdvancedFields
              purgeDays={form.purgeDays}
              embargoDays={form.embargoDays}
              minOosTrades={form.minOosTrades}
              onChange={onChange}
            />
          </CardContent>
        </Card>
      )}

      <Box sx={{ mb: 3 }}>
        <WalkForwardWindowPreview
          fullStartDate={form.fullStartDate}
          fullEndDate={form.fullEndDate}
          inSampleDays={form.inSampleDays}
          outOfSampleDays={form.outOfSampleDays}
          stepDays={form.stepDays}
          purgeDays={isRollingMode ? 0 : form.purgeDays}
          embargoDays={isRollingMode ? 0 : form.embargoDays}
          paramSearchSpace={form.paramSearchSpace}
        />
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            通用参数
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="初始资金"
              type="number"
              value={form.initialCapital}
              onChange={(event) => onChange({ initialCapital: Number(event.target.value) })}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="walk-forward-benchmark-label">基准指数</InputLabel>
              <Select
                id="walk-forward-benchmark"
                name="benchmarkTsCode"
                labelId="walk-forward-benchmark-label"
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
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="walk-forward-universe-label">股票池</InputLabel>
              <Select
                id="walk-forward-universe"
                name="universe"
                labelId="walk-forward-universe-label"
                label="股票池"
                value={form.universe}
                onChange={(event) => onChange({ universe: event.target.value })}
              >
                {UNIVERSE_OPTIONS.filter((option) => option.value !== 'CUSTOM').map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="walk-forward-rebalance-label">调仓频率</InputLabel>
              <Select
                id="walk-forward-rebalance"
                name="rebalanceFrequency"
                labelId="walk-forward-rebalance-label"
                label="调仓频率"
                value={form.rebalanceFrequency}
                onChange={(event) => onChange({ rebalanceFrequency: event.target.value })}
              >
                {REBALANCE_FREQUENCY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />

      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={submitting || !hasSearchSpace}
        onClick={onSubmit}
        startIcon={<Iconify icon="solar:play-circle-bold" width={20} />}
      >
        {submitting
          ? '提交中…'
          : isRollingMode
            ? '提交 Rolling 任务'
            : '提交 Walk-Forward 任务'}
      </Button>

      {!hasSearchSpace && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 1, display: 'block', textAlign: 'center' }}
        >
          请至少启用一个参数搜索空间
        </Typography>
      )}
    </>
  );
}
