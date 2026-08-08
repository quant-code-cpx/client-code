import type { ScreenerFilters, StockScreenerItem } from 'src/api/screener';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import TablePagination from '@mui/material/TablePagination';

import { SCREENER_PAGE_SIZE_OPTIONS } from './constants';
import { ScreenerEvidenceCard } from './screener-evidence-card';

// ----------------------------------------------------------------------

type ScreenerEvidenceListProps = {
  items: StockScreenerItem[];
  total: number;
  page: number;
  rowsPerPage: number;
  loading: boolean;
  executedFilters: ScreenerFilters;
  conceptNames?: Record<string, string>;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (size: number) => void;
};

// ----------------------------------------------------------------------

export function ScreenerEvidenceList({
  items,
  total,
  page,
  rowsPerPage,
  loading,
  executedFilters,
  conceptNames = {},
  onPageChange,
  onRowsPerPageChange,
}: ScreenerEvidenceListProps) {
  return (
    <Box>
      {loading ? (
        <Stack spacing={1.5} sx={{ p: 2 }}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={190} />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Box sx={{ px: 2, py: 6, textAlign: 'center' }}>
          <Typography variant="subtitle1">没有符合全部条件的股票</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            当前结果遵循严格 AND 匹配。
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5} sx={{ p: { xs: 1.5, sm: 2 } }}>
          {items.map((item) => (
            <ScreenerEvidenceCard
              key={item.tsCode}
              item={item}
              executedFilters={executedFilters}
              conceptNames={conceptNames}
            />
          ))}
        </Stack>
      )}

      <TablePagination
        component="div"
        page={page}
        count={total}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPageOptions={SCREENER_PAGE_SIZE_OPTIONS}
        onRowsPerPageChange={(event) => onRowsPerPageChange(parseInt(event.target.value, 10))}
        labelRowsPerPage="每页数量"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 只`}
      />
    </Box>
  );
}
