import type { StockMarginData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';

import { stockDetailApi } from 'src/api/stock';

import { AnalysisMarginChart } from './analysis-margin-chart';
import { AnalysisMarginSummaryCard } from './analysis-margin-summary-card';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function AnalysisMarginTab({ tsCode }: Props) {
  const [data, setData] = useState<StockMarginData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.marginData(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取融资融券数据失败');
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

  if (!data.available) {
    return (
      <Alert severity="info">
        该股票暂无融资融券数据（可能未纳入两融标的或数据未同步）
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <AnalysisMarginSummaryCard summary={data.summary} />
      <AnalysisMarginChart history={data.history} />
    </Stack>
  );
}
