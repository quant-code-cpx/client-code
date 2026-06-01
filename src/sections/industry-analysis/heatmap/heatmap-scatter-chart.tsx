import type { SectorFlowItem } from 'src/api/market';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

import {
  toYi,
  yuanToYi,
  getScatterColor,
  getScatterSectorKey,
  pickScatterLabelKeys,
  buildScatterInsightLists,
  type ScatterInsightLists,
} from './utils';

// ----------------------------------------------------------------------

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

type InsightValueMode = 'flow' | 'pct' | 'crowded';

type InsightSection = {
  title: string;
  rows: SectorFlowItem[];
  valueMode: InsightValueMode;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function signedPercent(value: number | null | undefined): string {
  const safeValue = value ?? 0;
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(2)}%`;
}

function signedYiFromYuan(value: number | null | undefined): string {
  const yiValue = yuanToYi(value);
  return `${yiValue >= 0 ? '+' : ''}${yiValue.toFixed(2)}亿`;
}

function flowColor(value: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

function pctColor(value: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

function tooltipColor(value: number, palette: TooltipPalette): string {
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
  // netAmount 单位是元，转亿元需除以 1亿（1e8）
  const netYi = yuanToYi(sector.netAmount);
  // amount 单位是万元，转亿元除以 1万（1e4）
  const amountYi = toYi(sector.amount);
  const chgValue = sector.pctChange ?? 0;
  const chgColor = tooltipColor(chgValue, palette);
  const flowTextColor = tooltipColor(netYi, palette);

  const gainersHtml =
    topGainers.length > 0
      ? `<div style="margin-top:8px;border-top:1px solid ${palette.border};padding-top:6px">
          <div style="font-weight:600;margin-bottom:2px">涨幅前5:</div>
          ${topGainers
            .slice(0, 5)
            .map((stock, index) => {
              const stockPct = stock.pctChg ?? 0;
              return `<div>${index + 1}. ${escapeHtml(stock.name)} <span style="color:${tooltipColor(stockPct, palette)}">${signedPercent(stockPct)}</span></div>`;
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
              const inflowYi = toYi(stock.mainNetInflow ?? 0);
              return `<div>${index + 1}. ${escapeHtml(stock.name)} <span style="color:${tooltipColor(inflowYi, palette)}">${inflowYi >= 0 ? '+' : ''}${inflowYi.toFixed(2)}亿</span></div>`;
            })
            .join('')}
        </div>`
      : '';

  return `
    <div style="padding:12px;min-width:260px;font-size:13px;line-height:1.7;max-height:400px;overflow:auto">
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">${escapeHtml(sector.name)}</div>
      <div>
        涨跌幅: <span style="color:${chgColor};font-weight:600">${signedPercent(chgValue)}</span>
        &nbsp;&nbsp;
        净流入: <span style="color:${flowTextColor};font-weight:600">${signedYiFromYuan(sector.netAmount)}</span>
      </div>
      <div>成交额: ${amountYi.toFixed(1)}亿 &nbsp; 上涨 ${sector.upCount ?? 0} 家 / 下跌 ${sector.downCount ?? 0} 家</div>
      ${
        sector.leadStock
          ? `<div>领涨: ${escapeHtml(sector.leadStock)} ${
              sector.leadPctChg != null ? signedPercent(sector.leadPctChg) : ''
            }</div>`
          : ''
      }
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

function InsightRow({
  sector,
  index,
  valueMode,
  onSectorClick,
}: {
  sector: SectorFlowItem;
  index: number;
  valueMode: InsightValueMode;
  onSectorClick?: (sector: SectorFlowItem) => void;
}) {
  const netAmount = sector.netAmount ?? 0;
  const pctChange = sector.pctChange ?? 0;

  return (
    <ButtonBase
      type="button"
      disabled={onSectorClick == null}
      onClick={() => onSectorClick?.(sector)}
      sx={(theme) => ({
        px: 1,
        py: 0.75,
        gap: 1,
        width: '100%',
        minHeight: 46,
        borderRadius: 1,
        display: 'flex',
        textAlign: 'left',
        alignItems: 'center',
        color: 'text.primary',
        justifyContent: 'space-between',
        border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        '&:hover': {
          bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
        },
        '&.Mui-disabled': {
          opacity: 1,
          color: 'text.primary',
        },
      })}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            width: 18,
            flexShrink: 0,
            color: 'text.disabled',
            fontWeight: 700,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {index + 1}
        </Typography>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap fontWeight="fontWeightMedium">
            {sector.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.disabled' }}>
            {sector.tsCode}
          </Typography>
        </Box>
      </Stack>

      {valueMode === 'flow' && (
        <Typography
          variant="body2"
          sx={{ flexShrink: 0, color: flowColor(netAmount), fontWeight: 700 }}
        >
          {signedYiFromYuan(netAmount)}
        </Typography>
      )}

      {valueMode === 'pct' && (
        <Typography
          variant="body2"
          sx={{ flexShrink: 0, color: pctColor(pctChange), fontWeight: 700 }}
        >
          {signedPercent(pctChange)}
        </Typography>
      )}

      {valueMode === 'crowded' && (
        <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: pctColor(pctChange), fontWeight: 700 }}>
            {signedPercent(pctChange)}
          </Typography>
          <Typography variant="caption" sx={{ color: flowColor(netAmount), fontWeight: 700 }}>
            {signedYiFromYuan(netAmount)}
          </Typography>
        </Stack>
      )}
    </ButtonBase>
  );
}

function InsightList({
  title,
  rows,
  valueMode,
  onSectorClick,
}: InsightSection & { onSectorClick?: (sector: SectorFlowItem) => void }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>

      {rows.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
          暂无
        </Typography>
      )}

      {rows.map((sector, index) => (
        <InsightRow
          index={index}
          sector={sector}
          key={getScatterSectorKey(sector)}
          valueMode={valueMode}
          onSectorClick={onSectorClick}
        />
      ))}
    </Stack>
  );
}

function ScatterInsightPanel({
  sectors,
  insights,
  onSectorClick,
}: {
  sectors: SectorFlowItem[];
  insights: ScatterInsightLists;
  onSectorClick?: (sector: SectorFlowItem) => void;
}) {
  const sections: InsightSection[] = [
    { title: '净流入 Top', rows: insights.topInflow, valueMode: 'flow' },
    { title: '净流出 Top', rows: insights.topOutflow, valueMode: 'flow' },
    { title: '涨幅 Top', rows: insights.topGainers, valueMode: 'pct' },
    { title: '跌幅 Top', rows: insights.topLosers, valueMode: 'pct' },
    { title: '中心拥挤区', rows: insights.crowded, valueMode: 'crowded' },
  ];

  return (
    <Box
      component="aside"
      sx={(theme) => ({
        minWidth: 0,
        pl: { lg: 2.5 },
        pt: { xs: 2, lg: 0 },
        borderTop: {
          xs: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
          lg: 0,
        },
        borderLeft: {
          xs: 0,
          lg: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
        },
      })}
    >
      <Stack spacing={1.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            信息索引
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
            {sectors.length} 个板块
          </Typography>
        </Stack>

        {sections.map((section) => (
          <InsightList
            rows={section.rows}
            title={section.title}
            key={section.title}
            valueMode={section.valueMode}
            onSectorClick={onSectorClick}
          />
        ))}
      </Stack>
    </Box>
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

  const labelKeys = useMemo(() => pickScatterLabelKeys(sectors, 8), [sectors]);
  const insights = useMemo(() => buildScatterInsightLists(sectors, 4), [sectors]);

  const tooltipPalette = useMemo<TooltipPalette>(
    () => ({
      muted: theme.vars.palette.text.secondary,
      border: theme.vars.palette.divider,
      positive: theme.vars.palette.error.main,
      negative: theme.vars.palette.success.main,
    }),
    [theme]
  );

  // ── 性能优化：按颜色分组 ──────────────────────────────────────
  // 原来每个行业一个 series（~60 个）→ 现在按颜色分组，最多 9 个 series
  // ApexCharts 每个 series 都有独立 DOM 开销，减少 series 数量可大幅提升渲染速度
  const { series, pointToSector } = useMemo(() => {
    // 按颜色分组
    const colorGroupMap = new Map<string, SectorFlowItem[]>();
    for (const sector of sectors) {
      const color = getScatterColor(sector.netAmount ?? 0);
      if (!colorGroupMap.has(color)) colorGroupMap.set(color, []);
      colorGroupMap.get(color)!.push(sector);
    }

    const seriesList: Array<{ name: string; color: string; data: [number, number, number][] }> = [];
    const sectorMatrix: SectorFlowItem[][] = []; // [seriesIndex][dataPointIndex]

    colorGroupMap.forEach((items, color) => {
      seriesList.push({
        name: color,
        color,
        data: items.map((sector) => {
          const amountYi = Math.max(toYi(sector.amount), 0.01);
          return [
            sector.pctChange ?? 0,
            yuanToYi(sector.netAmount), // Y：netAmount 单位元 → 亿
            Math.max(Math.sqrt(amountYi), 1), // Z：压缩成交额差异，避免大气泡吞掉中心簇
          ] as [number, number, number];
        }),
      });
      sectorMatrix.push(items);
    });

    return { series: seriesList, pointToSector: sectorMatrix };
  }, [sectors]);

  // 轴范围：用第 90 百分位数计算，避免极端値把其他点压到中心
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (!sectors.length) return { xMin: -5, xMax: 5, yMin: -20, yMax: 20 };

    const absXArr = sectors.map((sector) => Math.abs(sector.pctChange ?? 0)).sort((a, b) => a - b);
    const absYArr = sectors
      .map((sector) => Math.abs(yuanToYi(sector.netAmount ?? 0)))
      .sort((a, b) => a - b);

    // 90 百分位限制极端影响，并保证最小显示范围
    const p90X = absXArr[Math.floor(absXArr.length * 0.9)] ?? 3;
    const p90Y = absYArr[Math.floor(absYArr.length * 0.9)] ?? 10;

    const xPad = Math.max(p90X * 1.35, 3);
    const yPad = Math.max(p90Y * 1.25, 10);

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
        minBubbleRadius: 4,
        maxBubbleRadius: 18,
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
    fill: { opacity: 0.62 },
    stroke: { width: 1.4, colors: [theme.vars.palette.background.paper] },
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
        return sector.name;
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
          topGainersByGroup[sector.name] ?? [],
          topInflowByGroup[sector.name] ?? [],
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
            暂无数据
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

            <ScatterInsightPanel
              sectors={sectors}
              insights={insights}
              onSectorClick={onSectorClick}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
