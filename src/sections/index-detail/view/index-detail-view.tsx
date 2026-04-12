import type { IndexInfo, IndexConstituentItem } from 'src/api/index-detail';

import { useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { fetchIndexList } from 'src/api/index-detail';
import { DashboardContent } from 'src/layouts/dashboard';

import { IndexDailyChart } from '../index-daily-chart';
import { IndexOverviewCard } from '../index-overview-card';
import { IndexConstituentsTable } from '../index-constituents-table';
import { IndexWeightDistribution } from '../index-weight-distribution';

// ----------------------------------------------------------------------

export function IndexDetailView() {
  const [indexList, setIndexList] = useState<IndexInfo[]>([]);
  const [selected, setSelected] = useState<IndexInfo | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [constituents, setConstituents] = useState<IndexConstituentItem[]>([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const codeFromUrl = searchParams.get('code');

    fetchIndexList()
      .then((list) => {
        const items = list ?? [];
        setIndexList(items);

        const defaultIdx = codeFromUrl
          ? items.find((i) => i.tsCode === codeFromUrl)
          : items.find((i) => i.tsCode === '000300.SH');
        setSelected(defaultIdx ?? items[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  const handleConstituentsLoaded = useCallback((items: IndexConstituentItem[]) => {
    setConstituents(items);
  }, []);

  const tsCode = selected?.tsCode ?? '';

  return (
    <DashboardContent>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">指数详情</Typography>
        <Autocomplete
          options={indexList}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          getOptionLabel={(o) => `${o.name}（${o.tsCode}）`}
          loading={listLoading}
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} size="small" label="选择指数" />}
        />
      </Stack>

      {tsCode && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <IndexOverviewCard tsCode={tsCode} indexInfo={selected} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <IndexDailyChart tsCode={tsCode} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <IndexConstituentsTable tsCode={tsCode} onDataLoaded={handleConstituentsLoaded} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <IndexWeightDistribution constituents={constituents} />
          </Grid>
        </Grid>
      )}
    </DashboardContent>
  );
}
