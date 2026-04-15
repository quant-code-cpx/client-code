import type { Dayjs } from 'dayjs';

import { useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchHeatmapData, type HeatmapDataResult } from 'src/api/market';

import { HeatmapTreemapChart } from '../heatmap-treemap-chart';
import { HeatmapSnapshotPanel } from '../heatmap-snapshot-panel';
import { HeatmapSectorBarChart } from '../heatmap-sector-bar-chart';
import { HeatmapDistributionChart } from '../heatmap-distribution-chart';

// ----------------------------------------------------------------------

type GroupBy = 'industry' | 'market';
type SizeBy = 'totalMv' | 'circMv' | 'amount';

export function MarketHeatmapView() {
  const [tradeDate, setTradeDate] = useState<Dayjs | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('industry');
  const [sizeBy, setSizeBy] = useState<SizeBy>('totalMv');

  const tradeDateStr = tradeDate ? tradeDate.format('YYYYMMDD') : undefined;

  const [heatmapData, setHeatmapData] = useState<HeatmapDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchHeatmapData({ trade_date: tradeDateStr });
        setHeatmapData(result);
      } catch {
        setError('热力图数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tradeDateStr]);

  const handleGroupByChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: GroupBy | null) => {
      if (v) setGroupBy(v);
    },
    []
  );

  const handleSizeByChange = useCallback((_e: React.MouseEvent<HTMLElement>, v: SizeBy | null) => {
    if (v) setSizeBy(v);
  }, []);

  return (
    <DashboardContent>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">市场热力图</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <DatePicker
            label="交易日期"
            value={tradeDate}
            onChange={(newVal) => setTradeDate(newVal)}
            format="YYYY-MM-DD"
            slotProps={{
              textField: { size: 'small', sx: { width: 190 } },
              field: { clearable: true },
            }}
          />

          <ToggleButtonGroup size="small" exclusive value={groupBy} onChange={handleGroupByChange}>
            <ToggleButton value="industry">按行业</ToggleButton>
            <ToggleButton value="market">全市场</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup size="small" exclusive value={sizeBy} onChange={handleSizeByChange}>
            <ToggleButton value="totalMv">总市值</ToggleButton>
            <ToggleButton value="circMv">流通市值</ToggleButton>
            <ToggleButton value="amount">成交额</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <HeatmapTreemapChart
            data={heatmapData}
            loading={loading}
            error={error}
            groupBy={groupBy}
            sizeBy={sizeBy}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <HeatmapSectorBarChart
            sectors={heatmapData?.sectors ?? []}
            loading={loading}
            error={error}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <HeatmapDistributionChart data={heatmapData} loading={loading} error={error} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <HeatmapSnapshotPanel />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
