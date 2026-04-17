import type { DailyInfoResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { fetchDailyInfo } from 'src/api/market';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

function MetricItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack alignItems="center" sx={{ minWidth: 80, px: 1 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: color ?? 'text.primary', fontWeight: 'fontWeightBold' }}
      >
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

export function MarketDailySnapshotCard({ tradeDate }: Props) {
  const [data, setData] = useState<DailyInfoResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchDailyInfo({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        // silent fail — card is supplementary
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (loading) {
    return <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2 }} />;
  }

  if (!data) return null;

  return (
    <Card sx={{ px: 2, py: 1.5 }}>
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        spacing={1}
        sx={{ overflowX: 'auto' }}
        justifyContent="space-around"
      >
        <MetricItem label="成交额" value={`${fNumber(data.totalAmount)}亿`} />
        <MetricItem label="涨停" value={String(data.limitUpCount)} color="error.main" />
        <MetricItem label="跌停" value={String(data.limitDownCount)} color="success.main" />
        <MetricItem
          label="封板率"
          value={`${(data.limitUpSealRate * 100).toFixed(1)}%`}
          color="warning.main"
        />
        <MetricItem label="连板" value={String(data.continuousLimitCount)} color="info.main" />
        <MetricItem label="换手" value={`${data.avgTurnover.toFixed(2)}%`} />
        <MetricItem label="上涨" value={String(data.riseCount)} color="error.main" />
        <MetricItem label="下跌" value={String(data.fallCount)} color="success.main" />
      </Stack>
    </Card>
  );
}
