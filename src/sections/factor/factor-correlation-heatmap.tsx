import type { FactorCorrelationResult } from 'src/api/factor';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const NULL_SENTINEL = -2;

type Props = {
  result: FactorCorrelationResult;
  onCellClick?: (row: number, col: number) => void;
};

export function FactorCorrelationHeatmap({ result, onCellClick }: Props) {
  const theme = useTheme();
  const { factors, factorLabels, matrix, nMatrix } = result;

  const labels = useMemo(
    () => (factorLabels?.length === factors.length ? factorLabels : factors),
    [factorLabels, factors]
  );

  const series = useMemo(
    () =>
      factors.map((_, rowIdx) => ({
        name: labels[rowIdx],
        data: factors.map((__, colIdx) => {
          const v = matrix[rowIdx]?.[colIdx];
          return {
            x: labels[colIdx],
            y: v === null || v === undefined ? NULL_SENTINEL : Number(v.toFixed(3)),
          };
        }),
      })),
    [factors, labels, matrix]
  );

  const factorCount = factors.length;
  const heightPerRow = factorCount > 12 ? 32 : 40;
  const dynamicHeight = factorCount * heightPerRow + 80;
  const showDataLabels = factorCount <= 12;

  const colorScale = useMemo(() => {
    const errorMain = theme.palette.error.main;
    const errorLight = theme.palette.error.light;
    const infoMain = theme.palette.info.main;
    const infoLight = theme.palette.info.light;
    const neutral = theme.palette.background.neutral;
    const missing = theme.palette.action.disabledBackground;

    return [
      { from: NULL_SENTINEL - 0.5, to: NULL_SENTINEL + 0.5, color: missing, name: '样本不足' },
      { from: -1, to: -0.5, color: infoMain, name: '强负相关' },
      { from: -0.5, to: -0.2, color: infoLight, name: '弱负相关' },
      { from: -0.2, to: 0.2, color: neutral, name: '中性' },
      { from: 0.2, to: 0.5, color: errorLight, name: '弱正相关' },
      { from: 0.5, to: 1, color: errorMain, name: '强正相关' },
    ];
  }, [theme]);

  const chartOptions = useChart({
    chart: {
      type: 'heatmap',
      events: onCellClick
        ? {
            dataPointSelection: (_e: unknown, _c: unknown, config: any) => {
              const row = config?.seriesIndex as number;
              const col = config?.dataPointIndex as number;
              if (row >= 0 && col >= 0) onCellClick(row, col);
            },
          }
        : undefined,
    },
    dataLabels: {
      enabled: showDataLabels,
      formatter: (val: number) => {
        if (val <= NULL_SENTINEL + 0.5) return '—';
        return val.toFixed(2);
      },
      style: { fontSize: '12px' },
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0,
        radius: 2,
        useFillColorAsStroke: false,
        colorScale: { ranges: colorScale },
      },
    },
    xaxis: { type: 'category', labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: { labels: { style: { fontSize: '12px' } } },
    legend: { show: false },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        const rho: number = w.globals.initialSeries[seriesIndex].data[dataPointIndex].y;
        const xLabel: string = w.globals.initialSeries[seriesIndex].data[dataPointIndex].x;
        const yLabel: string = w.globals.initialSeries[seriesIndex].name;
        const sample = nMatrix?.[seriesIndex]?.[dataPointIndex];
        const isMissing = rho <= NULL_SENTINEL + 0.5;
        const rhoText = isMissing ? '— 无法计算' : rho.toFixed(3);
        const reason = isMissing ? '样本不足或常数序列' : '';
        const sampleText = sample !== undefined && sample !== null ? `n=${sample}` : 'n=未知';
        return `<div style="padding:8px 12px;font-size:12px;line-height:1.6">
          <div><b>${yLabel} × ${xLabel}</b></div>
          <div>ρ = ${rhoText}</div>
          <div>${sampleText}</div>
          ${reason ? `<div style="opacity:.7">${reason}</div>` : ''}
        </div>`;
      },
    },
  });

  return (
    <Box>
      <Box sx={{ height: dynamicHeight }}>
        <Chart
          type="heatmap"
          series={series}
          options={chartOptions}
          sx={{ height: dynamicHeight }}
        />
      </Box>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1, px: 1 }}>
        {colorScale.map((range) => (
          <Stack key={range.name} direction="row" alignItems="center" spacing={0.5}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: range.color,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {range.name}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
