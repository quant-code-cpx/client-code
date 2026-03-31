import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchHsgtFlow } from 'src/api/market';

// ----------------------------------------------------------------------

/** 百万元 → 亿元，保留 2 位小数 */
function toYi(millionYuan: number): string {
  return (millionYuan / 100).toFixed(2);
}

function flowColor(value: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

type SubItemProps = {
  label: string;
  value: number;
};

function SubItem({ label, value }: SubItemProps) {
  const color = flowColor(value);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="fontWeightMedium" sx={{ color }}>
        {value > 0 ? '+' : ''}
        {toYi(value)}亿
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function HsgtSummaryCard({ tradeDate }: Props) {
  const [data, setData] = useState<HsgtTrendItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtFlow({ trade_date: tradeDate, days: 1 })
      .then((res) => {
        if (!cancelled) setData(res?.data?.[0] ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载沪深港通数据失败');
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
          沪深港通资金
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={8} sx={{ my: 1.5 }} />
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="80%" />
          </>
        ) : !data ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            暂无数据
          </Typography>
        ) : (
          <>
            {/* 北向资金 */}
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              北向资金（合计）
            </Typography>
            <Typography
              variant="h4"
              fontWeight="fontWeightBold"
              sx={{ color: flowColor(data.northMoney), mb: 1 }}
            >
              {data.northMoney > 0 ? '+' : ''}
              {toYi(data.northMoney)}亿
            </Typography>

            <SubItem label="沪股通" value={data.hgt} />
            <SubItem label="深股通" value={data.sgt} />

            <Divider sx={{ my: 1.5 }} />

            {/* 南向资金 */}
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              南向资金（合计）
            </Typography>
            <Typography
              variant="h4"
              fontWeight="fontWeightBold"
              sx={{ color: flowColor(data.southMoney), mb: 1 }}
            >
              {data.southMoney > 0 ? '+' : ''}
              {toYi(data.southMoney)}亿
            </Typography>

            <SubItem label="港股通（沪）" value={data.ggtSs} />
            <SubItem label="港股通（深）" value={data.ggtSz} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
