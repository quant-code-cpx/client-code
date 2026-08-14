import type { SectorFlowItem } from 'src/api/market';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

import { HeatmapScatterInsightPanel } from './heatmap-scatter-insight-panel';
import { signedScatterYi, signedScatterPercent } from './heatmap-scatter-formatters';
import {
  yuanToYi,
  getScatterColor,
  getScatterSectorKey,
  pickScatterLabelKeys,
  hasScatterCoordinates,
  computeLinearAxisBounds,
  buildScatterInsightLists,
} from './utils';

type Props = {
  sectors: SectorFlowItem[];
  topGainersByGroup: Record<string, Array<{ name: string; tsCode: string; pctChg: number }>>;
  topInflowByGroup: Record<string, Array<{ name: string; tsCode: string; mainNetInflow: number }>>;
  loading: boolean;
  error: string;
  onSectorClick?: (sector: SectorFlowItem) => void;
};

type TooltipPalette = {
  muted: string;
  border: string;
  positive: string;
  negative: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tooltipColor(value: number | null, palette: TooltipPalette): string {
  if (value == null || !Number.isFinite(value)) return palette.muted;
  if (value > 0) return palette.positive;
  if (value < 0) return palette.negative;
  return palette.muted;
}

// 构建 tooltip HTML 字符串
function buildTooltipHtml(
  sector: SectorFlowItem,
  topGainers: Array<{ name: string; pctChg: number }>,
  topInflows: Array<{ name: string; mainNetInflow: number }>,
  palette: TooltipPalette
): string {
  const netYi = Number.isFinite(sector.netAmount) ? yuanToYi(sector.netAmount) : null;
  const chgValue = Number.isFinite(sector.pctChange) ? sector.pctChange : null;
  const chgColor = tooltipColor(chgValue, palette);
  const flowTextColor = tooltipColor(netYi, palette);

  const gainersHtml =
    topGainers.length > 0
      ? `<div style="margin-top:8px;border-top:1px solid ${palette.border};padding-top:6px">
          <div style="font-weight:600;margin-bottom:2px">涨幅前5:</div>
          ${topGainers
            .slice(0, 5)
            .map((stock, index) => {
              const stockPct = stock.pctChg;
              return `<div>${index + 1}. ${escapeHtml(stock.name)} <span style="color:${tooltipColor(stockPct, palette)}">${signedScatterPercent(stockPct)}</span></div>`;
            })
            .join('')}
        </div>`
      : '';

  const inflowsHtml =
    topInflows.length > 0
      ? `<div style="margin-top:6px;border-top:1px solid ${palette.border};padding-top:6px">
          <div style="font-weight:600;margin-bottom:2px">资金流入前5:</div>
          ${topInflows
            .slice(0, 5)
            .map((stock, index) => {
              // mainNetInflow 单位是万元，与 toYi 匹配
              const inflowYi = stock.mainNetInflow / 10_000;
              return `<div>${index + 1}. ${escapeHtml(stock.name)} <span style="color:${tooltipColor(inflowYi, palette)}">${inflowYi >= 0 ? '+' : ''}${inflowYi.toFixed(2)}亿</span></div>`;
            })
            .join('')}
        </div>`
      : '';

  return `
    <div style="padding:12px;min-width:260px;font-size:13px;line-height:1.7;max-height:400px;overflow:auto">
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">${escapeHtml(sector.name ?? sector.tsCode)}</div>
      <div>
        涨跌幅: <span style="color:${chgColor};font-weight:600">${signedScatterPercent(chgValue)}</span>
        &nbsp;&nbsp;
        净流入: <span style="color:${flowTextColor};font-weight:600">${signedScatterYi(sector.netAmount)}</span>
      </div>
      ${gainersHtml}
      ${inflowsHtml}
    </div>
  `;
}

function LegendItem({ color, label }: { color: 'error' | 'success' | 'text'; label: string }) {
  const channelByColor = {
    error: 'error',
    success: 'success',
    text: 'grey',
  } as const;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={(theme) => {
          const channel =
            color === 'text'
              ? theme.vars.palette.grey['500Channel']
              : theme.vars.palette[channelByColor[color]].mainChannel;

          return {
            width: 9,
            height: 9,
            borderRadius: '50%',
            bgcolor:
              color === 'text'
                ? 'text.disabled'
                : `${channelByColor[color] === 'error' ? 'error' : 'success'}.main`,
            boxShadow: `0 0 0 4px ${varAlpha(channel, 0.12)}`,
          };
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
        {label}
      </Typography>
    </Stack>
  );
}

function QuadrantLabel({
  sx,
  tone,
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
  tone: 'error' | 'success' | 'warning';
  sx: Record<string, unknown>;
}) {
  return (
    <Box
      sx={{
        ...sx,
        opacity: 0.35,
        position: 'absolute',
        pointerEvents: 'none',
      }}
    >
      <Typography variant="subtitle2" color={`${tone}.main`} fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 12 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

export function HeatmapScatterChart({
  sectors,
  topGainersByGroup,
  topInflowByGroup,
  loading,
  error,
  onSectorClick,
}: Props) {
  const theme = useTheme();
  const scatterSectors = useMemo(() => sectors.filter(hasScatterCoordinates), [sectors]);

  const labelKeys = useMemo(() => pickScatterLabelKeys(scatterSectors, 8), [scatterSectors]);
  // 五组索引完整保留当前散点集合；每个板块至少能经方向列表或中心簇列表访问。
  const insights = useMemo(
    () => buildScatterInsightLists(scatterSectors, scatterSectors.length),
    [scatterSectors]
  );

  const tooltipPalette = useMemo<TooltipPalette>(
    () => ({
      muted: theme.vars.palette.text.secondary,
      border: theme.vars.palette.divider,
      positive: theme.vars.palette.error.main,
      negative: theme.vars.palette.success.main,
    }),
    [theme]
  );
  const colorPalette = useMemo(
    () => ({
      strongNegative: theme.vars.palette.success.dark,
      negative: theme.vars.palette.success.main,
      weakNegative: theme.vars.palette.success.light,
      neutral: theme.vars.palette.grey[500],
      weakPositive: theme.vars.palette.error.light,
      positive: theme.vars.palette.error.main,
      strongPositive: theme.vars.palette.error.dark,
    }),
    [theme]
  );

  // ── 性能优化：按颜色分组 ──────────────────────────────────────
  // 原来每个行业一个 series（~60 个）→ 现在按颜色分组，最多 9 个 series
  // ApexCharts 每个 series 都有独立 DOM 开销，减少 series 数量可大幅提升渲染速度
  const { series, pointToSector } = useMemo(() => {
    // 按颜色分组
    const colorGroupMap = new Map<string, SectorFlowItem[]>();
    for (const sector of scatterSectors) {
      const color = getScatterColor(sector.netAmount, colorPalette);
      if (!colorGroupMap.has(color)) colorGroupMap.set(color, []);
      colorGroupMap.get(color)!.push(sector);
    }

    const seriesList: Array<{ name: string; color: string; data: [number, number, number][] }> = [];
    const sectorMatrix: SectorFlowItem[][] = []; // [seriesIndex][dataPointIndex]

    colorGroupMap.forEach((items, color) => {
      seriesList.push({
        name: color,
        color,
        data: items.map(
          (sector) =>
            [
              sector.pctChange as number,
              (sector.netAmount as number) / 100_000_000, // Y：仅做元→亿元单位换算，不预先舍入
              1, // 接口没有可信的规模字段，所有气泡使用固定尺寸。
            ] as [number, number, number]
        ),
      });
      sectorMatrix.push(items);
    });

    return { series: seriesList, pointToSector: sectorMatrix };
  }, [scatterSectors, colorPalette]);

  // 全量线性轴：真实最小/最大值 + 8% padding，不裁点、不改变 X/Y 原值。
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const xBounds = computeLinearAxisBounds(
      scatterSectors.map((sector) => sector.pctChange),
      { min: -5, max: 5 }
    );
    const yBounds = computeLinearAxisBounds(
      scatterSectors.map((sector) => sector.netAmount / 100_000_000),
      { min: -20, max: 20 }
    );

    return {
      xMin: xBounds.min,
      xMax: xBounds.max,
      yMin: yBounds.min,
      yMax: yBounds.max,
    };
  }, [scatterSectors]);

  const chartOptions = useChart({
    chart: {
      type: 'bubble',
      toolbar: { show: true, tools: { zoom: true, pan: true, reset: true } },
      zoom: { enabled: true },
      animations: { enabled: false },
      events: {
        dataPointSelection: (_e: unknown, _chart: unknown, opts?: unknown) => {
          const chartPoint = opts as { seriesIndex: number; dataPointIndex: number } | undefined;
          if (!chartPoint) return;
          const sector = pointToSector[chartPoint.seriesIndex]?.[chartPoint.dataPointIndex];
          if (sector && onSectorClick) onSectorClick(sector);
        },
      },
    },
    colors: series.map((item) => item.color),
    xaxis: {
      type: 'numeric',
      min: xMin,
      max: xMax,
      tickAmount: 8,
      title: { text: '涨跌幅 (%)' },
      labels: { formatter: (value: string) => `${Number(value).toFixed(1)}%` },
      axisBorder: { show: true, color: theme.vars.palette.divider },
      axisTicks: { show: true, color: theme.vars.palette.divider },
      crosshairs: { show: true, stroke: { color: theme.vars.palette.text.disabled, width: 1 } },
    },
    yaxis: {
      min: yMin,
      max: yMax,
      tickAmount: 6,
      title: { text: '资金净流入 (亿元)' },
      labels: { formatter: (value: number) => `${value.toFixed(0)}亿` },
    },
    plotOptions: {
      bubble: {
        minBubbleRadius: 3,
        maxBubbleRadius: 14,
      },
    },
    annotations: {
      xaxis: [
        {
          x: 0,
          borderColor: theme.vars.palette.text.disabled,
          strokeDashArray: 0,
          borderWidth: 1.3,
        },
      ],
      yaxis: [
        {
          y: 0,
          borderColor: theme.vars.palette.text.disabled,
          strokeDashArray: 0,
          borderWidth: 1.3,
        },
      ],
    },
    fill: { opacity: 0.52 },
    stroke: { width: 1.6, colors: [theme.vars.palette.background.paper] },
    states: {
      hover: { filter: { type: 'lighten' } },
      active: { allowMultipleDataPointsSelection: false, filter: { type: 'darken' } },
    },
    markers: {
      strokeWidth: 1,
      strokeColors: theme.vars.palette.background.paper,
      hover: { sizeOffset: 3 },
    },
    dataLabels: {
      enabled: true,
      formatter: (_value: unknown, opts?: unknown): string => {
        const chartPoint = opts as { seriesIndex: number; dataPointIndex: number } | undefined;
        const sector = chartPoint
          ? pointToSector[chartPoint.seriesIndex]?.[chartPoint.dataPointIndex]
          : undefined;
        if (!sector || !labelKeys.has(getScatterSectorKey(sector))) return '';
        return sector.name ?? sector.tsCode;
      },
      offsetY: -12,
      style: { fontSize: '12px', fontWeight: '700', colors: [theme.vars.palette.text.primary] },
      background: {
        enabled: true,
        opacity: 0.94,
        padding: 4,
        borderRadius: 3,
        borderWidth: 1,
        foreColor: theme.vars.palette.text.primary,
        borderColor: theme.vars.palette.divider,
      },
      dropShadow: { enabled: false },
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
          topGainersByGroup[sector.name ?? sector.tsCode] ?? [],
          topInflowByGroup[sector.name ?? sector.tsCode] ?? [],
          tooltipPalette
        );
      },
    },
    grid: {
      borderColor: theme.vars.palette.divider,
      padding: { top: 16, right: 12, bottom: 0, left: 8 },
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    responsive: [
      {
        breakpoint: theme.breakpoints.values.md,
        options: {
          chart: { toolbar: { show: false } },
          dataLabels: { enabled: false },
          plotOptions: { bubble: { minBubbleRadius: 4, maxBubbleRadius: 14 } },
        },
      },
    ],
  });

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h6">行业资金-涨跌散点图</Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <LegendItem color="error" label="净流入" />
            <LegendItem color="success" label="净流出" />
            <LegendItem color="text" label="低波动" />
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && <Skeleton variant="rectangular" sx={{ borderRadius: 1 }} height={620} />}

        {!loading && !error && series.length === 0 && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            {sectors.length === 0 ? '暂无数据' : '暂无同时具备涨跌幅与净流入的数据'}
          </Typography>
        )}

        {!loading && !error && series.length > 0 && (
          <Box
            sx={{
              gap: { xs: 2, lg: 2.5 },
              display: 'grid',
              alignItems: 'stretch',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' },
            }}
          >
            <Box sx={{ position: 'relative', minWidth: 0 }}>
              <Chart
                type="bubble"
                series={series}
                options={chartOptions}
                sx={{
                  height: { xs: 520, md: 600 },
                  '& .apexcharts-marker': {
                    cursor: onSectorClick ? 'pointer' : 'default',
                  },
                  '& .apexcharts-datalabel': {
                    pointerEvents: 'none',
                  },
                }}
              />

              {/* 四象限标签 — 绝对定位于图表内四个角 */}
              <QuadrantLabel
                title="↗ 强势"
                subtitle="涨 + 资金流入"
                tone="error"
                sx={{ top: 46, right: 20, textAlign: 'right' }}
              />
              <QuadrantLabel
                title="↖ 抄底"
                subtitle="跌 + 资金流入"
                tone="warning"
                sx={{ top: 46, left: 64 }}
              />
              <QuadrantLabel
                title="↘ 出货"
                subtitle="涨 + 资金流出"
                tone="warning"
                sx={{ right: 20, bottom: 42, textAlign: 'right' }}
              />
              <QuadrantLabel
                title="↙ 弱势"
                subtitle="跌 + 资金流出"
                tone="success"
                sx={{ bottom: 42, left: 64 }}
              />
            </Box>

        <HeatmapScatterInsightPanel
              sectors={scatterSectors}
              insights={insights}
              onSectorClick={onSectorClick}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
