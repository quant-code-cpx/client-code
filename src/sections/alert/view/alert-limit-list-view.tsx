import type { Dayjs } from 'dayjs';
import type { LimitListItem } from 'src/api/alert';

import { useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchLimitList } from 'src/api/alert';
import { DashboardContent } from 'src/layouts/dashboard';

import { ExportButton } from 'src/components/export-button';

import { AlertLimitListStats } from '../alert-limit-list-stats';
import { AlertLimitListTable } from '../alert-limit-list-table';
import { AlertLimitStreakCard } from '../alert-limit-streak-card';

// ----------------------------------------------------------------------

export function AlertLimitListView() {
  const [tradeDate, setTradeDate] = useState<Dayjs | null>(null);
  const [limitType, setLimitType] = useState<'UP' | 'DOWN' | ''>('');
  const [minConsecutive, setMinConsecutive] = useState('');
  const [items, setItems] = useState<LimitListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchLimitList({
        trade_date: tradeDate ? tradeDate.format('YYYYMMDD') : undefined,
        limit_type: limitType || undefined,
        min_consecutive: minConsecutive ? Number(minConsecutive) : undefined,
      });
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载涨跌停数据失败');
    } finally {
      setLoading(false);
    }
  }, [tradeDate, limitType, minConsecutive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">涨跌停明细</Typography>
        <ExportButton source="alert_limit_list" params={{ trade_date: tradeDate?.format('YYYYMMDD') }} />
      </Stack>

      {/* ── 筛选栏 ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <DatePicker
          label="交易日期"
          value={tradeDate}
          onChange={setTradeDate}
          format="YYYY-MM-DD"
          slotProps={{ textField: { size: 'small', sx: { width: 180 } }, field: { clearable: true } }}
        />

        <ToggleButtonGroup
          value={limitType}
          exclusive
          size="small"
          onChange={(_, val) => setLimitType(val ?? '')}
        >
          <ToggleButton value="">全部</ToggleButton>
          <ToggleButton value="UP">涨停</ToggleButton>
          <ToggleButton value="DOWN">跌停</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="最低连板天数"
          value={minConsecutive}
          onChange={(e) => setMinConsecutive(e.target.value)}
          type="number"
          size="small"
          sx={{ width: 140 }}
          slotProps={{ htmlInput: { min: 0 } }}
        />

        <Button variant="outlined" size="small" onClick={fetchData}>
          刷新
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
        </Stack>
      ) : (
        <Grid container spacing={3}>
          {/* ── 汇总统计 ── */}
          <Grid size={{ xs: 12 }}>
            <AlertLimitListStats items={items} />
          </Grid>

          {/* ── 连板龙虎榜 ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <AlertLimitStreakCard items={items} />
          </Grid>

          {/* ── 数据表格 ── */}
          <Grid size={{ xs: 12, md: 8 }}>
            <AlertLimitListTable items={items} />
          </Grid>
        </Grid>
      )}
    </DashboardContent>
  );
}
