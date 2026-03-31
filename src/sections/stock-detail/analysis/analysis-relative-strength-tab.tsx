import type { StockRelativeStrengthData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { stockDetailApi } from 'src/api/stock';

import { AnalysisRelativeStrengthChart } from './analysis-relative-strength-chart';
import { AnalysisRelativeStrengthSummaryCard } from './analysis-relative-strength-summary-card';

// ----------------------------------------------------------------------

const BENCHMARKS = [
  { code: '000300.SH', label: '沪深300' },
  { code: '000001.SH', label: '上证指数' },
  { code: '399001.SZ', label: '深证成指' },
  { code: '399006.SZ', label: '创业板指' },
];

type Props = { tsCode: string };

export function AnalysisRelativeStrengthTab({ tsCode }: Props) {
  const [benchmarkCode, setBenchmarkCode] = useState('000300.SH');
  const [days, setDays] = useState(120);
  const [data, setData] = useState<StockRelativeStrengthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.relativeStrength(tsCode, benchmarkCode, days);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取相对强弱数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode, benchmarkCode, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1.5 }} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={300} sx={{ borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={benchmarkCode}
          exclusive
          onChange={(_, v) => { if (v) setBenchmarkCode(v); }}
          size="small"
        >
          {BENCHMARKS.map((b) => (
            <ToggleButton key={b.code} value={b.code}>{b.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={days}
          exclusive
          onChange={(_, v) => { if (v) setDays(v); }}
          size="small"
        >
          <ToggleButton value={60}>60日</ToggleButton>
          <ToggleButton value={120}>120日</ToggleButton>
          <ToggleButton value={250}>250日</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {data && (
        <>
          <AnalysisRelativeStrengthSummaryCard summary={data.summary} />
          <AnalysisRelativeStrengthChart
            history={data.history}
            benchmarkName={data.benchmarkName}
          />
        </>
      )}
    </Stack>
  );
}
