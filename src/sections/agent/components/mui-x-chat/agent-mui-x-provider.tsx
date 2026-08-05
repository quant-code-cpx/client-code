import type { ReactNode } from 'react';
import type { ChatAdapter, ChatMessage, ChatConversation } from '@mui/x-chat-headless';

import { useEffect } from 'react';

import { ChatProvider, useChatStore } from '@mui/x-chat/headless';

const PROJECTION_ADAPTER: ChatAdapter = {
  sendMessage: () =>
    Promise.resolve(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      })
    ),
};

const keepControlledState = () => undefined;

type HistoryProjectionProps = {
  hasOlder: boolean;
};

function HistoryProjection({ hasOlder }: HistoryProjectionProps) {
  const store = useChatStore();

  useEffect(() => {
    store.setHistoryState({ cursor: 'agent-controlled', hasMore: hasOlder });
  }, [hasOlder, store]);

  return null;
}

type AgentMuiXProviderProps = {
  activeConversationId: string | null;
  composerValue: string;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  hasOlder: boolean;
  children: ReactNode;
  onActiveConversationChange: (conversationId: string) => void;
  onComposerValueChange: (value: string) => void;
};

export function AgentMuiXProvider({
  activeConversationId,
  composerValue,
  conversations,
  messages,
  hasOlder,
  children,
  onActiveConversationChange,
  onComposerValueChange,
}: AgentMuiXProviderProps) {
  return (
    <ChatProvider
      adapter={PROJECTION_ADAPTER}
      messages={messages}
      conversations={conversations}
      activeConversationId={activeConversationId ?? undefined}
      composerValue={composerValue}
      onMessagesChange={keepControlledState}
      onConversationsChange={keepControlledState}
      onActiveConversationChange={(conversationId) => {
        if (conversationId) onActiveConversationChange(conversationId);
      }}
      onComposerValueChange={onComposerValueChange}
      roleDisplayNames={{ user: '你', assistant: '研究助理', system: '系统' }}
    >
      <HistoryProjection hasOlder={hasOlder} />
      {children}
    </ChatProvider>
  );
}
