import type { FactorDef, FactorCondition, FactorConditionOperator } from 'src/api/factor';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { Iconify } from 'src/components/iconify';

import { OPERATOR_OPTIONS } from './screening-constants';

import type { ConditionRowError } from './screening-validation';

// ----------------------------------------------------------------------

type Props = {
  index: number;
  condition: FactorCondition;
  allFactors: FactorDef[];
  errors: ConditionRowError[];
  onChange: (index: number, condition: FactorCondition) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
};

export function ScreeningConditionRow({
  index,
  condition,
  allFactors,
  errors,
  onChange,
  onRemove,
  onDuplicate,
}: Props) {
  const theme = useTheme();

  const factorOption = useMemo(
    () => allFactors.find((f) => f.name === condition.factorName) ?? null,
    [allFactors, condition.factorName]
  );

  const errFor = (field: ConditionRowError['field']): string | undefined =>
    errors.find((e) => e.field === field)?.message;

  const handleOperatorChange = (operator: FactorConditionOperator) => {
    onChange(index, { factorName: condition.factorName, operator });
  };

  const handleNumChange = (field: 'value' | 'min' | 'max' | 'percent', raw: string) => {
    const num = raw === '' ? undefined : Number(raw);
    onChange(index, {
      ...condition,
      [field]: typeof num === 'number' && Number.isFinite(num) ? num : undefined,
    });
  };

  const isBetween = condition.operator === 'between';
  const isPct = condition.operator === 'top_pct' || condition.operator === 'bottom_pct';

  // 状态条颜色（左侧 2px）
  const statusColor = (() => {
    if (errors.length > 0) return theme.palette.error.main;
    if (!condition.factorName) return theme.palette.text.disabled;
    if (
      (isBetween && (condition.min === undefined || condition.max === undefined)) ||
      (isPct && condition.percent === undefined) ||
      (!isBetween && !isPct && condition.value === undefined)
    ) {
      return theme.palette.warning.main;
    }
    return theme.palette.success.main;
  })();

  return (
    <Box
      sx={{
        position: 'relative',
        pl: 2,
        py: 1.5,
        pr: 1,
        borderRadius: 1,
        bgcolor: (t) => varAlpha(t.vars.palette.background.neutralChannel, 0.4),
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 8,
          bottom: 8,
          width: 3,
          borderRadius: 1.5,
          bgcolor: statusColor,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap">
        <Typography
          variant="caption"
          sx={{
            minWidth: 28,
            mt: 1.25,
            color: 'text.disabled',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          #{index + 1}
        </Typography>

        <Autocomplete
          size="small"
          sx={{ minWidth: 240, flexGrow: 1, maxWidth: 360 }}
          options={allFactors}
          value={factorOption}
          onChange={(_, val) => onChange(index, { ...condition, factorName: val?.name ?? '' })}
          getOptionLabel={(o) => `${o.label} · ${o.name}`}
          groupBy={(o) => o.category}
          renderInput={(p) => (
            <TextField
              {...p}
              label="因子"
              error={Boolean(errFor('factor'))}
              helperText={errFor('factor')}
            />
          )}
          isOptionEqualToValue={(o, v) => o.name === v.name}
        />

        <TextField
          select
          size="small"
          label="条件"
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value as FactorConditionOperator)}
          sx={{ minWidth: 150 }}
          slotProps={{ select: { native: true } }}
        >
          {OPERATOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </TextField>

        {isBetween && (
          <>
            <TextField
              label="最小值"
              type="number"
              size="small"
              value={condition.min ?? ''}
              onChange={(e) => handleNumChange('min', e.target.value)}
              error={Boolean(errFor('min'))}
              helperText={errFor('min')}
              sx={{ width: 130 }}
            />
            <TextField
              label="最大值"
              type="number"
              size="small"
              value={condition.max ?? ''}
              onChange={(e) => handleNumChange('max', e.target.value)}
              error={Boolean(errFor('max'))}
              helperText={errFor('max')}
              sx={{ width: 130 }}
            />
          </>
        )}

        {isPct && (
          <TextField
            label="百分比 N"
            type="number"
            size="small"
            value={condition.percent ?? ''}
            onChange={(e) => handleNumChange('percent', e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
            sx={{ width: 130 }}
            error={Boolean(errFor('percent'))}
            helperText={errFor('percent') ?? `按选定股票池横截面排名（%）`}
          />
        )}

        {!isBetween && !isPct && (
          <TextField
            label="比较值"
            type="number"
            size="small"
            value={condition.value ?? ''}
            onChange={(e) => handleNumChange('value', e.target.value)}
            error={Boolean(errFor('value'))}
            helperText={errFor('value')}
            sx={{ width: 140 }}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="复制条件">
          <IconButton
            size="small"
            onClick={() => onDuplicate(index)}
            aria-label="复制条件"
            sx={{ mt: 0.5 }}
          >
            <Iconify icon="solar:copy-bold" width={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="删除条件">
          <IconButton
            size="small"
            color="error"
            onClick={() => onRemove(index)}
            aria-label="删除条件"
            sx={{ mt: 0.5 }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
