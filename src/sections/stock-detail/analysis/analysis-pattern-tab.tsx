import type { PatternTemplate, PatternSearchResult } from 'src/api/pattern';

import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { searchBySeries, searchPatterns, getPatternTemplatesRaw } from 'src/api/pattern';

import { DatePicker } from 'src/components/date-picker';

import {
  PatternResultsList,
  enrichPatternTemplate,
  PatternAdvancedFilters,
  PatternTemplateGallery,
  DEFAULT_PATTERN_FILTERS,
  type PatternFiltersValue,
} from 'src/sections/pattern/components';

// ----------------------------------------------------------------------

type SubMode = 'template' | 'range';
type TypeFilter = 'all' | PatternTemplate['type'];

const dateToYmd = (s: string): string => s.replace(/-/g, '');

type Props = { tsCode: string };

export function AnalysisPatternTab({ tsCode }: Props) {
  const navigate = useNavigate();
  const [subMode, setSubMode] = useState<SubMode>('template');

  // ---- Templates ----
  const [templates, setTemplates] = useState<PatternTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const loadTemplates = useCallback(() => {
    setTemplatesLoading(true);
    setTemplatesError('');
    getPatternTemplatesRaw()
      .then((raws) => setTemplates(raws.map(enrichPatternTemplate)))
      .catch((err: unknown) =>
        setTemplatesError(err instanceof Error ? err.message : '加载模板失败')
      )
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ---- Filters & search ----
  const [filters, setFilters] = useState<PatternFiltersValue>({
    ...DEFAULT_PATTERN_FILTERS,
    excludeSelf: false, // 个股内部搜索默认包含自身相邻区段
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PatternSearchResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );

  const canSearchTemplate = !!selectedTemplate && !loading;
  const canSearchRange = !!startDate && !!endDate && !loading;

  const handleSearch = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      let data: PatternSearchResult;
      if (subMode === 'template' && selectedTemplate) {
        data = await searchBySeries(
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
      } else if (subMode === 'range' && startDate && endDate) {
        data = await searchPatterns(
          {
            tsCode,
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
      } else {
        return;
      }
      if (!ctrl.signal.aborted) setResult(data);
    } catch (err) {
      if (!ctrl.signal.aborted) setError(err instanceof Error ? err.message : '搜索失败，请重试');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [subMode, selectedTemplate, startDate, endDate, tsCode, filters]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleExpandToFullMarket = useCallback(() => {
    const params = new URLSearchParams();
    if (subMode === 'template' && selectedTemplate) {
      params.set('mode', 'template');
      params.set('pattern', selectedTemplate.id);
    } else if (subMode === 'range') {
      params.set('mode', 'range');
      params.set('tsCode', tsCode);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
    } else {
      params.set('mode', 'template');
    }
    navigate(`/pattern?${params.toString()}`);
  }, [subMode, selectedTemplate, startDate, endDate, tsCode, navigate]);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <ToggleButtonGroup
          value={subMode}
          exclusive
          onChange={(_, v: SubMode | null) => {
            if (v) {
              setSubMode(v);
              setResult(null);
            }
          }}
          size="small"
        >
          <ToggleButton value="template">按模板搜索</ToggleButton>
          <ToggleButton value="range">按区间搜索</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="outlined" size="small" onClick={handleExpandToFullMarket}>
          扩大到全市场搜索
        </Button>
      </Box>

      {templatesError && subMode === 'template' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadTemplates}>
              重试
            </Button>
          }
        >
          {templatesError}
        </Alert>
      )}

      {subMode === 'template' && (
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
                setSelectedId(id);
                setResult(null);
              }}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />
          </CardContent>
        </Card>
      )}

      {subMode === 'range' && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              选择 {tsCode} 的某段区间作为查询样板
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <DatePicker
                label="开始日期"
                value={startDate ? dayjs(startDate) : null}
                onChange={(v) => {
                  setStartDate(v?.format('YYYY-MM-DD') ?? '');
                  setResult(null);
                }}
              />
              <DatePicker
                label="结束日期"
                value={endDate ? dayjs(endDate) : null}
                onChange={(v) => {
                  setEndDate(v?.format('YYYY-MM-DD') ?? '');
                  setResult(null);
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.excludeSelf}
                    onChange={(e) => setFilters({ ...filters, excludeSelf: e.target.checked })}
                  />
                }
                label="排除当前股票自身"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            搜索参数
          </Typography>
          <Stack spacing={2}>
            <PatternAdvancedFilters value={filters} onChange={setFilters} />
            <Box>
              <Button
                variant="contained"
                disabled={subMode === 'template' ? !canSearchTemplate : !canSearchRange}
                onClick={handleSearch}
              >
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
