import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';

import { periodToDays } from 'src/utils/format-time';

import { fetchReturnComparison, type ReturnComparisonResult } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const DEFAULT_SECTOR_OPTIONS = [
  '银行',
  '非银金融',
  '电力设备',
  '计算机',
  '医药生物',
  '食品饮料',
  '汽车',
  '机械设备',
  '建筑材料',
  '建筑装饰',
  '农林牧渔',
  '钢铁',
  '有色金属',
  '化工',
  '煤炭',
  '石油石化',
  '通信',
  '传媒',
  '电子',
  '纺织服装',
  '家用电器',
  '商贸零售',
  '国防军工',
  '轻工制造',
  '美容护理',
  '房地产',
  '公用事业',
  '交通运输',
  '环保',
  '综合',
];

const MAX_SECTORS = 8;

// Period label for chart series name: "5d" → "5天"
function periodLabel(key: string): string {
  const n = Number(key.replace('d', ''));
  if (n >= 250) return '1年';
  if (n >= 120) return '6月';
  if (n >= 60) return '3月';
  if (n >= 20) return '1月';
  if (n >= 5) return '1周';
  return `${n}天`;
}

function formatChartPercent(value: string | number | number[] | null | undefined): string {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? `${num > 0 ? '+' : ''}${num.toFixed(1)}%` : '-';
}

function formatTooltipPercent(value: string | number | number[] | null | undefined): string {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? `${num > 0 ? '+' : ''}${num.toFixed(2)}%` : '-';
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  period?: string;
  refreshKey?: number;
};

export function RotationReturnComparisonChart({ tradeDate, period, refreshKey }: Props) {
  const theme = useTheme();
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [data, setData] = useState<ReturnComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const periodDays = period ? Math.min(periodToDays(period), 60) : undefined;

    fetchReturnComparison({
      trade_date: tradeDate,
      periods: periodDays ? [periodDays] : [5, 20, 60],
      sort_period: periodDays ?? 20,
      order: 'desc',
    })
      .then((res) => {
        if (!cancelled) setData(res ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载收益对比数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, period, refreshKey]);

  const handleSectorChange = useCallback((_: unknown, value: string[]) => {
    if (value.length <= MAX_SECTORS) setSelectedSectors(value);
  }, []);

  // Apply sector filter; if nothing selected use top 15 (by first period return)
  const allSectors = data?.sectors ?? [];
  const filteredSectors =
    selectedSectors.length > 0
      ? allSectors.filter((s) => selectedSectors.includes(s.name))
      : allSectors.slice(0, 15);

  // period keys come from benchmark.data[].tradeDate which are like '5d', '20d', '60d'
  const periodKeys = data?.benchmark?.data?.map((d) => d.tradeDate) ?? [];

  // Build grouped bar series: one series per period
  const barSeries = periodKeys.map((pk) => ({
    name: periodLabel(pk),
    data: filteredSectors.map((s) => {
      const point = s.data.find((d) => d.tradeDate === pk);
      return point?.cumReturn == null ? null : Math.round(point.cumReturn * 100) / 100;
    }),
  }));

  const hasChartData = barSeries.some((s) => s.data.some((v) => v != null));

  const categories = filteredSectors.map((s) => s.name);

  const chartOptions = useChart({
    chart: {
      type: 'bar',
      toolbar: { show: false },
    },
    colors: [theme.palette.primary.main, theme.palette.warning.main, theme.palette.info.main],
    plotOptions: {
      bar: {
        columnWidth: categories.length <= 5 ? '40%' : '65%',
        borderRadius: 2,
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: categories.length <= 8,
      offsetY: -18,
      style: { fontSize: '12px', colors: [theme.palette.text.primary] },
      formatter: formatChartPercent,
    },
    xaxis: {
      categories,
      labels: { rotate: -35, style: { fontSize: '12px' } },
    },
    yaxis: {
      labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
      title: { text: '涨跌幅 (%)' },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: formatTooltipPercent },
    },
    legend: { position: 'top', horizontalAlign: 'left' },
  });

  const chartHeight = Math.max(320, categories.length * 22 + 80);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">行业收益对比</Typography>
          <Typography variant="caption" color="text.secondary">
            最多选 {MAX_SECTORS} 个行业
          </Typography>
        </Box>

        <Autocomplete
          multiple
          size="small"
          options={DEFAULT_SECTOR_OPTIONS}
          value={selectedSectors}
          onChange={handleSectorChange}
          freeSolo
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return <Chip key={key} label={option} size="small" {...tagProps} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selectedSectors.length === 0 ? '不选默认显示前15个行业，可搜索' : ''}
              size="small"
            />
          )}
          sx={{ mb: 2 }}
          limitTags={MAX_SECTORS}
          getOptionDisabled={() => selectedSectors.length >= MAX_SECTORS}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : !hasChartData ? (
          <Box
            sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.disabled">暂无数据</Typography>
          </Box>
        ) : (
          <Chart
            type="bar"
            series={barSeries}
            options={chartOptions}
            sx={{ height: chartHeight }}
          />
        )}
      </CardContent>
    </Card>
  );
}
