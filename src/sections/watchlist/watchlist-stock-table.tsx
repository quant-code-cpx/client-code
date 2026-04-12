import type { DragEndEvent } from '@dnd-kit/core';
import type { WatchlistStock } from 'src/api/watchlist';

import { useMemo, useCallback } from 'react';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  useSensor,
  DndContext,
  useSensors,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';

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
  onReorder: (reordered: WatchlistStock[]) => void;
};

export function WatchlistStockTable({
  stocks,
  loading,
  selectedIds,
  onSelectAll,
  onSelect,
  onEdit,
  onRemove,
  onReorder,
}: WatchlistStockTableProps) {
  const allSelected = stocks.length > 0 && selectedIds.length === stocks.length;
  const indeterminate = selectedIds.length > 0 && selectedIds.length < stocks.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const stockIds = useMemo(() => stocks.map((s) => s.id), [stocks]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = stocks.findIndex((s) => s.id === active.id);
      const newIndex = stocks.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onReorder(arrayMove(stocks, oldIndex, newIndex));
    },
    [stocks, onReorder]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset' }}>
          <Table sx={{ minWidth: 840 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 36, px: 1 }} /> {/* 拖拽手柄列 */}
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
              <SortableContext items={stockIds} strategy={verticalListSortingStrategy}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton width={j === 9 ? 60 : '80%'} />
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
              </SortableContext>

              {!loading && stocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
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
    </DndContext>
  );
}
