import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

// ----------------------------------------------------------------------

type StockSkeletonRowsProps = {
  rowCount: number;
  colCount: number;
};

export function StockSkeletonRows({ rowCount, colCount }: StockSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={`stock-skeleton-${rowIndex}`}>
          {Array.from({ length: colCount }).map((__, colIndex) => (
            <TableCell key={`stock-skeleton-${rowIndex}-${colIndex}`}>
              <Skeleton variant="text" width="80%" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
