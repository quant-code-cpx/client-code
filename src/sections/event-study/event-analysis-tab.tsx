import type { Dayjs } from 'dayjs';
import type { StockSearchItem } from 'src/api/stock';
import type {
  EventType,
  EventSample,
  EventTypeItem,
  MarketCapBucket,
  EventAnalyzeResult,
} from 'src/api/event-study';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

import { analyzeEvent } from 'src/api/event-study';

import { DatePicker } from 'src/components/date-picker';
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
                  <InputLabel id="event-analysis-type-label">事件类型 *</InputLabel>
                  <Select
                    labelId="event-analysis-type-label"
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
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DatePicker
                  label="结束日期"
                  value={endDate}
                  onChange={(v) => setEndDate(v)}
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="event-analysis-benchmark-label">基准</InputLabel>
                  <Select
                    labelId="event-analysis-benchmark-label"
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
                  <InputLabel id="event-analysis-market-cap-label">市值档位</InputLabel>
                  <Select
                    labelId="event-analysis-market-cap-label"
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
          <Tabs value="overall">
            <Tab value="overall" label="整体" />
            <Tab value="segments" label="分段对比（未开放）" disabled />
          </Tabs>

          <Alert severity="info">分段对比能力尚未开放；整体事件分析结果仍可正常使用。</Alert>

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
