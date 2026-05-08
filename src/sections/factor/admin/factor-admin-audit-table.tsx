import type { AdminAuditItem } from 'src/api/factor';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { adminAuditLog } from 'src/api/factor';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ADMIN_AUDIT_ACTION_LABELS } from '../constants';

// ─── Types ────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function FactorAdminAuditTable() {
  const [items, setItems] = useState<AdminAuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterOperator, setFilterOperator] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAuditLog({
        page: page + 1,
        pageSize: PAGE_SIZE,
        operatorId: filterOperator || undefined,
        action: (filterAction || undefined) as AdminAuditItem['action'] | undefined,
        startDate: filterFrom || undefined,
        endDate: filterTo || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterOperator, filterAction, filterFrom, filterTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Box>
      {/* Filter row */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" alignItems="flex-end">
        <TextField
          size="small"
          label="操作者"
          value={filterOperator}
          onChange={(e) => {
            setFilterOperator(e.target.value);
            setPage(0);
          }}
          sx={{ width: 140 }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>操作类型</InputLabel>
          <Select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(0);
            }}
            label="操作类型"
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(ADMIN_AUDIT_ACTION_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="date"
          size="small"
          label="从"
          value={filterFrom}
          onChange={(e) => {
            setFilterFrom(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 148 }}
        />
        <TextField
          type="date"
          size="small"
          label="至"
          value={filterTo}
          onChange={(e) => {
            setFilterTo(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 148 }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={fetchData}
          startIcon={<Iconify icon="solar:refresh-bold" />}
        >
          刷新
        </Button>
      </Stack>

      {loading && <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>操作者</TableCell>
                  <TableCell>操作类型</TableCell>
                  <TableCell>影响因子</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>结果</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        暂无审计记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item, idx) => (
                  <TableRow key={`${item.createdAt}-${idx}`} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>{item.operator}</TableCell>
                    <TableCell>
                      <Label color="default" variant="soft">
                        {ADMIN_AUDIT_ACTION_LABELS[item.action] ?? item.action}
                      </Label>
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                      }}
                    >
                      <Tooltip title={(item.factorNames ?? []).join(', ')}>
                        <span>{(item.factorNames ?? []).join(', ')}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {item.ip ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Label color={item.success ? 'success' : 'error'} variant="soft">
                        {item.success ? '成功' : '失败'}
                      </Label>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, p) => setPage(p)}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          />
        </>
      )}
    </Box>
  );
}
