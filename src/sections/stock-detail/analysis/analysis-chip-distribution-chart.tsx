import type { ChipDistributionBin } from 'src/api/stock';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  distribution: ChipDistributionBin[];
  currentPrice: number | null;
};

export function AnalysisChipDistributionChart({ distribution, currentPrice }: Props) {
  const bins = [...distribution].sort((a, b) => a.priceLow - b.priceLow);

  const series = [
    {
      name: '筹码占比',
      data: bins.map((b) => b.percent),
    },
  ];

  const annotations = currentPrice != null
    ? { xaxis: [{ x: currentPrice, borderColor: '#FF9800', label: { text: `当前价 ${currentPrice.toFixed(2)}`, style: { color: '#fff', background: '#FF9800' } } }] }
    : {};

  const chartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { horizontal: true, barHeight: '80%', distributed: true } },
    colors: bins.map((b) => (b.isProfit ? '#EF5350' : '#42A5F5')),
    xaxis: { categories: bins.map((b) => `${b.priceLow.toFixed(2)}-${b.priceHigh.toFixed(2)}`), title: { text: '筹码占比 (%)' } },
    yaxis: {},
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
    annotations,
  });

  if (bins.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary" textAlign="center" py={4}>暂无筹码数据</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>筹码分布</Typography>
        <Chart type="bar" series={series} options={chartOptions} sx={{ height: Math.max(300, bins.length * 14) }} />
      </CardContent>
    </Card>
  );
}
