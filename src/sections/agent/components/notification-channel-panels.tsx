import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import {
  type NotificationChannel,
  type NotificationDelivery,
  NOTIFICATION_DELIVERY_STATUS,
  getNotificationChannelStatus,
  NOTIFICATION_CHANNEL_TYPE_LABEL,
} from './notification-channel-model';

type NotificationChannelsPanelProps = {
  channels: NotificationChannel[];
  onDelete: (channel: NotificationChannel) => void;
  onEdit: (channel: NotificationChannel) => void;
  onEnabledChange: (channel: NotificationChannel, enabled: boolean) => void;
  onTest: (channel: NotificationChannel) => void;
};

export function NotificationChannelsPanel({
  channels,
  onDelete,
  onEdit,
  onEnabledChange,
  onTest,
}: NotificationChannelsPanelProps) {
  return (
    <Box
      component="section"
      aria-label="通知渠道列表"
      sx={{ p: 2, borderRight: { md: 1 }, borderColor: 'divider' }}
    >
      <StackHeader label="渠道" count={channels.length} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {channels.length === 0 ? (
          <EmptyState
            icon="solar:bell-bing-bold"
            title="还没有通知渠道"
            detail="先添加站内信，或配置签名 Webhook。"
          />
        ) : (
          channels.map((channel) => {
            const status = getNotificationChannelStatus(channel);
            return (
              <Box key={channel.channelId} sx={rowSx}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {channel.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {NOTIFICATION_CHANNEL_TYPE_LABEL[channel.type]}
                      {channel.lastFour ? ` · ••••${channel.lastFour}` : ''}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={status.label}
                    color={status.color}
                    variant="outlined"
                  />
                </Box>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  {channel.verifiedAt
                    ? `验证于 ${fDateTime(channel.verifiedAt)}`
                    : channel.type === 'WEBHOOK'
                      ? '测试通过后才会接收投递。'
                      : '站内信可直接接收投递。'}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <FormControlLabel
                    sx={{ ml: -1, mr: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={channel.status === 'ACTIVE'}
                        onChange={(event) => onEnabledChange(channel, event.target.checked)}
                      />
                    }
                    label={<Typography variant="caption">启用</Typography>}
                  />
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <Tooltip title="测试渠道">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`测试 ${channel.name}`}
                          disabled={channel.status !== 'ACTIVE'}
                          onClick={() => onTest(channel)}
                        >
                          <Iconify icon="solar:letter-bold" width={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="编辑渠道">
                      <IconButton
                        size="small"
                        aria-label={`编辑 ${channel.name}`}
                        onClick={() => onEdit(channel)}
                      >
                        <Iconify icon="solar:pen-bold" width={17} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除渠道">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`删除 ${channel.name}`}
                        onClick={() => onDelete(channel)}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={17} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

type NotificationDeliveriesPanelProps = {
  deliveries: NotificationDelivery[];
  retryingId: string | null;
  onRetry: (delivery: NotificationDelivery) => void;
};

export function NotificationDeliveriesPanel({
  deliveries,
  retryingId,
  onRetry,
}: NotificationDeliveriesPanelProps) {
  return (
    <Box component="section" aria-label="投递历史列表" sx={{ p: 2 }}>
      <StackHeader label="最近投递" count={deliveries.length} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {deliveries.length === 0 ? (
          <EmptyState
            icon="solar:inbox-line-bold"
            title="还没有投递记录"
            detail="完成的 Agent 研究会显示在这里。"
          />
        ) : (
          deliveries.map((delivery) => {
            const status = NOTIFICATION_DELIVERY_STATUS[delivery.status];
            const canRetry = delivery.status === 'FAILED' || delivery.status === 'SUPPRESSED';
            return (
              <Box key={delivery.deliveryId} sx={rowSx}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {delivery.channelName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {NOTIFICATION_CHANNEL_TYPE_LABEL[delivery.channelType]} · 尝试{' '}
                      {delivery.attempt}/{delivery.maxAttempts}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={status.label}
                    color={status.color}
                    variant="outlined"
                  />
                </Box>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  {delivery.deliveredAt
                    ? `送达于 ${fDateTime(delivery.deliveredAt)}`
                    : `下次处理 ${fDateTime(delivery.nextAttemptAt)}`}
                </Typography>
                {delivery.errorClass ? (
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ color: 'error.main', mt: 0.25 }}
                  >
                    {delivery.errorClass}
                  </Typography>
                ) : null}
                {canRetry ? (
                  <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      loading={retryingId === delivery.deliveryId}
                      onClick={() => onRetry(delivery)}
                    >
                      重试投递
                    </Button>
                  </Box>
                ) : null}
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

function StackHeader({ label, count }: { label: string; count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Chip size="small" label={count} variant="outlined" />
    </Box>
  );
}

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: 'solar:bell-bing-bold' | 'solar:inbox-line-bold';
  title: string;
  detail: string;
}) {
  return (
    <Box sx={{ textAlign: 'center', px: 2, py: 8 }}>
      <Iconify icon={icon} width={40} sx={{ color: 'text.disabled', mb: 1.5 }} />
      <Typography variant="body2">{title}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {detail}
      </Typography>
    </Box>
  );
}

const rowSx = {
  p: 1.5,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1.25,
  bgcolor: 'background.paper',
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 120px',
};
