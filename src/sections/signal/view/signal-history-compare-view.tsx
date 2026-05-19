import type {
  SignalForwardWindow,
  SignalActivationItem,
  SignalHistoryCompareResponse,
} from 'src/api/signal';

import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { compareSignalHistory, listSignalActivations } from 'src/api/signal';

import { Iconify } from 'src/components/iconify';

import { SignalReturnText } from '../signal-return-text';

// ----------------------------------------------------------------------

export function SignalHistoryCompareView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activations, setActivations] = useState<SignalActivationItem[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    parseIds(searchParams.get('strategyIds'))
  );
  const [startDate, setStartDate] = useState(searchParams.get('startDate') ?? defaultStartDate());
  const [endDate, setEndDate] = useState(searchParams.get('endDate') ?? dayjs().format('YYYYMMDD'));
  const [forwardWindow, setForwardWindow] = useState<SignalForwardWindow>(
    parseWindow(searchParams.get('forwardWindow'))
  );

  const [result, setResult] = useState<SignalHistoryCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeOptions = useMemo(
    () => activations.filter((activation) => activation.isActive),
    [activations]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingActivations(true);
    listSignalActivations()
      .then((data) => {
        if (cancelled) return;
        setActivations(data);
        if (selectedIds.length === 0) {
          setSelectedIds(
            data
              .filter((item) => item.isActive)
              .slice(0, 3)
              .map((item) => item.strategyId)
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingActivations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIds.length]);

  const fetchCompare = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await compareSignalHistory({
        strategyIds: selectedIds,
        startDate,
        endDate,
        forwardWindow,
      });
      setResult(data);
      const params = new URLSearchParams();
      params.set('strategyIds', selectedIds.join(','));
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      params.set('forwardWindow', String(forwardWindow));
      setSearchParams(params, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/Cannot (POST|GET)/i.test(message) || /404/.test(message)) {
        setError('多策略对比接口暂不可用');
      } else {
        setError(message || '获取多策略对比失败');
      }
    } finally {
      setLoading(false);
    }
  }, [endDate, forwardWindow, selectedIds, setSearchParams, startDate]);

  useEffect(() => {
    if (!loadingActivations && selectedIds.length > 0) fetchCompare();
  }, [fetchCompare, loadingActivations, selectedIds.length]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">信号历史对比</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            最多选择 3 个已激活策略，横向比较区间信号质量
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          href="/strategy/signal/history"
          variant="outlined"
          startIcon={<Iconify icon="solar:arrow-left-bold" />}
        >
          返回历史
        </Button>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 260 }} disabled={loadingActivations}>
            <InputLabel>策略（最多 3 个）</InputLabel>
            <Select
              multiple
              label="策略（最多 3 个）"
              value={selectedIds}
              input={<OutlinedInput label="策略（最多 3 个）" />}
              onChange={(event) => {
                const value = event.target.value;
                const next = typeof value === 'string' ? value.split(',') : value;
                setSelectedIds(next.slice(0, 3));
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip key={id} size="small" label={findStrategyName(activeOptions, id)} />
                  ))}
                </Box>
              )}
            >
              {activeOptions.map((activation) => (
                <MenuItem key={activation.strategyId} value={activation.strategyId}>
                  {activation.strategyName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="起始日期"
            value={startDate ? dayjs(toDisplayDate(startDate)) : null}
            onChange={(value) => setStartDate(value?.format('YYYYMMDD') ?? '')}
            format="YYYY-MM-DD"
            sx={{ width: { xs: 1, md: 150 } }}
            slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
          />
          <DatePicker
            label="截止日期"
            value={endDate ? dayjs(toDisplayDate(endDate)) : null}
            onChange={(value) => setEndDate(value?.format('YYYYMMDD') ?? '')}
            format="YYYY-MM-DD"
            sx={{ width: { xs: 1, md: 150 } }}
            slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
          />

          <ToggleButtonGroup
            exclusive
            aria-label="前瞻收益窗口"
            size="small"
            value={forwardWindow}
            onChange={(_, value: SignalForwardWindow | null) => {
              if (value) setForwardWindow(value);
            }}
          >
            <ToggleButton value={1}>T+1</ToggleButton>
            <ToggleButton value={5}>T+5</ToggleButton>
            <ToggleButton value={20}>T+20</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={fetchCompare}
            disabled={selectedIds.length === 0 || selectedIds.length > 3}
          >
            查询
          </Button>
        </Stack>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
        >
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={180} />
          ))}
        </Box>
      )}

      {!loading && result && (
        <Box
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
        >
          {result.items.map((item) => (
            <Card key={item.strategyId} sx={{ p: 2 }}>
              <Typography variant="subtitle1" noWrap>
                {item.strategyName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.strategyId}
              </Typography>
              <Box sx={{ mt: 2, display: 'grid', gap: 1.25 }}>
                <Metric label="信号总数" value={String(item.aggregateStats?.totalSignals ?? '—')} />
                <Metric
                  label="买入:卖出"
                  value={`${item.aggregateStats?.buyCount ?? 0} : ${item.aggregateStats?.sellCount ?? 0}`}
                />
                <Metric
                  label={`准确率 T+${forwardWindow}`}
                  value={
                    item.aggregateStats?.accuracy
                      ? `${(item.aggregateStats.accuracy.rate * 100).toFixed(1)}%`
                      : '待结算'
                  }
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    平均超额
                  </Typography>
                  <SignalReturnText value={item.aggregateStats?.avgExcessReturn?.value} />
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function parseIds(value: string | null) {
  return value ? value.split(',').filter(Boolean).slice(0, 3) : [];
}

function parseWindow(value: string | null): SignalForwardWindow {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 20) return numeric;
  return 5;
}

function defaultStartDate() {
  return dayjs().subtract(29, 'day').format('YYYYMMDD');
}

function toDisplayDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function findStrategyName(activations: SignalActivationItem[], strategyId: string) {
  return (
    activations.find((activation) => activation.strategyId === strategyId)?.strategyName ??
    strategyId
  );
}
