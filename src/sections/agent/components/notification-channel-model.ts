import type { AgentResponse } from 'src/api/agent';

export type NotificationChannel =
  AgentResponse<'/agent/notification-channels/list'>['items'][number];

export type NotificationDelivery =
  AgentResponse<'/agent/notification-deliveries/list'>['items'][number];

export type NotificationChannelType = NotificationChannel['type'];

export const NOTIFICATION_CHANNEL_TYPE_LABEL: Record<NotificationChannelType, string> = {
  IN_APP: '站内信',
  WEBHOOK: '签名 Webhook',
};

export const NOTIFICATION_DELIVERY_STATUS: Record<
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

export function getNotificationChannelStatus(channel: NotificationChannel): {
  label: string;
  color: 'success' | 'warning' | 'default';
} {
  if (channel.status !== 'ACTIVE') return { label: '已停用', color: 'default' };
  if (!channel.isVerified) return { label: '待验证', color: 'warning' };
  return { label: '已启用', color: 'success' };
}
