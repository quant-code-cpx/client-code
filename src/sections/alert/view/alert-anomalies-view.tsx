import type { AnomalyType, AnomalyListResponse } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { alertApi } from 'src/api/alert';
import { getSocket } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { AlertScanButton } from '../alert-scan-button';
import { AlertAnomalyStats } from '../alert-anomaly-stats';
import { AlertAnomalyTable } from '../alert-anomaly-table';

// ----------------------------------------------------------------------

const ANOMALY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '全部类型' },
  { value: 'VOLUME_SURGE', label: '放量突破' },
  { value: 'CONSECUTIVE_LIMIT_UP', label: '连续涨停' },
  { value: 'LARGE_NET_INFLOW', label: '大额净流入' },
];

export function AlertAnomaliesView() {
  const [tradeDate, setTradeDate] = useState('');
  const [anomalyType, setAnomalyType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AnomalyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const yyyymmdd = tradeDate ? tradeDate.replace(/-/g, '') : undefined;
      const result = await alertApi.getAnomalies({
        tradeDate: yyyymmdd,
        type: (anomalyType as AnomalyType) || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载异动数据失败');
    } finally {
      setLoading(false);
    }
  }, [tradeDate, anomalyType, page]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      fetchAnomalies();
    };
    socket.on('market-anomaly-scan-completed', handler);
    return () => {
      socket.off('market-anomaly-scan-completed', handler);
    };
  }, [fetchAnomalies]);

  const handleDateChange = (value: string) => {
    setTradeDate(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setAnomalyType(value);
    setPage(1);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">异动监控</Typography>
        <AlertScanButton type="anomaly" onScanned={fetchAnomalies} />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <DatePicker
          label="交易日"
          value={tradeDate ? dayjs(tradeDate) : null}
          onChange={(v) => handleDateChange(v?.format('YYYY-MM-DD') ?? '')}
          format="YYYY-MM-DD"
          maxDate={dayjs()}
          slotProps={{
            textField: { size: 'small', sx: { minWidth: 190 } },
            field: { clearable: true },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>异动类型</InputLabel>
          <Select
            value={anomalyType}
            label="异动类型"
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {ANOMALY_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <AlertAnomalyStats data={data} loading={loading} />

      <Card sx={{ mt: 3 }}>
        <AlertAnomalyTable
          items={data?.items ?? []}
          loading={loading}
          page={page}
          total={data?.total ?? 0}
          pageSize={20}
          onPageChange={setPage}
        />
      </Card>
    </DashboardContent>
  );
}
