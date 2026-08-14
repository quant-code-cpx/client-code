import type { StockSearchItem } from 'src/api/stock';
import type { PatternTemplate, PatternSearchResult, PatternTemplateType } from 'src/api/pattern';

import dayjs from 'dayjs';
import { useSearchParams } from 'react-router';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';
import { searchBySeries, searchPatterns, getPatternTemplatesRaw } from 'src/api/pattern';

import { DatePicker } from 'src/components/date-picker';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

import { dateToYmd } from './pattern-mode-utils';
import { PatternModeSeries } from './pattern-mode-series';
import {
  PatternResultsList,
  enrichPatternTemplate,
  PatternAdvancedFilters,
  PatternTemplateGallery,
  DEFAULT_PATTERN_FILTERS,
} from '../components';

import type { PatternFiltersValue } from '../components';

// ----------------------------------------------------------------------

type Mode = 'template' | 'range' | 'series';
type TypeFilter = 'all' | PatternTemplateType;

// ----------------------------------------------------------------------

export function PatternView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = ((searchParams.get('mode') as Mode | null) ?? 'template') as Mode;

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setMode = useCallback((next: Mode) => updateParam('mode', next), [updateParam]);

  // ----- 模板加载（共享） -----
  const [templates, setTemplates] = useState<PatternTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');

  const loadTemplates = useCallback(() => {
    setTemplatesLoading(true);
    setTemplatesError('');
    getPatternTemplatesRaw()
      .then((raws) => setTemplates(raws.map(enrichPatternTemplate)))
      .catch((err: unknown) => {
        setTemplatesError(err instanceof Error ? err.message : '加载模板失败');
      })
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <DashboardContent maxWidth="xl">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h4">形态匹配</Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v: Mode | null) => {
            if (v) setMode(v);
          }}
          size="small"
        >
          <ToggleButton value="template">按模板搜索</ToggleButton>
          <ToggleButton value="range">按区间搜索</ToggleButton>
          <ToggleButton value="series">按序列搜索</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {templatesError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={loadTemplates}>
              重试
            </Button>
          }
        >
          {templatesError}
        </Alert>
      )}

      {mode === 'template' && (
        <ModeTemplate
          templates={templates}
          templatesLoading={templatesLoading}
          searchParams={searchParams}
          updateParam={updateParam}
        />
      )}
      {mode === 'range' && <ModeRange searchParams={searchParams} updateParam={updateParam} />}
      {mode === 'series' && <PatternModeSeries />}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------
// Mode 1: 按模板搜索
// ----------------------------------------------------------------------

type ModeProps = {
  searchParams: URLSearchParams;
  updateParam: (key: string, value: string | null) => void;
};

type ModeTemplateProps = ModeProps & {
  templates: PatternTemplate[];
  templatesLoading: boolean;
};

function ModeTemplate({
  templates,
  templatesLoading,
  searchParams,
  updateParam,
}: ModeTemplateProps) {
  const selectedId = searchParams.get('pattern');
  const typeFilter = (searchParams.get('type') as TypeFilter | null) ?? 'all';

  const [filters, setFilters] = useState<PatternFiltersValue>(DEFAULT_PATTERN_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PatternSearchResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );

  const handleSearch = useCallback(async () => {
    if (!selectedTemplate || selectedTemplate.series.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await searchBySeries(
        {
          series: selectedTemplate.series,
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
  }, [selectedTemplate, filters]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            形态模板库
          </Typography>
          <PatternTemplateGallery
            templates={templates}
            loading={templatesLoading}
            selectedId={selectedId}
            onSelect={(id) => {
              updateParam('pattern', id);
              setResult(null);
            }}
            typeFilter={typeFilter}
            onTypeFilterChange={(v) => updateParam('type', v === 'all' ? null : v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            搜索参数
          </Typography>
          <Stack spacing={2}>
            <PatternAdvancedFilters value={filters} onChange={setFilters} />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                disabled={!selectedTemplate || loading}
                onClick={handleSearch}
              >
                  {loading ? '搜索中…' : '搜索'}
              </Button>
              {!selectedTemplate && (
                <Typography variant="caption" color="text.secondary">
                  请先在上方选择一个形态模板
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <PatternResultsList loading={loading} error={error} result={result} />
    </Stack>
  );
}

// ----------------------------------------------------------------------
// Mode 2: 按区间搜索
// ----------------------------------------------------------------------

function ModeRange({ searchParams, updateParam }: ModeProps) {
  const tsCode = searchParams.get('tsCode') ?? '';
  const startDate = searchParams.get('start') ?? '';
  const endDate = searchParams.get('end') ?? '';

  const [stock, setStock] = useState<StockSearchItem | null>(
    tsCode ? { tsCode, symbol: '', name: '', market: null, industry: null, listStatus: null } : null
  );
  const [filters, setFilters] = useState<PatternFiltersValue>(DEFAULT_PATTERN_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PatternSearchResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSearch = !!stock?.tsCode && !!startDate && !!endDate && !loading;

  const handleSearch = useCallback(async () => {
    if (!canSearch || !stock) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await searchPatterns(
        {
          tsCode: stock.tsCode,
          startDate: dateToYmd(startDate),
          endDate: dateToYmd(endDate),
          algorithm: filters.algorithm,
          topK: filters.topK,
          scope: filters.scope,
          indexCode: filters.scope === 'INDEX' ? filters.indexCode : undefined,
          lookbackYears: filters.lookbackYears,
          excludeSelf: filters.excludeSelf,
        },
        ctrl.signal
      );
      if (!ctrl.signal.aborted) setResult(data);
    } catch (err) {
      if (!ctrl.signal.aborted) setError(err instanceof Error ? err.message : '搜索失败，请重试');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [canSearch, stock, startDate, endDate, filters]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            选择查询样板（股票 + 区间）
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <StockSearchAutocomplete
                label="股票"
                value={stock}
                onChange={(item) => {
                  setStock(item);
                  updateParam('tsCode', item?.tsCode ?? null);
                  setResult(null);
                }}
                sx={{ width: 240 }}
              />
              <DatePicker
                label="开始日期"
                value={startDate ? dayjs(startDate) : null}
                onChange={(v) => {
                  updateParam('start', v?.format('YYYY-MM-DD') ?? null);
                  setResult(null);
                }}
              />
              <DatePicker
                label="结束日期"
                value={endDate ? dayjs(endDate) : null}
                onChange={(v) => {
                  updateParam('end', v?.format('YYYY-MM-DD') ?? null);
                  setResult(null);
                }}
              />
            </Box>
            <PatternAdvancedFilters value={filters} onChange={setFilters} showExcludeSelf />
            <Box>
              <Button variant="contained" disabled={!canSearch} onClick={handleSearch}>
                  {loading ? '搜索中…' : '搜索'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <PatternResultsList loading={loading} error={error} result={result} />
    </Stack>
  );
}
