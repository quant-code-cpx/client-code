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

import { toYi, yuanToYi, getScatterColor } from './utils';

// ----------------------------------------------------------------------

type Props = {
  sectors: SectorFlowItem[];
  topGainersByGroup: Record<string, Array<{ name: string; tsCode: string; pctChg: number }>>;
  topInflowByGroup: Record<string, Array<{ name: string; tsCode: string; mainNetInflow: number }>>;
  loading: boolean;
  error: string;
  onSectorClick?: (sector: SectorFlowItem) => void;
};

// 构建 tooltip HTML 字符串
function buildTooltipHtml(
  sector: SectorFlowItem,
  topGainers: Array<{ name: string; pctChg: number }>,
  topInflows: Array<{ name: string; mainNetInflow: number }>
): string {
  // netAmount 单位是元，转亿元需除以 1亿（1e8）
  const netYi = yuanToYi(sector.netAmount);
  // amount 单位是万元，转亿元除以 1万（1e4）
  const amountYi = toYi(sector.amount);
  const chgColor = (sector.pctChange ?? 0) >= 0 ? '#F44336' : '#4CAF50';
  const flowColor = netYi >= 0 ? '#F44336' : '#4CAF50';

  const gainersHtml =
    topGainers.length > 0
      ? `<div style="margin-top:8px;border-top:1px solid rgba(0,0,0,0.1);padding-top:6px">
          <div style="font-weight:600;margin-bottom:2px">涨幅前5:</div>
          ${topGainers
            .slice(0, 5)
            .map(
              (s, i) =>
                `<div>${i + 1}. ${s.name} <span style="color:${(s.pctChg ?? 0) >= 0 ? '#F44336' : '#4CAF50'}">${(s.pctChg ?? 0) >= 0 ? '+' : ''}${(s.pctChg ?? 0).toFixed(2)}%</span></div>`
            )
            .join('')}
        </div>`
      : '';

  const inflowsHtml =
    topInflows.length > 0
      ? `<div style="margin-top:6px;border-top:1px solid rgba(0,0,0,0.1);padding-top:6px">
          <div style="font-weight:600;margin-bottom:2px">资金流入前5:</div>
          ${topInflows
            .slice(0, 5)
            .map((s, i) => {
              // mainNetInflow 单位是万元，与 toYi 匹配
              const inflowYi = toYi(s.mainNetInflow ?? 0);
              return `<div>${i + 1}. ${s.name} <span style="color:${inflowYi >= 0 ? '#F44336' : '#4CAF50'}">${inflowYi >= 0 ? '+' : ''}${inflowYi.toFixed(2)}亿</span></div>`;
            })
            .join('')}
        </div>`
      : '';

  return `
    <div style="padding:12px;min-width:260px;font-size:13px;line-height:1.7;max-height:400px;overflow:auto">
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">${sector.name}</div>
      <div>
        涨跌幅: <span style="color:${chgColor};font-weight:600">${(sector.pctChange ?? 0) >= 0 ? '+' : ''}${(sector.pctChange ?? 0).toFixed(2)}%</span>
        &nbsp;&nbsp;
        净流入: <span style="color:${flowColor};font-weight:600">${netYi >= 0 ? '+' : ''}${netYi.toFixed(2)}亿</span>
      </div>
      <div>成交额: ${amountYi.toFixed(1)}亿 &nbsp; 上涨 ${sector.upCount ?? 0} 家 / 下跌 ${sector.downCount ?? 0} 家</div>
      ${sector.leadStock ? `<div>领涨: ${sector.leadStock} ${sector.leadPctChg != null ? `${sector.leadPctChg >= 0 ? '+' : ''}${sector.leadPctChg.toFixed(2)}%` : ''}</div>` : ''}
      ${gainersHtml}
      ${inflowsHtml}
      <div style="margin-top:8px;color:#999;font-size:12px">点击查看行业详情 →</div>
    </div>
  `;
}

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

  // ── 性能优化：按颜色分组 ──────────────────────────────────────
  // 原来每个行业一个 series（~60 个）→ 现在按颜色分组，最多 9 个 series
  // ApexCharts 每个 series 都有独立 DOM 开销，减少 series 数量可大幅提升渲染速度
  const { series, pointToSector } = useMemo(() => {
    // 按颜色分组
    const colorGroupMap = new Map<string, SectorFlowItem[]>();
    for (const s of sectors) {
      const color = getScatterColor(s.netAmount ?? 0);
      if (!colorGroupMap.has(color)) colorGroupMap.set(color, []);
      colorGroupMap.get(color)!.push(s);
    }

    const seriesList: Array<{ name: string; color: string; data: [number, number, number][] }> = [];
    const sectorMatrix: SectorFlowItem[][] = []; // [seriesIndex][dataPointIndex]

    colorGroupMap.forEach((items, color) => {
      seriesList.push({
        name: color,
        color,
        data: items.map(
          (s) =>
            [
              s.pctChange ?? 0,
              yuanToYi(s.netAmount), // Y：netAmount 单位元 → 亿
              Math.max(toYi(s.amount), 1), // Z：amount 单位万元 → 亿
            ] as [number, number, number]
        ),
      });
      sectorMatrix.push(items);
    });

    return { series: seriesList, pointToSector: sectorMatrix };
  }, [sectors]);

  // 轴范围：用第 90 百分位数计算，避免极端値把其他点压到中心
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (!sectors.length) return { xMin: -5, xMax: 5, yMin: -20, yMax: 20 };

    const absXArr = sectors.map((s) => Math.abs(s.pctChange ?? 0)).sort((a, b) => a - b);
    const absYArr = sectors.map((s) => Math.abs(yuanToYi(s.netAmount ?? 0))).sort((a, b) => a - b);

    // 90 百分位限制极端影响，并保证最小显示范围
    const p90X = absXArr[Math.floor(absXArr.length * 0.9)] ?? 3;
    const p90Y = absYArr[Math.floor(absYArr.length * 0.9)] ?? 10;

    const xPad = Math.max(p90X * 1.5, 3);
    const yPad = Math.max(p90Y * 1.5, 10);

    return { xMin: -xPad, xMax: xPad, yMin: -yPad, yMax: yPad };
  }, [sectors]);

  const chartOptions = useChart({
    chart: {
      type: 'bubble',
      toolbar: { show: true, tools: { zoom: true, pan: true, reset: true } },
      zoom: { enabled: true },
      animations: { enabled: false },
      events: {
        dataPointSelection: (_e: unknown, _chart: unknown, opts?: unknown) => {
          const o = opts as { seriesIndex: number; dataPointIndex: number } | undefined;
          if (!o) return;
          const sector = pointToSector[o.seriesIndex]?.[o.dataPointIndex];
          if (sector && onSectorClick) onSectorClick(sector);
        },
      },
    },
    xaxis: {
      type: 'numeric',
      min: xMin,
      max: xMax,
      title: { text: '涨跌幅 (%)' },
      labels: { formatter: (v: string) => `${Number(v).toFixed(1)}%` },
      axisBorder: { show: true },
    },
    yaxis: {
      min: yMin,
      max: yMax,
      title: { text: '资金净流入 (亿元)' },
      labels: { formatter: (v: number) => `${v.toFixed(0)}亿` },
    },
    plotOptions: {
      bubble: {
        minBubbleRadius: 8,
        maxBubbleRadius: 36,
      },
    },
    annotations: {
      xaxis: [
        {
          x: 0,
          borderColor: theme.palette.text.disabled,
          strokeDashArray: 0,
          borderWidth: 1.5,
        },
      ],
      yaxis: [
        {
          y: 0,
          borderColor: theme.palette.text.disabled,
          strokeDashArray: 0,
          borderWidth: 1.5,
        },
      ],
    },
    dataLabels: {
      enabled: true,
      formatter: (_val: unknown, opts?: unknown): string => {
        const o = opts as { seriesIndex: number; dataPointIndex: number } | undefined;
        const sector = o ? pointToSector[o.seriesIndex]?.[o.dataPointIndex] : undefined;
        return sector?.name ?? '';
      },
      style: { fontSize: '12px', fontWeight: '600', colors: ['#fff'] },
      dropShadow: { enabled: true, blur: 2, opacity: 0.6 },
    },
    legend: { show: false },
    tooltip: {
      custom: ({
        seriesIndex,
        dataPointIndex,
      }: {
        seriesIndex: number;
        dataPointIndex: number;
      }) => {
        const sector = pointToSector[seriesIndex]?.[dataPointIndex];
        if (!sector) return '';
        return buildTooltipHtml(
          sector,
          topGainersByGroup[sector.name] ?? [],
          topInflowByGroup[sector.name] ?? []
        );
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

        {loading && <Skeleton variant="rectangular" sx={{ borderRadius: 1 }} height={620} />}

        {!loading && !error && series.length === 0 && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}

        {!loading && !error && series.length > 0 && (
          <Box sx={{ position: 'relative' }}>
            <Chart type="bubble" series={series} options={chartOptions} sx={{ height: 620 }} />

            {/* 四象限标签 — 绝对定位于图表内四个角 */}
            <Box
              sx={{
                position: 'absolute',
                top: 44,
                right: 20,
                opacity: 0.25,
                pointerEvents: 'none',
                textAlign: 'right',
              }}
            >
              <Typography variant="subtitle2" color="error.main" fontWeight={700}>
                ↗ 强势
              </Typography>
              <Typography variant="caption" color="text.disabled">
                涨 + 资金流入
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: 44,
                left: 64,
                opacity: 0.25,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="subtitle2" color="warning.main" fontWeight={700}>
                ↖ 抄底
              </Typography>
              <Typography variant="caption" color="text.disabled">
                跌 + 资金流入
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                bottom: 44,
                right: 20,
                opacity: 0.25,
                pointerEvents: 'none',
                textAlign: 'right',
              }}
            >
              <Typography variant="subtitle2" sx={{ color: 'warning.dark' }} fontWeight={700}>
                ↘ 出货
              </Typography>
              <Typography variant="caption" color="text.disabled">
                涨 + 资金流出
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                bottom: 44,
                left: 64,
                opacity: 0.25,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="subtitle2" color="success.main" fontWeight={700}>
                ↙ 弱势
              </Typography>
              <Typography variant="caption" color="text.disabled">
                跌 + 资金流出
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
