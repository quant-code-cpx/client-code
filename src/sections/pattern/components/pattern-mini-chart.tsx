import { useTheme } from '@mui/material/styles';

import { Chart, useChart } from 'src/components/chart';

type Props = {
  series: number[];
  height?: number;
  /** 用于颜色：默认 primary；bullish→success（绿/红根据图表色规约）；bearish→error */
  tone?: 'primary' | 'bullish' | 'bearish' | 'muted';
};

/**
 * 形态 sparkline。
 * 注意：项目"涨红跌绿"是数据色规约，仅 tone='bullish'/'bearish' 时使用 success/error
 * 表达预期方向；tone='primary' 用于纯展示，避免污染 UI 主色含义。
 */
export function PatternMiniChart({ series, height = 60, tone = 'primary' }: Props) {
  const theme = useTheme();
  const color =
    tone === 'bullish'
      ? theme.palette.success.main
      : tone === 'bearish'
        ? theme.palette.error.main
        : tone === 'muted'
          ? theme.palette.text.secondary
          : theme.palette.primary.main;

  const options = useChart({
    chart: { type: 'line', sparkline: { enabled: true }, animations: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    tooltip: { enabled: false },
    colors: [color],
  });

  return <Chart type="line" series={[{ data: series }]} options={options} sx={{ height }} />;
}
