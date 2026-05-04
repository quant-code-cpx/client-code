import type { Dayjs } from 'dayjs';
import type { StockSearchItem } from 'src/api/stock';
import type {
  EventType,
  EventSample,
  SegmentItem,
  EventTypeItem,
  SegmentGroupBy,
  MarketCapBucket,
  EventAnalyzeResult,
  AnalyzeBySegmentResult,
} from 'src/api/event-study';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { analyzeEvent, analyzeBySegment } from 'src/api/event-study';

import { Label } from 'src/components/label';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

import { DataState } from './_shared/data-state';
import { TermTooltip } from './_shared/term-tooltip';
import { EventAnalysisChart } from './event-analysis-chart';
import { SampleDetailDrawer } from './_shared/sample-detail-drawer';
import { EventAnalysisSummaryCards } from './event-analysis-summary-cards';
import { EventAnalysisSamplesTable } from './event-analysis-samples-table';
import { INDUSTRY_OPTIONS, BENCHMARK_OPTIONS, MARKET_CAP_BUCKETS } from './constants';

// ----------------------------------------------------------------------

type Props = {
  eventTypes: EventTypeItem[];
};

type SubTab = 'overall' | 'segments';

export function EventAnalysisTab({ eventTypes }: Props) {
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [marketCapBucket, setMarketCapBucket] = useState<MarketCapBucket | ''>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [preDays, setPreDays] = useState(5);
  const [postDays, setPostDays] = useState(20);
  const [benchmarkCode, setBenchmarkCode] = useState('000300.SH');
  const [clusterWindow, setClusterWindow] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventAnalyzeResult | null>(null);
  const [error, setError] = useState('');

  const [subTab, setSubTab] = useState<SubTab>('overall');
  const [segGroupBy, setSegGroupBy] = useState<SegmentGroupBy>('industry');
  const [segLoading, setSegLoading] = useState(false);
  const [segResult, setSegResult] = useState<AnalyzeBySegmentResult | null>(null);

  const [drawerSample, setDrawerSample] = useState<EventSample | null>(null);

  const buildBaseParams = () => ({
    eventType: eventType as EventType,
    tsCode: selectedStock?.tsCode || undefined,
    startDate: startDate ? startDate.format('YYYYMMDD') : undefined,
    endDate: endDate ? endDate.format('YYYYMMDD') : undefined,
    preDays,
    postDays,
    benchmarkCode,
    clusterWindow,
    filters: {
      industry: industry || undefined,
      marketCapBucket: marketCapBucket || undefined,
    },
  });

  const handleAnalyze = async () => {
    if (!eventType) return;
    setLoading(true);
    setError('');
    try {
      const data = await analyzeEvent(buildBaseParams());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentLoad = async (groupBy: SegmentGroupBy) => {
    if (!eventType) return;
    setSegLoading(true);
    try {
      const data = await analyzeBySegment({
        ...buildBaseParams(),
        groupBy,
      });
      setSegResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分段分析失败');
    } finally {
      setSegLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {/* 基础参数组 */}
          <Box>
            <Typography variant="overline" color="text.secondary">
              基础参数
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>事件类型 *</InputLabel>
                  <Select
                    value={eventType}
                    label="事件类型 *"
                    onChange={(e) => setEventType(e.target.value as EventType)}
                  >
                    {eventTypes.map((et) => (
                      <MenuItem key={et.type} value={et.type}>
                        {et.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DatePicker
                  label="开始日期"
                  value={startDate}
                  onChange={(v) => setStartDate(v)}
                  format="YYYY-MM-DD"
                  slotProps={{
                    textField: { size: 'small', fullWidth: true },
                    field: { clearable: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DatePicker
                  label="结束日期"
                  value={endDate}
                  onChange={(v) => setEndDate(v)}
                  format="YYYY-MM-DD"
                  slotProps={{
                    textField: { size: 'small', fullWidth: true },
                    field: { clearable: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>基准</InputLabel>
                  <Select
                    value={benchmarkCode}
                    label="基准"
                    onChange={(e) => setBenchmarkCode(e.target.value)}
                  >
                    {BENCHMARK_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <MenuItem key={`ind-${ind}`} value={`IND:${ind}`}>
                        行业基准 · {ind}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* 样本筛选组 */}
          <Box>
            <Typography variant="overline" color="text.secondary">
              样本筛选
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <StockSearchAutocomplete
                  label="股票代码（可选）"
                  value={selectedStock}
                  onChange={(item) => setSelectedStock(item)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  size="small"
                  options={INDUSTRY_OPTIONS}
                  value={industry}
                  onChange={(_, v) => setIndustry(v)}
                  renderInput={(params) => <TextField {...params} label="行业" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>市值档位</InputLabel>
                  <Select
                    value={marketCapBucket}
                    label="市值档位"
                    onChange={(e) => setMarketCapBucket(e.target.value as MarketCapBucket | '')}
                  >
                    <MenuItem value="">不限</MenuItem>
                    {MARKET_CAP_BUCKETS.map((b) => (
                      <MenuItem key={b.value} value={b.value}>
                        {b.label} · {b.hint}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* 高级 */}
          <Box>
            <Typography variant="overline" color="text.secondary">
              高级参数
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  事件前 {preDays} 天
                </Typography>
                <Slider
                  value={preDays}
                  min={0}
                  max={60}
                  step={1}
                  onChange={(_, v) => setPreDays(v as number)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  事件后 {postDays} 天
                </Typography>
                <Slider
                  value={postDays}
                  min={1}
                  max={120}
                  step={1}
                  onChange={(_, v) => setPostDays(v as number)}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <TermTooltip termKey="CLUSTER" label={`聚簇窗口 ±${clusterWindow}`} />
                </Typography>
                <Slider
                  value={clusterWindow}
                  min={0}
                  max={30}
                  step={1}
                  onChange={(_, v) => setClusterWindow(v as number)}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              disabled={!eventType || loading}
              onClick={handleAnalyze}
            >
              开始分析
            </Button>
          </Stack>
        </Stack>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {/* 子 Tab：整体 / 分段 */}
      {result && (
        <>
          <Tabs
            value={subTab}
            onChange={(_, v: SubTab) => {
              setSubTab(v);
              if (v === 'segments' && !segResult) handleSegmentLoad(segGroupBy);
            }}
          >
            <Tab value="overall" label="整体" />
            <Tab value="segments" label="分段对比" />
          </Tabs>

          {subTab === 'overall' && (
            <DataState loading={loading} skeletonHeight={380}>
              <Stack spacing={3}>
                <EventAnalysisSummaryCards result={result} />
                <EventAnalysisChart result={result} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EventAnalysisSamplesTable
                      title="超额收益 Top 10"
                      samples={result.topSamples}
                      color="success"
                      onSampleClick={setDrawerSample}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EventAnalysisSamplesTable
                      title="超额收益 Bottom 10"
                      samples={result.bottomSamples}
                      color="error"
                      onSampleClick={setDrawerSample}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </DataState>
          )}

          {subTab === 'segments' && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  分组维度：
                </Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={segGroupBy}
                    onChange={(e) => {
                      const v = e.target.value as SegmentGroupBy;
                      setSegGroupBy(v);
                      handleSegmentLoad(v);
                    }}
                  >
                    <MenuItem value="industry">按行业</MenuItem>
                    <MenuItem value="marketCapBucket">按市值档位</MenuItem>
                    <MenuItem value="stFlag">按 ST 标识</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Card>
                <DataState
                  loading={segLoading}
                  empty={!!segResult && segResult.segments.length === 0}
                  emptyText="暂无分段数据"
                  skeletonHeight={240}
                >
                  {segResult ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>分组</TableCell>
                            <TableCell align="right">样本</TableCell>
                            <TableCell align="right">CAAR</TableCell>
                            <TableCell align="right">t</TableCell>
                            <TableCell align="right">p</TableCell>
                            <TableCell>显著性</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {segResult.segments.map((it: SegmentItem) => {
                            const sig = it.pValue < 0.05;
                            return (
                              <TableRow key={it.label} hover>
                                <TableCell>{it.label}</TableCell>
                                <TableCell align="right">{it.sampleCount}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color: it.caar >= 0 ? 'success.main' : 'error.main',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {(it.caar * 100).toFixed(2)}%
                                </TableCell>
                                <TableCell align="right">{it.tStatistic.toFixed(2)}</TableCell>
                                <TableCell align="right">{it.pValue.toFixed(4)}</TableCell>
                                <TableCell>
                                  <Label color={sig ? 'success' : 'default'}>
                                    {sig ? '显著' : '不显著'}
                                  </Label>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : null}
                </DataState>
              </Card>
            </Stack>
          )}
        </>
      )}

      <SampleDetailDrawer
        open={drawerSample !== null}
        onClose={() => setDrawerSample(null)}
        sample={drawerSample}
        preDays={preDays}
      />
    </Stack>
  );
}
