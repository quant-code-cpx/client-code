import type { ReactNode } from 'react';
import type { AgentResponse } from 'src/api/agent';

import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { NotificationChannelSettings } from '../components/notification-channel-settings';

const mocks = vi.hoisted(() => ({
  deleteNotificationChannel: vi.fn(),
  listNotificationChannels: vi.fn(),
  listNotificationDeliveries: vi.fn(),
}));

vi.mock('src/api/agent', () => ({ agentApi: mocks }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

type NotificationChannel = AgentResponse<'/agent/notification-channels/list'>['items'][number];

const webhookChannel: NotificationChannel = {
  channelId: 'channel_webhook_1',
  type: 'WEBHOOK',
  name: '研究完成 Webhook',
  status: 'ACTIVE',
  version: 7,
  isVerified: true,
  lastFour: '4f9a',
  verifiedAt: '2026-07-22T01:00:00.000Z',
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T01:00:00.000Z',
};

describe('NotificationChannelSettings', () => {
  beforeEach(() => {
    mocks.deleteNotificationChannel.mockReset();
    mocks.listNotificationChannels.mockReset();
    mocks.listNotificationDeliveries.mockReset();
    mocks.listNotificationChannels.mockResolvedValue({
      items: [
        { ...webhookChannel, secret: 'webhook-secret-must-never-appear' } as NotificationChannel,
      ],
      nextCursor: null,
    });
    mocks.listNotificationDeliveries.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('渠道列表仅展示末四位，不回显 Webhook Secret', async () => {
    renderWithProviders(<NotificationChannelSettings open onClose={vi.fn()} />);

    expect(await screen.findByText('研究完成 Webhook')).toBeInTheDocument();
    expect(screen.getByText('签名 Webhook · ••••4f9a')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('webhook-secret-must-never-appear');
  });

  it('删除操作必须经过确认，确认后按当前版本删除渠道', async () => {
    mocks.deleteNotificationChannel.mockResolvedValue(webhookChannel);
    const { user } = renderWithProviders(
      <NotificationChannelSettings open onClose={vi.fn()} />
    );

    await screen.findByText('研究完成 Webhook');
    await user.click(screen.getByRole('button', { name: '删除 研究完成 Webhook' }));

    const dialog = await screen.findByRole('dialog', { name: '删除通知渠道' });
    expect(mocks.deleteNotificationChannel).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText('删除「研究完成 Webhook」后，不会再创建新的投递；历史记录会保留。')
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() =>
      expect(mocks.deleteNotificationChannel).toHaveBeenCalledWith({
        channelId: 'channel_webhook_1',
        expectedVersion: 7,
      })
    );
    await waitFor(() => expect(screen.queryByText('研究完成 Webhook')).not.toBeInTheDocument());
  });
});
