import { useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';

import { HeatmapTreemapChart } from '../heatmap-treemap-chart';
import { HeatmapSnapshotPanel } from '../heatmap-snapshot-panel';
import { HeatmapSectorBarChart } from '../heatmap-sector-bar-chart';
import { HeatmapDistributionChart } from '../heatmap-distribution-chart';

// ----------------------------------------------------------------------

type GroupBy = 'industry' | 'market';
type SizeBy = 'totalMv' | 'circMv' | 'amount';

export function MarketHeatmapView() {
  const [tradeDate, setTradeDate] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('industry');
  const [sizeBy, setSizeBy] = useState<SizeBy>('totalMv');

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
          <TextField
            size="small"
            label="交易日期"
            placeholder="YYYYMMDD（空=最新）"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            sx={{ width: 190 }}
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
            tradeDate={tradeDate || undefined}
            groupBy={groupBy}
            sizeBy={sizeBy}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <HeatmapSectorBarChart tradeDate={tradeDate || undefined} />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <HeatmapDistributionChart tradeDate={tradeDate || undefined} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <HeatmapSnapshotPanel />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
