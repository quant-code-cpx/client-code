import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { NotificationChannelEditorDialog } from './notification-channel-editor-dialog';
import {
  type NotificationChannel,
  type NotificationDelivery,
} from './notification-channel-model';
import {
  NotificationChannelsPanel,
  NotificationDeliveriesPanel,
} from './notification-channel-panels';

type NotificationChannelSettingsProps = {
  open: boolean;
  onClose: () => void;
};

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
                <NotificationChannelsPanel
                  channels={channels}
                  onDelete={setDeleteTarget}
                  onEdit={setEditorChannel}
                  onEnabledChange={handleEnabled}
                  onTest={handleTest}
                />
                <NotificationDeliveriesPanel
                  deliveries={deliveries}
                  retryingId={retryingId}
                  onRetry={handleRetry}
                />
              </>
            )}
          </Box>
        </Scrollbar>
      </Dialog>

      <NotificationChannelEditorDialog
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
