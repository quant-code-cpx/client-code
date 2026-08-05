import { Route, Routes } from 'react-router';
import { screen, waitFor } from '@testing-library/react';

import { agentApi } from 'src/api/agent';
import { renderWithProviders } from 'src/test/test-utils';
import { agentMockConversation } from 'src/mocks/agent-mocks';
import { createAuthenticatedContext } from 'src/test/factories/auth-context';

import { AgentView } from '../view/agent-view';

const mocks = vi.hoisted(() => ({
  useConversation: vi.fn(),
  useConversationList: vi.fn(),
  useAgentRun: vi.fn(),
  useComposerDraft: vi.fn(),
}));

vi.mock('../hooks/use-conversation', () => ({ useConversation: mocks.useConversation }));
vi.mock('../hooks/use-conversation-list', () => ({
  useConversationList: mocks.useConversationList,
}));
vi.mock('../hooks/use-agent-run', () => ({ useAgentRun: mocks.useAgentRun }));
vi.mock('../hooks/use-composer-draft', () => ({ useComposerDraft: mocks.useComposerDraft }));
vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({ lastAgentRunUpdate: null }),
}));

function renderAgent(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/agent" element={<AgentView />} />
      <Route path="/agent/:conversationId" element={<AgentView />} />
    </Routes>,
    { initialEntries: [path], authContext: createAuthenticatedContext() }
  );
}

beforeEach(() => {
  mocks.useConversationList.mockReturnValue({
    items: [],
    status: 'ready',
    error: null,
    hasMore: false,
    loadingMore: false,
    refresh: vi.fn(),
    loadMore: vi.fn(),
  });
  mocks.useConversation.mockReturnValue({
    conversation: null,
    messages: [],
    loadState: null,
    refresh: vi.fn(),
    loadOlder: vi.fn(),
    hasOlder: false,
  });
  mocks.useAgentRun.mockReturnValue({
    send: vi.fn(),
    cancel: vi.fn(),
    regenerate: vi.fn(),
    retryUnsent: vi.fn(),
    continueReceiving: vi.fn(),
    activeRun: null,
    isSending: false,
    commandError: null,
  });
  mocks.useComposerDraft.mockReturnValue({
    value: '',
    recovered: false,
    setValue: vi.fn(),
    clear: vi.fn(),
  });
});

describe('AgentView', () => {
  it('新建态展示研究空态和 Composer', () => {
    renderAgent('/agent');

    expect(screen.getByRole('heading', { name: 'AI 量化研究' })).toBeInTheDocument();
    expect(screen.getByText('开始一次量化研究')).toBeInTheDocument();
    expect(screen.getByLabelText('研究问题')).toBeInTheDocument();
    expect(screen.getByLabelText('管理长期记忆')).toBeInTheDocument();
  });

  it('深链把指定 conversationId 交给加载 hook', () => {
    renderAgent('/agent/cm_deep_link');
    expect(mocks.useConversation).toHaveBeenCalledWith('cm_deep_link');
  });

  it('深链无权限或不存在时展示页面错误，不回退到其他会话', () => {
    mocks.useConversation.mockReturnValue({
      conversation: null,
      messages: [],
      loadState: {
        detailStatus: 'error',
        messagesStatus: 'error',
        error: '会话不存在或无权访问',
      },
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      hasOlder: false,
    });

    renderAgent('/agent/cm_forbidden');

    expect(screen.getByText('会话不存在或无权访问')).toBeInTheDocument();
    expect(screen.queryByLabelText('研究问题')).not.toBeInTheDocument();
  });

  it('模型切换需要压缩时显示明确提示', async () => {
    const refresh = vi.fn();
    vi.spyOn(agentApi, 'listModels').mockResolvedValue({ items: [] });
    vi.spyOn(agentApi, 'updateConversationModel').mockResolvedValue({
      conversationId: 'cm_mock_1',
      modelPolicy: 'AUTO',
      preferredModel: null,
      contextPreparation: {
        status: 'COMPACTION_REQUIRED',
        targetModel: 'research-model',
        contextWindow: 128000,
        estimatedRecentTokens: 92000,
        triggerTokens: 88473,
        targetTokens: 58982,
        willAutoCompactOnNextRun: true,
        message: '下一轮发送前会自动整理历史会话，原始消息不会删除',
      },
      updatedAt: '2026-07-20T00:00:05.000Z',
    });
    mocks.useConversation.mockReturnValue({
      conversation: agentMockConversation,
      messages: [],
      loadState: { detailStatus: 'ready', messagesStatus: 'ready', error: null },
      refresh,
      loadOlder: vi.fn(),
      hasOlder: false,
    });

    const { user } = renderAgent('/agent/cm_mock_1');
    await user.click(screen.getByRole('button', { name: '自动模型' }));
    const saveButton = await screen.findByRole('button', { name: '保存' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(
      await screen.findByText(/下一轮发送前会自动整理历史会话，原始消息不会删除/)
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
