import { Route, Routes } from 'react-router';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
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
});
