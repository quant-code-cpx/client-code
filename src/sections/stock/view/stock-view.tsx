import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { _stocks } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';

import { Scrollbar } from 'src/components/scrollbar';

import { StockTableRow } from '../stock-table-row';
import { StockTableHead } from '../stock-table-head';
import { StockTableToolbar } from '../stock-table-toolbar';

import type { StockRowProps } from '../stock-table-row';
import type { StockFilters } from '../stock-table-toolbar';

// ----------------------------------------------------------------------

const HEAD_LABELS = [
  { id: 'name', label: '股票名称 / 代码', minWidth: 160 },
  { id: 'exchange', label: '交易所' },
  { id: 'market', label: '板块' },
  { id: 'industry', label: '行业' },
  { id: 'pctChg', label: '涨跌幅', align: 'right' as const, minWidth: 90 },
  { id: 'peTtm', label: '市盈率(TTM)', align: 'right' as const, minWidth: 110 },
  { id: 'pb', label: '市净率', align: 'right' as const },
  { id: 'dvTtm', label: '股息率(TTM)', align: 'right' as const, minWidth: 110 },
  { id: 'totalMv', label: '总市值', align: 'right' as const },
  { id: 'turnoverRate', label: '换手率', align: 'right' as const },
  { id: 'close', label: '最新价', align: 'right' as const },
];

function applySort(data: StockRowProps[], orderBy: string, order: 'asc' | 'desc') {
  return [...data].sort((a, b) => {
    const aVal = (a[orderBy as keyof StockRowProps] as number | null) ?? -Infinity;
    const bVal = (b[orderBy as keyof StockRowProps] as number | null) ?? -Infinity;
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });
}

function applyFilters(data: StockRowProps[], filters: StockFilters): StockRowProps[] {
  return data.filter((row) => {
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      if (
        !row.name.toLowerCase().includes(kw) &&
        !row.tsCode.toLowerCase().includes(kw) &&
        !row.symbol.toLowerCase().includes(kw)
      ) {
        return false;
      }
    }
    if (filters.exchange && filters.exchange !== '全部' && row.exchange !== filters.exchange) {
      return false;
    }
    if (filters.market && filters.market !== '全部' && row.market !== filters.market) {
      return false;
    }
    if (filters.industry && filters.industry !== '全部' && row.industry !== filters.industry) {
      return false;
    }
    return true;
  });
}

// ----------------------------------------------------------------------

export function StockView() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('totalMv');
  const [filters, setFilters] = useState<StockFilters>({
    keyword: '',
    exchange: '',
    market: '',
    industry: '',
  });

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

  const filtered = applyFilters(_stocks as StockRowProps[], filters);
  const sorted = applySort(filtered, orderBy, order);
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        股票
      </Typography>

      <Card>
        <StockTableToolbar filters={filters} onFilterChange={handleFilterChange} />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 960 }}>
              <StockTableHead
                order={order}
                orderBy={orderBy}
                onSort={handleSort}
                headLabel={HEAD_LABELS}
              />
              <TableBody>
                {paginated.map((row) => (
                  <StockTableRow key={row.tsCode} row={row} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={page}
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPageOptions={[5, 10, 20]}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>
    </DashboardContent>
  );
}
