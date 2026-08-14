import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import {
  COST_PRESETS,
  TOOLTIP_TEXTS,
  getCostPresetId,
  PRICE_MODE_OPTIONS,
  REBALANCE_FREQUENCY_OPTIONS,
} from './constants';

import type { BacktestRunForm } from './types';
import type { CostPresetId } from './constants';

// ----------------------------------------------------------------------

interface BacktestExecutionConfigProps {
  form: BacktestRunForm;
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

function LabelWithTooltip({
  id,
  label,
  tooltip,
}: {
  id?: string;
  label: string;
  tooltip: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
      <Typography id={id} variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <InfoTooltip text={tooltip} />
    </Box>
  );
}

function SwitchRow({
  id,
  name,
  checked,
  title,
  helper,
  tooltip,
  onChange,
}: {
  id: string;
  name: string;
  checked: boolean;
  title: string;
  helper: string;
  tooltip: string;
  onChange: (next: boolean) => void;
}) {
  const helperId = `${id}-helper-text`;

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
          <Typography component="label" htmlFor={id} variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <InfoTooltip text={tooltip} />
        </Box>
        <Typography
          id={helperId}
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
        >
          {helper}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        size="small"
        slotProps={{ input: { id, name, 'aria-describedby': helperId } }}
        onChange={(event) => onChange(event.target.checked)}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function BacktestExecutionConfig({
  form,
  fieldErrors,
  onChange,
}: BacktestExecutionConfigProps) {
  const detectedCostPreset = getCostPresetId(form);
  const [costMode, setCostMode] = useState<CostPresetId>(detectedCostPreset);

  useEffect(() => {
    setCostMode(detectedCostPreset);
  }, [detectedCostPreset]);

  const singleStockCapital = form.initialCapital * form.maxWeightPerStock;
  const maxCapitalUsage = singleStockCapital * form.maxPositions;
  const leverageRatio = form.initialCapital > 0 ? maxCapitalUsage / form.initialCapital : 0;
  const leverageWarning = leverageRatio > 1;
  const getFieldError = (path: string) => fieldErrors?.[path] ?? '';

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
    <>
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
                id="backtest-trade-constraints"
                name="enableTradeConstraints"
                checked={form.enableTradeConstraints}
                title="真实交易约束"
                helper="依赖涨跌停 / 停牌数据"
                tooltip={TOOLTIP_TEXTS.enableTradeConstraints}
                onChange={(next) => onChange({ enableTradeConstraints: next })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <SwitchRow
                id="backtest-t1-restriction"
                name="enableT1Restriction"
                checked={form.enableT1Restriction}
                title="T+1 限制"
                helper="避免同日买入卖出"
                tooltip={TOOLTIP_TEXTS.enableT1Restriction}
                onChange={(next) => onChange({ enableT1Restriction: next })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <SwitchRow
                id="backtest-partial-fill"
                name="partialFillEnabled"
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
            <ToggleButton value="CUSTOM">自定义</ToggleButton>
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
            id="backtest-slippage-label"
            label={`滑点（bps）：${form.slippageBps}`}
            tooltip={TOOLTIP_TEXTS.slippageBps}
          />
          <Slider
            name="slippageBps"
            aria-labelledby="backtest-slippage-label"
            slotProps={{ input: { id: 'backtest-slippage' } }}
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
            id="backtest-max-weight-label"
            label={`单票最大权重：${(form.maxWeightPerStock * 100).toFixed(0)}%`}
            tooltip={TOOLTIP_TEXTS.maxWeightPerStock}
          />
          <Slider
            name="maxWeightPerStock"
            aria-labelledby="backtest-max-weight-label"
            slotProps={{ input: { id: 'backtest-max-weight' } }}
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
    </>
  );
}
