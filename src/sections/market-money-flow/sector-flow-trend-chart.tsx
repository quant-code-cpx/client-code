import type { SectorFlowTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate as fmtDate } from 'src/utils/format-time';

import { fetchSectorFlowTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

/** 元 → 亿元（SectorFlowTrendItemDto 金额单位为元），缺失值保留为断点。 */
function toYi(yuan: number | null): number | null {
  return yuan == null ? null : +(yuan / 1e8).toFixed(2);
}

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
  sectorName: string;
  contentType?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  days?: number;
  open: boolean;
};

export function SectorFlowTrendChart({ tsCode, sectorName, contentType, days = 20, open }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<SectorFlowTrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !tsCode) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSectorFlowTrend({ ts_code: tsCode, content_type: contentType, days })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载板块资金趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tsCode, contentType, days, open]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const dailyNet = data.map((d) => toYi(d.netAmount));
  const cumulativeNet = data.map((d) => toYi(d.cumulativeNet));

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: theme.palette.success.main },
            { from: 0, to: 9999999, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: {
      categories,
      labels: { rotate: -30 },
    },
    yaxis: [
      {
        title: { text: '每日净流入(亿)' },
        labels: {
          formatter: (v: number) => `${v.toFixed(1)}亿`,
        },
      },
      {
        opposite: true,
        title: { text: '累计净流入(亿)' },
        labels: {
          formatter: (v: number) => `${v.toFixed(1)}亿`,
        },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
  });

  const series = [
    { name: '每日净流入', type: 'column', data: dailyNet },
    { name: '累计净流入', type: 'line', data: cumulativeNet },
  ];

  return (
    <Collapse in={open} unmountOnExit>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {sectorName}板块资金流趋势
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Skeleton variant="rectangular" height={280} />
          ) : data.length === 0 ? (
            <Box
              sx={{
                height: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">暂无数据</Typography>
            </Box>
          ) : (
            <Chart type="line" series={series} options={chartOptions} sx={{ height: 280 }} />
          )}
        </CardContent>
      </Card>
    </Collapse>
  );
}
