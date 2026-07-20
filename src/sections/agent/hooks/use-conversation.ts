import type { AgentRunStatus } from 'src/types/agent/generated';

import { useRef, useMemo, useEffect, useCallback } from 'react';

import { agentApi } from 'src/api/agent';

import { AGENT_RUN_STATUSES } from 'src/types/agent/generated';

import { nextAgentRequestGeneration } from '../lib/request-generation';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';
import {
  selectOrderedMessages,
  selectConversationLoad,
  selectCurrentConversation,
} from '../state/agent-selectors';

import type { AgentMessageSnapshot } from '../state/agent-state.types';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function asRunStatus(status: string): AgentRunStatus | null {
  return AGENT_RUN_STATUSES.includes(status as AgentRunStatus)
    ? (status as AgentRunStatus)
    : null;
}

function findActiveRun(items: AgentMessageSnapshot[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const status = item.run ? asRunStatus(item.run.status) : null;
    if (item.run && status && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      return { item, run: item.run, status };
    }
  }
  return null;
}

export function useConversation(conversationId: string | null) {
  const state = useAgentState();
  const dispatch = useAgentDispatch();
  const snapshotControllerRef = useRef<AbortController | null>(null);
  const historyControllerRef = useRef<AbortController | null>(null);
  const conversation = selectCurrentConversation(state);
  const messages = useMemo(
    () => selectOrderedMessages(state, conversationId),
    [conversationId, state]
  );
  const loadState = selectConversationLoad(state, conversationId);

  const refresh = useCallback(async () => {
    if (!conversationId) return;

    snapshotControllerRef.current?.abort();
    const controller = new AbortController();
    snapshotControllerRef.current = controller;
    const detailGeneration = nextAgentRequestGeneration();
    const messagesGeneration = nextAgentRequestGeneration();

    dispatch({ type: 'CONVERSATION_DETAIL_REQUESTED', conversationId, generation: detailGeneration });
    dispatch({ type: 'MESSAGES_REQUESTED', conversationId, generation: messagesGeneration });

    const detailPromise = agentApi
      .getConversation({ conversationId }, controller.signal)
      .then((result) => {
        dispatch({
          type: 'CONVERSATION_DETAIL_SUCCEEDED',
          conversationId,
          generation: detailGeneration,
          conversation: result,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        dispatch({
          type: 'CONVERSATION_DETAIL_FAILED',
          conversationId,
          generation: detailGeneration,
          error: errorMessage(error, '会话加载失败'),
        });
      });

    const messagesPromise = agentApi
      .listMessages(
        { conversationId, beforeMessageId: null, limit: 50 },
        controller.signal
      )
      .then((result) => {
        dispatch({
          type: 'MESSAGES_SUCCEEDED',
          conversationId,
          generation: messagesGeneration,
          items: result.items,
          nextBeforeMessageId: result.nextBeforeMessageId ?? null,
          mode: 'replace',
        });
        const active = findActiveRun(result.items);
        if (active) {
          dispatch({
            type: 'RUN_DISCOVERED',
            runId: active.run.runId,
            conversationId,
            assistantMessageId: active.item.messageId,
            status: active.status,
            statusVersion: active.run.statusVersion,
          });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        dispatch({
          type: 'MESSAGES_FAILED',
          conversationId,
          generation: messagesGeneration,
          error: errorMessage(error, '消息加载失败'),
        });
      });

    await Promise.all([detailPromise, messagesPromise]);
  }, [conversationId, dispatch]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || !loadState?.nextBeforeMessageId) return;
    historyControllerRef.current?.abort();
    const controller = new AbortController();
    historyControllerRef.current = controller;
    const generation = nextAgentRequestGeneration();
    dispatch({ type: 'MESSAGES_REQUESTED', conversationId, generation });

    try {
      const result = await agentApi.listMessages(
        {
          conversationId,
          beforeMessageId: loadState.nextBeforeMessageId,
          limit: 50,
        },
        controller.signal
      );
      dispatch({
        type: 'MESSAGES_SUCCEEDED',
        conversationId,
        generation,
        items: result.items,
        nextBeforeMessageId: result.nextBeforeMessageId ?? null,
        mode: 'prepend',
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: 'MESSAGES_FAILED',
        conversationId,
        generation,
        error: errorMessage(error, '更早消息加载失败'),
      });
    }
  }, [conversationId, dispatch, loadState?.nextBeforeMessageId]);

  useEffect(() => {
    if (conversationId) void refresh();
    return () => {
      snapshotControllerRef.current?.abort();
      historyControllerRef.current?.abort();
    };
  }, [conversationId, refresh]);

  return {
    conversation,
    messages,
    loadState,
    refresh,
    loadOlder,
    hasOlder: Boolean(loadState?.nextBeforeMessageId),
  };
}
