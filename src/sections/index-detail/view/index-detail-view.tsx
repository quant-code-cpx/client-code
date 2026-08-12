import type { IndexInfo, IndexConstituentItem } from 'src/api/index-detail';

import { useRef, useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
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
  const [listError, setListError] = useState('');
  const [constituents, setConstituents] = useState<IndexConstituentItem[]>([]);
  const listRequestRef = useRef(0);

  const fetchList = useCallback(async () => {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    const searchParams = new URLSearchParams(window.location.search);
    const codeFromUrl = searchParams.get('code');
    setListLoading(true);
    setListError('');

    try {
      const items = (await fetchIndexList()) ?? [];
      if (listRequestRef.current !== requestId) return;
      setIndexList(items);

      const defaultIdx = codeFromUrl
        ? items.find((item) => item.tsCode === codeFromUrl)
        : items.find((item) => item.tsCode === '000300.SH');
      setSelected(defaultIdx ?? items[0] ?? null);
    } catch (error) {
      if (listRequestRef.current !== requestId) return;
      setListError(error instanceof Error ? error.message : '指数列表加载失败');
    } finally {
      if (listRequestRef.current === requestId) setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
    return () => {
      listRequestRef.current += 1;
    };
  }, [fetchList]);

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
          onChange={(_, v) => {
            setSelected(v);
            setConstituents([]);
          }}
          getOptionLabel={(o) => `${o.name}（${o.tsCode}）`}
          loading={listLoading}
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} size="small" label="选择指数" />}
        />
      </Stack>

      {listError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void fetchList()}>
              重试
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {listError}
        </Alert>
      )}

      {tsCode && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <IndexOverviewCard key={tsCode} tsCode={tsCode} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <IndexDailyChart key={tsCode} tsCode={tsCode} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <IndexConstituentsTable
              key={tsCode}
              tsCode={tsCode}
              onDataLoaded={handleConstituentsLoaded}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <IndexWeightDistribution constituents={constituents} />
          </Grid>
        </Grid>
      )}
    </DashboardContent>
  );
}
