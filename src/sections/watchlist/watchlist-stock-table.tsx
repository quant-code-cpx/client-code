import type { WatchlistStock } from 'src/api/watchlist';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar } from 'src/components/scrollbar';

import { WatchlistStockTableRow } from './watchlist-stock-table-row';

// ----------------------------------------------------------------------

type WatchlistStockTableProps = {
  stocks: WatchlistStock[];
  loading: boolean;
  selectedIds: number[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: number) => void;
  onEdit: (row: WatchlistStock) => void;
  onRemove: (id: number) => void;
};

export function WatchlistStockTable({
  stocks,
  loading,
  selectedIds,
  onSelectAll,
  onSelect,
  onEdit,
  onRemove,
}: WatchlistStockTableProps) {
  const allSelected = stocks.length > 0 && selectedIds.length === stocks.length;
  const indeterminate = selectedIds.length > 0 && selectedIds.length < stocks.length;

  return (
    <Scrollbar>
      <TableContainer sx={{ overflow: 'unset' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 80 }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  size="small"
                />
              </TableCell>
              <TableCell>名称/代码</TableCell>
              <TableCell align="right">现价</TableCell>
              <TableCell align="right">涨跌幅</TableCell>
              <TableCell align="right">成交量</TableCell>
              <TableCell align="right">PE</TableCell>
              <TableCell align="right">PB</TableCell>
              <TableCell align="right">目标价</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton width={j === 8 ? 60 : '80%'} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : stocks.map((stock) => (
                  <WatchlistStockTableRow
                    key={stock.id}
                    row={stock}
                    selected={selectedIds.includes(stock.id)}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onRemove={onRemove}
                  />
                ))}

            {!loading && stocks.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      暂无自选股，点击「添加股票」开始添加
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
