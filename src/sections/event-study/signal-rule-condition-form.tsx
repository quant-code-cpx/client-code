import type { EventSchemaField } from 'src/api/event-study';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';

import { Iconify } from 'src/components/iconify';

import { OPERATORS_BY_FIELD_TYPE } from './constants';

// ----------------------------------------------------------------------

type ConditionRow = {
  id: string;
  field: string;
  operator: string;
  value: string | number | string[];
};

type Props = {
  schemaFields: EventSchemaField[];
  value: Record<string, unknown>;
  onChange: (conditions: Record<string, unknown>) => void;
};

function rowsToConditions(rows: ConditionRow[]): Record<string, unknown> {
  const result: Record<string, Record<string, unknown>> = {};
  rows.forEach((row) => {
    if (!row.field || !row.operator) return;
    if (!result[row.field]) result[row.field] = {};
    if (Array.isArray(row.value)) {
      result[row.field][row.operator] = row.value;
    } else if (typeof row.value === 'string') {
      const num = Number(row.value);
      result[row.field][row.operator] = !Number.isNaN(num) && row.value !== '' ? num : row.value;
    } else {
      result[row.field][row.operator] = row.value;
    }
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
          value: Array.isArray(val) ? (val as string[]) : val != null ? String(val) : '',
        });
      });
    }
  });
  return rows;
}

export function SignalRuleConditionForm({ schemaFields, value, onChange }: Props) {
  const [rows, setRows] = useState<ConditionRow[]>(() =>
    Object.keys(value).length > 0 ? conditionsToRows(value) : []
  );

  const fieldByName = useMemo(() => {
    const m = new Map<string, EventSchemaField>();
    schemaFields.forEach((f) => m.set(f.name, f));
    return m;
  }, [schemaFields]);

  const updateRows = (newRows: ConditionRow[]) => {
    setRows(newRows);
    onChange(rowsToConditions(newRows));
  };

  const addRow = () => {
    const first = schemaFields[0];
    updateRows([
      ...rows,
      {
        id: `r-${Date.now()}-${Math.random()}`,
        field: first?.name ?? '',
        operator: first ? OPERATORS_BY_FIELD_TYPE[first.type][0].value : 'gte',
        value: '',
      },
    ]);
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
        条件配置（至少添加一条，多条件 AND 关系）
      </Typography>

      <Stack spacing={1.5}>
        {rows.map((row) => {
          const f = fieldByName.get(row.field);
          const ops = f ? OPERATORS_BY_FIELD_TYPE[f.type] : OPERATORS_BY_FIELD_TYPE.number;
          return (
            <Stack key={row.id} direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ flex: 2, minWidth: 140 }}>
                <InputLabel>字段</InputLabel>
                <Select
                  value={row.field}
                  label="字段"
                  onChange={(e) => {
                    const newField = e.target.value;
                    const newType = fieldByName.get(newField)?.type ?? 'number';
                    updateRow(row.id, {
                      field: newField,
                      operator: OPERATORS_BY_FIELD_TYPE[newType][0].value,
                      value: '',
                    });
                  }}
                >
                  {schemaFields.map((s) => (
                    <MenuItem key={s.name} value={s.name}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1, minWidth: 90 }}>
                <InputLabel>运算符</InputLabel>
                <Select
                  value={row.operator}
                  label="运算符"
                  onChange={(e) => updateRow(row.id, { operator: e.target.value })}
                >
                  {ops.map((op) => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 值输入 */}
              <Box sx={{ flex: 2, minWidth: 160 }}>
                {f?.type === 'enum' && row.operator === 'in' ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>值</InputLabel>
                    <Select
                      multiple
                      label="值"
                      value={Array.isArray(row.value) ? (row.value as string[]) : []}
                      onChange={(e) =>
                        updateRow(row.id, {
                          value:
                            typeof e.target.value === 'string'
                              ? e.target.value.split(',')
                              : (e.target.value as string[]),
                        })
                      }
                      input={<OutlinedInput label="值" />}
                      renderValue={(selected) => (selected as string[]).join(', ')}
                    >
                      {(f.enumValues ?? []).map((opt) => (
                        <MenuItem key={String(opt.value)} value={String(opt.value)}>
                          <Checkbox
                            checked={
                              Array.isArray(row.value) &&
                              (row.value as string[]).includes(String(opt.value))
                            }
                          />
                          <ListItemText primary={opt.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : f?.type === 'enum' ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>值</InputLabel>
                    <Select
                      value={typeof row.value === 'string' ? row.value : ''}
                      label="值"
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    >
                      {(f.enumValues ?? []).map((opt) => (
                        <MenuItem key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    label="值"
                    type={f?.type === 'number' ? 'number' : 'text'}
                    value={typeof row.value === 'string' ? row.value : ''}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  />
                )}
              </Box>

              <IconButton size="small" color="error" onClick={() => removeRow(row.id)}>
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>

      <Button
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" />}
        onClick={addRow}
        disabled={schemaFields.length === 0}
        sx={{ mt: 1.5 }}
      >
        添加条件
      </Button>
    </Box>
  );
}
