import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AgentShellHeader } from '../components/agent-shell-header';

vi.mock('../components/agent-memory-drawer', () => ({
  AgentMemoryDrawer: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="长期记忆面板" /> : null,
}));
vi.mock('../components/notification-channel-settings', () => ({
  NotificationChannelSettings: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="通知渠道面板" /> : null,
}));
vi.mock('../components/agent-report-library-dialog', () => ({
  AgentReportLibraryDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="研究报告面板" /> : null,
}));
vi.mock('../components/conversation-model-control', () => ({
  ConversationModelControl: ({ trigger }: { trigger?: 'button' | 'menu-item' }) => (
    <button type="button">{trigger === 'menu-item' ? '移动模型控制' : '模型控制'}</button>
  ),
}));

const baseProps = {
  mobile: false,
  conversationId: 'conversation_1',
  conversationTitle: '贵州茅台研究',
  activeRunStatus: null,
  canConfigureModel: true,
  modelPolicy: 'AUTO' as const,
  preferredModel: null,
  reasoningEffort: null,
  modelSaving: false,
  evidenceAvailable: true,
  evidencePanelOpen: false,
  onOpenSidebar: vi.fn(),
  onToggleEvidence: vi.fn(),
  onModelSave: vi.fn().mockResolvedValue(true),
};

describe('AgentShellHeader', () => {
  beforeEach(() => {
    baseProps.onOpenSidebar.mockClear();
    baseProps.onToggleEvidence.mockClear();
    baseProps.onModelSave.mockClear();
  });

  it('桌面入口打开各辅助面板，并转发证据切换', async () => {
    const { user } = renderWithProviders(<AgentShellHeader {...baseProps} />);

    expect(screen.getByRole('heading', { name: '贵州茅台研究' })).toBeInTheDocument();
    expect(screen.getByText('Research thread · conversation_1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '模型控制' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看证据面板' }));
    expect(baseProps.onToggleEvidence).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '管理长期记忆' }));
    expect(screen.getByRole('dialog', { name: '长期记忆面板' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '管理通知渠道' }));
    expect(screen.getByRole('dialog', { name: '通知渠道面板' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看研究报告' }));
    expect(screen.getByRole('dialog', { name: '研究报告面板' })).toBeInTheDocument();
  });

  it('移动入口打开会话列表，并从更多菜单进入辅助面板', async () => {
    const { user } = renderWithProviders(
      <AgentShellHeader
        {...baseProps}
        mobile
        canConfigureModel={false}
        evidenceAvailable={false}
      />
    );

    await user.click(screen.getByRole('button', { name: '打开会话列表' }));
    expect(baseProps.onOpenSidebar).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '更多研究操作' }));
    expect(screen.queryByRole('button', { name: '移动模型控制' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '管理通知渠道' }));
    expect(screen.getByRole('dialog', { name: '通知渠道面板' })).toBeInTheDocument();
  });

  it.each([
    ['FAILED', '研究失败'],
    ['CANCELLED', '已停止'],
    ['COMPLETED', '已完成'],
    ['RUNNING', '研究中'],
  ] as const)('将 %s 映射为“%s”状态标签', (activeRunStatus, label) => {
    renderWithProviders(<AgentShellHeader {...baseProps} activeRunStatus={activeRunStatus} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
