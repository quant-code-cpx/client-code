import type { ReactNode } from 'react';
import type { ScreenerFilters } from 'src/api/screener';
import type {
  MetricDefinition,
  FactorConditionSpec,
  SignalConditionSpec,
} from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

import {
  normalizeMetricId,
  signalEventLabels,
  isMetricAvailable,
  displayMetricValue,
  stockMetricFilterKey,
  factorOperatorLabels,
} from './subscription-rule-metric-helpers';

// ----------------------------------------------------------------------

type StockRulePanelProps = {
  metrics: MetricDefinition[];
  selected: MetricDefinition | null;
  filters: Partial<ScreenerFilters>;
  disabled: boolean;
  onSelectedChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
  onChange: (filters: Partial<ScreenerFilters>) => void;
};

export function StockRulePanel({
  metrics,
  selected,
  filters,
  disabled,
  onSelectedChange,
  onAdd,
  onChange,
}: StockRulePanelProps) {
  const selectedIds = new Set(Object.keys(filters));
  return (
    <Stack spacing={1.5}>
      <AddMetricControl
        metrics={metrics.filter((metric) => !selectedIds.has(stockMetricFilterKey(metric)))}
        value={selected}
        onChange={onSelectedChange}
        onAdd={onAdd}
        disabled={disabled}
      />
      {Object.entries(filters).map(([id, value]) => {
        const metric = metrics.find((item) => stockMetricFilterKey(item) === id || item.id === id);
        if (!metric) return null;
        return (
          <StockConditionRow
            key={id}
            metric={metric}
            value={value}
            onChange={(next) => {
              const nextFilters = { ...filters };
              delete nextFilters[normalizeMetricId(id)];
              onChange({
                ...nextFilters,
                [stockMetricFilterKey(metric)]: next,
              } as Partial<ScreenerFilters>);
            }}
            onRemove={() => {
              const next = { ...filters };
              delete next[normalizeMetricId(id)];
              onChange(next);
            }}
          />
        );
      })}
    </Stack>
  );
}

type FactorRulePanelProps = {
  metrics: MetricDefinition[];
  selected: MetricDefinition | null;
  conditions: FactorConditionSpec[];
  disabled: boolean;
  onSelectedChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
  onChange: (conditions: FactorConditionSpec[]) => void;
};

export function FactorRulePanel({
  metrics,
  selected,
  conditions,
  disabled,
  onSelectedChange,
  onAdd,
  onChange,
}: FactorRulePanelProps) {
  const selectedIds = new Set(conditions.map((condition) => condition.factorId));
  return (
    <Stack spacing={1.5}>
      <AddMetricControl
        metrics={metrics.filter((metric) => !selectedIds.has(metric.id))}
        value={selected}
        onChange={onSelectedChange}
        onAdd={onAdd}
        disabled={disabled}
      />
      {conditions.map((condition, index) => {
        const metric = metrics.find((item) => item.id === condition.factorId);
        if (!metric) return null;
        const isRange = condition.operator === 'BETWEEN';
        const value = Array.isArray(condition.value)
          ? condition.value
          : [condition.value, condition.value];
        return (
          <ConditionFrame
            key={condition.factorId}
            onRemove={() => onChange(conditions.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
              {metric.label}
            </Typography>
            <TextField
              select
              size="small"
              label="比较"
              value={condition.operator}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          operator: event.target.value as FactorConditionSpec['operator'],
                          value:
                            event.target.value === 'BETWEEN'
                              ? [Number(item.value), Number(item.value)]
                              : Number(Array.isArray(item.value) ? item.value[0] : item.value),
                        }
                      : item
                  )
                )
              }
              sx={{ minWidth: 150 }}
            >
              {metric.operators
                .filter(
                  (operator): operator is FactorConditionSpec['operator'] =>
                    operator in factorOperatorLabels
                )
                .map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {factorOperatorLabels[operator]}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label={isRange ? '最小值' : '阈值'}
              value={isRange ? value[0] : condition.value}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          value: isRange
                            ? [Number(event.target.value), value[1]]
                            : Number(event.target.value),
                        }
                      : item
                  )
                )
              }
              sx={{ width: 140 }}
            />
            {isRange ? (
              <TextField
                size="small"
                type="number"
                label="最大值"
                value={value[1]}
                onChange={(event) =>
                  onChange(
                    conditions.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: [value[0], Number(event.target.value)] }
                        : item
                    )
                  )
                }
                sx={{ width: 140 }}
              />
            ) : null}
          </ConditionFrame>
        );
      })}
    </Stack>
  );
}

type SignalRulePanelProps = {
  metrics: MetricDefinition[];
  selected: MetricDefinition | null;
  conditions: SignalConditionSpec[];
  minSatisfied: number;
  disabled: boolean;
  onSelectedChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
  onChange: (conditions: SignalConditionSpec[]) => void;
  onMinSatisfiedChange: (value: number) => void;
};

export function SignalRulePanel({
  metrics,
  selected,
  conditions,
  minSatisfied,
  disabled,
  onSelectedChange,
  onAdd,
  onChange,
  onMinSatisfiedChange,
}: SignalRulePanelProps) {
  const selectedIds = new Set(conditions.map((condition) => condition.metricId));
  return (
    <Stack spacing={1.5}>
      <AddMetricControl
        metrics={metrics.filter((metric) => !selectedIds.has(metric.id))}
        value={selected}
        onChange={onSelectedChange}
        onAdd={onAdd}
        disabled={disabled}
      />
      {conditions.map((condition, index) => {
        const metric = metrics.find((item) => item.id === condition.metricId);
        if (!metric) return null;
        const events = metric.operators.filter(
          (operator): operator is SignalConditionSpec['eventType'] => operator in signalEventLabels
        );
        return (
          <ConditionFrame
            key={condition.metricId}
            onRemove={() => onChange(conditions.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
              {metric.label}
            </Typography>
            <TextField
              select
              size="small"
              label="事件"
              value={condition.eventType}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          eventType: event.target.value as SignalConditionSpec['eventType'],
                        }
                      : item
                  )
                )
              }
              sx={{ minWidth: 180 }}
            >
              {events.map((event) => (
                <MenuItem key={event} value={event}>
                  {signalEventLabels[event]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label="强度下限（可选）"
              value={condition.strengthAtLeast ?? ''}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          strengthAtLeast:
                            event.target.value === '' ? undefined : Number(event.target.value),
                        }
                      : item
                  )
                )
              }
              sx={{ width: 160 }}
            />
          </ConditionFrame>
        );
      })}
      {conditions.length > 0 ? (
        <TextField
          size="small"
          type="number"
          label="至少满足 N 条"
          value={Math.min(minSatisfied, conditions.length)}
          onChange={(event) =>
            onMinSatisfiedChange(
              Math.max(1, Math.min(Number(event.target.value), conditions.length))
            )
          }
          slotProps={{ htmlInput: { min: 1, max: conditions.length } }}
          sx={{ width: 180 }}
        />
      ) : null}
    </Stack>
  );
}

type AddMetricControlProps = {
  metrics: MetricDefinition[];
  value: MetricDefinition | null;
  disabled: boolean;
  onChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
};

function AddMetricControl({ metrics, value, disabled, onChange, onAdd }: AddMetricControlProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Autocomplete
        options={metrics}
        value={value}
        onChange={(_, next) => onChange(next)}
        getOptionLabel={(metric) => `${metric.category} · ${metric.label}`}
        getOptionDisabled={(metric) => !isMetricAvailable(metric)}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        renderInput={(params) => <TextField {...params} size="small" label="搜索并添加指标" />}
        sx={{ minWidth: 280, maxWidth: 440, flexGrow: 1 }}
      />
      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:add-circle-bold" />}
        onClick={onAdd}
        disabled={!value || disabled || !isMetricAvailable(value)}
      >
        添加条件
      </Button>
    </Stack>
  );
}

type StockConditionRowProps = {
  metric: MetricDefinition;
  value: unknown;
  onChange: (value: string | number | boolean) => void;
  onRemove: () => void;
};

function StockConditionRow({ metric, value, onChange, onRemove }: StockConditionRowProps) {
  return (
    <ConditionFrame onRemove={onRemove}>
      <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
        {metric.label}
      </Typography>
      {metric.valueType === 'BOOLEAN' ? (
        <FormControlLabel
          control={
            <Switch checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          }
          label="启用"
        />
      ) : null}
      {metric.valueType === 'ENUM' ? (
        <TextField
          select
          size="small"
          label="取值"
          value={displayMetricValue(value)}
          onChange={(event) => onChange(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          {(metric.enumOptions ?? []).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {metric.valueType === 'NUMBER' || metric.valueType === 'PERCENT' ? (
        <TextField
          size="small"
          type="number"
          label={metric.unit ? `阈值（${metric.unit}）` : '阈值'}
          value={displayMetricValue(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          slotProps={{
            htmlInput: {
              min: metric.min,
              max: metric.max,
              step: metric.precision ? 10 ** -metric.precision : 'any',
            },
          }}
          sx={{ width: 180 }}
        />
      ) : null}
    </ConditionFrame>
  );
}

type ConditionFrameProps = { children: ReactNode; onRemove: () => void };

function ConditionFrame({ children, onRemove }: ConditionFrameProps) {
  return (
    <Box
      sx={{
        py: 1.5,
        pl: 2,
        gap: 1.5,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        borderLeft: '3px solid',
        borderColor: 'primary.main',
        bgcolor: 'background.neutral',
        borderRadius: 1,
      }}
    >
      {children}
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="删除条件">
        <IconButton aria-label="删除条件" color="error" onClick={onRemove}>
          <Iconify icon="solar:trash-bin-trash-bold" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
