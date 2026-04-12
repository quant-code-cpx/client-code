import type { FactorDef , FactorLibraryResult, FactorCorrelationResult } from 'src/api/factor';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { FactorCorrelationHeatmap } from '../factor-correlation-heatmap';

// ----------------------------------------------------------------------

const UNIVERSE_OPTIONS = [
  { label: '全市场', value: '' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '上证50', value: '000016.SH' },
];

const DEFAULT_FACTORS = ['pe_ttm', 'pb', 'roe', 'ret_20d', 'ln_market_cap'];

// ----------------------------------------------------------------------

export function FactorCorrelationView() {
  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [selectedFactors, setSelectedFactors] = useState<string[]>(DEFAULT_FACTORS);
  const [tradeDate, setTradeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [universe, setUniverse] = useState('');
  const [method, setMethod] = useState<'spearman' | 'pearson'>('spearman');
  const [result, setResult] = useState<FactorCorrelationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLibraryLoading(true);
    factorApi
      .library()
      .then((data) => setLibrary(data))
      .finally(() => setLibraryLoading(false));
  }, []);

  const allFactors = useMemo<FactorDef[]>(
    () => library?.categories.flatMap((c) => c.factors) ?? [],
    [library]
  );

  const allFactorNames = useMemo<string[]>(() => allFactors.map((f) => f.name), [allFactors]);

  const factorLabelMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(allFactors.map((f) => [f.name, f.label])),
    [allFactors]
  );

  const handleCalculate = async () => {
    if (selectedFactors.length < 2) {
      setError('请至少选择 2 个因子');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await factorApi.correlation({
        factorNames: selectedFactors,
        tradeDate: dayjs(tradeDate).format('YYYYMMDD'),
        universe: universe || undefined,
        method,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算相关性失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        因子相关性
      </Typography>

      {/* 参数面板 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {libraryLoading ? (
            <Skeleton height={56} />
          ) : (
            <Autocomplete
              multiple
              value={selectedFactors}
              onChange={(_, newValue) => setSelectedFactors(newValue as string[])}
              options={allFactorNames}
              getOptionLabel={(name) =>
                factorLabelMap[name] ? `${name} · ${factorLabelMap[name]}` : name
              }
              renderInput={(params) => (
                <TextField {...params} label="选择因子（2~20个）" size="small" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((name, index) => (
                  <Chip
                    label={factorLabelMap[name] ?? name}
                    {...getTagProps({ index })}
                    key={name}
                    size="small"
                  />
                ))
              }
              isOptionEqualToValue={(a, b) => a === b}
              limitTags={8}
              sx={{ mb: 2 }}
            />
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            <DatePicker
              label="分析日期"
              value={tradeDate ? dayjs(tradeDate) : null}
              onChange={(v) => setTradeDate(v?.format('YYYY-MM-DD') ?? '')}
              format="YYYY-MM-DD"
              maxDate={dayjs()}
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
                field: { clearable: true },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>股票池</InputLabel>
              <Select label="股票池" value={universe} onChange={(e) => setUniverse(e.target.value)}>
                {UNIVERSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>相关性方法</InputLabel>
              <Select
                label="相关性方法"
                value={method}
                onChange={(e) => setMethod(e.target.value as 'spearman' | 'pearson')}
              >
                <MenuItem value="spearman">Spearman</MenuItem>
                <MenuItem value="pearson">Pearson</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleCalculate}
              disabled={loading === true || selectedFactors.length < 2}
            >
              计算相关性
            </Button>
          </Stack>

          {loading && <LinearProgress sx={{ mt: 2 }} />}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result ? (
        <FactorCorrelationHeatmap result={result} />
      ) : (
        !loading && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="body2" color="text.secondary">
              请选择因子后点击&quot;计算相关性&quot;
            </Typography>
          </Box>
        )
      )}
    </DashboardContent>
  );
}
