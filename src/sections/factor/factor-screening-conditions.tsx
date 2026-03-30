import type { FactorCondition, FactorDef } from 'src/api/factor';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { FactorScreeningConditionRow } from './factor-screening-condition-row';

// ----------------------------------------------------------------------

const MAX_CONDITIONS = 10;

type FactorScreeningConditionsProps = {
  conditions: FactorCondition[];
  allFactors: FactorDef[];
  onConditionsChange: (conditions: FactorCondition[]) => void;
  onScreening: () => void;
  loading: boolean;
};

export function FactorScreeningConditions({
  conditions,
  allFactors,
  onConditionsChange,
  onScreening,
  loading,
}: FactorScreeningConditionsProps) {
  const handleChange = (index: number, condition: FactorCondition) => {
    const next = conditions.map((c, i) => (i === index ? condition : c));
    onConditionsChange(next);
  };

  const handleRemove = (index: number) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (conditions.length >= MAX_CONDITIONS) return;
    onConditionsChange([...conditions, { factorName: '', operator: 'gt', value: undefined }]);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          筛选条件
        </Typography>

        <Stack spacing={2}>
          {conditions.map((condition, index) => (
            <FactorScreeningConditionRow
              key={index}
              condition={condition}
              index={index}
              allFactors={allFactors}
              onChange={handleChange}
              onRemove={handleRemove}
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

          <Button
            variant="contained"
            onClick={onScreening}
            disabled={loading === true || conditions.every((c) => !c.factorName)}
          >
            开始选股
          </Button>

          {conditions.length >= MAX_CONDITIONS && (
            <Typography variant="caption" color="text.secondary">
              最多 {MAX_CONDITIONS} 个条件
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
