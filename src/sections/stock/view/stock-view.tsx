import type { StockListItem } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { stockApi } from 'src/api/stock';
import { DashboardContent } from 'src/layouts/dashboard';

import { Scrollbar } from 'src/components/scrollbar';

import { StockTableRow } from '../stock-table-row';
import { SORT_BY, HEAD_LABELS } from '../constants';
import { StockTableHead } from '../stock-table-head';
import { StockTableToolbar } from '../stock-table-toolbar';

import type { StockFilters } from '../types';

// ----------------------------------------------------------------------

const DEFAULT_FILTERS: StockFilters = {
  keyword: '',
  exchange: '',
  market: '',
  industry: '',
  area: '',
};

// ----------------------------------------------------------------------

export function StockView() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>(SORT_BY.TOTAL_MV);
  const [filters, setFilters] = useState<StockFilters>(DEFAULT_FILTERS);

  const [rows, setRows] = useState<StockListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await stockApi.list({
        page: page + 1,
        pageSize: rowsPerPage,
        sortBy: orderBy,
        sortOrder: order,
        listStatus: 'L',
        keyword: filters.keyword.trim() || undefined,
        exchange: filters.exchange || undefined,
        market: filters.market || undefined,
        industry: filters.industry.trim() || undefined,
        area: filters.area.trim() || undefined,
      });
      setRows(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取股票列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, order, orderBy, filters]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
      setPage(0);
    },
    [order, orderBy]
  );

  const handleFilterChange = useCallback((changed: Partial<StockFilters>) => {
    setFilters((prev) => ({ ...prev, ...changed }));
    setPage(0);
  }, []);

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        股票
      </Typography>

      <Card>
        <StockTableToolbar filters={filters} onFilterChange={handleFilterChange} />

        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 1200 }}>
              <StockTableHead
                order={order}
                orderBy={orderBy}
                onSort={handleSort}
                headLabel={HEAD_LABELS}
              />
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={HEAD_LABELS.length} align="center" sx={{ py: 5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={28} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => <StockTableRow key={row.tsCode} row={row} />)
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={page}
          count={total}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPageOptions={[10, 20, 50]}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
        />
      </Card>
    </DashboardContent>
  );
}
