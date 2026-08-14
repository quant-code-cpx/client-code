import type { ReactNode } from 'react';
import type { AgentResponse } from 'src/api/agent';

import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { NotificationChannelSettings } from '../components/notification-channel-settings';

const mocks = vi.hoisted(() => ({
  createNotificationChannel: vi.fn(),
  deleteNotificationChannel: vi.fn(),
  listNotificationChannels: vi.fn(),
  listNotificationDeliveries: vi.fn(),
  retryNotificationDelivery: vi.fn(),
  testNotificationChannel: vi.fn(),
  updateNotificationChannel: vi.fn(),
}));

vi.mock('src/api/agent', () => ({ agentApi: mocks }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

type NotificationChannel = AgentResponse<'/agent/notification-channels/list'>['items'][number];
type NotificationDelivery =
  AgentResponse<'/agent/notification-deliveries/list'>['items'][number];

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

const failedDelivery: NotificationDelivery = {
  deliveryId: 'delivery_1',
  channelId: webhookChannel.channelId,
  channelName: webhookChannel.name,
  channelType: 'WEBHOOK',
  executionId: 'execution_1',
  runId: 'run_1',
  status: 'FAILED',
  attempt: 2,
  maxAttempts: 3,
  nextAttemptAt: '2026-07-22T02:00:00.000Z',
  deliveredAt: null,
  providerMessageId: null,
  errorClass: 'WEBHOOK_TIMEOUT',
  createdAt: '2026-07-22T01:30:00.000Z',
};

describe('NotificationChannelSettings', () => {
  beforeEach(() => {
    mocks.createNotificationChannel.mockReset();
    mocks.deleteNotificationChannel.mockReset();
    mocks.listNotificationChannels.mockReset();
    mocks.listNotificationDeliveries.mockReset();
    mocks.retryNotificationDelivery.mockReset();
    mocks.testNotificationChannel.mockReset();
    mocks.updateNotificationChannel.mockReset();
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

    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-color-scheme');
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

  it('新增 Webhook 时校验必填配置，并提交签名参数', async () => {
    const savedChannel: NotificationChannel = {
      ...webhookChannel,
      channelId: 'channel_webhook_2',
      name: '盘后研究 Webhook',
      version: 1,
      isVerified: false,
      lastFour: 'cdef',
      verifiedAt: null,
    };
    mocks.createNotificationChannel.mockResolvedValue(savedChannel);
    const { user } = renderWithProviders(
      <NotificationChannelSettings open onClose={vi.fn()} />
    );

    await screen.findByText('研究完成 Webhook');
    await user.click(screen.getByRole('button', { name: '添加通知渠道' }));

    const editor = await screen.findByRole('dialog', { name: '添加通知渠道' });
    await user.selectOptions(within(editor).getByLabelText('渠道类型'), 'WEBHOOK');
    await user.type(within(editor).getByLabelText('名称'), '  盘后研究 Webhook  ');
    await user.type(
      within(editor).getByLabelText('Webhook URL'),
      'https://hooks.example.com/agent'
    );
    await user.type(within(editor).getByLabelText('签名 Secret'), 'too-short');
    expect(within(editor).getByRole('button', { name: '保存' })).toBeDisabled();

    await user.type(within(editor).getByLabelText('签名 Secret'), '-1234567');
    await user.click(within(editor).getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(mocks.createNotificationChannel).toHaveBeenCalledWith({
        type: 'WEBHOOK',
        name: '盘后研究 Webhook',
        webhookUrl: 'https://hooks.example.com/agent',
        secret: 'too-short-1234567',
      })
    );
    expect(await screen.findByText('盘后研究 Webhook')).toBeInTheDocument();
  });

  it('编辑 Webhook 时保留未填写的地址和 Secret', async () => {
    const savedChannel = { ...webhookChannel, name: '研究通知', version: 8 };
    mocks.updateNotificationChannel.mockResolvedValue(savedChannel);
    const { user } = renderWithProviders(
      <NotificationChannelSettings open onClose={vi.fn()} />
    );

    await screen.findByText('研究完成 Webhook');
    await user.click(screen.getByRole('button', { name: '编辑 研究完成 Webhook' }));

    const editor = await screen.findByRole('dialog', { name: '编辑通知渠道' });
    expect(within(editor).getByLabelText('渠道类型')).toBeDisabled();
    await user.clear(within(editor).getByLabelText('名称'));
    await user.type(within(editor).getByLabelText('名称'), '研究通知');
    await user.click(within(editor).getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(mocks.updateNotificationChannel).toHaveBeenCalledWith({
        channelId: 'channel_webhook_1',
        expectedVersion: 7,
        name: '研究通知',
      })
    );
    expect(await screen.findByText('研究通知')).toBeInTheDocument();
  });

  it('支持启停和重新测试渠道', async () => {
    const unverifiedChannel = {
      ...webhookChannel,
      isVerified: false,
      verifiedAt: null,
    };
    mocks.listNotificationChannels.mockResolvedValue({
      items: [unverifiedChannel],
      nextCursor: null,
    });
    mocks.testNotificationChannel.mockResolvedValue({
      channelId: webhookChannel.channelId,
      verified: true,
      verifiedAt: '2026-07-22T02:00:00.000Z',
    });
    mocks.updateNotificationChannel.mockResolvedValue({
      ...webhookChannel,
      status: 'DISABLED',
      version: 8,
    });
    const { user } = renderWithProviders(
      <NotificationChannelSettings open onClose={vi.fn()} />
    );

    expect(await screen.findByText('待验证')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '测试 研究完成 Webhook' }));
    await waitFor(() =>
      expect(mocks.testNotificationChannel).toHaveBeenCalledWith({
        channelId: 'channel_webhook_1',
      })
    );
    expect(await screen.findByText('已启用')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: '启用' }));
    await waitFor(() =>
      expect(mocks.updateNotificationChannel).toHaveBeenCalledWith({
        channelId: 'channel_webhook_1',
        expectedVersion: 7,
        enabled: false,
      })
    );
    expect(await screen.findByText('已停用')).toBeInTheDocument();
  });

  it('失败投递可重试，并用服务端返回状态更新记录', async () => {
    mocks.listNotificationDeliveries.mockResolvedValue({ items: [failedDelivery], nextCursor: null });
    mocks.retryNotificationDelivery.mockResolvedValue({
      ...failedDelivery,
      status: 'DELIVERED',
      attempt: 3,
      deliveredAt: '2026-07-22T02:05:00.000Z',
      errorClass: null,
    });
    const { user } = renderWithProviders(
      <NotificationChannelSettings open onClose={vi.fn()} />
    );

    expect(await screen.findByText('WEBHOOK_TIMEOUT')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试投递' }));

    await waitFor(() =>
      expect(mocks.retryNotificationDelivery).toHaveBeenCalledWith({ deliveryId: 'delivery_1' })
    );
    expect(await screen.findByText('已送达')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重试投递' })).not.toBeInTheDocument();
  });

  it('加载失败显示可执行重试，并能恢复渠道列表', async () => {
    mocks.listNotificationChannels
      .mockRejectedValueOnce(new Error('通知配置暂时不可用'))
      .mockResolvedValueOnce({ items: [webhookChannel], nextCursor: null });
    const { user } = renderWithProviders(
      <NotificationChannelSettings open onClose={vi.fn()} />
    );

    expect(await screen.findByText('通知配置暂时不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('研究完成 Webhook')).toBeInTheDocument();
    expect(mocks.listNotificationChannels).toHaveBeenCalledTimes(2);
  });
});
