import type { PatternMatch, PatternTemplate, PatternSearchResult } from 'src/api/pattern';

import dayjs from 'dayjs';
import { varAlpha } from 'minimal-shared/utils';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';
import { searchBySeries, searchPatterns, getPatternTemplates } from 'src/api/pattern';

import { Label } from 'src/components/label';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  reversal_top: '顶部反转',
  reversal_bottom: '底部反转',
  continuation: '持续形态',
  bilateral: '双向形态',
};

const TYPE_COLORS: Record<string, 'error' | 'success' | 'info' | 'warning' | 'default'> = {
  reversal_top: 'error',
  reversal_bottom: 'success',
  continuation: 'info',
  bilateral: 'warning',
};

// ----------------------------------------------------------------------

function PatternMiniChart({ series, height = 60 }: { series: number[]; height?: number }) {
  const theme = useTheme();
  const chartOptions = useChart({
    chart: { type: 'line', sparkline: { enabled: true }, animations: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    tooltip: { enabled: false },
    colors: [theme.palette.primary.main],
  });
  return <Chart type="line" series={[{ data: series }]} options={chartOptions} sx={{ height }} />;
}

// ----------------------------------------------------------------------

function MatchCard({ match }: { match: PatternMatch }) {
  const pct = Math.round(match.similarity * 100);
  const fmtDate = (d: string) =>
    d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="subtitle2">{match.patternName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {match.stockName || match.tsCode}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtDate(match.matchStartDate)} → {fmtDate(match.matchEndDate)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{ flex: 1, height: 6, borderRadius: 1 }}
              />
              <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 600 }}>
                {pct}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              相似度
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {match.series?.length > 0 && <PatternMiniChart series={match.series} height={50} />}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function ModeAPanel({ templates }: { templates: PatternTemplate[] }) {
  const [tsCode, setTsCode] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternSearchResult | null>(null);
  const [error, setError] = useState('');

  const canSearch = !!selectedPatternId && !!startDate && !!endDate && !loading;

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await searchPatterns({
        tsCode: tsCode.trim() || '000001.SZ', // fallback for demo; server can handle empty tsCode
        startDate,
        endDate,
        algorithm: selectedPatternId as 'NED' | 'DTW',
        topK: topN,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [canSearch, tsCode, startDate, endDate, selectedPatternId, topN]);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            搜索参数
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField
              label="股票代码（可选）"
              size="small"
              value={tsCode}
              onChange={(e) => setTsCode(e.target.value)}
              placeholder="e.g. 000001.SZ"
              sx={{ width: 180 }}
            />
            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel>形态模板</InputLabel>
              <Select
                label="形态模板"
                value={selectedPatternId}
                onChange={(e) => {
                  setSelectedPatternId(e.target.value);
                  setResult(null);
                }}
              >
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}（{TYPE_LABELS[t.type] ?? t.type}）
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DatePicker
              label="开始日期"
              value={startDate ? dayjs(startDate) : null}
              onChange={(v) => setStartDate(v?.format('YYYY-MM-DD') ?? '')}
              format="YYYY-MM-DD"
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
                field: { clearable: true },
              }}
            />
            <DatePicker
              label="结束日期"
              value={endDate ? dayjs(endDate) : null}
              onChange={(v) => setEndDate(v?.format('YYYY-MM-DD') ?? '')}
              format="YYYY-MM-DD"
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
                field: { clearable: true },
              }}
            />
            <FormControl size="small" sx={{ width: 110 }}>
              <InputLabel>返回条数</InputLabel>
              <Select
                label="返回条数"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
              >
                {[10, 20, 50].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n} 条
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" disabled={!canSearch} onClick={handleSearch}>
              搜索
            </Button>
          </Box>
          {!selectedPatternId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              请选择形态模板后搜索
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Template gallery */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            形态模板库
          </Typography>
          <Grid container spacing={1.5}>
            {templates.map((tpl) => {
              const selected = selectedPatternId === tpl.id;
              return (
                <Grid key={tpl.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <TemplateDisplayCard
                    template={tpl}
                    selected={selected}
                    onSelect={() => {
                      setSelectedPatternId(tpl.id === selectedPatternId ? '' : tpl.id);
                      setResult(null);
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {loading && (
        <Stack spacing={1.5}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      )}

      {!loading && result && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            共找到 {result.total} 个匹配
          </Typography>
          {result.matches.length === 0 ? (
            <Alert severity="info">未找到匹配形态，请调整搜索条件。</Alert>
          ) : (
            result.matches.map((m, i) => (
              <MatchCard key={`${m.tsCode}-${m.matchStartDate}-${i}`} match={m} />
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function TemplateDisplayCard({
  template,
  selected,
  onSelect,
}: {
  template: PatternTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  return (
    <Card
      onClick={onSelect}
      sx={{
        cursor: 'pointer',
        border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
        bgcolor: selected
          ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08)
          : 'background.paper',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': { border: `2px solid ${theme.palette.primary.light}` },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {template.series?.length > 0 && <PatternMiniChart series={template.series} />}
        <Typography variant="subtitle2" noWrap sx={{ mt: 0.5, mb: 0.5 }}>
          {template.name}
        </Typography>
        <Label color={TYPE_COLORS[template.type] ?? 'default'} variant="soft" sx={{ fontSize: 10 }}>
          {TYPE_LABELS[template.type] ?? template.type}
        </Label>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function parseSeriesInput(raw: string): number[] {
  return raw
    .split(/[\s,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

function normalizeSeries(values: number[]): number[] {
  if (values.length < 2) return values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map((v) => (v - min) / range);
}

function ModeBPanel() {
  const [rawInput, setRawInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternSearchResult | null>(null);
  const [error, setError] = useState('');

  const parsedSeries = parseSeriesInput(rawInput);
  const normalizedSeries = normalizeSeries(parsedSeries);
  const tooFew = parsedSeries.length > 0 && parsedSeries.length < 5;
  const hasEnough = parsedSeries.length >= 5;

  const canSearch = hasEnough && !loading;

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await searchBySeries({
        series: normalizedSeries,
        topK: topN,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败，请重试');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSearch, rawInput, topN, startDate, endDate]);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            自定义价格序列
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="价格序列（逗号或换行分隔）"
              multiline
              rows={3}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setResult(null);
              }}
              placeholder="e.g. 10, 11, 10.5, 12, 11.8, 13, 12.5"
              fullWidth
            />

            {tooFew && (
              <Alert severity="warning">
                请至少输入 5 个价格点位（当前 {parsedSeries.length} 个）。
              </Alert>
            )}

            {hasEnough && normalizedSeries.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  序列预览（{parsedSeries.length} 个点，已标准化）
                </Typography>
                <PatternMiniChart series={normalizedSeries} height={100} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <DatePicker
                label="开始日期（可选）"
                value={startDate ? dayjs(startDate) : null}
                onChange={(v) => setStartDate(v?.format('YYYY-MM-DD') ?? '')}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: { size: 'small', sx: { minWidth: 190 } },
                  field: { clearable: true },
                }}
              />
              <DatePicker
                label="结束日期（可选）"
                value={endDate ? dayjs(endDate) : null}
                onChange={(v) => setEndDate(v?.format('YYYY-MM-DD') ?? '')}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: { size: 'small', sx: { minWidth: 190 } },
                  field: { clearable: true },
                }}
              />
              <FormControl size="small" sx={{ width: 110 }}>
                <InputLabel>返回条数</InputLabel>
                <Select
                  label="返回条数"
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                >
                  {[10, 20, 50].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} 条
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" disabled={!canSearch} onClick={handleSearch}>
                搜索相似形态
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {loading && (
        <Stack spacing={1.5}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      )}

      {!loading && result && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            共找到 {result.total} 个匹配
          </Typography>
          {result.matches.length === 0 ? (
            <Alert severity="info">未找到相似形态，请尝试调整序列或时间范围。</Alert>
          ) : (
            result.matches.map((m, i) => (
              <MatchCard key={`${m.tsCode}-${m.matchStartDate}-${i}`} match={m} />
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function PatternView() {
  const [mode, setMode] = useState<'template' | 'series'>('template');
  const [templates, setTemplates] = useState<PatternTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    setTemplatesLoading(true);
    getPatternTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

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
          onChange={(_, v) => {
            if (v) setMode(v);
          }}
          size="small"
        >
          <ToggleButton value="template">按形态搜索</ToggleButton>
          <ToggleButton value="series">按序列搜索</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {templatesLoading && mode === 'template' ? (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1.5 }} />
        </Stack>
      ) : (
        <>
          {mode === 'template' && <ModeAPanel templates={templates} />}
          {mode === 'series' && <ModeBPanel />}
        </>
      )}
    </DashboardContent>
  );
}
