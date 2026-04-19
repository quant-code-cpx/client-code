import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate } from 'src/utils/format-time';

import { fetchHsgtFlow } from 'src/api/market';
import { fetchIndexDaily } from 'src/api/index-detail';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  return fmtTradeDate(d, 'MM-DD');
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** 计算 N 日移动均线（不足 N 个点时返回 null） */
function calcMA(values: number[], n: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < n - 1) return null;
    const sum = values.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0);
    return +(sum / n).toFixed(2);
  });
}

// ----------------------------------------------------------------------

export function DashboardHsgtFlow() {
  const [data, setData] = useState<HsgtTrendItem[]>([]);
  const [hs300PctChg, setHs300PctChg] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const startDate = daysAgoStr(50); // 多取一些天数，确保 MA10 有足够数据

    Promise.allSettled([
      fetchHsgtFlow({ days: 50 }),
      fetchIndexDaily({ ts_code: '000300.SH', start_date: startDate }),
    ]).then(([hsgtRes, hs300Res]) => {
      if (cancelled) return;

      if (hsgtRes.status === 'fulfilled') {
        setData(hsgtRes.value?.history ?? []);
      } else {
        setError('加载北向资金失败');
      }

      if (hs300Res.status === 'fulfilled') {
        const map = new Map<string, number>();
        for (const item of hs300Res.value) {
          // IndexDailyItem.tradeDate 是 YYYY-MM-DD，取前 10 位作 key
          map.set(item.tradeDate.slice(0, 10), item.pctChg ?? 0);
        }
        setHs300PctChg(map);
      }
      // HS300 加载失败不影响北向资金展示，静默处理

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // 只展示最近 30 个交易日
  const displayData = data.slice(-30);

  const categories = displayData.map((d) => fmtDate(d.tradeDate));
  // 后端 northMoney 单位为百万元，前端转为亿元展示
  const dailyValues = displayData.map((d) => +((d.northMoney ?? 0) / 100).toFixed(2));

  // 移动均线：先基于全量数据计算，再截取后 30 条（保证 MA10 在首日有值）
  const allDailyValues = data.map((d) => +((d.northMoney ?? 0) / 100).toFixed(2));
  const allMA5 = calcMA(allDailyValues, 5);
  const allMA10 = calcMA(allDailyValues, 10);
  const ma5Values = allMA5.slice(-30);
  const ma10Values = allMA10.slice(-30);

  // 沪深300涨跌幅（%）与北向资金日期对齐
  // HsgtFlowDto.tradeDate 是 date-time 格式，取前 10 位与 IndexDailyItem 的 YYYY-MM-DD 对齐
  const hs300Values = displayData.map((d) => {
    const v = hs300PctChg.get(d.tradeDate.slice(0, 10));
    return v !== undefined ? +v.toFixed(2) : null;
  });

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 1.5, 1.5, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '65%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: '#00B746' },
            { from: 0.001, to: 9999999, color: '#FF4560' },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: [
      {
        title: { text: '北向资金(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}` },
      },
      { show: false }, // MA5 共用左轴，不显示额外轴
      { show: false }, // MA10 共用左轴
      {
        opposite: true,
        title: { text: '沪深300涨跌(%)' },
        labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
        decimalsInFloat: 1,
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true, position: 'top' },
    colors: ['#637381', '#FFA500', '#2196F3', '#9C27B0'],
  });

  const series = [
    { name: '每日北向(亿)', type: 'bar', data: dailyValues },
    { name: 'MA5', type: 'line', data: ma5Values },
    { name: 'MA10', type: 'line', data: ma10Values },
    { name: '沪深300(%)', type: 'line', data: hs300Values },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          北向资金 · MA5/MA10 · 沪深300（近30日）
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={220} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 220 }} />
        )}
      </CardContent>
    </Card>
  );
}
