import type { StockTimingSignalsData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';

import { stockDetailApi } from 'src/api/stock';

import { AnalysisTimingScoreCard } from './analysis-timing-score-card';
import { AnalysisTimingDetailsTable } from './analysis-timing-details-table';
import { AnalysisTimingSignalTimeline } from './analysis-timing-signal-timeline';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function AnalysisTimingTab({ tsCode }: Props) {
  const [data, setData] = useState<StockTimingSignalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.timingSignals(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取择时信号数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

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

  if (!data) return null;

  return (
    <Stack spacing={3}>
      <AnalysisTimingScoreCard scoreSummary={data.scoreSummary} />
      <AnalysisTimingDetailsTable details={data.scoreSummary.details} />
      <AnalysisTimingSignalTimeline signals={data.signals} />
    </Stack>
  );
}
