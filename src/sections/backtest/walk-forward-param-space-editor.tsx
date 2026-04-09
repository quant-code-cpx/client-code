import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';

import { Iconify } from 'src/components/iconify';

import { PARAM_SEARCH_TYPE_OPTIONS } from './constants';

import type { ParamSearchSpaceItemLocal } from './types';

// ----------------------------------------------------------------------

export type ParamDefinition = {
  key: string;
  label: string;
  defaultMin?: number;
  defaultMax?: number;
  defaultStep?: number;
};

type Props = {
  availableParams: ParamDefinition[];
  value: Record<string, ParamSearchSpaceItemLocal>;
  onChange: (next: Record<string, ParamSearchSpaceItemLocal>) => void;
};

function computeTotalCombos(space: Record<string, ParamSearchSpaceItemLocal>): number {
  let total = 1;
  for (const item of Object.values(space)) {
    if (item.type === 'range') {
      const { min = 0, max = 0, step = 1 } = item;
      const count = Math.max(1, Math.floor((max - min) / step) + 1);
      total *= count;
    } else if (item.type === 'enum') {
      const count = (item.values ?? []).length;
      total *= Math.max(1, count);
    }
  }
  return total;
}

// ----------------------------------------------------------------------

export function WalkForwardParamSpaceEditor({ availableParams, value, onChange }: Props) {
  const totalCombos = useMemo(() => computeTotalCombos(value), [value]);

  const enabledKeys = Object.keys(value);

  function toggleParam(key: string, enabled: boolean) {
    if (enabled) {
      const def = availableParams.find((p) => p.key === key);
      const next: Record<string, ParamSearchSpaceItemLocal> = {
        ...value,
        [key]: {
          type: 'range',
          min: def?.defaultMin ?? 1,
          max: def?.defaultMax ?? 10,
          step: def?.defaultStep ?? 1,
        },
      };
      onChange(next);
    } else {
      const next = { ...value };
      delete next[key];
      onChange(next);
    }
  }

  function updateItem(key: string, patch: Partial<ParamSearchSpaceItemLocal>) {
    const current = value[key];
    if (!current) return;
    onChange({ ...value, [key]: { ...current, ...patch } });
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2">参数搜索空间</Typography>
        {enabledKeys.length > 0 && (
          <Chip
            size="small"
            color={totalCombos > 500 ? 'warning' : 'default'}
            label={`约 ${totalCombos} 个参数组合`}
          />
        )}
      </Box>

      {availableParams.map((param) => {
        const enabled = enabledKeys.includes(param.key);
        const item = value[param.key];

        return (
          <Box
            key={param.key}
            sx={{
              border: '1px solid',
              borderColor: enabled ? 'primary.light' : 'divider',
              borderRadius: 1,
              p: 2,
              mb: 1.5,
              bgcolor: enabled ? 'action.selected' : 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: enabled ? 2 : 0 }}>
              <IconButton
                size="small"
                onClick={() => toggleParam(param.key, !enabled)}
                color={enabled ? 'primary' : 'default'}
              >
                <Iconify
                  icon={enabled ? 'solar:check-square-bold' : 'solar:square-linear'}
                  width={20}
                />
              </IconButton>
              <Typography variant="body2" fontWeight={enabled ? 600 : 400}>
                {param.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                ({param.key})
              </Typography>
            </Box>

            {enabled && item && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', ml: 4 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>搜索类型</InputLabel>
                  <Select
                    label="搜索类型"
                    value={item.type}
                    onChange={(e) =>
                      updateItem(param.key, { type: e.target.value as 'range' | 'enum' })
                    }
                  >
                    {PARAM_SEARCH_TYPE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {item.type === 'range' ? (
                  <>
                    <TextField
                      size="small"
                      label="最小值"
                      type="number"
                      value={item.min ?? ''}
                      onChange={(e) => updateItem(param.key, { min: Number(e.target.value) })}
                      sx={{ width: 100 }}
                    />
                    <TextField
                      size="small"
                      label="最大值"
                      type="number"
                      value={item.max ?? ''}
                      onChange={(e) => updateItem(param.key, { max: Number(e.target.value) })}
                      sx={{ width: 100 }}
                    />
                    <TextField
                      size="small"
                      label="步长"
                      type="number"
                      value={item.step ?? ''}
                      onChange={(e) => updateItem(param.key, { step: Number(e.target.value) })}
                      sx={{ width: 90 }}
                    />
                  </>
                ) : (
                  <Box sx={{ flex: 1, minWidth: 240 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="枚举值 (逗号分隔)"
                      value={(item.values ?? []).join(', ')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const vals = raw
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((s) => (Number.isNaN(Number(s)) ? s : Number(s)));
                        updateItem(param.key, { values: vals });
                      }}
                      helperText="数字或字符串，如: 5, 10, 20, 30"
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {availableParams.length === 0 && (
        <FormHelperText sx={{ mt: 1 }}>请先选择策略类型以加载可搜索参数</FormHelperText>
      )}
    </Box>
  );
}
