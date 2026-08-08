import type { ApexOptions } from 'apexcharts';
import type { Theme, SxProps } from '@mui/material/styles';

// ----------------------------------------------------------------------

type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'pie'
  | 'donut'
  | 'radialBar'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'candlestick'
  | 'boxPlot'
  | 'radar'
  | 'polarArea'
  | 'rangeBar'
  | 'rangeArea'
  | 'treemap';

type ApexChartProps = {
  type?: ChartType;
  series?: ApexOptions['series'];
  options?: ApexOptions;
};

export type ChartOptions = ApexOptions;

export type ChartProps = React.ComponentProps<'div'> &
  Pick<ApexChartProps, 'type' | 'series' | 'options'> & {
    sx?: SxProps<Theme>;
    slotProps?: {
      loading?: SxProps<Theme>;
    };
  };
