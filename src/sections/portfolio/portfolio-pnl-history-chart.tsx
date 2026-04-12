import type { PnlHistoryItem } from 'src/api/portfolio';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { getPnlHistory } from 'src/api/portfolio';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function toApiDate(yyyymmdd: string) {
  return yyyymmdd.replace(/-/g, '');
}

function defaultStartDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

interface PortfolioPnlHistoryChartProps {
  portfolioId: string;
}

export function PortfolioPnlHistoryChart({ portfolioId }: PortfolioPnlHistoryChartProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [data, setData] = useState<PnlHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPnlHistory({
        portfolioId,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
      });
      setData(res);
    } catch {
      setError('加载盈亏历史失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const categories = data.map((item) => item.date);
  const navSeries = data.map((item) => (item.nav !== null ? Number(item.nav.toFixed(4)) : null));

  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories, tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(4) } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => v.toFixed(4) },
    },
  });

  const series = [{ name: '净值', data: navSeries }];

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          净值历史
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <DatePicker
            label="开始日期"
            value={startDate ? dayjs(startDate) : null}
            onChange={(v) => setStartDate(v?.format('YYYY-MM-DD') ?? '')}
            format="YYYY-MM-DD"
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 190 } },
              field: { clearable: true },
            }}
          />
          <DatePicker
            label="结束日期"
            value={endDate ? dayjs(endDate) : null}
            onChange={(v) => setEndDate(v?.format('YYYY-MM-DD') ?? '')}
            format="YYYY-MM-DD"
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 190 } },
              field: { clearable: true },
            }}
          />
          <Button variant="outlined" size="small" onClick={fetchHistory}>
            查询
          </Button>
        </Box>

        {loading && <Skeleton variant="rectangular" height={300} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && data.length === 0 && (
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无净值数据
            </Typography>
          </Box>
        )}
        {!loading && !error && data.length > 0 && (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 300 }} />
        )}
      </CardContent>
    </Card>
  );
}
