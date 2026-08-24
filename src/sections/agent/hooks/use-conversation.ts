import type { AgentRunStatus } from 'src/types/agent/generated';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { agentApi } from 'src/api/agent';
import { AgentClientError } from 'src/api/agent-error';

import { AGENT_RUN_STATUSES } from 'src/types/agent/generated';

import { nextAgentRequestGeneration } from '../lib/request-generation';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';
import {
  selectOrderedMessages,
  selectConversationLoad,
  selectCurrentConversation,
} from '../state/agent-selectors';

import type {
  AgentMessageSnapshot,
  AgentMessageListSnapshot,
  AgentMessageProjectionState,
} from '../state/agent-state.types';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function asRunStatus(status: string): AgentRunStatus | null {
  return AGENT_RUN_STATUSES.includes(status as AgentRunStatus) ? (status as AgentRunStatus) : null;
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

function projectionFromSnapshot(result: AgentMessageListSnapshot): AgentMessageProjectionState {
  const snapshot = result as Partial<AgentMessageListSnapshot>;
  const activeLeafMessageId = snapshot.activeLeafMessageId ?? null;
  return {
    projection: snapshot.projection ?? 'ACTIVE_BRANCH',
    activeLeafMessageId,
    branchVersion: snapshot.branchVersion ?? 0,
    displayLeafMessageId:
      snapshot.displayLeafMessageId === undefined
        ? activeLeafMessageId
        : (snapshot.displayLeafMessageId ?? null),
    lineageComplete: snapshot.lineageComplete ?? true,
    isActiveBranch: snapshot.isActiveBranch ?? true,
    displayBranchCompatible: snapshot.displayBranchCompatible ?? true,
    canAdoptDisplay: snapshot.canAdoptDisplay ?? false,
    siblingGroups: snapshot.siblingGroups ?? [],
  };
}

export function useConversation(conversationId: string | null) {
  const state = useAgentState();
  const dispatch = useAgentDispatch();
  const snapshotControllerRef = useRef<AbortController | null>(null);
  const historyControllerRef = useRef<AbortController | null>(null);
  const branchControllerRef = useRef<AbortController | null>(null);
  const [branchChanging, setBranchChanging] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const conversation = selectCurrentConversation(state);
  const messages = useMemo(
    () => selectOrderedMessages(state, conversationId),
    [conversationId, state]
  );
  const loadState = selectConversationLoad(state, conversationId);

  useEffect(() => {
    setBranchChanging(false);
    setBranchError(null);
  }, [conversationId]);

  const refresh = useCallback(async () => {
    if (!conversationId) return;

    snapshotControllerRef.current?.abort();
    const controller = new AbortController();
    snapshotControllerRef.current = controller;
    const detailGeneration = nextAgentRequestGeneration();
    const messagesGeneration = nextAgentRequestGeneration();

    dispatch({
      type: 'CONVERSATION_DETAIL_REQUESTED',
      conversationId,
      generation: detailGeneration,
    });
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
        {
          conversationId,
          projection: 'ACTIVE_BRANCH',
          beforeMessageId: null,
          limit: 50,
        },
        controller.signal
      )
      .then((result) => {
        dispatch({
          type: 'MESSAGES_SUCCEEDED',
          conversationId,
          generation: messagesGeneration,
          items: result.items,
          nextBeforeMessageId: result.nextBeforeMessageId ?? null,
          projection: projectionFromSnapshot(result),
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
          projection: 'ACTIVE_BRANCH',
          beforeMessageId: loadState.nextBeforeMessageId,
          displayMessageId: loadState.messageProjection?.displayLeafMessageId ?? null,
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
        projection: projectionFromSnapshot(result),
        mode: 'prepend',
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof AgentClientError && error.code === 6051) {
        dispatch({ type: 'MESSAGE_CURSOR_INVALIDATED', conversationId, generation });
        await refresh();
        return;
      }
      dispatch({
        type: 'MESSAGES_FAILED',
        conversationId,
        generation,
        error: errorMessage(error, '更早消息加载失败'),
      });
    }
  }, [
    conversationId,
    dispatch,
    loadState?.messageProjection,
    loadState?.nextBeforeMessageId,
    refresh,
  ]);

  const viewBranch = useCallback(
    async (displayMessageId: string | null) => {
      if (!conversationId) return false;
      branchControllerRef.current?.abort();
      const controller = new AbortController();
      branchControllerRef.current = controller;
      const generation = nextAgentRequestGeneration();
      setBranchChanging(true);
      setBranchError(null);
      dispatch({ type: 'MESSAGES_REQUESTED', conversationId, generation });
      try {
        const result = await agentApi.listMessages(
          {
            conversationId,
            projection: 'ACTIVE_BRANCH',
            beforeMessageId: null,
            displayMessageId,
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
          projection: projectionFromSnapshot(result),
          mode: 'replace',
          authoritative: true,
        });
        return true;
      } catch (error) {
        if (controller.signal.aborted) return false;
        const message = errorMessage(error, '分支版本加载失败');
        setBranchError(message);
        dispatch({ type: 'MESSAGES_FAILED', conversationId, generation, error: message });
        return false;
      } finally {
        if (branchControllerRef.current === controller) branchControllerRef.current = null;
        if (!controller.signal.aborted) setBranchChanging(false);
      }
    },
    [conversationId, dispatch]
  );

  const returnToActiveBranch = useCallback(
    () => viewBranch(loadState?.messageProjection?.activeLeafMessageId ?? null),
    [loadState?.messageProjection?.activeLeafMessageId, viewBranch]
  );

  const adoptDisplayedBranch = useCallback(async () => {
    const projection = loadState?.messageProjection;
    const messageId = projection?.displayLeafMessageId;
    if (
      !conversationId ||
      !projection ||
      !messageId ||
      !projection.canAdoptDisplay ||
      projection.isActiveBranch
    ) {
      return false;
    }
    setBranchChanging(true);
    setBranchError(null);
    try {
      const adopted = await agentApi.adoptConversationBranch({
        conversationId,
        messageId,
        expectedBranchVersion: projection.branchVersion,
      });
      const loaded = await viewBranch(adopted.activeLeafMessageId);
      if (!loaded) return false;
      const generation = nextAgentRequestGeneration();
      dispatch({ type: 'CONVERSATION_DETAIL_REQUESTED', conversationId, generation });
      const detail = await agentApi.getConversation({ conversationId });
      dispatch({
        type: 'CONVERSATION_DETAIL_SUCCEEDED',
        conversationId,
        generation,
        conversation: detail,
      });
      return true;
    } catch (error) {
      const message = errorMessage(error, '分支采纳失败；会话可能已在其他页面变更');
      setBranchError(message);
      await refresh();
      return false;
    } finally {
      setBranchChanging(false);
    }
  }, [conversationId, dispatch, loadState?.messageProjection, refresh, viewBranch]);

  useEffect(() => {
    if (conversationId) void refresh();
    return () => {
      snapshotControllerRef.current?.abort();
      historyControllerRef.current?.abort();
      branchControllerRef.current?.abort();
    };
  }, [conversationId, refresh]);

  return {
    conversation,
    messages,
    loadState,
    refresh,
    loadOlder,
    hasOlder: Boolean(loadState?.nextBeforeMessageId),
    branchProjection: loadState?.messageProjection ?? null,
    branchChanging,
    branchError,
    viewBranch,
    returnToActiveBranch,
    adoptDisplayedBranch,
  };
}
