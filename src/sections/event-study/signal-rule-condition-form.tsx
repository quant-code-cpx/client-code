import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { Iconify } from 'src/components/iconify';

import { CONDITION_OPERATORS } from './constants';

// ----------------------------------------------------------------------

type ConditionRow = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

type Props = {
  value: Record<string, unknown>;
  onChange: (conditions: Record<string, unknown>) => void;
};

function rowsToConditions(rows: ConditionRow[]): Record<string, unknown> {
  const result: Record<string, Record<string, unknown>> = {};
  rows.forEach((row) => {
    if (!row.field || !row.operator) return;
    if (!result[row.field]) result[row.field] = {};
    const numVal = Number(row.value);
    result[row.field][row.operator] = Number.isNaN(numVal) ? row.value : numVal;
  });
  return result;
}

function conditionsToRows(conditions: Record<string, unknown>): ConditionRow[] {
  const rows: ConditionRow[] = [];
  Object.entries(conditions).forEach(([field, ops]) => {
    if (ops && typeof ops === 'object') {
      Object.entries(ops as Record<string, unknown>).forEach(([operator, val]) => {
        rows.push({
          id: `${field}-${operator}-${Math.random()}`,
          field,
          operator,
          value: val != null ? String(val) : '',
        });
      });
    }
  });
  return rows;
}

export function SignalRuleConditionForm({ value, onChange }: Props) {
  const [rows, setRows] = useState<ConditionRow[]>(() =>
    Object.keys(value).length > 0 ? conditionsToRows(value) : []
  );

  const updateRows = (newRows: ConditionRow[]) => {
    setRows(newRows);
    onChange(rowsToConditions(newRows));
  };

  const addRow = () => {
    updateRows([...rows, { id: String(Date.now()), field: '', operator: 'gte', value: '' }]);
  };

  const removeRow = (id: string) => {
    updateRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<ConditionRow>) => {
    updateRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        条件配置（可选）
      </Typography>

      <Stack spacing={1}>
        {rows.map((row) => (
          <Stack key={row.id} direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="字段名"
              placeholder="如 change_pct"
              value={row.field}
              onChange={(e) => updateRow(row.id, { field: e.target.value })}
              sx={{ flex: 2 }}
            />

            <FormControl size="small" sx={{ flex: 1, minWidth: 80 }}>
              <InputLabel>运算符</InputLabel>
              <Select
                value={row.operator}
                label="运算符"
                onChange={(e) => updateRow(row.id, { operator: e.target.value })}
              >
                {CONDITION_OPERATORS.map((op) => (
                  <MenuItem key={op.value} value={op.value}>
                    {op.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="值"
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              sx={{ flex: 2 }}
            />

            <IconButton size="small" color="error" onClick={() => removeRow(row.id)}>
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" />}
        onClick={addRow}
        sx={{ mt: 1 }}
      >
        添加条件
      </Button>
    </Box>
  );
}
