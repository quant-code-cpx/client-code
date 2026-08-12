import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MessageViewport } from '../components/message-viewport';
import { toChatMessages } from '../components/mui-x-chat/agent-chat-mappers';
import { AgentMuiXProvider } from '../components/mui-x-chat/agent-mui-x-provider';

import type { AgentMessageEntity } from '../state/agent-state.types';

const MESSAGE: AgentMessageEntity = {
  messageId: 'msg_provider_integration',
  conversationId: 'cm_provider_integration',
  role: 'ASSISTANT',
  status: 'COMPLETED',
  contentText: 'Provider 集成正常',
  contentBlocks: [],
  version: 1,
  parentMessageId: null,
  modelName: null,
  run: null,
  citations: [],
  createdAt: '2026-08-10T01:00:00.000Z',
  completedAt: '2026-08-10T01:00:01.000Z',
};

describe('MUI X Chat Provider integration', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('使用真实 ChatMessageList 时与 ChatProvider 共享同一 store', () => {
    renderWithProviders(
      <AgentMuiXProvider
        activeConversationId={MESSAGE.conversationId}
        composerValue=""
        conversations={[]}
        messages={toChatMessages([MESSAGE])}
        hasOlder={false}
        onActiveConversationChange={vi.fn()}
        onComposerValueChange={vi.fn()}
      >
        <MessageViewport
          messages={[MESSAGE]}
          activeRun={null}
          runsById={{}}
          status="ready"
          error={null}
          hasOlder={false}
          onLoadOlder={vi.fn()}
          onRetryLoad={vi.fn()}
          onRegenerate={vi.fn()}
          onRetryMessage={vi.fn()}
          onSaveReport={vi.fn()}
          onContinue={vi.fn()}
        />
      </AgentMuiXProvider>
    );

    expect(screen.getByRole('article', { name: 'Message from 研究助理' })).toHaveTextContent(
      'Provider 集成正常'
    );
  });
});
