import type { StockTechnicalData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { stockDetailApi } from 'src/api/stock';

import { AnalysisTechnicalMaCard } from './analysis-technical-ma-card';
import { AnalysisTechnicalVolumeCard } from './analysis-technical-volume-card';
import { AnalysisTechnicalSignalPanel } from './analysis-technical-signal-panel';
import { AnalysisTechnicalIndicatorCard } from './analysis-technical-indicator-card';

// ----------------------------------------------------------------------

export function fmtD(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

type Props = { tsCode: string };

export function AnalysisTechnicalTab({ tsCode }: Props) {
  const [period, setPeriod] = useState<'D' | 'W' | 'M'>('D');
  const [days, setDays] = useState(120);
  const [data, setData] = useState<StockTechnicalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.technicalIndicators(tsCode, period, days);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取技术指标数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode, period, days]);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => { if (v) setPeriod(v); }}
          size="small"
        >
          <ToggleButton value="D">日线</ToggleButton>
          <ToggleButton value="W">周线</ToggleButton>
          <ToggleButton value="M">月线</ToggleButton>
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
          <AnalysisTechnicalSignalPanel signals={data.signals} maStatus={data.maStatus} />
          <AnalysisTechnicalMaCard history={data.history} />
          <AnalysisTechnicalIndicatorCard history={data.history} />
          <AnalysisTechnicalVolumeCard history={data.history} />
        </>
      )}
    </Stack>
  );
}
