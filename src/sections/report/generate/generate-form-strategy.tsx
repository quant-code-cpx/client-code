import type { Strategy } from 'src/api/strategy';
import type { PortfolioListItem } from 'src/api/portfolio';
import type { BacktestRunListItem } from 'src/api/backtest';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDate } from 'src/utils/format-time';

import { listRuns } from 'src/api/backtest';
import { listStrategies } from 'src/api/strategy';
import { listPortfolios } from 'src/api/portfolio';

import type { GenerateFormProps, GenerateStrategyParams } from './types';

type Props = GenerateFormProps<GenerateStrategyParams>;

export function GenerateFormStrategy({ value, onChange, onValidChange }: Props) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [runs, setRuns] = useState<BacktestRunListItem[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, r, p] = await Promise.all([
        listStrategies({ pageSize: 100 }).catch(() => ({ strategies: [] as Strategy[] })),
        listRuns({ pageSize: 50 }).catch(() => ({ items: [] as BacktestRunListItem[] })),
        listPortfolios().catch(() => [] as PortfolioListItem[]),
      ]);
      setStrategies(s.strategies ?? []);
      setRuns(r.items ?? []);
      setPortfolios(p);
    } catch {
      // ignore - empty state shown in autocompletes
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onValidChange?.(value.backtestRunId.trim().length > 0);
  }, [value.backtestRunId, onValidChange]);

  const selectedStrategy = strategies.find((s) => s.id === value.strategyId) ?? null;
  const selectedRun = runs.find((r) => r.runId === value.backtestRunId) ?? null;
  const selectedPortfolio = portfolios.find((p) => p.id === value.portfolioId) ?? null;

  const setSection = (k: keyof NonNullable<GenerateStrategyParams['sections']>, on: boolean) => {
    onChange({
      ...value,
      sections: { ...(value.sections ?? {}), [k]: on },
    });
  };

  // Default sections to all on if not set
  const sections = value.sections ?? {
    performance: true,
    holdings: true,
    riskAssessment: true,
    tradeLog: false,
  };

  return (
    <Stack spacing={2}>
      <Autocomplete
        size="small"
        options={runs}
        value={selectedRun}
        getOptionLabel={(o) =>
          `${o.name ?? o.strategyType} · ${o.startDate}~${o.endDate} · ${o.runId.slice(-6)}`
        }
        onChange={(_, opt) => onChange({ ...value, backtestRunId: opt?.runId ?? '' })}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.runId}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" noWrap>
                {option.name ?? option.strategyType}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {option.startDate} ~ {option.endDate} · {fDate(option.createdAt)}
              </Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => <TextField {...params} label="选择回测运行" required />}
      />

      <Autocomplete
        size="small"
        options={strategies}
        value={selectedStrategy}
        getOptionLabel={(o) => `${o.name} · v${o.version}`}
        onChange={(_, opt) => onChange({ ...value, strategyId: opt?.id })}
        renderInput={(params) => <TextField {...params} label="选择策略（可选）" />}
      />

      <Autocomplete
        size="small"
        options={portfolios}
        value={selectedPortfolio}
        getOptionLabel={(o) => o.name}
        onChange={(_, opt) => {
          const portfolioId = opt?.id;
          onChange({
            ...value,
            portfolioId,
            sections:
              !portfolioId && value.sections?.tradeLog
                ? { ...value.sections, tradeLog: false }
                : value.sections,
          });
        }}
        renderInput={(params) => <TextField {...params} label="选择参考组合（可选）" />}
      />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          包含章节
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={sections.performance ?? true}
                onChange={(e) => setSection('performance', e.target.checked)}
              />
            }
            label="回测表现"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={sections.holdings ?? true}
                onChange={(e) => setSection('holdings', e.target.checked)}
              />
            }
            label="持仓分析"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={sections.riskAssessment ?? true}
                onChange={(e) => setSection('riskAssessment', e.target.checked)}
              />
            }
            label="风险评估"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={sections.tradeLog ?? false}
                onChange={(e) => setSection('tradeLog', e.target.checked)}
                disabled={!value.portfolioId}
              />
            }
            label={value.portfolioId ? '交易日志' : '交易日志（需先选择组合）'}
          />
        </Box>
      </Box>
    </Stack>
  );
}
