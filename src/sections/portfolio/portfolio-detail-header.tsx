import type { PortfolioDetail } from 'src/api/portfolio';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PortfolioDetailHeaderProps {
  detail: PortfolioDetail;
  onEdit: () => void;
  onDelete: () => void;
}

export function PortfolioDetailHeader({ detail, onEdit, onDelete }: PortfolioDetailHeaderProps) {
  const router = useRouter();
  const { portfolio } = detail;

  return (
    <Box sx={{ mb: 3 }}>
      <Button
        startIcon={<Iconify icon="solar:arrow-left-bold" />}
        onClick={() => router.push('/portfolio')}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        返回列表
      </Button>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            {portfolio.name}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              初始资金：{fCurrency(portfolio.initialCash)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              持仓：{detail.holdings.length} 只
            </Typography>
            <Typography variant="body2" color="text.secondary">
              创建时间：{fDate(portfolio.createdAt, 'YYYY-MM-DD')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={onEdit}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
          <IconButton onClick={onDelete} color="error">
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
