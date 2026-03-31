import type { StockFlowDetailItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { fetchStockFlowDetail } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

/** 千元 → 万元 */
function toWan(qianYuan: number): number {
  return +(qianYuan / 10).toFixed(2);
}

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  tsCode: string;
  stockName: string;
  onClose: () => void;
};

export function StockFlowDetailDialog({ open, tsCode, stockName, onClose }: Props) {
  const [data, setData] = useState<StockFlowDetailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !tsCode) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchStockFlowDetail({ ts_code: tsCode, days: 20 })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载个股资金明细失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, tsCode]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const mainNet = data.map((d) => toWan(d.mainNetInflow));
  const retailNet = data.map((d) => toWan(d.retailNetInflow));
  const totalNet = data.map((d) => toWan(d.netMfAmount));

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 2,
      },
    },
    xaxis: {
      categories,
      labels: { rotate: -30 },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => `${v.toFixed(0)}万`,
      },
    },
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
    colors: ['#FF4560', '#00B746', '#008FFB'],
  });

  const series = [
    { name: '主力净流入(万)', type: 'column', data: mainNet },
    { name: '散户净流入(万)', type: 'column', data: retailNet },
    { name: '净流入总额(万)', type: 'line', data: totalNet },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {stockName}&nbsp;({tsCode})&nbsp;资金流明细
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 320 }} />
        )}
      </DialogContent>
    </Dialog>
  );
}
