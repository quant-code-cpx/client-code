import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';

import { fetchReturnComparison, type ReturnComparisonResult } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

// Common A-share industry sectors for autocomplete suggestions
const DEFAULT_SECTOR_OPTIONS = [
  '银行', '非银金融', '电力设备', '计算机', '医药生物', '食品饮料', '汽车', '机械设备',
  '建筑材料', '建筑装饰', '农林牧渔', '钢铁', '有色金属', '化工', '煤炭', '石油石化',
  '通信', '传媒', '电子', '纺织服装', '家用电器', '商贸零售', '国防军工', '轻工制造',
  '美容护理', '房地产', '公用事业', '交通运输', '环保', '综合',
];

const MAX_SECTORS = 6;

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  period?: string;
};

export function RotationReturnComparisonChart({ tradeDate, period }: Props) {
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [data, setData] = useState<ReturnComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchReturnComparison({
      trade_date: tradeDate,
      periods: period ? [period] : undefined,
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
  }, [tradeDate, period, selectedSectors]);

  const handleSectorChange = useCallback((_: unknown, value: string[]) => {
    if (value.length <= MAX_SECTORS) {
      setSelectedSectors(value);
    }
  }, []);

  // Build series
  const benchmarkSeries = data?.benchmark
    ? {
        name: data.benchmark.name,
        type: 'line' as const,
        data: data.benchmark.data.map((d) => [fmtDate(d.tradeDate), d.cumReturn]),
      }
    : null;

  const sectorSeries = (data?.sectors ?? []).map((s) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map((d) => [fmtDate(d.tradeDate), d.cumReturn]),
  }));

  const series = benchmarkSeries ? [benchmarkSeries, ...sectorSeries] : sectorSeries;

  // Build stroke config: benchmark is dashed, sectors are solid
  const strokeDash = series.map((s, i) =>
    s.name === data?.benchmark?.name ? 4 : 0
  );
  const strokeWidths = series.map(() => 2);

  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: true },
    },
    stroke: {
      curve: 'smooth',
      width: strokeWidths,
      dashArray: strokeDash,
    },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `${val.toFixed(2)}%`,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'yyyy-MM-dd' },
      y: {
        formatter: (val: number) => `${val.toFixed(2)}%`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
    },
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">行业收益对比</Typography>
          <Typography variant="caption" color="text.secondary">
            最多对比 {MAX_SECTORS} 个行业
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
              placeholder={selectedSectors.length === 0 ? '不选默认展示全部，可搜索行业名称' : ''}
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
        ) : series.length === 0 ? (
          <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.disabled">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 320 }} />
        )}
      </CardContent>
    </Card>
  );
}
