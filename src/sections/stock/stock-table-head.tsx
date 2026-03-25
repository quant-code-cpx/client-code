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
            sx={{ minWidth: headCell.minWidth }}
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
