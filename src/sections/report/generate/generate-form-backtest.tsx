import type { BacktestRunListItem } from 'src/api/backtest';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { fDate } from 'src/utils/format-time';

import { listRuns } from 'src/api/backtest';

import type { GenerateFormProps, GenerateBacktestParams } from './types';

type Props = GenerateFormProps<GenerateBacktestParams> & {
  /** When true, render an even more compact layout (used inside schedule dialog) */
  compact?: boolean;
};

export function GenerateFormBacktest({ value, onChange, onValidChange, compact = false }: Props) {
  const [items, setItems] = useState<BacktestRunListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<BacktestRunListItem | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const fetchList = useCallback(async (kw: string) => {
    setLoading(true);
    try {
      const res = await listRuns({ pageSize: 30, keyword: kw || undefined });
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList('');
  }, [fetchList]);

  // Sync external runId → resolve to selected option if known
  useEffect(() => {
    if (!value.runId) {
      setSelected(null);
      return;
    }
    const match = items.find((it) => it.runId === value.runId);
    if (match) setSelected(match);
  }, [value.runId, items]);

  useEffect(() => {
    onValidChange?.(value.runId.trim().length > 0);
  }, [value.runId, onValidChange]);

  return (
    <Stack spacing={1.5}>
      {!manualMode ? (
        <Autocomplete
          size="small"
          loading={loading}
          options={items}
          value={selected}
          getOptionLabel={(o) =>
            `${o.name ?? o.strategyType} · ${o.startDate}~${o.endDate} · ${o.runId.slice(-6)}`
          }
          onChange={(_, opt) => {
            setSelected(opt);
            onChange({ runId: opt?.runId ?? '' });
          }}
          onInputChange={(_, kw) => {
            setKeyword(kw);
            fetchList(kw);
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.runId}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap>
                  {option.name ?? option.strategyType}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {option.startDate} ~ {option.endDate} · {fDate(option.createdAt)} ·{' '}
                  {option.runId.slice(-6)}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="选择回测运行"
              placeholder="输入策略名 / 标签搜索"
              required
            />
          )}
          noOptionsText={keyword ? '无匹配回测' : '尚无回测记录'}
        />
      ) : (
        <TextField
          size="small"
          label="回测运行 ID（手动）"
          value={value.runId}
          onChange={(e) => onChange({ runId: e.target.value })}
          fullWidth
          required
        />
      )}
      {!compact && (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', cursor: 'pointer', alignSelf: 'flex-start' }}
          onClick={() => setManualMode((v) => !v)}
        >
          {manualMode ? '← 改用下拉选择' : '高级：手动输入 runId →'}
        </Typography>
      )}
    </Stack>
  );
}
