import type { HeatmapStockItem, HeatmapDataResult } from 'src/api/market';

import { useRef, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchHeatmapData } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type SizeBy = 'totalMv' | 'circMv' | 'amount';
type GroupBy = 'industry' | 'market';

type Props = {
  tradeDate?: string;
  groupBy: GroupBy;
  sizeBy: SizeBy;
};

function getHeatmapColor(pctChg: number): string {
  if (pctChg <= -7) return '#00695C';
  if (pctChg <= -3) return '#2E7D32';
  if (pctChg <= -0.5) return '#66BB6A';
  if (pctChg < 0.5) return '#757575';
  if (pctChg < 3) return '#EF9A9A';
  if (pctChg < 7) return '#F44336';
  return '#B71C1C';
}

function formatLabel(pctChg: number): string {
  return `${pctChg >= 0 ? '+' : ''}${pctChg.toFixed(1)}%`;
}

type ApexChartCtx = {
  seriesIndex: number;
  dataPointIndex: number;
  w: { config: { series: Array<{ data: Array<{ x: string }> }> } };
};

export function HeatmapTreemapChart({ tradeDate, groupBy, sizeBy }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<HeatmapDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // keep a ref to all stocks so custom tooltip can look up pctChg/close/amount
  const stocksRef = useRef<HeatmapStockItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchHeatmapData({ trade_date: tradeDate });
        setData(result);
        stocksRef.current = result.stocks;
      } catch {
        setError('热力图数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tradeDate]);

  // Build series for ApexCharts treemap
  const series = (() => {
    if (!data?.stocks?.length) return [];

    // Sort by sizeBy desc, take top 300 to keep performance reasonable
    const topStocks = [...data.stocks]
      .sort((a, b) => (b[sizeBy] ?? 0) - (a[sizeBy] ?? 0))
      .slice(0, 300);

    if (groupBy === 'industry') {
      // Group by industry
      const grouped: Record<string, HeatmapStockItem[]> = {};
      for (const s of topStocks) {
        const key = s.industry || '其他';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      }
      return Object.entries(grouped).map(([industry, stocks]) => ({
        name: industry,
        data: stocks.map((s) => ({
          x: s.name,
          y: Math.max(s[sizeBy] ?? 1, 1),
          fillColor: getHeatmapColor(s.pctChg),
        })),
      }));
    }

    // Flat: single series
    return [
      {
        name: '全市场',
        data: topStocks.map((s) => ({
          x: s.name,
          y: Math.max(s[sizeBy] ?? 1, 1),
          fillColor: getHeatmapColor(s.pctChg),
        })),
      },
    ];
  })();

  const chartOptions = useChart({
    chart: {
      type: 'treemap',
      toolbar: { show: false },
      animations: { enabled: false },
      events: {
        dataPointSelection: (_e: unknown, _chart: unknown, opts: any) => {
          const { seriesIndex, dataPointIndex, w } = opts as ApexChartCtx;
          const point = w.config.series[seriesIndex]?.data[dataPointIndex];
          if (point) {
            const stock = stocksRef.current.find((s) => s.name === point.x);
            if (stock) {
              // Emit for parent to handle if needed — currently just logs
              console.log('Selected:', stock.tsCode, stock.name);
            }
          }
        },
      },
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false,
      },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '11px', fontWeight: 500, colors: ['#fff'] },

      formatter(text: string, _op: any) {
        const stock = stocksRef.current.find((s) => s.name === text);
        if (!stock) return text;
        return [text, formatLabel(stock.pctChg)];
      },
      offsetY: -4,
    },
    tooltip: {
      custom({ seriesIndex, dataPointIndex, w }: ApexChartCtx) {
        const point = w.config.series[seriesIndex]?.data[dataPointIndex];
        if (!point) return '';
        const stock = stocksRef.current.find((s) => s.name === point.x);
        if (!stock) return `<div style="padding:8px"><b>${point.x}</b></div>`;
        const pnlColor = stock.pctChg >= 0 ? '#F44336' : '#2E7D32';
        const amtBillion = (stock.amount / 100000).toFixed(2);
        return `
          <div style="padding:10px 14px;font-size:13px;line-height:1.8">
            <b style="font-size:14px">${stock.name}</b> <span style="color:#9e9e9e;font-size:11px">${stock.tsCode}</span><br/>
            <span style="color:#9e9e9e">行业：</span>${stock.industry}<br/>
            <span style="color:#9e9e9e">收盘价：</span>${stock.close.toFixed(2)}<br/>
            <span style="color:${pnlColor};font-weight:600">${formatLabel(stock.pctChg)}</span><br/>
            <span style="color:#9e9e9e">成交额：</span>${amtBillion} 亿
          </div>`;
      },
    },
    legend: { show: false },
    // colors required by useChart but overridden per-point via fillColor
    colors: [theme.palette.primary.main],
  });

  // Summary chips
  const dist = data?.distribution;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6">
            市场热力图
            {data?.tradeDate && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {data.tradeDate}
              </Typography>
            )}
          </Typography>

          {dist && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`涨停 ${dist.limitUp}`}
                sx={{ bgcolor: '#B71C1C', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`上涨 ${dist.upCount}`}
                sx={{ bgcolor: '#F44336', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`平盘 ${dist.flatCount}`}
                sx={{ bgcolor: '#757575', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`下跌 ${dist.downCount}`}
                sx={{ bgcolor: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`跌停 ${dist.limitDown}`}
                sx={{ bgcolor: '#00695C', color: '#fff', fontWeight: 700, fontSize: 11 }}
              />
            </Stack>
          )}
        </Stack>

        {loading && <Skeleton variant="rectangular" sx={{ borderRadius: 1 }} height={560} />}

        {!loading && error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {!loading && !error && series.length > 0 && (
          <Chart type="treemap" series={series} options={chartOptions} sx={{ height: 560 }} />
        )}

        {!loading && !error && series.length === 0 && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
