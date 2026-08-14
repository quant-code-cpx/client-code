import type { StockSearchItem } from 'src/api/stock';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { stockDetailApi } from 'src/api/stock';
import { searchBySeries } from 'src/api/pattern';

import { DatePicker } from 'src/components/date-picker';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

import { dateToYmd, normalizeSeries, parseSeriesInput } from './pattern-mode-utils';
import {
  PatternMiniChart,
  PatternResultsList,
  PatternAdvancedFilters,
  DEFAULT_PATTERN_FILTERS,
} from '../components';

import type { PatternFiltersValue } from '../components';

// ----------------------------------------------------------------------

type SeriesSource = 'paste' | 'extract';

export function PatternModeSeries() {
  const [source, setSource] = useState<SeriesSource>('paste');
  const [rawInput, setRawInput] = useState('');
  const [extractStock, setExtractStock] = useState<StockSearchItem | null>(null);
  const [extractStart, setExtractStart] = useState('');
  const [extractEnd, setExtractEnd] = useState('');
  const [extractedSeries, setExtractedSeries] = useState<number[] | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState('');

  const [filters, setFilters] = useState<PatternFiltersValue>(DEFAULT_PATTERN_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof searchBySeries>> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pastedSeries = parseSeriesInput(rawInput);
  const pasteNormalized = normalizeSeries(pastedSeries);
  const tooFewPaste = pastedSeries.length > 0 && pastedSeries.length < 5;

  const activeSeries =
    source === 'paste' ? (pastedSeries.length >= 5 ? pasteNormalized : null) : extractedSeries;

  const canSearch = !!activeSeries && activeSeries.length >= 5 && !loading;

  const handleExtract = useCallback(async () => {
    if (!extractStock || !extractStart || !extractEnd) return;
    setExtractLoading(true);
    setExtractError('');
    setExtractedSeries(null);
    try {
      const data = await stockDetailApi.chart({
        tsCode: extractStock.tsCode,
        period: 'D',
        adjustType: 'qfq',
        startDate: dateToYmd(extractStart),
        endDate: dateToYmd(extractEnd),
      });
      const closes = data.items.map((item) => item.close).filter((value): value is number => value !== null);
      if (closes.length < 5) {
        setExtractError('该区间交易日不足 5 个，请扩大区间。');
      } else {
        setExtractedSeries(normalizeSeries(closes));
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : '提取序列失败');
    } finally {
      setExtractLoading(false);
    }
  }, [extractStock, extractStart, extractEnd]);

  const handleSearch = useCallback(async () => {
    if (!canSearch || !activeSeries) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await searchBySeries(
        {
          series: activeSeries,
          algorithm: filters.algorithm,
          topK: filters.topK,
          scope: filters.scope,
          indexCode: filters.scope === 'INDEX' ? filters.indexCode : undefined,
          lookbackYears: filters.lookbackYears,
        },
        ctrl.signal
      );
      if (!ctrl.signal.aborted) setResult(data);
    } catch (err) {
      if (!ctrl.signal.aborted) setError(err instanceof Error ? err.message : '搜索失败，请重试');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [canSearch, activeSeries, filters]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            自定义查询序列
          </Typography>

          <ToggleButtonGroup
            value={source}
            exclusive
            onChange={(_, value: SeriesSource | null) => {
              if (value) {
                setSource(value);
                setResult(null);
              }
            }}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="paste">粘贴数列</ToggleButton>
            <ToggleButton value="extract">从历史区段提取</ToggleButton>
          </ToggleButtonGroup>

          {source === 'paste' && (
            <Stack spacing={2}>
              <TextField
                label="价格序列（逗号或换行分隔）"
                multiline
                rows={3}
                value={rawInput}
                onChange={(event) => {
                  setRawInput(event.target.value);
                  setResult(null);
                }}
                placeholder="例如 10, 11, 10.5, 12, 11.8, 13, 12.5"
                fullWidth
              />
              {tooFewPaste && (
                <Alert severity="warning">
                  请至少输入 5 个价格点位（当前 {pastedSeries.length} 个）。
                </Alert>
              )}
              {pastedSeries.length >= 5 && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    序列预览（{pastedSeries.length} 个点，已 0–1 标准化，与后端口径一致）
                  </Typography>
                  <PatternMiniChart series={pasteNormalized} height={100} />
                </Box>
              )}
            </Stack>
          )}

          {source === 'extract' && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <StockSearchAutocomplete
                  label="股票"
                  value={extractStock}
                  onChange={(item) => {
                    setExtractStock(item);
                    setExtractedSeries(null);
                  }}
                  sx={{ width: 240 }}
                />
                <DatePicker
                  label="开始日期"
                  value={extractStart ? dayjs(extractStart) : null}
                  onChange={(value) => {
                    setExtractStart(value?.format('YYYY-MM-DD') ?? '');
                    setExtractedSeries(null);
                  }}
                />
                <DatePicker
                  label="结束日期"
                  value={extractEnd ? dayjs(extractEnd) : null}
                  onChange={(value) => {
                    setExtractEnd(value?.format('YYYY-MM-DD') ?? '');
                    setExtractedSeries(null);
                  }}
                />
                <Button
                  variant="outlined"
                  disabled={!extractStock || !extractStart || !extractEnd || extractLoading}
                  onClick={handleExtract}
                >
                  {extractLoading ? '提取中...' : '提取序列'}
                </Button>
              </Box>
              {extractError && <Alert severity="error">{extractError}</Alert>}
              {extractedSeries && extractedSeries.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    已提取序列（{extractedSeries.length} 个交易日，已标准化）
                  </Typography>
                  <PatternMiniChart series={extractedSeries} height={100} />
                </Box>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            搜索参数
          </Typography>
          <Stack spacing={2}>
            <PatternAdvancedFilters value={filters} onChange={setFilters} />
            <Box>
              <Button variant="contained" disabled={!canSearch} onClick={handleSearch}>
                {loading ? '搜索中…' : '搜索相似形态'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <PatternResultsList loading={loading} error={error} result={result} />
    </Stack>
  );
}
