import type { EventType, EventTypeItem, EventAnalyzeResult } from 'src/api/event-study';

import { useState } from 'react';

import Box from '@mui/material/Box';
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
import CircularProgress from '@mui/material/CircularProgress';

import { analyzeEvent } from 'src/api/event-study';

import { BENCHMARK_OPTIONS } from './constants';
import { EventAnalysisChart } from './event-analysis-chart';
import { EventAnalysisSummaryCards } from './event-analysis-summary-cards';
import { EventAnalysisSamplesTable } from './event-analysis-samples-table';

// ----------------------------------------------------------------------

type Props = {
  eventTypes: EventTypeItem[];
};

export function EventAnalysisTab({ eventTypes }: Props) {
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [tsCode, setTsCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preDays, setPreDays] = useState(5);
  const [postDays, setPostDays] = useState(20);
  const [benchmarkCode, setBenchmarkCode] = useState('000300.SH');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventAnalyzeResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!eventType) return;
    setLoading(true);
    setError('');
    try {
      const data = await analyzeEvent({
        eventType,
        tsCode: tsCode || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        preDays,
        postDays,
        benchmarkCode,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* 参数面板 */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          分析参数
        </Typography>
        <Grid container spacing={2}>
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
            <TextField
              fullWidth
              size="small"
              label="股票代码（可选）"
              placeholder="如 000001.SZ"
              value={tsCode}
              onChange={(e) => setTsCode(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="开始日期"
              placeholder="YYYYMMDD"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="结束日期"
              placeholder="YYYYMMDD"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>基准指数</InputLabel>
              <Select
                value={benchmarkCode}
                label="基准指数"
                onChange={(e) => setBenchmarkCode(e.target.value)}
              >
                {BENCHMARK_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              事件前天数：{preDays}
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
              事件后天数：{postDays}
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

          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              size="large"
              disabled={!eventType || loading}
              onClick={handleAnalyze}
            >
              开始分析
            </Button>
          </Grid>
        </Grid>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {/* 结果区域 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      ) : result ? (
        <Stack spacing={3}>
          <EventAnalysisSummaryCards result={result} />
          <EventAnalysisChart result={result} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <EventAnalysisSamplesTable
                title="超额收益 Top 10"
                samples={result.topSamples}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <EventAnalysisSamplesTable
                title="超额收益 Bottom 10"
                samples={result.bottomSamples}
                color="error"
              />
            </Grid>
          </Grid>
        </Stack>
      ) : null}
    </Stack>
  );
}
