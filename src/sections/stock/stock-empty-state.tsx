import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type StockEmptyStateProps = {
  onClearFilters: () => void;
  onOpenScreener: () => void;
};

export function StockEmptyState({ onClearFilters, onOpenScreener }: StockEmptyStateProps) {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Stack spacing={1.5} alignItems="center">
        <Iconify
          icon="solar:filter-bold"
          width={48}
          sx={{ color: 'text.disabled', opacity: 0.6 }}
        />

        <Typography variant="subtitle1">未找到匹配的股票</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
          当前筛选条件下没有命中任何标的。建议放宽行业或地域条件，或使用选股器构建多因子组合。
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button variant="outlined" onClick={onClearFilters}>
            清空筛选条件
          </Button>

          <Button
            variant="contained"
            startIcon={<Iconify icon="ic:round-filter-list" />}
            onClick={onOpenScreener}
          >
            打开选股器
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
