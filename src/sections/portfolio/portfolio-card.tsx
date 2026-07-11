import type { MouseEvent } from 'react';
import type { PortfolioListItem, PortfolioSparklinePoint } from 'src/api/portfolio';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';

import {
  fSignedRatio,
  fNullableRatio,
  fSignedCurrency,
  fNullableCurrency,
  fPortfolioUpdatedAt,
  getPortfolioValueTone,
} from 'src/utils/format-portfolio';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PortfolioCardProps {
  portfolio: PortfolioListItem;
  onView: (id: string) => void;
  onEdit: (portfolio: PortfolioListItem) => void;
  onDelete: (portfolio: PortfolioListItem) => void;
}

function toSparklineValues(points: PortfolioSparklinePoint[] | undefined): number[] {
  return (points ?? [])
    .map((point) => point.nav)
    .filter((value): value is number => value !== null && !Number.isNaN(value));
}

function MiniSparkline({ points, color }: { points?: PortfolioSparklinePoint[]; color: string }) {
  const values = useMemo(() => toSparklineValues(points), [points]);

  const polyline = useMemo(() => {
    if (values.length < 2) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 36 - ((value - min) / range) * 32;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values]);

  if (!polyline) {
    return (
      <Box
        sx={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          等待净值曲线
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="svg"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      sx={{ width: 1, height: 44, color }}
    >
      <polyline fill="none" points={polyline} stroke="currentColor" strokeWidth={2.4} />
    </Box>
  );
}

export function PortfolioCard({ portfolio, onView, onEdit, onDelete }: PortfolioCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const kind = portfolio.kind ?? 'PAPER';
  const isArchived = Boolean(portfolio.isArchived);
  const todayPnl = portfolio.todayPnl ?? null;
  const todayPnlPct = portfolio.todayPnlPct ?? null;
  const pnlFallback = portfolio.isTradingDay === false ? '非交易日' : '--';
  const valueTone = getPortfolioValueTone(todayPnl);
  const accentColor = isArchived
    ? 'text.disabled'
    : kind === 'LIVE'
      ? 'primary.main'
      : 'secondary.main';
  const updatedAt = portfolio.lastUpdated ?? portfolio.updatedAt ?? portfolio.createdAt;
  const totalMarketValue = portfolio.totalMarketValue ?? portfolio.initialCash;
  const cumulativeReturn = portfolio.cumulativeReturn ?? null;

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        borderLeft: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        flexDirection: 'column',
        borderLeftColor: accentColor,
        opacity: isArchived ? 0.68 : 1,
        transition: (theme) => theme.transitions.create(['box-shadow', 'transform']),
        '&:hover': { boxShadow: 8, transform: 'translateY(-2px)' },
      }}
      onClick={() => onView(portfolio.id)}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {portfolio.name}
              </Typography>
              <Label color={kind === 'LIVE' ? 'primary' : 'secondary'} variant="soft">
                {kind === 'LIVE' ? '实盘' : '模拟'}
              </Label>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {isArchived ? '已归档' : `${fPortfolioUpdatedAt(updatedAt)} 更新`}
            </Typography>
          </Box>
          <Tooltip title="更多操作">
            <IconButton
              size="small"
              aria-label="更多操作"
              onClick={(event) => {
                event.stopPropagation();
                handleMenuOpen(event);
              }}
            >
              <Iconify icon="solar:menu-dots-bold" width={20} />
            </IconButton>
          </Tooltip>
        </Stack>

        {portfolio.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {portfolio.description}
          </Typography>
        )}

        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: valueTone, fontWeight: 700 }}>
              {fSignedCurrency(todayPnl, pnlFallback)}
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                今日盈亏
              </Typography>
              <Typography variant="caption" sx={{ color: valueTone, fontWeight: 600 }}>
                {fSignedRatio(todayPnlPct, pnlFallback)}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                总市值
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fNullableCurrency(totalMarketValue)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                累计收益
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: getPortfolioValueTone(cumulativeReturn) }}
              >
                {fNullableRatio(cumulativeReturn)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                持仓
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {portfolio.holdingCount} 只
              </Typography>
            </Box>
          </Stack>

          <MiniSparkline points={portfolio.sparkline} color={valueTone} />
        </Stack>
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onView(portfolio.id);
          }}
        >
          查看详情
        </Button>
        <Typography variant="caption" sx={{ color: 'text.secondary', pr: 1 }}>
          {fNullableCurrency(portfolio.initialCash)} 初始资金
        </Typography>
      </CardActions>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onEdit(portfolio);
          }}
        >
          <Iconify icon="solar:pen-bold" width={16} sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem disabled>
          <Iconify icon="solar:copy-bold" width={16} sx={{ mr: 1 }} />
          复制（待后端）
        </MenuItem>
        <MenuItem disabled>
          <Iconify icon="solar:archive-bold" width={16} sx={{ mr: 1 }} />
          归档（待后端）
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
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
