import type { TushareSyncPlan } from 'src/api/tushare-sync';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const CATEGORY_LABEL: Record<string, string> = {
  basic: '基础数据',
  market: '市场行情',
  financial: '财务数据',
  moneyflow: '资金流数据',
  factor: '因子数据',
  alternative: '另类数据',
  fund: '基金数据',
  macro: '宏观数据',
  option: '期权数据',
};

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  { value: 'basic', label: '基础数据' },
  { value: 'market', label: '市场行情' },
  { value: 'financial', label: '财务数据' },
  { value: 'moneyflow', label: '资金流数据' },
  { value: 'factor', label: '因子数据' },
  { value: 'alternative', label: '另类数据' },
  { value: 'fund', label: '基金数据' },
  { value: 'macro', label: '宏观数据' },
  { value: 'option', label: '期权数据' },
];

// ----------------------------------------------------------------------

const DOW_NAMES: Record<string, string> = {
  '0': '周日',
  '1': '周一',
  '2': '周二',
  '3': '周三',
  '4': '周四',
  '5': '周五',
  '6': '周六',
};

/** Translate a 6-field cron (sec min hour dom mon dow) to Chinese */
function cronToChinese(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 6) return cron;

  const [_sec, min, hour, dom, _mon, dow] = parts;

  // Build time string
  let timeStr = '';
  if (hour !== '*' && min !== '*') {
    timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  } else if (hour !== '*') {
    timeStr = `${hour.padStart(2, '0')}:00`;
  } else if (min !== '*') {
    timeStr = `每小时第${min}分`;
  } else {
    return cron;
  }

  // Build day prefix
  let prefix = '';
  if (dow === '*' && dom === '*') {
    prefix = '每天';
  } else if (dow === '1-5') {
    prefix = '工作日';
  } else if (dow === '0-6') {
    prefix = '每天';
  } else if (/^\d$/.test(dow)) {
    prefix = DOW_NAMES[dow] ?? `周${dow}`;
  } else if (dom !== '*') {
    prefix = `每月${dom}日`;
  } else {
    prefix = '每天';
  }

  return `${prefix} ${timeStr}`;
}

// ----------------------------------------------------------------------

export function DashboardSystemStatus() {
  const [plans, setPlans] = useState<TushareSyncPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    tushareSyncApi
      .getPlans()
      .then((res) => {
        if (!cancelled) setPlans(res ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载同步计划失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlans = useMemo(() => {
    let result = plans;
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.label.toLowerCase().includes(q) || p.task.toLowerCase().includes(q)
      );
    }
    return result;
  }, [plans, categoryFilter, search]);

  return (
    <Card>
      <CardContent>
        {/* Header + Filters */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">数据同步状态</Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                displayEmpty
                sx={{ fontSize: 13 }}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="搜索任务名称…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 180 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" width={16} sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="text" height={36} />
            ))}
          </>
        ) : filteredPlans.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {plans.length === 0 ? '暂无同步计划' : '无匹配结果'}
            </Typography>
          </Box>
        ) : (
          <Scrollbar sx={{ maxHeight: 400 }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>任务名称</TableCell>
                    <TableCell>分类</TableCell>
                    <TableCell>调度时间</TableCell>
                    <TableCell align="center">状态</TableCell>
                    <TableCell>说明</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlans.map((plan) => {
                    const cronRaw = plan.schedule?.cron ?? '';
                    const cronCn = cronRaw ? cronToChinese(cronRaw) : '—';

                    return (
                      <TableRow key={plan.task} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight="fontWeightMedium"
                            sx={{ fontSize: 13 }}
                          >
                            {plan.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.disabled', fontSize: 12 }}
                          >
                            {plan.task}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {CATEGORY_LABEL[plan.category] ?? plan.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12 }}>
                            {cronCn}
                          </Typography>
                          {cronRaw && cronCn !== cronRaw && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                color: 'text.disabled',
                                fontFamily: 'monospace',
                                fontSize: 12,
                              }}
                            >
                              {cronRaw}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: plan.bootstrapEnabled ? 'success.main' : 'text.disabled',
                              display: 'inline-block',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {[
                              plan.supportsManual ? '支持手动' : null,
                              plan.supportsFullSync ? '全量' : null,
                            ]
                              .filter(Boolean)
                              .join(' / ')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        )}
      </CardContent>
    </Card>
  );
}
