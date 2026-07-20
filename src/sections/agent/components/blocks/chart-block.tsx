import type { ChartBlock as ChartBlockValue } from 'src/types/agent/generated';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Chart } from 'src/components/chart/chart';
import { useChart } from 'src/components/chart/use-chart';

import { DataProvenance } from '../data-provenance';
import { toChartViewModel, chartSeriesValueLabel } from '../../lib/chart-adapters';

export function ChartBlock({ block }: { block: ChartBlockValue }) {
  const viewModel = useMemo(() => toChartViewModel(block), [block]);
  const chartRows = useMemo(() => {
    const rows = new Map<
      string,
      { x: string | number; values: Record<string, number | null> }
    >();
    block.series.forEach((series) =>
      series.points.forEach((point) => {
        const key = `${typeof point.x}:${String(point.x)}`;
        const row = rows.get(key) ?? { x: point.x, values: {} };
        row.values[series.key] = point.y;
        rows.set(key, row);
      })
    );
    return [...rows.values()];
  }, [block.series]);
  const options = useChart({
    chart: { type: viewModel.type, animations: { enabled: false }, toolbar: { show: false } },
    xaxis: { type: viewModel.xAxisType, tickAmount: 8, labels: { style: { fontSize: '12px' } } },
    tooltip: {
      shared: viewModel.type !== 'heatmap',
      intersect: false,
      y: {
        formatter: (value: number, apexContext?: { seriesIndex?: number }) => {
          const series = block.series[apexContext?.seriesIndex ?? 0] ?? block.series[0];
          return series ? chartSeriesValueLabel(value, series) : String(value);
        },
      },
    },
    legend: { show: true, position: 'top' },
    stroke: { curve: viewModel.type === 'bar' || viewModel.type === 'heatmap' ? 'straight' : 'smooth' },
  });

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {block.title ?? '数据图表'}
      </Typography>
      <Box role="img" aria-label={`${block.title ?? '数据图表'}。${viewModel.summary}`}>
        <Chart
          type={viewModel.type}
          series={viewModel.series}
          options={options}
          sx={{ height: { xs: 280, md: 360 } }}
        />
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        {viewModel.summary}
      </Typography>
      <Box component="details" sx={{ mt: 1 }}>
        <Typography component="summary" variant="caption" sx={{ cursor: 'pointer', fontWeight: 700 }}>
          查看图表数据
        </Typography>
        <TableContainer sx={{ mt: 1, maxHeight: 320 }}>
          <Table size="small" stickyHeader aria-label={`${block.title ?? '图表'}数据`}>
            <TableHead>
              <TableRow>
                <TableCell>x</TableCell>
                {block.series.map((series) => (
                  <TableCell key={series.key} align="right">
                    {series.name}{series.unit ? `（${series.unit}）` : ''}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {chartRows.map((row, index) => (
                <TableRow key={`${row.x}-${index}`}>
                  <TableCell>{row.x}</TableCell>
                  {block.series.map((series) => (
                    <TableCell key={series.key} align="right">
                      {chartSeriesValueLabel(row.values[series.key] ?? null, series, false)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <DataProvenance provenance={block.provenance} />
    </Box>
  );
}
