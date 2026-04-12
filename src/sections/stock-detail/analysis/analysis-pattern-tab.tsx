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
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { searchPatterns, getPatternTemplates } from 'src/api/pattern';

import { Label } from 'src/components/label';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const TYPE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'reversal_top', label: '顶部反转' },
  { value: 'reversal_bottom', label: '底部反转' },
  { value: 'continuation', label: '持续形态' },
  { value: 'bilateral', label: '双向形态' },
];

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

function TemplateCard({
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
        '&:hover': {
          border: `2px solid ${theme.palette.primary.light}`,
        },
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

function MatchCard({ match }: { match: PatternMatch }) {
  const pct = Math.round(match.similarity * 100);
  const fmtDate = (d: string) =>
    d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 5 }}>
            <Typography variant="subtitle2">{match.patternName}</Typography>
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
          <Grid size={{ xs: 12, sm: 3 }}>
            {match.series?.length > 0 && <PatternMiniChart series={match.series} height={50} />}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function AnalysisPatternTab({ tsCode }: Props) {
  const [templates, setTemplates] = useState<PatternTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternSearchResult | null>(null);
  const [error, setError] = useState('');

  // Load templates on mount
  useEffect(() => {
    setTemplatesLoading(true);
    getPatternTemplates()
      .then(setTemplates)
      .catch(() => {}) // templates are optional display; silently ignore
      .finally(() => setTemplatesLoading(false));
  }, []);

  const filteredTemplates =
    typeFilter === 'all' ? templates : templates.filter((t) => t.type === typeFilter);

  const handleTypeFilter = (_: React.MouseEvent, v: string) => {
    if (!v) return;
    setTypeFilter(v);
    // Clear selected pattern if it no longer belongs to the new type
    if (v !== 'all' && selectedPatternId) {
      const still = templates.find((t) => t.id === selectedPatternId && t.type === v);
      if (!still) {
        setSelectedPatternId(null);
        setResult(null);
      }
    }
  };

  const handleSearch = useCallback(async () => {
    if (!selectedPatternId || !startDate || !endDate) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await searchPatterns({
        tsCode,
        startDate,
        endDate,
        algorithm: selectedPatternId as 'NED' | 'DTW',
        topK: topN,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索形态失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [tsCode, selectedPatternId, startDate, endDate, topN]);

  const canSearch = !!selectedPatternId && !!startDate && !!endDate && !loading;

  return (
    <Stack spacing={3}>
      {/* Template type filter */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            形态模板
          </Typography>

          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={handleTypeFilter}
            size="small"
            sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}
          >
            {TYPE_FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {templatesLoading ? (
            <Grid container spacing={1.5}>
              {[...Array(6)].map((_, i) => (
                <Grid key={i} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={1.5}>
              {filteredTemplates.map((tpl) => (
                <Grid key={tpl.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <TemplateCard
                    template={tpl}
                    selected={selectedPatternId === tpl.id}
                    onSelect={() => {
                      setSelectedPatternId(tpl.id === selectedPatternId ? null : tpl.id);
                      setResult(null);
                    }}
                  />
                </Grid>
              ))}
              {filteredTemplates.length === 0 && !templatesLoading && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无此类型形态模板
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Search params */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            搜索参数
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>返回条数</InputLabel>
              <Select
                label="返回条数"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
              >
                {[5, 10, 20, 50].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n} 条
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" disabled={!canSearch} onClick={handleSearch}>
              搜索匹配形态
            </Button>
          </Box>
          {!selectedPatternId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              请先在上方选择一个形态模板
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Results */}
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
            <Alert severity="info">未找到匹配形态，请调整日期区间或选择不同形态模板。</Alert>
          ) : (
            result.matches.map((m, i) => <MatchCard key={`${m.matchStartDate}-${i}`} match={m} />)
          )}
        </Stack>
      )}
    </Stack>
  );
}
