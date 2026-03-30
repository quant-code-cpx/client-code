import type { FactorCondition, FactorConditionOperator, FactorDef } from 'src/api/factor';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const OPERATOR_OPTIONS: { value: FactorConditionOperator; label: string }[] = [
  { value: 'gt', label: '大于 >' },
  { value: 'gte', label: '大于等于 >=' },
  { value: 'lt', label: '小于 <' },
  { value: 'lte', label: '小于等于 <=' },
  { value: 'between', label: '介于' },
  { value: 'top_pct', label: '前 N%' },
  { value: 'bottom_pct', label: '后 N%' },
];

// ----------------------------------------------------------------------

type FactorScreeningConditionRowProps = {
  condition: FactorCondition;
  index: number;
  allFactors: FactorDef[];
  onChange: (index: number, condition: FactorCondition) => void;
  onRemove: (index: number) => void;
};

export function FactorScreeningConditionRow({
  condition,
  index,
  allFactors,
  onChange,
  onRemove,
}: FactorScreeningConditionRowProps) {
  const handleFactorChange = (factorName: string) => {
    onChange(index, { ...condition, factorName });
  };

  const handleOperatorChange = (operator: FactorConditionOperator) => {
    // Reset value fields when operator changes
    onChange(index, { factorName: condition.factorName, operator });
  };

  const handleValueChange = (field: 'value' | 'min' | 'max' | 'percent', val: string) => {
    const num = val === '' ? undefined : Number(val);
    onChange(index, { ...condition, [field]: num });
  };

  const isBetween = condition.operator === 'between';
  const isPct = condition.operator === 'top_pct' || condition.operator === 'bottom_pct';

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {/* 因子选择 */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>因子</InputLabel>
        <Select
          label="因子"
          value={condition.factorName}
          onChange={(e) => handleFactorChange(e.target.value)}
        >
          {allFactors.map((f) => (
            <MenuItem key={f.name} value={f.name}>
              {f.label} ({f.name})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 运算符 */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>条件</InputLabel>
        <Select
          label="条件"
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value as FactorConditionOperator)}
        >
          {OPERATOR_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 值输入 */}
      {isBetween ? (
        <>
          <TextField
            label="最小值"
            type="number"
            size="small"
            value={condition.min ?? ''}
            onChange={(e) => handleValueChange('min', e.target.value)}
            sx={{ width: 110 }}
          />
          <TextField
            label="最大值"
            type="number"
            size="small"
            value={condition.max ?? ''}
            onChange={(e) => handleValueChange('max', e.target.value)}
            sx={{ width: 110 }}
          />
        </>
      ) : isPct ? (
        <TextField
          label="百分比 N"
          type="number"
          size="small"
          value={condition.percent ?? ''}
          onChange={(e) => handleValueChange('percent', e.target.value)}
          inputProps={{ min: 0, max: 100, step: 1 }}
          sx={{ width: 120 }}
        />
      ) : (
        <TextField
          label="值"
          type="number"
          size="small"
          value={condition.value ?? ''}
          onChange={(e) => handleValueChange('value', e.target.value)}
          sx={{ width: 110 }}
        />
      )}

      {/* 删除按钮 */}
      <IconButton
        size="small"
        color="error"
        onClick={() => onRemove(index)}
        sx={{ mb: 0.5 }}
      >
        <Iconify icon="eva:trash-2-outline" width={20} />
      </IconButton>
    </Box>
  );
}
