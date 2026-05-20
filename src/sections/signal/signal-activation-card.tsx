import type { SignalActivationItem } from 'src/api/signal';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  activation: SignalActivationItem;
  selected: boolean;
  onClick: () => void;
};

type StatusKey = 'ok' | 'pending' | 'failed' | 'stale' | 'inactive';

const STATUS_META: Record<
  StatusKey,
  { color: 'success' | 'warning' | 'error' | 'default'; label: string }
> = {
  ok: { color: 'success', label: '活跃' },
  pending: { color: 'warning', label: '跑批中' },
  failed: { color: 'error', label: '跑批失败' },
  stale: { color: 'warning', label: '陈旧' },
  inactive: { color: 'default', label: '已停用' },
};

function resolveStatus(a: SignalActivationItem): StatusKey {
  if (!a.isActive) return 'inactive';
  return (a.status ?? 'ok') as StatusKey;
}

export function SignalActivationCard({ activation, selected, onClick }: Props) {
  const theme = useTheme();
  const statusKey = resolveStatus(activation);
  const meta = STATUS_META[statusKey];
  const disabled = statusKey === 'inactive';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return fmtTradeDate(dateStr, 'MM/DD');
  };

  const colorChannelMap: Record<StatusKey, string> = {
    ok: theme.vars.palette.success.mainChannel,
    pending: theme.vars.palette.warning.mainChannel,
    failed: theme.vars.palette.error.mainChannel,
    stale: theme.vars.palette.warning.mainChannel,
    inactive: theme.vars.palette.text.disabledChannel,
  };

  return (
    <Tooltip
      title={
        disabled
          ? '已停用，点击前往策略详情重新激活'
          : statusKey === 'failed'
            ? (activation.lastRunError ?? '今日跑批失败')
            : ''
      }
      disableHoverListener={!disabled && statusKey !== 'failed'}
    >
      <Card
        onClick={onClick}
        sx={{
          p: 2.5,
          position: 'relative',
          cursor: 'pointer',
          opacity: disabled ? 0.6 : 1,
          border: `2px solid ${selected ? theme.vars.palette.primary.main : 'transparent'}`,
          transition: 'border-color 0.2s, background 0.2s',
          overflow: 'hidden',
          '&:hover': {
            borderColor: disabled ? 'transparent' : theme.vars.palette.primary.light,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            bgcolor: varAlpha(colorChannelMap[statusKey], 0.8),
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
            pl: 0.5,
          }}
        >
          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 160 }}>
            {activation.strategyName}
          </Typography>

          <Label color={meta.color} variant="soft">
            {meta.label}
          </Label>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Iconify icon="solar:pulse-2-bold-duotone" width={14} sx={{ color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              信号 {activation.lastSignalCount ?? 0} 条 · {formatDate(activation.lastSignalDate)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Iconify icon="solar:cart-3-bold" width={14} sx={{ color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
              {activation.portfolioName ?? (activation.portfolioId ? '未命名组合' : '未关联组合')}
            </Typography>
          </Box>
        </Box>
      </Card>
    </Tooltip>
  );
}
