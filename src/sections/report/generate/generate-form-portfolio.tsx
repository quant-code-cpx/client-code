import type { PortfolioListItem } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { fDate } from 'src/utils/format-time';

import { listPortfolios } from 'src/api/portfolio';

import type { GenerateFormProps, GeneratePortfolioParams } from './types';

type Props = GenerateFormProps<GeneratePortfolioParams> & {
  compact?: boolean;
};

export function GenerateFormPortfolio({ value, onChange, onValidChange, compact = false }: Props) {
  const [items, setItems] = useState<PortfolioListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PortfolioListItem | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPortfolios();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!value.portfolioId) {
      setSelected(null);
      return;
    }
    const match = items.find((it) => it.id === value.portfolioId);
    if (match) setSelected(match);
  }, [value.portfolioId, items]);

  useEffect(() => {
    onValidChange?.(value.portfolioId.trim().length > 0);
  }, [value.portfolioId, onValidChange]);

  return (
    <Stack spacing={1.5}>
      {!manualMode ? (
        <Autocomplete
          size="small"
          loading={loading}
          options={items}
          value={selected}
          getOptionLabel={(o) => `${o.name} · ${o.holdingCount} 持仓`}
          onChange={(_, opt) => {
            setSelected(opt);
            onChange({ portfolioId: opt?.id ?? '' });
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.id}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap>
                  {option.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {option.holdingCount} 持仓 · 创建于 {fDate(option.createdAt)}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => <TextField {...params} label="选择组合" required />}
          noOptionsText="尚无组合"
        />
      ) : (
        <TextField
          size="small"
          label="组合 ID（手动）"
          value={value.portfolioId}
          onChange={(e) => onChange({ portfolioId: e.target.value })}
          fullWidth
          required
        />
      )}
      {!compact && (
        <Typography
          component="button"
          type="button"
          variant="caption"
          sx={{
            p: 0,
            border: 0,
            bgcolor: 'transparent',
            color: 'text.secondary',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
          onClick={() => setManualMode((v) => !v)}
        >
          {manualMode ? '← 改用下拉选择' : '高级：手动输入组合 ID →'}
        </Typography>
      )}
    </Stack>
  );
}
