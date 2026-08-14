import type { EventType, EventCalendarResult } from 'src/api/event-study';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate } from 'src/utils/format-time';

import { Chart, useChart } from 'src/components/chart';

import { EVENT_TYPE_LABELS } from './constants';

// ----------------------------------------------------------------------

type Props = {
  data: EventCalendarResult;
  title?: string;
  height?: number;
};

export function EventCalendarHeatmap({
  data,
  title = '事件日历（密度热力图）',
  height = 320,
}: Props) {
  const theme = useTheme();

  // 转换为按 eventType 分组、横轴为日期的 heatmap series
  const dateSet = new Set<string>();
  data.cells.forEach((c) => dateSet.add(c.date));
  const dates = Array.from(dateSet).sort();

  const typeMap = new Map<string, Map<string, number>>();
  data.cells.forEach((c) => {
    if (!typeMap.has(c.eventType)) typeMap.set(c.eventType, new Map());
    typeMap.get(c.eventType)!.set(c.date, c.count);
  });

  const series = Array.from(typeMap.entries()).map(([eventType, dateCount]) => ({
    name: EVENT_TYPE_LABELS[eventType as EventType] ?? eventType,
    data: dates.map((d) => ({ x: fmtTradeDate(d), y: dateCount.get(d) ?? 0 })),
  }));

  const options = useChart({
    chart: { type: 'heatmap', toolbar: { show: false } },
    dataLabels: { enabled: false },
    colors: [theme.palette.primary.main],
    plotOptions: {
      heatmap: {
        radius: 2,
        colorScale: {
          ranges: [
            { from: 0, to: 0, name: '0', color: theme.palette.background.neutral },
            { from: 1, to: 5, name: '低', color: theme.palette.info.lighter },
            { from: 6, to: 20, name: '中', color: theme.palette.info.main },
            { from: 21, to: 9999, name: '高', color: theme.palette.primary.main },
          ],
        },
      },
    },
    xaxis: { type: 'category', labels: { rotate: -45 } },
    legend: { show: true, position: 'top' },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
        <Chart type="heatmap" series={series} options={options} sx={{ height }} />
      </CardContent>
    </Card>
  );
}
