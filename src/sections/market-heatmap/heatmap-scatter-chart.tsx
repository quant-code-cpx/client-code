import type { SectorFlowItem } from 'src/api/market';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

import { toYi, getScatterColor } from './utils';

// ----------------------------------------------------------------------

type Props = {
  sectors: SectorFlowItem[];
  topGainersByGroup: Record<string, Array<{ name: string; tsCode: string; pctChg: number }>>;
  topInflowByGroup: Record<
    string,
    Array<{ name: string; tsCode: string; mainNetInflow: number }>
  >;
  loading: boolean;
  error: string;
  onSectorClick?: (sector: SectorFlowItem) => void;
};

// ----------------------------------------------------------------------

export function HeatmapScatterChart({
  sectors,
  topGainersByGroup,
  topInflowByGroup,
  loading,
  error,
  onSectorClick,
}: Props) {
  const theme = useTheme();

  const series = useMemo(
    () =>
      sectors.map((sector) => ({
        name: sector.name,
        data: [
          [
            sector.pctChange ?? 0,
            toYi(sector.netAmount),
            Math.max(toYi(sector.amount), 1),
          ],
        ] as [number, number, number][],
      })),
    [sectors]
  );

  const colors = useMemo(() => sectors.map((s) => getScatterColor(s.netAmount ?? 0)), [sectors]);

  const chartOptions = useChart({
    chart: {
      type: 'bubble',
      toolbar: { show: true, tools: { zoom: true, pan: true, reset: true } },
      zoom: { enabled: true },
      events: {
        dataPointSelection: (
          _e: any,
          _chart: any,
          opts: any
        ) => {
          const sectorIndex = (opts as { seriesIndex: number }).seriesIndex;
          if (sectorIndex >= 0 && onSectorClick) {
            onSectorClick(sectors[sectorIndex]);
          }
        },
      },
    },
    xaxis: {
      type: 'numeric',
      title: { text: '涨跌幅 (%)' },
      labels: { formatter: (v: string) => `${Number(v).toFixed(2)}%` },
      axisBorder: { show: true },
    },
    yaxis: {
      title: { text: '资金净流入 (亿元)' },
      labels: { formatter: (v: number) => `${v.toFixed(1)}亿` },
    },
    plotOptions: {
      bubble: {
        minBubbleRadius: 8,
        maxBubbleRadius: 40,
      },
    },
    annotations: {
      xaxis: [
        {
          x: 0,
          borderColor: theme.palette.divider,
          strokeDashArray: 4,
          label: { text: '涨跌分界', style: { fontSize: '11px' } },
        },
      ],
      yaxis: [
        {
          y: 0,
          borderColor: theme.palette.divider,
          strokeDashArray: 4,
          label: { text: '资金分界', style: { fontSize: '11px' } },
        },
      ],
    },
    colors,
    dataLabels: {
      enabled: true,
      formatter: (_val: any, opts: any) => {
        const idx = (opts as { seriesIndex: number }).seriesIndex;
        return sectors[idx]?.name ?? '';
      },
      style: { fontSize: '10px', fontWeight: 600, colors: ['#fff'] },
    },
    legend: { show: false },
    tooltip: {
      custom: ({ seriesIndex }: { seriesIndex: number }) => {
        const sector = sectors[seriesIndex];
        if (!sector) return '';

        const topGainers = topGainersByGroup[sector.name] ?? [];
        const topInflows = topInflowByGroup[sector.name] ?? [];
        const netYi = toYi(sector.netAmount);
        const amountYi = toYi(sector.amount);
        const chgColor = (sector.pctChange ?? 0) >= 0 ? '#F44336' : '#4CAF50';
        const flowColor = netYi >= 0 ? '#F44336' : '#4CAF50';

        return `
          <div style="padding:12px;min-width:280px;font-size:13px;line-height:1.6">
            <div style="font-weight:700;font-size:15px;margin-bottom:6px">${sector.name}</div>
            <div>
              涨跌幅: <span style="color:${chgColor};font-weight:600">${(sector.pctChange ?? 0) >= 0 ? '+' : ''}${(sector.pctChange ?? 0).toFixed(2)}%</span>
              &nbsp;&nbsp;
              净流入: <span style="color:${flowColor};font-weight:600">${netYi >= 0 ? '+' : ''}${netYi.toFixed(2)}亿</span>
            </div>
            <div>成交额: ${amountYi.toFixed(1)}亿 &nbsp; 上涨 ${sector.upCount ?? 0} 家 / 下跌 ${sector.downCount ?? 0} 家</div>
            ${sector.leadStock ? `<div>领涨: ${sector.leadStock} ${sector.leadPctChg != null ? `${sector.leadPctChg >= 0 ? '+' : ''}${sector.leadPctChg.toFixed(2)}%` : ''}</div>` : ''}
            ${
              topGainers.length > 0
                ? `
              <div style="margin-top:8px;border-top:1px solid #eee;padding-top:6px">
                <div style="font-weight:600;margin-bottom:2px">涨幅前5:</div>
                ${topGainers
                  .slice(0, 5)
                  .map(
                    (s, i) =>
                      `<div>${i + 1}. ${s.name} <span style="color:${(s.pctChg ?? 0) >= 0 ? '#F44336' : '#4CAF50'}">${(s.pctChg ?? 0) >= 0 ? '+' : ''}${(s.pctChg ?? 0).toFixed(2)}%</span></div>`
                  )
                  .join('')}
              </div>
            `
                : ''
            }
            ${
              topInflows.length > 0
                ? `
              <div style="margin-top:6px;border-top:1px solid #eee;padding-top:6px">
                <div style="font-weight:600;margin-bottom:2px">资金流入前5:</div>
                ${topInflows
                  .slice(0, 5)
                  .map(
                    (s, i) =>
                      `<div>${i + 1}. ${s.name} <span style="color:#F44336">+${((s.mainNetInflow ?? 0) / 10000).toFixed(2)}亿</span></div>`
                  )
                  .join('')}
              </div>
            `
                : ''
            }
            <div style="margin-top:8px;color:#999;font-size:11px">点击查看行业详情 →</div>
          </div>
        `;
      },
    },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          行业资金-涨跌散点图
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && <Skeleton variant="rectangular" sx={{ borderRadius: 1 }} height={500} />}

        {!loading && !error && series.length === 0 && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}

        {!loading && !error && series.length > 0 && (
          <Box sx={{ position: 'relative' }}>
            <Chart type="bubble" series={series} options={chartOptions} sx={{ height: 500 }} />

            {/* 四象限标签 */}
            <Box
              sx={{
                position: 'absolute',
                top: 40,
                right: 16,
                opacity: 0.15,
                pointerEvents: 'none',
                textAlign: 'right',
              }}
            >
              <Typography variant="h6" color="error.main">
                强势区 ↗
              </Typography>
              <Typography variant="caption" color="text.secondary">
                涨 + 资金流入
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: 40,
                left: 60,
                opacity: 0.15,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h6" color="warning.main">
                抄底区 ↖
              </Typography>
              <Typography variant="caption" color="text.secondary">
                跌 + 资金流入
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                bottom: 40,
                right: 16,
                opacity: 0.15,
                pointerEvents: 'none',
                textAlign: 'right',
              }}
            >
              <Typography variant="h6" sx={{ color: 'warning.dark' }}>
                出货区 ↘
              </Typography>
              <Typography variant="caption" color="text.secondary">
                涨 + 资金流出
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                bottom: 40,
                left: 60,
                opacity: 0.15,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h6" color="success.main">
                弱势区 ↙
              </Typography>
              <Typography variant="caption" color="text.secondary">
                跌 + 资金流出
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
