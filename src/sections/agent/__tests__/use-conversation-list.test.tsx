import type { PropsWithChildren } from 'react';

import { act, waitFor, renderHook } from '@testing-library/react';

import { agentApi } from 'src/api/agent';
import { ApiError } from 'src/api/client';

import { AgentProvider } from '../state/agent-provider';
import { useConversationList } from '../hooks/use-conversation-list';

function wrapper({ children }: PropsWithChildren) {
  return <AgentProvider>{children}</AgentProvider>;
}

describe('useConversationList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('把后端内部异常收敛为用户可读文案，重试后可恢复', async () => {
    const internalError = [
      'Invalid `this.prisma.aiConversation.findMany()` invocation',
      '/app/src/apps/agent/conversation/agent-conversation.repository.ts:71',
      "Value 'AUTO' not found in enum 'AiModelPolicy'",
    ].join('\n');
    vi.spyOn(agentApi, 'listConversations')
      .mockRejectedValueOnce(new ApiError(internalError, { status: 500 }))
      .mockResolvedValueOnce({ items: [], nextCursor: null });

    const conversationList = renderHook(() => useConversationList(), { wrapper });

    await waitFor(() => expect(conversationList.result.current.status).toBe('error'));
    expect(conversationList.result.current.error).toBe(
      '会话列表暂时无法加载，请稍后重试'
    );
    expect(conversationList.result.current.error).not.toContain('prisma');
    expect(conversationList.result.current.error).not.toContain('/app/src');

    await act(async () => {
      await conversationList.result.current.refresh();
    });

    expect(conversationList.result.current.status).toBe('ready');
    expect(conversationList.result.current.error).toBeNull();
  });
});
