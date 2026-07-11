import type { Dayjs } from 'dayjs';
import type { StockSearchItem } from 'src/api/stock';
import type {
  SignalRule,
  SignalType,
  SignalHistoryItem,
  SignalHistoryResult,
} from 'src/api/event-study';

import { useState, Fragment, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { querySignals, listSignalRules } from 'src/api/event-study';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

import { DataState } from './_shared/data-state';
import { EVENT_TYPE_LABELS, SIGNAL_TYPE_CONFIG } from './constants';

// ----------------------------------------------------------------------

export function SignalHistoryTab() {
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [ruleId, setRuleId] = useState<number | ''>('');
  const [signalType, setSignalType] = useState<SignalType | ''>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const [rules, setRules] = useState<SignalRule[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignalHistoryResult | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 加载规则下拉
  useEffect(() => {
    listSignalRules({ page: 1, pageSize: 200 })
      .then((d) => setRules(d.items ?? []))
      .catch(() => undefined);
  }, []);

  const fetchSignals = useCallback(
    async (p: number, ps: number) => {
      setLoading(true);
      setError('');
      try {
        const data = await querySignals({
          page: p + 1,
          pageSize: ps,
          tsCode: selectedStock?.tsCode || undefined,
          ruleId: ruleId === '' ? undefined : ruleId,
          signalType: signalType === '' ? undefined : signalType,
          startDate: startDate ? startDate.format('YYYYMMDD') : undefined,
          endDate: endDate ? endDate.format('YYYYMMDD') : undefined,
        });
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查询失败');
      } finally {
        setLoading(false);
      }
    },
    [selectedStock, ruleId, signalType, startDate, endDate]
  );

  useEffect(() => {
    fetchSignals(0, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuery = () => {
    setPage(0);
    fetchSignals(0, pageSize);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchSignals(newPage, pageSize);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ps = Number(e.target.value);
    setPageSize(ps);
    setPage(0);
    fetchSignals(0, ps);
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const eventTypeLabelFor = (type: string) =>
    EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type;

  const renderEventDetail = (item: SignalHistoryItem) => (
    <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        事件详情
      </Typography>
      <Box
        component="pre"
        sx={{ m: 0, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
      >
        {JSON.stringify(item.eventDetail, null, 2)}
      </Box>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StockSearchAutocomplete
              label="股票代码"
              value={selectedStock}
              onChange={(item) => setSelectedStock(item)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>所属规则</InputLabel>
              <Select
                value={ruleId === '' ? '' : String(ruleId)}
                label="所属规则"
                onChange={(e) => {
                  const v = e.target.value;
                  setRuleId(v === '' ? '' : Number(v));
                }}
              >
                <MenuItem value="">不限</MenuItem>
                {rules.map((r) => (
                  <MenuItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>信号类型</InputLabel>
              <Select
                value={signalType}
                label="信号类型"
                onChange={(e) => setSignalType(e.target.value as SignalType | '')}
              >
                <MenuItem value="">不限</MenuItem>
                <MenuItem value="BUY">买入</MenuItem>
                <MenuItem value="SELL">卖出</MenuItem>
                <MenuItem value="WATCH">观察</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <DatePicker
              label="开始日期"
              value={startDate}
              onChange={(v) => setStartDate(v)}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <DatePicker
              label="结束日期"
              value={endDate}
              onChange={(v) => setEndDate(v)}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" onClick={handleQuery}>
                查询
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <DataState
          loading={loading}
          empty={!loading && (result?.items.length ?? 0) === 0}
          emptyText="暂无信号历史"
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ width: 60 }}>ID</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>规则</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>事件类型</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>股票</TableCell>
                  <TableCell sx={{ minWidth: 90 }}>信号</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>事件日期</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>触发时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result?.items.map((item) => {
                  const cfg = SIGNAL_TYPE_CONFIG[item.signalType];
                  const isOpen = expanded.has(item.id);
                  return (
                    <Fragment key={item.id}>
                      <TableRow hover>
                        <TableCell>
                          <Tooltip title="展开行">
                            <IconButton
                              aria-label="展开行"
                              size="small"
                              onClick={() => toggleExpand(item.id)}
                            >
                              <Iconify
                                icon={
                                  isOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'
                                }
                                width={16}
                              />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>{item.rule?.name ?? '-'}</TableCell>
                        <TableCell>
                          <Label color="default">
                            {eventTypeLabelFor(item.rule?.eventType ?? '')}
                          </Label>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.tsCode}</Typography>
                          {item.stockName && (
                            <Typography variant="caption" color="text.secondary">
                              {item.stockName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Label color={cfg.color as 'success' | 'error' | 'info'}>
                            {cfg.label}
                          </Label>
                        </TableCell>
                        <TableCell>{item.eventDate}</TableCell>
                        <TableCell>
                          {item.triggeredAt
                            ? new Date(item.triggeredAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isOpen}>
                            <Box sx={{ p: 2 }}>{renderEventDetail(item)}</Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={result?.total ?? 0}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[20, 50, 100]}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            labelRowsPerPage="每页行数"
          />
        </DataState>
      </Card>
    </Stack>
  );
}
