import type { FactorDef, FactorCondition } from 'src/api/factor';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

import { ScreeningConditionRow } from './screening-condition-row';
import { MAX_CONDITIONS, EMPTY_CONDITION } from './screening-constants';

import type { ConditionValidation } from './screening-validation';

// ----------------------------------------------------------------------

type Props = {
  conditions: FactorCondition[];
  allFactors: FactorDef[];
  validation: ConditionValidation;
  onChange: (next: FactorCondition[]) => void;
};

export function ScreeningConditionBuilder({ conditions, allFactors, validation, onChange }: Props) {
  const handleRowChange = (idx: number, c: FactorCondition) => {
    onChange(conditions.map((it, i) => (i === idx ? c : it)));
  };

  const handleRemove = (idx: number) => {
    if (conditions.length <= 1) {
      onChange([{ ...EMPTY_CONDITION }]);
      return;
    }
    onChange(conditions.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    if (conditions.length >= MAX_CONDITIONS) return;
    onChange([...conditions, { ...EMPTY_CONDITION }]);
  };

  const handleDuplicate = (idx: number) => {
    if (conditions.length >= MAX_CONDITIONS) return;
    const src = conditions[idx];
    // 保留 factor + operator，清空具体阈值
    const cloned: FactorCondition = { factorName: src.factorName, operator: src.operator };
    onChange([...conditions.slice(0, idx + 1), cloned, ...conditions.slice(idx + 1)]);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">筛选条件（AND）</Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            最多 {MAX_CONDITIONS} 条 · 当前 {conditions.length}
          </Typography>
        </Stack>

        {validation.global.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {validation.global.join('；')}
          </Alert>
        )}

        <Stack spacing={1.5}>
          {conditions.map((c, idx) => (
            <ScreeningConditionRow
              key={idx}
              index={idx}
              condition={c}
              allFactors={allFactors}
              errors={validation.rows[idx] ?? []}
              onChange={handleRowChange}
              onRemove={handleRemove}
              onDuplicate={handleDuplicate}
            />
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={handleAdd}
            disabled={conditions.length >= MAX_CONDITIONS}
          >
            添加条件
          </Button>
          {conditions.length >= MAX_CONDITIONS && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              已达上限，建议合并相同因子的多条比较为 between
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
