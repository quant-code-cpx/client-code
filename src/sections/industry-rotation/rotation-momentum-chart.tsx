import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchMomentumRanking, type MomentumRankingItem } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  period?: string;
  onSectorClick?: (name: string) => void;
};

const LIMIT_OPTIONS = [10, 15, 20, 0] as const; // 0 = 全部
const LIMIT_LABELS: Record<number, string> = {
  10: 'Top 10',
  15: 'Top 15',
  20: 'Top 20',
  0: '全部',
};

export function RotationMomentumChart({ tradeDate, period, onSectorClick }: Props) {
  const theme = useTheme();
  const [limit, setLimit] = useState<number>(15);
  const [rankings, setRankings] = useState<MomentumRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMomentumRanking({ trade_date: tradeDate, method: period, limit: limit === 0 ? undefined : limit })
      .then((res) => {
        if (!cancelled) setRankings(res?.rankings ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载动量排名失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, period, limit]);

  const handleLimitChange = useCallback((e: { target: { value: unknown } }) => {
    setLimit(Number(e.target.value));
  }, []);

  // Sort ascending so best momentum is at top of horizontal bar chart
  const sorted = [...rankings].sort((a, b) => a.momentum - b.momentum);

  const categories = sorted.map((r) => r.name);
  const values = sorted.map((r) => Math.round(r.momentum * 100) / 100);
  const barColors = values.map((v) =>
    v >= 0 ? theme.palette.error.main : theme.palette.success.main
  );

  const series = [{ name: '动量值', data: values }];

  const chartOptions = useChart({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      events: {
         
        dataPointSelection: (_event: unknown, _chartCtx: unknown, config: any) => {
          const name = sorted[(config as { dataPointIndex: number })?.dataPointIndex]?.name;
          if (name && onSectorClick) onSectorClick(name);
        },
      },
    },
    colors: [theme.palette.error.main],
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 3,
        barHeight: '60%',
        dataLabels: { position: 'top' },
        colors: {
          backgroundBarColors: [],
          ranges: barColors.map((color, i) => ({ from: i, to: i, color })),
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetX: 8,
      style: { fontSize: '11px', colors: [theme.palette.text.primary] },
       
      formatter: (val: unknown, opts: any) => {
        const numVal = typeof val === 'number' ? val : Number(val);
        const item = sorted[(opts as { dataPointIndex: number })?.dataPointIndex];
        if (!item) return `${numVal.toFixed(2)}%`;
        const sign = item.rankChange > 0 ? '↑' : item.rankChange < 0 ? '↓' : '—';
        return `${numVal.toFixed(2)}% ${sign}`;
      },
    },
    xaxis: {
      categories,
      labels: { formatter: (val: number) => `${val.toFixed(2)}%` },
    },
    yaxis: { labels: { style: { fontSize: '12px' } } },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const item = sorted[dataPointIndex];
        if (!item) return '';
        const sign = item.momentum > 0 ? '+' : '';
        const rankColor =
          item.rankChange > 0 ? '#22C55E' : item.rankChange < 0 ? '#FF5630' : '#919EAB';
        const arrow = item.rankChange > 0 ? '↑' : item.rankChange < 0 ? '↓' : '—';
        return [
          '<div style="padding:8px 12px;font-size:13px;">',
          `<b>${item.name}</b><br/>`,
          `动量值：<span style="color:${item.momentum >= 0 ? '#FF5630' : '#22C55E'}">${sign}${item.momentum.toFixed(2)}%</span><br/>`,
          `当前排名：${item.rank} <span style="color:${rankColor}">${arrow} ${Math.abs(item.rankChange)}</span><br/>`,
          `上期排名：${item.prevRank}`,
          '</div>',
        ].join('');
      },
    },
    legend: { show: false },
  });

  const chartHeight = Math.max(320, sorted.length * 28);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">行业动量排名</Typography>
          <Select size="small" value={limit} onChange={handleLimitChange} sx={{ minWidth: 100 }}>
            {LIMIT_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {LIMIT_LABELS[opt]}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : sorted.length === 0 ? (
          <Box
            sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.disabled">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="bar" series={series} options={chartOptions} sx={{ height: chartHeight }} />
        )}
      </CardContent>
    </Card>
  );
}
