import type { ApexOptions } from 'apexcharts';
import type { ChipDistributionBin } from 'src/api/stock';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type XAxisAnnotation = NonNullable<NonNullable<ApexOptions['annotations']>['xaxis']>[number];

type Props = {
  distribution: ChipDistributionBin[];
  currentPrice: number | null;
  avgCost?: number | null;
};

export function AnalysisChipDistributionChart({ distribution, currentPrice, avgCost }: Props) {
  const theme = useTheme();

  const bins = [...distribution].sort((a, b) => a.priceLow - b.priceLow);

  const series = [
    {
      name: '筹码占比',
      data: bins.map((b) => b.percent),
    },
  ];

  const xaxisAnnotations: XAxisAnnotation[] = [];
  if (currentPrice != null) {
    xaxisAnnotations.push({
      x: currentPrice,
      borderColor: theme.palette.warning.main,
      label: {
        text: `当前价 ${currentPrice.toFixed(2)}`,
        style: { color: theme.palette.common.white, background: theme.palette.warning.main },
      },
    });
  }
  if (avgCost != null) {
    xaxisAnnotations.push({
      x: avgCost,
      borderColor: theme.palette.secondary.main,
      label: {
        text: `平均成本 ${avgCost.toFixed(2)}`,
        style: { color: theme.palette.common.white, background: theme.palette.secondary.main },
      },
    });
  }
  const annotations: ApexOptions['annotations'] =
    xaxisAnnotations.length > 0 ? { xaxis: xaxisAnnotations } : {};

  const chartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { horizontal: true, barHeight: '80%', distributed: true } },
    colors: bins.map((b) => (b.isProfit ? theme.palette.error.main : theme.palette.info.main)),
    xaxis: {
      categories: bins.map((b) => `${b.priceLow.toFixed(2)}-${b.priceHigh.toFixed(2)}`),
      title: { text: '筹码占比 (%)' },
    },
    yaxis: {},
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
    annotations,
  });

  if (bins.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary" textAlign="center" py={4}>
            暂无筹码数据
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          筹码分布
        </Typography>
        <Chart
          type="bar"
          series={series}
          options={chartOptions}
          sx={{ height: Math.max(300, bins.length * 14) }}
        />
      </CardContent>
    </Card>
  );
}
