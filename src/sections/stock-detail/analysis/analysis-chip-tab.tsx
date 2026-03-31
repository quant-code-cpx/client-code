import type { ChipDistributionData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';

import { stockDetailApi } from 'src/api/stock';

import { AnalysisChipSummaryCard } from './analysis-chip-summary-card';
import { AnalysisChipDistributionChart } from './analysis-chip-distribution-chart';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function AnalysisChipTab({ tsCode }: Props) {
  const [data, setData] = useState<ChipDistributionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.chipDistribution(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取筹码分布数据失败');
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
      {data.isEstimated && (
        <Alert severity="warning">⚠️ 数据为估算值，仅供参考</Alert>
      )}
      <AnalysisChipDistributionChart
        distribution={data.distribution}
        currentPrice={data.currentPrice}
      />
      <AnalysisChipSummaryCard
        concentration={data.concentration}
        keyLevels={data.keyLevels}
        currentPrice={data.currentPrice}
      />
    </Stack>
  );
}
