import { varAlpha } from 'minimal-shared/utils';

import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import { useTheme } from '@mui/material/styles';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';

import type { ColumnId, HeadCell } from './types';

// ----------------------------------------------------------------------

type StockTableHeadProps = {
  order: 'asc' | 'desc';
  orderBy: string;
  onSort: (id: string) => void;
  headLabel: HeadCell[];
  visibleColumns: ColumnId[];
  numSelected: number;
  rowCount: number;
  onSelectAll: (checked: boolean) => void;
};

export function StockTableHead({
  order,
  orderBy,
  onSort,
  headLabel,
  visibleColumns,
  numSelected,
  rowCount,
  onSelectAll,
}: StockTableHeadProps) {
  const theme = useTheme();
  const stickyShadow = `2px 0 6px -2px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`;

  const cells = headLabel.filter(
    (h) => h.id === 'name' || visibleColumns.includes(h.id as ColumnId)
  );

  return (
    <TableHead>
      <TableRow>
        <TableCell
          padding="checkbox"
          sx={{
            position: 'sticky',
            left: 0,
            zIndex: 4,
            bgcolor: 'background.neutral',
          }}
        >
          <Checkbox
            size="small"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={(e) => onSelectAll(e.target.checked)}
            slotProps={{ input: { 'aria-label': '全选当前页股票' } }}
          />
        </TableCell>

        {cells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align ?? 'left'}
            sortDirection={headCell.sortable === true && orderBy === headCell.id ? order : false}
            sx={{
              minWidth: headCell.minWidth,
              ...(headCell.sticky === true && {
                position: 'sticky',
                left: 48,
                zIndex: 3,
                bgcolor: 'background.neutral',
                boxShadow: stickyShadow,
              }),
            }}
          >
            {headCell.sortable === true ? (
              <TableSortLabel
                hideSortIcon
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={() => onSort(headCell.id)}
              >
                {headCell.label}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
