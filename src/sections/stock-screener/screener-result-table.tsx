import type { StockScreenerItem } from 'src/api/screener';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { Scrollbar } from 'src/components/scrollbar';

import { SCREENER_HEAD_CELLS } from './constants';
import { ScreenerResultTableRow } from './screener-result-table-row';
import { ScreenerResultTableHead } from './screener-result-table-head';

// ----------------------------------------------------------------------

type ScreenerResultTableProps = {
  items: StockScreenerItem[];
  total: number;
  page: number;
  rowsPerPage: number;
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (size: number) => void;
  onSort: (field: string) => void;
  /** 显示哪些列的 id 集合 */
  visibleColumns: string[];
};

// ----------------------------------------------------------------------

export function ScreenerResultTable({
  items,
  total,
  page,
  rowsPerPage,
  loading,
  sortBy,
  sortOrder,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  visibleColumns,
}: ScreenerResultTableProps) {
  const visibleSet = new Set(visibleColumns);

  // 按 SCREENER_HEAD_CELLS 顺序过滤出需要显示的列（name 列始终显示）
  const headCells = SCREENER_HEAD_CELLS.filter(
    (c) => c.id === 'name' || visibleSet.has(c.id)
  );

  return (
    <>
      <Scrollbar>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <ScreenerResultTableHead
              order={sortOrder}
              orderBy={sortBy}
              onSort={onSort}
              headCells={headCells}
            />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <ScreenerResultTableRow
                    key={row.tsCode}
                    row={row}
                    visibleColumns={visibleColumns}
                  />
                ))
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
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPageOptions={[10, 20, 50]}
        onRowsPerPageChange={(e) => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
        }}
        labelRowsPerPage="每页行数"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
      />
    </>
  );
}
