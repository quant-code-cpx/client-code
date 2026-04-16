import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import type { EmptyContentProps, TableEmptyRowProps } from './types';

// ----------------------------------------------------------------------

/**
 * General-purpose empty state for cards, boxes, and containers.
 */
export function EmptyContent({ title = '暂无数据', description, action, sx }: EmptyContentProps) {
  return (
    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary', ...sx }}>
      <Typography variant="body1">{title}</Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

// ----------------------------------------------------------------------

/**
 * Empty-state row for MUI Table > TableBody.
 * Renders a single row spanning all columns with a centered message.
 */
export function TableEmptyRow({ colSpan, message = '暂无数据' }: TableEmptyRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 5, color: 'text.secondary' }}>
        {message}
      </TableCell>
    </TableRow>
  );
}
