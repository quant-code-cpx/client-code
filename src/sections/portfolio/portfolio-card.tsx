import type { PortfolioListItem } from 'src/api/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PortfolioCardProps {
  portfolio: PortfolioListItem;
  onView: (id: string) => void;
  onEdit: (portfolio: PortfolioListItem) => void;
  onDelete: (portfolio: PortfolioListItem) => void;
}

export function PortfolioCard({ portfolio, onView, onEdit, onDelete }: PortfolioCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 0.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
          onClick={() => onView(portfolio.id)}
        >
          {portfolio.name}
        </Typography>

        {portfolio.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {portfolio.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            初始资金：{fCurrency(portfolio.initialCash)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            持仓：{portfolio.holdingCount} 只
          </Typography>
          <Typography variant="caption" color="text.secondary">
            创建：{fDate(portfolio.createdAt, 'YYYY-MM-DD')}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button size="small" onClick={() => onView(portfolio.id)}>
          查看详情
        </Button>
        <IconButton size="small" onClick={handleMenuOpen}>
          <Iconify icon="solar:menu-dots-bold" width={20} />
        </IconButton>
      </CardActions>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onEdit(portfolio);
          }}
        >
          <Iconify icon="solar:pen-bold" width={16} sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onDelete(portfolio);
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" width={16} sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </Card>
  );
}
