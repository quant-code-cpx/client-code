import type { ValuationResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { fetchValuation } from 'src/api/market';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type PercentileLevel = 'low' | 'mid' | 'high';

function getLevel(pct: number | null): PercentileLevel {
  if (pct == null) return 'mid';
  if (pct < 30) return 'low';
  if (pct > 70) return 'high';
  return 'mid';
}

function LevelLabel({ pct }: { pct: number | null }) {
  const level = getLevel(pct);

  if (level === 'low')
    return (
      <Label color="success" variant="filled">
        低估
      </Label>
    );
  if (level === 'high')
    return (
      <Label color="error" variant="filled">
        高估
      </Label>
    );
  return (
    <Label color="default" variant="filled">
      中性
    </Label>
  );
}

function PercentileRow({
  label,
  pct,
}: {
  label: string;
  pct: number | null;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}分位
        </Typography>
        <Typography variant="caption" fontWeight="fontWeightMedium">
          {pct != null ? `${pct.toFixed(1)}%` : '-'}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct ?? 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            bgcolor: getLevel(pct) === 'high'
              ? 'error.main'
              : getLevel(pct) === 'low'
              ? 'success.main'
              : 'primary.main',
          },
        }}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketValuationCard({ tradeDate }: Props) {
  const [data, setData] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchValuation({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载市场估值失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          市场估值（全A中位数）
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <>
            <Skeleton variant="text" width="40%" height={48} />
            <Skeleton variant="text" width="40%" height={48} />
            <Skeleton variant="rectangular" height={120} sx={{ mt: 1 }} />
          </>
        ) : (
          <>
            {/* PE & PB 当日值 */}
            <Stack direction="row" spacing={4} sx={{ mb: 2.5 }}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    variant="h4"
                    fontWeight="fontWeightBold"
                    sx={{ color: 'text.primary' }}
                  >
                    {data?.peTtmMedian != null ? data.peTtmMedian.toFixed(2) : '-'}
                  </Typography>
                  <LevelLabel pct={data?.peTtmPercentile?.oneYear ?? null} />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  PE_TTM 中位数
                </Typography>
              </Box>

              <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    variant="h4"
                    fontWeight="fontWeightBold"
                    sx={{ color: 'text.primary' }}
                  >
                    {data?.pbMedian != null ? data.pbMedian.toFixed(2) : '-'}
                  </Typography>
                  <LevelLabel pct={data?.pbPercentile?.oneYear ?? null} />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  PB 中位数
                </Typography>
              </Box>
            </Stack>

            {/* PE 分位 */}
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
            >
              PE_TTM 分位数
            </Typography>
            <PercentileRow label="1年" pct={data?.peTtmPercentile?.oneYear ?? null} />
            <PercentileRow label="3年" pct={data?.peTtmPercentile?.threeYear ?? null} />
            <PercentileRow label="5年" pct={data?.peTtmPercentile?.fiveYear ?? null} />

            {/* PB 分位 */}
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', display: 'block', mb: 1, mt: 1.5 }}
            >
              PB 分位数
            </Typography>
            <PercentileRow label="1年" pct={data?.pbPercentile?.oneYear ?? null} />
            <PercentileRow label="3年" pct={data?.pbPercentile?.threeYear ?? null} />
            <PercentileRow label="5年" pct={data?.pbPercentile?.fiveYear ?? null} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
