import type { ChatMessage, ChatConversation, ChatMessageStatus } from '@mui/x-chat-headless';

import type { AgentMessageEntity, AgentConversationEntity } from '../../state/agent-state.types';

type ConversationProjectionOptions = {
  activeConversationIds?: ReadonlySet<string>;
  staleConversationIds?: ReadonlySet<string>;
};

function toChatMessageStatus(message: AgentMessageEntity): ChatMessageStatus {
  if (message.deliveryStatus === 'UNSENT' || message.status === 'FAILED') return 'error';
  if (message.deliveryStatus === 'SENDING') return 'sending';
  if (message.status === 'PENDING') return 'pending';
  if (message.status === 'STREAMING') return 'streaming';
  if (message.status === 'CANCELLED') return 'cancelled';
  return 'sent';
}

export function toChatConversations(
  conversations: AgentConversationEntity[],
  options: ConversationProjectionOptions = {}
): ChatConversation[] {
  const { activeConversationIds = new Set(), staleConversationIds = new Set() } = options;

  return conversations.map((conversation) => {
    const stateLabel = activeConversationIds.has(conversation.conversationId)
      ? '后台运行中'
      : staleConversationIds.has(conversation.conversationId)
        ? '有新状态'
        : null;
    const messageLabel = `${conversation.messageCount} 条消息`;

    return {
      id: conversation.conversationId,
      title: conversation.title,
      subtitle: stateLabel ? `${stateLabel} · ${messageLabel}` : messageLabel,
      lastMessageAt: conversation.lastMessageAt,
    };
  });
}

export function toChatMessages(messages: AgentMessageEntity[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.messageId,
    conversationId: message.conversationId,
    role: message.role === 'USER' ? 'user' : message.role === 'ASSISTANT' ? 'assistant' : 'system',
    parts: [{ type: 'text', text: message.contentText ?? '' }],
    createdAt: message.createdAt,
    updatedAt: message.completedAt ?? undefined,
    status: toChatMessageStatus(message),
  }));
}
