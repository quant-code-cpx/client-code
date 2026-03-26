import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';

import type { HeadCell } from './types';

// ----------------------------------------------------------------------

type StockTableHeadProps = {
  order: 'asc' | 'desc';
  orderBy: string;
  onSort: (id: string) => void;
  headLabel: HeadCell[];
};

export function StockTableHead({ order, orderBy, onSort, headLabel }: StockTableHeadProps) {
  return (
    <TableHead>
      <TableRow>
        {headLabel.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align ?? 'left'}
            sortDirection={headCell.sortable && orderBy === headCell.id ? order : false}
            sx={{
              minWidth: headCell.minWidth,
              ...(headCell.sticky && {
                position: 'sticky',
                left: 0,
                zIndex: 3,
                bgcolor: 'background.neutral',
                boxShadow: '2px 0 6px -2px rgba(0,0,0,0.12)',
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
