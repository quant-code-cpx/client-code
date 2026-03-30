import type { FactorCondition, FactorDef, FactorLibraryResult, FactorScreeningResult } from 'src/api/factor';

import dayjs from 'dayjs';
import { useState, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import CardContent from '@mui/material/CardContent';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { FactorScreeningConditions } from '../factor-screening-conditions';
import { FactorScreeningTable } from '../factor-screening-table';

// ----------------------------------------------------------------------

const UNIVERSE_OPTIONS = [
  { label: '全市场', value: '' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '上证50', value: '000016.SH' },
];

const PAGE_SIZE = 50;

// ----------------------------------------------------------------------

export function FactorScreeningView() {
  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [conditions, setConditions] = useState<FactorCondition[]>([
    { factorName: '', operator: 'gt', value: undefined },
  ]);
  const [tradeDate, setTradeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [universe, setUniverse] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [result, setResult] = useState<FactorScreeningResult | null>(null);
  const [page, setPage] = useState(0);
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

  const factorOptions = useMemo<{ label: string; name: string }[]>(
    () =>
      conditions
        .map((c) => c.factorName)
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((name) => {
          const f = allFactors.find((x) => x.name === name);
          return { label: f?.label ?? name, name };
        }),
    [conditions, allFactors]
  );

  const handleScreening = async (targetPage = 0) => {
    const validConditions = conditions.filter((c) => c.factorName);
    if (validConditions.length === 0) {
      setError('请至少设置一个有效的筛选条件');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await factorApi.screening({
        conditions: validConditions,
        tradeDate: dayjs(tradeDate).format('YYYYMMDD'),
        universe: universe || undefined,
        sortBy: sortBy || undefined,
        sortOrder,
        page: targetPage + 1,
        pageSize: PAGE_SIZE,
      });
      setResult(data);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : '选股失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    handleScreening(newPage);
  };

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        因子选股
      </Typography>

      {/* 全局参数 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            全局参数
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <TextField
              label="选股日期"
              type="date"
              size="small"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: dayjs().format('YYYY-MM-DD') }}
              sx={{ minWidth: 160 }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>股票池</InputLabel>
              <Select
                label="股票池"
                value={universe}
                onChange={(e) => setUniverse(e.target.value)}
              >
                {UNIVERSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {factorOptions.length > 0 && (
              <>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>排序因子</InputLabel>
                  <Select
                    label="排序因子"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="">无</MenuItem>
                    {factorOptions.map((opt) => (
                      <MenuItem key={opt.name} value={opt.name}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>排序方向</InputLabel>
                  <Select
                    label="排序方向"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <MenuItem value="desc">降序</MenuItem>
                    <MenuItem value="asc">升序</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* 条件构建器 */}
      {libraryLoading ? (
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 3 }} />
      ) : (
        <FactorScreeningConditions
          conditions={conditions}
          allFactors={allFactors}
          onConditionsChange={setConditions}
          onScreening={() => handleScreening(0)}
          loading={loading}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 结果表格 */}
      <Card>
        <FactorScreeningTable
          result={result}
          conditions={conditions}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      </Card>

      <Box sx={{ mt: 4, py: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          数据来源：Tushare · 仅供参考，不构成投资建议
        </Typography>
      </Box>
    </DashboardContent>
  );
}
