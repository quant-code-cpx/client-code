import type { MouseEvent } from 'react';
import type { ComparisonListItem } from 'src/api/backtest';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardActionArea from '@mui/material/CardActionArea';

import { fNumber } from 'src/utils/format-number';
import { fDate, fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STATUS_COLOR, STATUS_LABEL, normalizeDisplayDate } from './constants';

// ----------------------------------------------------------------------

type Props = {
  item: ComparisonListItem;
  onView: (groupId: string) => void;
};

function formatRangeDate(value: string) {
  const normalized = normalizeDisplayDate(value);
  if (!normalized) return '—';
  return fDate(normalized, 'YYYY-MM-DD');
}

function canCancel(status: string) {
  return status === 'QUEUED' || status === 'RUNNING';
}

export function ComparisonListCard({ item, onView }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const statusColor = STATUS_COLOR[item.status] ?? 'default';
  const title = item.name || '未命名策略对比';
  const bestLabel = item.bestStrategyLabel ? ` · ${item.bestStrategyLabel}` : '';
  const hasBestSharpe = item.bestSharpe !== null && item.bestSharpe !== undefined;

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        height: 1,
        position: 'relative',
        borderLeft: 2,
        borderLeftColor: `${statusColor}.main`,
      }}
    >
      <CardActionArea
        onClick={() => onView(item.groupId)}
        sx={{ height: 1, alignItems: 'stretch' }}
      >
        <Stack spacing={2} sx={{ p: 2.5, height: 1 }}>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap title={title}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                {formatRangeDate(item.startDate)} ~ {formatRangeDate(item.endDate)} ·{' '}
                {item.benchmarkTsCode}
              </Typography>
            </Box>
            <Label color={statusColor}>{STATUS_LABEL[item.status] ?? item.status}</Label>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Label variant="soft" color="info">
              {item.strategyCount} 策略
            </Label>
            {item.failedCount ? (
              <Label variant="soft" color="error">
                {item.failedCount} 失败
              </Label>
            ) : null}
            {item.progress !== null && item.progress !== undefined && item.status === 'RUNNING' ? (
              <Label variant="soft" color="warning">
                进度 {fNumber(item.progress)}%
              </Label>
            ) : null}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {hasBestSharpe
                ? `最优 Sharpe ${fNumber(item.bestSharpe)}${bestLabel}`
                : '等待指标产出'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              创建于 {fDateTime(item.createdAt)}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>

      <Tooltip title="对比任务操作">
        <IconButton
          size="small"
          aria-label="对比任务操作"
          onClick={handleMenuOpen}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <Iconify icon="solar:menu-dots-bold" width={18} />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem disabled>
          <Iconify icon="solar:copy-bold" width={16} sx={{ mr: 1 }} />
          复制配置（未开放）
        </MenuItem>
        {canCancel(item.status) ? (
          <MenuItem disabled>
            <Iconify icon="solar:close-circle-bold" width={16} sx={{ mr: 1 }} />
            取消任务（未开放）
          </MenuItem>
        ) : null}
        <MenuItem disabled>
          <Iconify icon="solar:trash-bin-trash-bold" width={16} sx={{ mr: 1 }} />
          删除任务（未开放）
        </MenuItem>
      </Menu>

      <Button
        size="small"
        variant="text"
        onClick={(event) => {
          event.stopPropagation();
          onView(item.groupId);
        }}
        sx={{ position: 'absolute', right: 12, bottom: 10 }}
      >
        查看详情
      </Button>
    </Card>
  );
}
