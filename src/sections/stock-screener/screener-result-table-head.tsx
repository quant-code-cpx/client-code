import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';

import type { HeadCell } from './types';

// ----------------------------------------------------------------------

type ScreenerResultTableHeadProps = {
  order: 'asc' | 'desc';
  orderBy: string;
  onSort: (id: string) => void;
  headCells: HeadCell[];
};

// ----------------------------------------------------------------------

export function ScreenerResultTableHead({
  order,
  orderBy,
  onSort,
  headCells,
}: ScreenerResultTableHeadProps) {
  return (
    <TableHead>
      <TableRow>
        {headCells.map((cell) => (
          <TableCell
            key={cell.id}
            align={cell.align ?? 'left'}
            sortDirection={cell.sortable === true && orderBy === cell.id ? order : false}
            sx={{
              minWidth: cell.minWidth,
              whiteSpace: 'nowrap',
              ...(cell.sticky === true && {
                position: 'sticky',
                left: 0,
                zIndex: 3,
                bgcolor: 'background.neutral',
                boxShadow: '2px 0 6px -2px rgba(0,0,0,0.12)',
              }),
            }}
          >
            {cell.sortable === true ? (
              <TableSortLabel
                hideSortIcon
                active={orderBy === cell.id}
                direction={orderBy === cell.id ? order : 'asc'}
                onClick={() => onSort(cell.id)}
              >
                {cell.label}
              </TableSortLabel>
            ) : (
              cell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
