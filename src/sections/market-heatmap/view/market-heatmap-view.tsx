import type { HeatmapItem, HeatmapDistribution, HeatmapSectorSummary } from 'src/api/heatmap';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHeatmapData } from 'src/api/heatmap';
import { DashboardContent } from 'src/layouts/dashboard';

import { HeatmapTreemapChart } from '../heatmap-treemap-chart';
import { aggregateSectors, computeDistribution } from '../utils';
import { HeatmapSnapshotPanel } from '../heatmap-snapshot-panel';
import { HeatmapSectorBarChart } from '../heatmap-sector-bar-chart';
import { HeatmapDistributionChart } from '../heatmap-distribution-chart';

// ----------------------------------------------------------------------

type GroupByOption = 'industry' | 'hs300' | 'zz500' | 'sz50' | 'cyb';
type SizeBy = 'totalMv' | 'amount';

type GroupConfig = {
  value: GroupByOption;
  label: string;
  groupBy: 'industry' | 'index' | 'concept';
  indexCode?: string;
};

const GROUP_OPTIONS: GroupConfig[] = [
  { value: 'industry', label: '按行业', groupBy: 'industry' },
  { value: 'hs300', label: '沪深300', groupBy: 'index', indexCode: '000300.SH' },
  { value: 'zz500', label: '中证500', groupBy: 'index', indexCode: '000905.SH' },
  { value: 'sz50', label: '上证50', groupBy: 'index', indexCode: '000016.SH' },
  { value: 'cyb', label: '创业板', groupBy: 'index', indexCode: '399006.SZ' },
];

export function MarketHeatmapView() {
  const [tradeDate, setTradeDate] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('industry');
  const [sizeBy, setSizeBy] = useState<SizeBy>('totalMv');

  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sectors: HeatmapSectorSummary[] = useMemo(() => aggregateSectors(items), [items]);
  const distribution: HeatmapDistribution = useMemo(() => computeDistribution(items), [items]);

  useEffect(() => {
    const cfg = GROUP_OPTIONS.find((o) => o.value === groupBy)!;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchHeatmapData({
          trade_date: tradeDate || undefined,
          group_by: cfg.groupBy,
          index_code: cfg.indexCode,
        });
        setItems(result);
      } catch {
        setError('热力图数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tradeDate, groupBy]);

  const handleGroupByChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: GroupByOption | null) => {
      if (v) setGroupBy(v);
    },
    []
  );

  const handleSizeByChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, v: SizeBy | null) => {
      if (v) setSizeBy(v);
    },
    []
  );

  const activeGroupBy = GROUP_OPTIONS.find((o) => o.value === groupBy)!.groupBy;

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
            {GROUP_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <ToggleButtonGroup size="small" exclusive value={sizeBy} onChange={handleSizeByChange}>
            <ToggleButton value="totalMv">总市值</ToggleButton>
            <ToggleButton value="amount">成交额</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <HeatmapTreemapChart
            items={items}
            distribution={items.length > 0 ? distribution : null}
            loading={loading}
            error={error}
            groupBy={activeGroupBy}
            sizeBy={sizeBy}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <HeatmapSectorBarChart sectors={sectors} loading={loading} error={error} />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <HeatmapDistributionChart
            distribution={items.length > 0 ? distribution : null}
            loading={loading}
            error={error}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <HeatmapSnapshotPanel />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
