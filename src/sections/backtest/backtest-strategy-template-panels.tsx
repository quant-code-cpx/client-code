import { useRef, useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { searchStocks } from 'src/api/stock';

import { RANK_BY_OPTIONS } from './constants';

import type {
  MaCrossConfig,
  CustomPoolConfig,
  FactorRankingConfig,
  ScreeningRotationConfig,
} from './types';

// ----------------------------------------------------------------------

interface StockOption {
  tsCode: string;
  label: string;
}

function useStockSearch() {
  const [options, setOptions] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(false);
  const latestRequestRef = useRef(0);

  const search = useCallback(async (keyword: string) => {
    const normalizedKeyword = keyword.trim();
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    if (!normalizedKeyword) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await searchStocks({ keyword: normalizedKeyword, limit: 20 });
      if (requestId !== latestRequestRef.current) return;
      setOptions(
        res.items.map((stock) => ({
          tsCode: stock.tsCode,
          label: `${stock.tsCode} ${stock.name ?? ''}`.trim(),
        }))
      );
    } catch {
      if (requestId === latestRequestRef.current) setOptions([]);
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }, []);

  return { options, loading, search };
}

// ----------------------------------------------------------------------

export function MaCrossPanel({
  config,
  fieldIdPrefix,
  onChange,
}: {
  config: MaCrossConfig;
  fieldIdPrefix: string;
  onChange: (config: MaCrossConfig) => void;
}) {
  const { options, loading, search } = useStockSearch();
  const allowFlatId = `${fieldIdPrefix}-allow-flat`;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Autocomplete
          options={options}
          loading={loading}
          getOptionLabel={(option) => option.label}
          filterOptions={(items) => items}
          onInputChange={(_, value, reason) => {
            if (reason === 'input' || reason === 'clear') void search(value);
          }}
          value={options.find((option) => option.tsCode === config.tsCode) ?? null}
          onChange={(_, value) => onChange({ ...config, tsCode: value?.tsCode ?? '' })}
          renderInput={(params) => (
            <TextField {...params} label="股票代码" size="small" helperText="输入代码或名称搜索" />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="短均线周期"
          type="number"
          fullWidth
          size="small"
          value={config.shortWindow}
          onChange={(event) => onChange({ ...config, shortWindow: Number(event.target.value) })}
          helperText="例：5 日均线"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="长均线周期"
          type="number"
          fullWidth
          size="small"
          value={config.longWindow}
          onChange={(event) => onChange({ ...config, longWindow: Number(event.target.value) })}
          helperText="例：20 日均线"
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.allowFlat}
              onChange={(event) => onChange({ ...config, allowFlat: event.target.checked })}
              size="small"
              slotProps={{ input: { id: allowFlatId, name: `${fieldIdPrefix}-allowFlat` } }}
            />
          }
          label="允许空仓（死叉后清空持仓）"
        />
      </Grid>
    </Grid>
  );
}

// ----------------------------------------------------------------------

export function ScreeningRotationPanel({
  config,
  fieldIdPrefix,
  onChange,
}: {
  config: ScreeningRotationConfig;
  fieldIdPrefix: string;
  onChange: (config: ScreeningRotationConfig) => void;
}) {
  const rankByLabelId = `${fieldIdPrefix}-rank-by-label`;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth size="small">
          <InputLabel id={rankByLabelId}>排序字段</InputLabel>
          <Select
            id={`${fieldIdPrefix}-rank-by`}
            name={`${fieldIdPrefix}-rankBy`}
            labelId={rankByLabelId}
            label="排序字段"
            value={config.rankBy}
            onChange={(event) => onChange({ ...config, rankBy: event.target.value })}
          >
            {RANK_BY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
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
          exclusive
          size="small"
          onChange={(_, value) => {
            if (value) onChange({ ...config, rankOrder: value as 'asc' | 'desc' });
          }}
        >
          <ToggleButton value="desc">高→低</ToggleButton>
          <ToggleButton value="asc">低→高</ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Top N"
          type="number"
          fullWidth
          size="small"
          value={config.topN}
          onChange={(event) => onChange({ ...config, topN: Number(event.target.value) })}
          helperText="每期持有排名前 N 只股票"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="最小上市天数"
          type="number"
          fullWidth
          size="small"
          value={config.minDaysListed ?? ''}
          onChange={(event) =>
            onChange({
              ...config,
              minDaysListed: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          helperText="过滤上市不足 N 天的新股"
        />
      </Grid>
    </Grid>
  );
}

// ----------------------------------------------------------------------

export function FactorRankingPanel({
  config,
  onChange,
  factorOptions,
}: {
  config: FactorRankingConfig;
  onChange: (config: FactorRankingConfig) => void;
  factorOptions: string[];
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Autocomplete
          options={factorOptions}
          value={config.factorName || null}
          onChange={(_, value) => onChange({ ...config, factorName: value ?? '' })}
          renderInput={(params) => (
            <TextField {...params} label="因子名称" size="small" helperText="选择已计算的因子" />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          排序方向
        </Typography>
        <ToggleButtonGroup
          value={config.rankOrder}
          exclusive
          size="small"
          onChange={(_, value) => {
            if (value) onChange({ ...config, rankOrder: value as 'asc' | 'desc' });
          }}
        >
          <ToggleButton value="desc">高因子优先</ToggleButton>
          <ToggleButton value="asc">低因子优先</ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Top N"
          type="number"
          fullWidth
          size="small"
          value={config.topN}
          onChange={(event) => onChange({ ...config, topN: Number(event.target.value) })}
          helperText="每期持有排名前 N 只"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="最小上市天数"
          type="number"
          fullWidth
          size="small"
          value={config.minDaysListed ?? ''}
          onChange={(event) =>
            onChange({
              ...config,
              minDaysListed: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          helperText="过滤上市不足 N 天的新股"
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
          fullWidth
          size="small"
          value={config.optionalFilters?.minTotalMv ?? ''}
          onChange={(event) =>
            onChange({
              ...config,
              optionalFilters: {
                ...config.optionalFilters,
                minTotalMv: event.target.value ? Number(event.target.value) : undefined,
              },
            })
          }
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          label="最小换手率 (%)"
          type="number"
          fullWidth
          size="small"
          value={config.optionalFilters?.minTurnoverRate ?? ''}
          onChange={(event) =>
            onChange({
              ...config,
              optionalFilters: {
                ...config.optionalFilters,
                minTurnoverRate: event.target.value ? Number(event.target.value) : undefined,
              },
            })
          }
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          label="最大 PE(TTM)"
          type="number"
          fullWidth
          size="small"
          value={config.optionalFilters?.maxPeTtm ?? ''}
          onChange={(event) =>
            onChange({
              ...config,
              optionalFilters: {
                ...config.optionalFilters,
                maxPeTtm: event.target.value ? Number(event.target.value) : undefined,
              },
            })
          }
        />
      </Grid>
    </Grid>
  );
}

// ----------------------------------------------------------------------

export function CustomPoolPanel({
  config,
  availableTsCodes,
  onChange,
}: {
  config: CustomPoolConfig;
  availableTsCodes: string[];
  onChange: (config: CustomPoolConfig) => void;
}) {
  const tsCodes = availableTsCodes.length > 0 ? availableTsCodes : config.tsCodes;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Alert severity={tsCodes.length > 0 ? 'info' : 'warning'}>
          {tsCodes.length > 0
            ? `已从「基础配置 → 股票池」读取 ${tsCodes.length} 只股票。股票代码请在基础配置卡片中维护。`
            : '请先在「基础配置 → 股票池」中选择「自定义股票池」并添加股票代码。'}
        </Alert>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          权重模式
        </Typography>
        <ToggleButtonGroup
          value={config.weightMode}
          exclusive
          size="small"
          onChange={(_, value) => {
            if (value) onChange({ ...config, tsCodes, weightMode: value as 'EQUAL' | 'CUSTOM' });
          }}
        >
          <ToggleButton value="EQUAL">等权</ToggleButton>
          <ToggleButton value="CUSTOM">自定义权重</ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      {config.weightMode === 'CUSTOM' && tsCodes.length > 0 ? (
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
              {tsCodes.map((code) => (
                <TableRow key={code}>
                  <TableCell>{code}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 100 }}
                      value={
                        (config.customWeights.find((weight) => weight.tsCode === code)?.weight ??
                          0) * 100
                      }
                      onChange={(event) => {
                        const newWeight = Number(event.target.value) / 100;
                        const updated = config.customWeights.filter(
                          (weight) => weight.tsCode !== code
                        );
                        onChange({
                          ...config,
                          tsCodes,
                          customWeights: [...updated, { tsCode: code, weight: newWeight }],
                        });
                      }}
                      slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                    />
                  </TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Grid>
      ) : null}
    </Grid>
  );
}
