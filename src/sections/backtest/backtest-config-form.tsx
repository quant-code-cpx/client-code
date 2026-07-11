import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import FormHelperText from '@mui/material/FormHelperText';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { BacktestStockAutocomplete } from './backtest-stock-autocomplete';
import {
  COST_PRESETS,
  RANGE_PRESETS,
  TOOLTIP_TEXTS,
  getCostPresetId,
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  PRICE_MODE_OPTIONS,
  resolveRangePreset,
  normalizeDisplayDate,
  getRecommendedBenchmark,
  REBALANCE_FREQUENCY_OPTIONS,
} from './constants';

import type { BacktestRunForm } from './types';
import type { CostPresetId, RangePresetId } from './constants';

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

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip title={text} arrow placement="top">
      <IconButton aria-label="查看字段说明" size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
        <Iconify icon="solar:info-circle-bold" width={16} />
      </IconButton>
    </Tooltip>
  );
}

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <InfoTooltip text={tooltip} />
    </Box>
  );
}

function SwitchRow({
  checked,
  title,
  helper,
  tooltip,
  onChange,
}: {
  checked: boolean;
  title: string;
  helper: string;
  tooltip: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <InfoTooltip text={tooltip} />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
          {helper}
        </Typography>
      </Box>
      <Switch checked={checked} size="small" onChange={(event) => onChange(event.target.checked)} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function BacktestConfigForm({
  form,
  dateBounds,
  fieldErrors,
  onChange,
}: BacktestConfigFormProps) {
  const detectedCostPreset = getCostPresetId(form);
  const [costMode, setCostMode] = useState<CostPresetId>(detectedCostPreset);

  useEffect(() => {
    setCostMode(detectedCostPreset);
  }, [detectedCostPreset]);

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
  const singleStockCapital = form.initialCapital * form.maxWeightPerStock;
  const maxCapitalUsage = singleStockCapital * form.maxPositions;
  const leverageRatio = form.initialCapital > 0 ? maxCapitalUsage / form.initialCapital : 0;
  const leverageWarning = leverageRatio > 1;

  const getFieldError = (path: string) => fieldErrors?.[path] ?? '';

  const handleRangePreset = (presetId: RangePresetId) => {
    onChange(resolveRangePreset(presetId, dateBounds?.latestAvailableDate ?? form.endDate));
  };

  const handleUniverseChange = (universe: string) => {
    onChange({ universe, benchmarkTsCode: getRecommendedBenchmark(universe) });
  };

  const handleCostPresetChange = (_: unknown, presetId: CostPresetId | null) => {
    if (!presetId) return;
    setCostMode(presetId);

    const preset = COST_PRESETS.find((item) => item.id === presetId);
    if (preset) {
      onChange({
        commissionRate: preset.commissionRate,
        stampDutyRate: preset.stampDutyRate,
        minCommission: preset.minCommission,
      });
    }
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
              <InputLabel>基准指数</InputLabel>
              <Select
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
              <InputLabel>股票池范围</InputLabel>
              <Select
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

        <Divider sx={{ my: 3 }} />

        <SectionTitle title="交易执行" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <LabelWithTooltip label="调仓频率" tooltip={TOOLTIP_TEXTS.rebalanceFrequency} />
            <ToggleButtonGroup
              value={form.rebalanceFrequency}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value) onChange({ rebalanceFrequency: value });
              }}
            >
              {REBALANCE_FREQUENCY_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <LabelWithTooltip label="成交模式" tooltip={TOOLTIP_TEXTS.priceMode} />
            <ToggleButtonGroup
              value={form.priceMode}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value) onChange({ priceMode: value });
              }}
            >
              {PRICE_MODE_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SwitchRow
                  checked={form.enableTradeConstraints}
                  title="真实交易约束"
                  helper="依赖涨跌停 / 停牌数据"
                  tooltip={TOOLTIP_TEXTS.enableTradeConstraints}
                  onChange={(next) => onChange({ enableTradeConstraints: next })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SwitchRow
                  checked={form.enableT1Restriction}
                  title="T+1 限制"
                  helper="避免同日买入卖出"
                  tooltip={TOOLTIP_TEXTS.enableT1Restriction}
                  onChange={(next) => onChange({ enableT1Restriction: next })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SwitchRow
                  checked={form.partialFillEnabled}
                  title="允许部分成交"
                  helper="按可成交比例执行"
                  tooltip={TOOLTIP_TEXTS.partialFillEnabled}
                  onChange={(next) => onChange({ partialFillEnabled: next })}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <SectionTitle title="交易成本" />
          <Button
            size="small"
            startIcon={<Iconify icon="solar:restart-bold" width={16} />}
            onClick={() => {
              const preset = COST_PRESETS[0];
              setCostMode(preset.id);
              onChange({
                commissionRate: preset.commissionRate,
                stampDutyRate: preset.stampDutyRate,
                minCommission: preset.minCommission,
                slippageBps: 5,
              });
            }}
          >
            还原默认
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <ToggleButtonGroup
              value={costMode}
              exclusive
              size="small"
              onChange={handleCostPresetChange}
            >
              {COST_PRESETS.map((preset) => (
                <ToggleButton key={preset.id} value={preset.id}>
                  {preset.label}
                </ToggleButton>
              ))}
              <ToggleButton value="CUSTOM">
                自定义
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {costMode === 'CUSTOM' ? (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="手续费率"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.commissionRate}
                  error={Boolean(getFieldError('commissionRate'))}
                  helperText={getFieldError('commissionRate') || '0.0003 = 万 3'}
                  slotProps={{ htmlInput: { step: 0.0001, min: 0 } }}
                  onChange={(event) => onChange({ commissionRate: Number(event.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="印花税率"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.stampDutyRate}
                  error={Boolean(getFieldError('stampDutyRate'))}
                  helperText={getFieldError('stampDutyRate') || '卖出时收取'}
                  slotProps={{ htmlInput: { step: 0.0001, min: 0 } }}
                  onChange={(event) => onChange({ stampDutyRate: Number(event.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="最低手续费（元）"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.minCommission}
                  error={Boolean(getFieldError('minCommission'))}
                  helperText={getFieldError('minCommission') || '每笔交易最低费用'}
                  onChange={(event) => onChange({ minCommission: Number(event.target.value) })}
                />
              </Grid>
            </>
          ) : (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                当前成本档位：手续费 {(form.commissionRate * 10000).toFixed(2)} / 万，印花税{' '}
                {(form.stampDutyRate * 10000).toFixed(2)} / 万，最低手续费 {form.minCommission} 元。
              </Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <LabelWithTooltip
              label={`滑点（bps）：${form.slippageBps}`}
              tooltip={TOOLTIP_TEXTS.slippageBps}
            />
            <Slider
              value={form.slippageBps}
              min={0}
              max={50}
              step={1}
              marks={[
                { value: 0, label: '0' },
                { value: 10, label: '10' },
                { value: 30, label: '30' },
                { value: 50, label: '50' },
              ]}
              valueLabelDisplay="auto"
              onChange={(_, value) => onChange({ slippageBps: value as number })}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <SectionTitle title="仓位约束" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="最大持仓数"
              type="number"
              fullWidth
              size="small"
              value={form.maxPositions}
              error={Boolean(getFieldError('maxPositions'))}
              helperText={getFieldError('maxPositions') || '同时最多持有几只股票'}
              slotProps={{ htmlInput: { min: 1 } }}
              onChange={(event) => onChange({ maxPositions: Number(event.target.value) })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <LabelWithTooltip
              label={`单票最大权重：${(form.maxWeightPerStock * 100).toFixed(0)}%`}
              tooltip={TOOLTIP_TEXTS.maxWeightPerStock}
            />
            <Slider
              value={form.maxWeightPerStock * 100}
              min={1}
              max={100}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              onChange={(_, value) => onChange({ maxWeightPerStock: (value as number) / 100 })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="最小上市天数"
              type="number"
              fullWidth
              size="small"
              value={form.minDaysListed}
              error={Boolean(getFieldError('minDaysListed'))}
              helperText={getFieldError('minDaysListed') || '过滤次新股，默认 60 天'}
              onChange={(event) => onChange({ minDaysListed: Number(event.target.value) })}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Alert severity={leverageWarning ? 'warning' : 'info'}>
              初始 {fNumber(form.initialCapital)} 元 × 单票上限{' '}
              {(form.maxWeightPerStock * 100).toFixed(0)}% × 最大持仓 {form.maxPositions} → 单票最高{' '}
              {fNumber(singleStockCapital)} 元 / 理论资金占用上限 {fNumber(maxCapitalUsage)} 元 （
              {leverageRatio.toFixed(1)}×）。
            </Alert>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
