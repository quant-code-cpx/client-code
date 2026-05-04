import type { BacktestRunListItem } from 'src/api/backtest';

import { useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Badge from '@mui/material/Badge';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Skeleton from '@mui/material/Skeleton';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STATUS_LABEL, STATUS_COLOR } from './constants';
import { useRunningRunsBadge } from './hooks/use-running-runs-badge';

// ----------------------------------------------------------------------

type BacktestRunningRunsBadgeProps = {
  refreshToken?: number;
  onOpenRun: (runId: string) => void;
};

function RunItem({
  item,
  onOpenRun,
}: {
  item: BacktestRunListItem;
  onOpenRun: (runId: string) => void;
}) {
  return (
    <ListItem
      disableGutters
      secondaryAction={
        <Button size="small" onClick={() => onOpenRun(item.runId)}>
          查看
        </Button>
      }
      sx={{ alignItems: 'flex-start', pr: 7 }}
    >
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 160, fontWeight: 600 }}>
              {item.name ?? item.runId}
            </Typography>
            <Label color={STATUS_COLOR[item.status] ?? 'default'} variant="soft">
              {STATUS_LABEL[item.status] ?? item.status}
            </Label>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.75 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, item.progress ?? 0))}
              sx={{ height: 6, borderRadius: 1 }}
            />
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}
            >
              创建于 {fToNow(item.createdAt)} · {item.progress ?? 0}%
            </Typography>
          </Box>
        }
      />
    </ListItem>
  );
}

export function BacktestRunningRunsBadge({
  refreshToken = 0,
  onOpenRun,
}: BacktestRunningRunsBadgeProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { total, items, loading, error } = useRunningRunsBadge(refreshToken);
  const open = Boolean(anchorEl);

  return (
    <>
      <Badge badgeContent={total} color="info" overlap="rectangular">
        <Button
          size="small"
          variant="outlined"
          color="info"
          startIcon={<Iconify icon="solar:clock-circle-outline" width={18} />}
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          运行中
        </Button>
      </Badge>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 360, p: 2 } } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          运行中 / 排队中任务
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" height={58} />
            ))}
          </Box>
        ) : null}

        {!loading && error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && items.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Iconify icon="solar:shield-check-bold" width={32} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              暂无运行中任务
            </Typography>
          </Box>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <List dense disablePadding>
            {items.map((item) => (
              <RunItem key={item.runId} item={item} onOpenRun={onOpenRun} />
            ))}
          </List>
        ) : null}
      </Popover>
    </>
  );
}
