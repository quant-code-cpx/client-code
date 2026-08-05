import type { AgentRequest, AgentResponse } from 'src/api/agent';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

type NotificationChannel = AgentResponse<'/agent/notification-channels/list'>['items'][number];
type NotificationDelivery = AgentResponse<'/agent/notification-deliveries/list'>['items'][number];
type ChannelType = NotificationChannel['type'];

type NotificationChannelSettingsProps = {
  open: boolean;
  onClose: () => void;
};

type ChannelEditorProps = {
  channel: NotificationChannel | null;
  open: boolean;
  onClose: () => void;
  onSaved: (channel: NotificationChannel) => void;
};

const CHANNEL_TYPE_LABEL: Record<ChannelType, string> = {
  IN_APP: '站内信',
  WEBHOOK: '签名 Webhook',
};

const DELIVERY_STATUS: Record<
  NotificationDelivery['status'],
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  PENDING: { label: '待发送', color: 'default' },
  SENDING: { label: '发送中', color: 'warning' },
  DELIVERED: { label: '已送达', color: 'success' },
  RETRY: { label: '重试中', color: 'warning' },
  FAILED: { label: '失败', color: 'error' },
  SUPPRESSED: { label: '已抑制', color: 'default' },
};

function channelStatus(channel: NotificationChannel): {
  label: string;
  color: 'success' | 'warning' | 'default';
} {
  if (channel.status !== 'ACTIVE') return { label: '已停用', color: 'default' };
  if (!channel.isVerified) return { label: '待验证', color: 'warning' };
  return { label: '已启用', color: 'success' };
}

function ChannelEditorDialog({ channel, open, onClose, onSaved }: ChannelEditorProps) {
  const [type, setType] = useState<ChannelType>('IN_APP');
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(channel?.type ?? 'IN_APP');
    setName(channel?.name ?? '');
    setWebhookUrl('');
    setSecret('');
    setError(null);
  }, [channel, open]);

  const webhookRequired = type === 'WEBHOOK' && !channel;
  const valid =
    name.trim().length > 0 &&
    (type === 'IN_APP' ||
      !webhookRequired ||
      (webhookUrl.trim().length > 0 && secret.length >= 16));

  const handleSave = useCallback(async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      let saved: NotificationChannel;
      if (channel) {
        const update: AgentRequest<'/agent/notification-channels/update'> = {
          channelId: channel.channelId,
          expectedVersion: channel.version,
          name: name.trim(),
          ...(type === 'WEBHOOK' && webhookUrl.trim() ? { webhookUrl: webhookUrl.trim() } : {}),
          ...(type === 'WEBHOOK' && secret ? { secret } : {}),
        };
        saved = await agentApi.updateNotificationChannel(update);
      } else {
        const create: AgentRequest<'/agent/notification-channels/create'> =
          type === 'WEBHOOK'
            ? { type, name: name.trim(), webhookUrl: webhookUrl.trim(), secret }
            : { type, name: name.trim() };
        saved = await agentApi.createNotificationChannel(create);
      }
      onSaved(saved);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存通知渠道失败');
    } finally {
      setSaving(false);
    }
  }, [channel, name, onClose, onSaved, secret, type, valid, webhookUrl]);

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            color: 'text.primary',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            overscrollBehavior: 'contain',
          },
        },
      }}
    >
      <DialogTitle>{channel ? '编辑通知渠道' : '添加通知渠道'}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <TextField
          select
          fullWidth
          label="渠道类型"
          name="agent-notification-channel-type"
          value={type}
          disabled={Boolean(channel) || saving}
          onChange={(event) => setType(event.target.value as ChannelType)}
          slotProps={{ select: { native: true } }}
          sx={{ mt: 1, '& select': { bgcolor: 'background.paper', color: 'text.primary' } }}
        >
          {(Object.entries(CHANNEL_TYPE_LABEL) as [ChannelType, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </TextField>
        <TextField
          fullWidth
          label="名称"
          name="agent-notification-channel-name"
          value={name}
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 160, autoComplete: 'off' } }}
          sx={{ mt: 2 }}
        />
        {type === 'WEBHOOK' ? (
          <>
            <TextField
              fullWidth
              label="Webhook URL"
              name="agent-notification-webhook-url"
              value={webhookUrl}
              disabled={saving}
              placeholder={channel ? '不修改则留空' : 'https://hooks.example.com/agent'}
              helperText={
                channel
                  ? '留空则保留已验证的地址；修改后需重新测试。'
                  : '仅允许服务端 allowlist 内的 HTTPS 域名。'
              }
              onChange={(event) => setWebhookUrl(event.target.value)}
              slotProps={{ htmlInput: { autoComplete: 'url', maxLength: 2048, spellCheck: false } }}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="签名 Secret"
              name="agent-notification-webhook-secret"
              value={secret}
              disabled={saving}
              placeholder={channel ? '不修改则留空' : '至少 16 个字符'}
              helperText={
                channel
                  ? '已保存的 Secret 不会回显；填入新值会替换。'
                  : '用于 HMAC-SHA256 签名，不会再次显示。'
              }
              onChange={(event) => setSecret(event.target.value)}
              slotProps={{ htmlInput: { autoComplete: 'new-password', maxLength: 512 } }}
              sx={{ mt: 2 }}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" loading={saving} disabled={!valid} onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function NotificationChannelSettings({ open, onClose }: NotificationChannelSettingsProps) {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorChannel, setEditorChannel] = useState<NotificationChannel | null | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<NotificationChannel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelResponse, deliveryResponse] = await Promise.all([
        agentApi.listNotificationChannels({ cursor: null, limit: 100 }),
        agentApi.listNotificationDeliveries({ cursor: null, limit: 100 }),
      ]);
      setChannels(channelResponse.items);
      setDeliveries(deliveryResponse.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载通知设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const handleSaved = useCallback((saved: NotificationChannel) => {
    setChannels((current) => {
      const index = current.findIndex((channel) => channel.channelId === saved.channelId);
      return index < 0
        ? [saved, ...current]
        : current.map((channel) => (channel.channelId === saved.channelId ? saved : channel));
    });
    setEditorChannel(undefined);
  }, []);

  const handleTest = useCallback(async (channel: NotificationChannel) => {
    setError(null);
    try {
      const result = await agentApi.testNotificationChannel({ channelId: channel.channelId });
      setChannels((current) =>
        current.map((item) =>
          item.channelId === channel.channelId
            ? { ...item, isVerified: result.verified, verifiedAt: result.verifiedAt }
            : item
        )
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '测试通知渠道失败');
    }
  }, []);

  const handleEnabled = useCallback(
    async (channel: NotificationChannel, enabled: boolean) => {
      setError(null);
      try {
        const saved = await agentApi.updateNotificationChannel({
          channelId: channel.channelId,
          expectedVersion: channel.version,
          enabled,
        });
        handleSaved(saved);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '更新渠道状态失败');
      }
    },
    [handleSaved]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await agentApi.deleteNotificationChannel({
        channelId: deleteTarget.channelId,
        expectedVersion: deleteTarget.version,
      });
      setChannels((current) =>
        current.filter((channel) => channel.channelId !== deleteTarget.channelId)
      );
      setDeleteTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除通知渠道失败');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const handleRetry = useCallback(async (delivery: NotificationDelivery) => {
    setRetryingId(delivery.deliveryId);
    setError(null);
    try {
      const saved = await agentApi.retryNotificationDelivery({ deliveryId: delivery.deliveryId });
      setDeliveries((current) =>
        current.map((item) => (item.deliveryId === saved.deliveryId ? saved : item))
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '重试通知投递失败');
    } finally {
      setRetryingId(null);
    }
  }, []);

  const editorOpen = editorChannel !== undefined;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        aria-labelledby="agent-notification-settings-title"
        slotProps={{
          paper: {
            sx: {
              height: { md: 'min(760px, calc(100dvh - 64px))' },
              color: 'text.primary',
              bgcolor: 'background.default',
              backgroundImage: 'none',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
            },
          },
        }}
      >
        <Box sx={{ px: 2.75, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="caption" sx={{ color: 'primary.light', letterSpacing: 1 }}>
              DELIVERY CENTER
            </Typography>
            <Typography
              id="agent-notification-settings-title"
              component="h2"
              variant="h6"
              sx={{ textWrap: 'balance' }}
            >
              通知与投递
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            onClick={() => setEditorChannel(null)}
          >
            添加通知渠道
          </Button>
          <Tooltip title="关闭通知渠道">
            <IconButton aria-label="关闭通知渠道" onClick={onClose}>
              <Iconify icon="solar:close-circle-bold" width={21} />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />

        {error ? (
          <Alert
            severity="error"
            action={<Button onClick={load}>重试</Button>}
            sx={{ borderRadius: 0 }}
          >
            {error}
          </Alert>
        ) : null}

        <Scrollbar sx={{ flex: 1 }}>
          <Box
            sx={{
              minHeight: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' },
            }}
          >
            {loading ? (
              <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 1.25, p: 2 }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={116} />
                ))}
              </Box>
            ) : (
              <>
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
                  const status = channelStatus(channel);
                  return (
                    <Box key={channel.channelId} sx={rowSx}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {channel.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {CHANNEL_TYPE_LABEL[channel.type]}
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
                              onChange={(event) =>
                                void handleEnabled(channel, event.target.checked)
                              }
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
                                onClick={() => void handleTest(channel)}
                              >
                                <Iconify icon="solar:letter-bold" width={18} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="编辑渠道">
                            <IconButton
                              size="small"
                              aria-label={`编辑 ${channel.name}`}
                              onClick={() => setEditorChannel(channel)}
                            >
                              <Iconify icon="solar:pen-bold" width={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除渠道">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`删除 ${channel.name}`}
                              onClick={() => setDeleteTarget(channel)}
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
                const status = DELIVERY_STATUS[delivery.status];
                const canRetry = delivery.status === 'FAILED' || delivery.status === 'SUPPRESSED';
                return (
                  <Box key={delivery.deliveryId} sx={rowSx}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="subtitle2" noWrap>
                          {delivery.channelName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {CHANNEL_TYPE_LABEL[delivery.channelType]} · 尝试 {delivery.attempt}/
                          {delivery.maxAttempts}
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
                          onClick={() => void handleRetry(delivery)}
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
              </>
            )}
          </Box>
        </Scrollbar>
      </Dialog>

      <ChannelEditorDialog
        open={editorOpen}
        channel={editorChannel ?? null}
        onClose={() => setEditorChannel(undefined)}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除通知渠道"
        content={`删除「${deleteTarget?.name ?? ''}」后，不会再创建新的投递；历史记录会保留。`}
        submitting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="删除"
      />
    </>
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
