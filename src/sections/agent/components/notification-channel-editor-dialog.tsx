import type { AgentRequest } from 'src/api/agent';

import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { agentApi } from 'src/api/agent';

import {
  type NotificationChannel,
  type NotificationChannelType,
  NOTIFICATION_CHANNEL_TYPE_LABEL,
} from './notification-channel-model';

type NotificationChannelEditorDialogProps = {
  channel: NotificationChannel | null;
  open: boolean;
  onClose: () => void;
  onSaved: (channel: NotificationChannel) => void;
};

export function NotificationChannelEditorDialog({
  channel,
  open,
  onClose,
  onSaved,
}: NotificationChannelEditorDialogProps) {
  const [type, setType] = useState<NotificationChannelType>('IN_APP');
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
          onChange={(event) => setType(event.target.value as NotificationChannelType)}
          slotProps={{ select: { native: true } }}
          sx={{ mt: 1, '& select': { bgcolor: 'background.paper', color: 'text.primary' } }}
        >
          {(Object.entries(NOTIFICATION_CHANNEL_TYPE_LABEL) as [
            NotificationChannelType,
            string,
          ][]).map(([value, label]) => (
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
        <Button color="inherit" disabled={saving} onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" loading={saving} disabled={!valid} onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
