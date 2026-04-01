import type { BacktestRunForm, MaCrossConfig, ScreeningRotationConfig, FactorRankingConfig, CustomPoolConfig } from './types';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';

import { stockApi } from 'src/api/stock';

import { Iconify } from 'src/components/iconify';

import { RANK_BY_OPTIONS, WEIGHT_MODE_OPTIONS } from './constants';

// ----------------------------------------------------------------------

interface BacktestStrategyConfigPanelProps {
  selectedTemplateId: string;
  form: BacktestRunForm;
  onChange: (updates: Partial<BacktestRunForm>) => void;
}

// ── Stock search option ─────────────────────────────────────────────────

interface StockOption {
  tsCode: string;
  label: string;
}

function useStockSearch() {
  const [options, setOptions] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.list({ keyword, pageSize: 20 });
      setOptions(
        (res.items ?? []).map((s) => ({
          tsCode: s.tsCode,
          label: `${s.tsCode} ${s.name ?? ''}`.trim(),
        }))
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return { options, loading, search };
}

// ── MA Cross Panel ─────────────────────────────────────────────────────

function MaCrossPanel({
  config,
  onChange,
}: {
  config: MaCrossConfig;
  onChange: (c: MaCrossConfig) => void;
}) {
  const { options, loading, search } = useStockSearch();

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Autocomplete
          options={options}
          loading={loading}
          getOptionLabel={(o) => o.label}
          filterOptions={(x) => x}
          onInputChange={(_, v) => search(v)}
          value={options.find((o) => o.tsCode === config.tsCode) ?? null}
          onChange={(_, v) => onChange({ ...config, tsCode: v?.tsCode ?? '' })}
          renderInput={(params) => (
            <TextField
              {...params}
              label="股票代码"
              size="small"
              helperText="输入代码或名称搜索"
            />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="短均线周期"
          type="number"
          fullWidth={true}
          size="small"
          value={config.shortPeriod}
          onChange={(e) => onChange({ ...config, shortPeriod: Number(e.target.value) })}
          helperText="例：5 日均线"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="长均线周期"
          type="number"
          fullWidth={true}
          size="small"
          value={config.longPeriod}
          onChange={(e) => onChange({ ...config, longPeriod: Number(e.target.value) })}
          helperText="例：20 日均线"
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.allowShort}
              onChange={(e) => onChange({ ...config, allowShort: e.target.checked })}
              size="small"
            />
          }
          label="允许空仓（死叉后清空持仓）"
        />
      </Grid>
    </Grid>
  );
}

// ── Screening Rotation Panel ───────────────────────────────────────────

function ScreeningRotationPanel({
  config,
  onChange,
}: {
  config: ScreeningRotationConfig;
  onChange: (c: ScreeningRotationConfig) => void;
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth={true} size="small">
          <InputLabel>排序字段</InputLabel>
          <Select
            label="排序字段"
            value={config.rankBy}
            onChange={(e) => onChange({ ...config, rankBy: e.target.value })}
          >
            {RANK_BY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          排序方向
        </Typography>
        <ToggleButtonGroup
          value={config.rankOrder}
          exclusive={true}
          size="small"
          onChange={(_, v) => {
            if (v) onChange({ ...config, rankOrder: v as 'asc' | 'desc' });
          }}
        >
          <ToggleButton value="desc" sx={{ px: 2 }}>高→低</ToggleButton>
          <ToggleButton value="asc" sx={{ px: 2 }}>低→高</ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Top N"
          type="number"
          fullWidth={true}
          size="small"
          value={config.topN}
          onChange={(e) => onChange({ ...config, topN: Number(e.target.value) })}
          helperText="每期持有排名前 N 只股票"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth={true} size="small">
          <InputLabel>权重模式</InputLabel>
          <Select
            label="权重模式"
            value={config.weightMode}
            onChange={(e) =>
              onChange({ ...config, weightMode: e.target.value as 'equal' | 'rank' })
            }
          >
            {WEIGHT_MODE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          过滤条件（可选）
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="最小 ROE (%)"
          type="number"
          fullWidth={true}
          size="small"
          value={config.minRoe ?? ''}
          onChange={(e) =>
            onChange({ ...config, minRoe: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="最大 PE(TTM)"
          type="number"
          fullWidth={true}
          size="small"
          value={config.maxPe ?? ''}
          onChange={(e) =>
            onChange({ ...config, maxPe: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </Grid>
    </Grid>
  );
}

// ── Factor Ranking Panel ───────────────────────────────────────────────

function FactorRankingPanel({
  config,
  onChange,
  factorOptions,
}: {
  config: FactorRankingConfig;
  onChange: (c: FactorRankingConfig) => void;
  factorOptions: string[];
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Autocomplete
          options={factorOptions}
          value={config.factorName || null}
          onChange={(_, v) => onChange({ ...config, factorName: v ?? '' })}
          renderInput={(params) => (
            <TextField
              {...params}
              label="因子名称"
              size="small"
              helperText="选择已计算的因子"
            />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          排序方向
        </Typography>
        <ToggleButtonGroup
          value={config.rankOrder}
          exclusive={true}
          size="small"
          onChange={(_, v) => {
            if (v) onChange({ ...config, rankOrder: v as 'asc' | 'desc' });
          }}
        >
          <ToggleButton value="desc" sx={{ px: 2 }}>高因子优先</ToggleButton>
          <ToggleButton value="asc" sx={{ px: 2 }}>低因子优先</ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Top N"
          type="number"
          fullWidth={true}
          size="small"
          value={config.topN}
          onChange={(e) => onChange({ ...config, topN: Number(e.target.value) })}
          helperText="每期持有排名前 N 只"
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          过滤条件（可选）
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          label="最小市值（亿元）"
          type="number"
          fullWidth={true}
          size="small"
          value={config.minMv ?? ''}
          onChange={(e) =>
            onChange({ ...config, minMv: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          label="最小换手率 (%)"
          type="number"
          fullWidth={true}
          size="small"
          value={config.minTurnoverRate ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              minTurnoverRate: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          label="最大 PE(TTM)"
          type="number"
          fullWidth={true}
          size="small"
          value={config.maxPe ?? ''}
          onChange={(e) =>
            onChange({ ...config, maxPe: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </Grid>
    </Grid>
  );
}

// ── Custom Pool Panel ──────────────────────────────────────────────────

function CustomPoolPanel({
  config,
  onChange,
}: {
  config: CustomPoolConfig;
  onChange: (c: CustomPoolConfig) => void;
}) {
  const { options, loading, search } = useStockSearch();
  const [inputValue, setInputValue] = useState('');

  const selectedOptions: StockOption[] = config.tsCodes.map((code) => ({
    tsCode: code,
    label: code,
  }));

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Autocomplete
          multiple={true}
          options={options}
          loading={loading}
          filterOptions={(x) => x}
          getOptionLabel={(o) => o.label}
          inputValue={inputValue}
          onInputChange={(_, v) => {
            setInputValue(v);
            search(v);
          }}
          value={selectedOptions}
          onChange={(_, v) =>
            onChange({ ...config, tsCodes: v.map((o) => o.tsCode) })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="股票池"
              size="small"
              helperText="输入代码或名称搜索并添加"
            />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          权重模式
        </Typography>
        <ToggleButtonGroup
          value={config.weightMode}
          exclusive={true}
          size="small"
          onChange={(_, v) => {
            if (v) onChange({ ...config, weightMode: v as 'equal' | 'custom' });
          }}
        >
          <ToggleButton value="equal" sx={{ px: 2 }}>等权</ToggleButton>
          <ToggleButton value="custom" sx={{ px: 2 }}>自定义权重</ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      {config.weightMode === 'custom' && config.tsCodes.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            自定义权重（总和应为 100%）
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>股票代码</TableCell>
                <TableCell>权重 (%)</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {config.tsCodes.map((code) => (
                <TableRow key={code}>
                  <TableCell>{code}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 100 }}
                      value={(config.weights[code] ?? 0) * 100}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          weights: {
                            ...config.weights,
                            [code]: Number(e.target.value) / 100,
                          },
                        })
                      }
                      slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                    />
                  </TableCell>
                  <TableCell padding="checkbox">
                    <IconButton
                      size="small"
                      onClick={() =>
                        onChange({
                          ...config,
                          tsCodes: config.tsCodes.filter((c) => c !== code),
                          weights: Object.fromEntries(
                            Object.entries(config.weights).filter(([k]) => k !== code)
                          ),
                        })
                      }
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Grid>
      )}
    </Grid>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function BacktestStrategyConfigPanel({
  selectedTemplateId,
  form,
  onChange,
}: BacktestStrategyConfigPanelProps) {
  const [factorOptions, setFactorOptions] = useState<string[]>([]);

  useEffect(() => {
    if (selectedTemplateId === 'FACTOR_RANKING') {
      import('src/api/factor')
        .then(({ factorApi }) =>
          factorApi.library().then((res) => {
            const names = (res.categories ?? []).flatMap((g) => g.factors.map((f) => f.name));
            setFactorOptions(names);
          })
        )
        .catch(() => {});
    }
  }, [selectedTemplateId]);

  const strategyConfig = form.strategyConfig as Record<string, unknown>;

  const renderPanel = () => {
    switch (selectedTemplateId) {
      case 'MA_CROSS_SINGLE':
        return (
          <MaCrossPanel
            config={{
              tsCode: (strategyConfig.tsCode as string) ?? '',
              shortPeriod: (strategyConfig.shortPeriod as number) ?? 5,
              longPeriod: (strategyConfig.longPeriod as number) ?? 20,
              allowShort: (strategyConfig.allowShort as boolean) ?? false,
            }}
            onChange={(c) => onChange({ strategyConfig: c as unknown as Record<string, unknown> })}
          />
        );

      case 'SCREENING_ROTATION':
        return (
          <ScreeningRotationPanel
            config={{
              rankBy: (strategyConfig.rankBy as string) ?? 'totalMv',
              rankOrder: (strategyConfig.rankOrder as 'asc' | 'desc') ?? 'desc',
              topN: (strategyConfig.topN as number) ?? 20,
              weightMode: (strategyConfig.weightMode as 'equal' | 'rank') ?? 'equal',
              minRoe: strategyConfig.minRoe as number | undefined,
              maxPe: strategyConfig.maxPe as number | undefined,
            }}
            onChange={(c) => onChange({ strategyConfig: c as unknown as Record<string, unknown> })}
          />
        );

      case 'FACTOR_RANKING':
        return (
          <FactorRankingPanel
            config={{
              factorName: (strategyConfig.factorName as string) ?? '',
              rankOrder: (strategyConfig.rankOrder as 'asc' | 'desc') ?? 'desc',
              topN: (strategyConfig.topN as number) ?? 20,
              minMv: strategyConfig.minMv as number | undefined,
              minTurnoverRate: strategyConfig.minTurnoverRate as number | undefined,
              maxPe: strategyConfig.maxPe as number | undefined,
            }}
            onChange={(c) => onChange({ strategyConfig: c as unknown as Record<string, unknown> })}
            factorOptions={factorOptions}
          />
        );

      case 'CUSTOM_POOL_REBALANCE':
        return (
          <CustomPoolPanel
            config={{
              tsCodes: (strategyConfig.tsCodes as string[]) ?? [],
              weightMode: (strategyConfig.weightMode as 'equal' | 'custom') ?? 'equal',
              weights: (strategyConfig.weights as Record<string, number>) ?? {},
            }}
            onChange={(c) => onChange({ strategyConfig: c as unknown as Record<string, unknown> })}
          />
        );

      default:
        return (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            请先选择策略模板
          </Typography>
        );
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          策略参数
        </Typography>
        {renderPanel()}
      </CardContent>
    </Card>
  );
}
