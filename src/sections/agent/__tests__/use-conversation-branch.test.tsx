import type { PropsWithChildren } from 'react';

import { act, waitFor, renderHook } from '@testing-library/react';

import { agentApi } from 'src/api/agent';
import { AgentClientError } from 'src/api/agent-error';

import { AgentProvider } from '../state/agent-provider';
import { useConversation } from '../hooks/use-conversation';

import type { AgentMessageListSnapshot } from '../state/agent-state.types';

const CONVERSATION_ID = 'conversation-branch';

function wrapper({ children }: PropsWithChildren) {
  return <AgentProvider initialConversationId={CONVERSATION_ID}>{children}</AgentProvider>;
}

function conversation(activeLeafMessageId: string, branchVersion: number) {
  return {
    conversationId: CONVERSATION_ID,
    title: '分支投影测试',
    status: 'ACTIVE' as const,
    modelPolicy: 'MANUAL' as const,
    preferredModel: 'gpt-5.6-sol',
    reasoningEffort: null,
    researchDepth: 'STANDARD' as const,
    answerDetail: 'STANDARD' as const,
    activeLeafMessageId,
    branchVersion,
    messageCount: 6,
    lastMessageAt: '2026-08-22T01:00:06.000Z',
    createdAt: '2026-08-22T01:00:00.000Z',
    updatedAt: '2026-08-22T01:00:06.000Z',
    statusVersion: 1,
    currentSummary: null,
  };
}

function userMessage(messageId: string, text: string, contextParentMessageId: string | null) {
  return {
    messageId,
    role: 'USER' as const,
    status: 'COMPLETED' as const,
    contentText: text,
    contentBlocks: [],
    version: 1,
    parentMessageId: null,
    contextParentMessageId,
    modelName: null,
    run: null,
    feedback: null,
    citations: [],
    createdAt: '2026-08-22T01:00:01.000Z',
    completedAt: '2026-08-22T01:00:01.000Z',
  };
}

function assistantMessage(
  messageId: string,
  parentMessageId: string,
  version: number,
  text: string
) {
  return {
    messageId,
    role: 'ASSISTANT' as const,
    status: 'COMPLETED' as const,
    contentText: text,
    contentBlocks: [],
    version,
    parentMessageId,
    contextParentMessageId: parentMessageId,
    modelName: 'gpt-5.6-sol',
    run: null,
    feedback: null,
    citations: [],
    createdAt: `2026-08-22T01:00:0${version}.000Z`,
    completedAt: `2026-08-22T01:00:0${version}.000Z`,
  };
}

const question1 = userMessage('question-1', 'Q', null);
const answer1 = assistantMessage('answer-1', 'question-1', 1, 'A1');
const answer2 = assistantMessage('answer-2', 'question-1', 2, 'A2');
const question2 = userMessage('question-2', 'Q2', 'answer-2');
const answer3 = assistantMessage('answer-3', 'question-2', 1, 'A3');

function versionGroup(selectedMessageId: string, activeMessageId: string) {
  return {
    parentMessageId: 'question-1',
    selectedMessageId,
    selectedVersion: selectedMessageId === 'answer-1' ? 1 : 2,
    activeMessageId,
    totalVersions: 2,
    versions: [
      {
        messageId: 'answer-1',
        version: 1,
        status: 'COMPLETED' as const,
        isActive: activeMessageId === 'answer-1',
        isDisplayed: selectedMessageId === 'answer-1',
        canAdopt: activeMessageId !== 'answer-1',
        createdAt: answer1.createdAt,
      },
      {
        messageId: 'answer-2',
        version: 2,
        status: 'COMPLETED' as const,
        isActive: activeMessageId === 'answer-2',
        isDisplayed: selectedMessageId === 'answer-2',
        canAdopt: activeMessageId !== 'answer-2',
        createdAt: answer2.createdAt,
      },
    ],
  };
}

function activeProjection(afterAdopt = false): AgentMessageListSnapshot {
  if (afterAdopt) {
    return {
      projection: 'ACTIVE_BRANCH',
      activeLeafMessageId: 'answer-1',
      branchVersion: 6,
      displayLeafMessageId: 'answer-1',
      lineageComplete: true,
      isActiveBranch: true,
      displayBranchCompatible: true,
      canAdoptDisplay: false,
      items: [question1, answer1],
      siblingGroups: [versionGroup('answer-1', 'answer-1')],
      nextBeforeMessageId: null,
    };
  }
  return {
    projection: 'ACTIVE_BRANCH',
    activeLeafMessageId: 'answer-3',
    branchVersion: 5,
    displayLeafMessageId: 'answer-3',
    lineageComplete: true,
    isActiveBranch: true,
    displayBranchCompatible: true,
    canAdoptDisplay: false,
    items: [question1, answer2, question2, answer3],
    siblingGroups: [versionGroup('answer-2', 'answer-2')],
    nextBeforeMessageId: null,
  };
}

function historicalProjection(): AgentMessageListSnapshot {
  return {
    projection: 'ACTIVE_BRANCH',
    activeLeafMessageId: 'answer-3',
    branchVersion: 5,
    displayLeafMessageId: 'answer-1',
    lineageComplete: true,
    isActiveBranch: false,
    displayBranchCompatible: false,
    canAdoptDisplay: true,
    items: [question1, answer1],
    siblingGroups: [versionGroup('answer-1', 'answer-2')],
    nextBeforeMessageId: null,
  };
}

function stoppedHistoricalProjection(): AgentMessageListSnapshot {
  const stoppedAnswer = {
    ...answer1,
    messageId: 'answer-stopped',
    status: 'CANCELLED' as const,
    contentText: '',
  };
  return {
    projection: 'ACTIVE_BRANCH',
    activeLeafMessageId: 'answer-3',
    branchVersion: 5,
    displayLeafMessageId: stoppedAnswer.messageId,
    lineageComplete: true,
    isActiveBranch: false,
    displayBranchCompatible: true,
    canAdoptDisplay: false,
    items: [question1, stoppedAnswer],
    siblingGroups: [
      {
        parentMessageId: 'question-1',
        selectedMessageId: stoppedAnswer.messageId,
        selectedVersion: 1,
        activeMessageId: 'answer-2',
        totalVersions: 2,
        versions: [
          {
            messageId: stoppedAnswer.messageId,
            version: 1,
            status: 'CANCELLED',
            isActive: false,
            isDisplayed: true,
            canAdopt: false,
            createdAt: stoppedAnswer.createdAt,
          },
          {
            messageId: 'answer-2',
            version: 2,
            status: 'COMPLETED',
            isActive: true,
            isDisplayed: false,
            canAdopt: false,
            createdAt: answer2.createdAt,
          },
        ],
      },
    ],
    nextBeforeMessageId: null,
  };
}

describe('useConversation branch projection', () => {
  afterEach(() => vi.restoreAllMocks());

  it('A2 后继续 Q2 时不渲染 A1；切回 A1 只读，CAS 成功后才成为 active', async () => {
    let adopted = false;
    vi.spyOn(agentApi, 'getConversation').mockImplementation(async () =>
      adopted ? conversation('answer-1', 6) : conversation('answer-3', 5)
    );
    const listMessages = vi.spyOn(agentApi, 'listMessages').mockImplementation(async (request) => {
      if (adopted) return activeProjection(true);
      return request.displayMessageId === 'answer-1'
        ? historicalProjection()
        : activeProjection(false);
    });
    const adopt = vi.spyOn(agentApi, 'adoptConversationBranch').mockImplementation(async () => {
      adopted = true;
      return {
        conversationId: CONVERSATION_ID,
        activeLeafMessageId: 'answer-1',
        branchVersion: 6,
      };
    });

    const hook = renderHook(() => useConversation(CONVERSATION_ID), { wrapper });
    await waitFor(() => expect(hook.result.current.loadState?.messagesStatus).toBe('ready'));
    expect(hook.result.current.messages.map((message) => message.messageId)).toEqual([
      'question-1',
      'answer-2',
      'question-2',
      'answer-3',
    ]);
    expect(hook.result.current.messages.some((message) => message.messageId === 'answer-1')).toBe(
      false
    );

    await act(async () => {
      await hook.result.current.viewBranch('answer-1');
    });
    expect(hook.result.current.messages.map((message) => message.messageId)).toEqual([
      'question-1',
      'answer-1',
    ]);
    expect(hook.result.current.branchProjection).toMatchObject({
      displayLeafMessageId: 'answer-1',
      isActiveBranch: false,
      canAdoptDisplay: true,
    });
    expect(adopt).not.toHaveBeenCalled();

    await act(async () => {
      await hook.result.current.adoptDisplayedBranch();
    });
    expect(adopt).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      messageId: 'answer-1',
      expectedBranchVersion: 5,
    });
    expect(hook.result.current.branchProjection).toMatchObject({
      activeLeafMessageId: 'answer-1',
      displayLeafMessageId: 'answer-1',
      branchVersion: 6,
      isActiveBranch: true,
    });
    expect(listMessages).toHaveBeenCalledWith(
      expect.objectContaining({ projection: 'ACTIVE_BRANCH' }),
      expect.any(AbortSignal)
    );
  });

  it('已停止的历史版本不可采纳，只能返回 active 分支', async () => {
    vi.spyOn(agentApi, 'getConversation').mockResolvedValue(conversation('answer-3', 5));
    const listMessages = vi
      .spyOn(agentApi, 'listMessages')
      .mockImplementation(async (request) =>
        request.displayMessageId === 'answer-stopped'
          ? stoppedHistoricalProjection()
          : activeProjection(false)
      );
    const adopt = vi.spyOn(agentApi, 'adoptConversationBranch');

    const hook = renderHook(() => useConversation(CONVERSATION_ID), { wrapper });
    await waitFor(() => expect(hook.result.current.loadState?.messagesStatus).toBe('ready'));

    await act(async () => {
      await hook.result.current.viewBranch('answer-stopped');
    });
    expect(hook.result.current.branchProjection).toMatchObject({
      displayLeafMessageId: 'answer-stopped',
      isActiveBranch: false,
      canAdoptDisplay: false,
    });

    await act(async () => {
      expect(await hook.result.current.adoptDisplayedBranch()).toBe(false);
    });
    expect(adopt).not.toHaveBeenCalled();

    await act(async () => {
      expect(await hook.result.current.returnToActiveBranch()).toBe(true);
    });
    expect(hook.result.current.branchProjection).toMatchObject({
      activeLeafMessageId: 'answer-3',
      displayLeafMessageId: 'answer-3',
      isActiveBranch: true,
    });
    expect(listMessages).toHaveBeenLastCalledWith(
      expect.objectContaining({ displayMessageId: 'answer-3' }),
      expect.any(AbortSignal)
    );
  });

  it('分页游标遇到 6051 时丢弃旧游标并重读最新首屏', async () => {
    const listMessages = vi
      .spyOn(agentApi, 'listMessages')
      .mockResolvedValueOnce({ ...activeProjection(false), nextBeforeMessageId: 'cursor-v5' })
      .mockRejectedValueOnce(
        new AgentClientError('消息分支已变化', {
          kind: 'BUSINESS',
          code: 6051,
          status: 409,
        })
      )
      .mockResolvedValueOnce(activeProjection(true));
    vi.spyOn(agentApi, 'getConversation')
      .mockResolvedValueOnce(conversation('answer-3', 5))
      .mockResolvedValueOnce(conversation('answer-1', 6));

    const hook = renderHook(() => useConversation(CONVERSATION_ID), { wrapper });
    await waitFor(() => expect(hook.result.current.hasOlder).toBe(true));

    await act(async () => {
      await hook.result.current.loadOlder();
    });

    await waitFor(() => expect(listMessages).toHaveBeenCalledTimes(3));
    expect(hook.result.current.hasOlder).toBe(false);
    expect(hook.result.current.branchProjection).toMatchObject({
      activeLeafMessageId: 'answer-1',
      branchVersion: 6,
    });
  });
});
