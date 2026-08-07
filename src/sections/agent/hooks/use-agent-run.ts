import type { AgentStreamConnectionState } from 'src/api/agent-stream';

import { useRef, useState, useEffect, useCallback } from 'react';

import { useRouter } from 'src/routes/hooks';

import { agentApi } from 'src/api/agent';
import { streamAgentRun } from 'src/api/agent-stream';

import { AGENT_CAPABILITIES } from 'src/types/agent/generated';

import { TERMINAL_RUN_STATUSES } from '../state/agent-state.types';
import { nextAgentRequestGeneration } from '../lib/request-generation';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';
import { selectActiveRun, selectCurrentConversation } from '../state/agent-selectors';

import type {
  AgentComposerModel,
  AgentMessageEntity,
  AgentRunProjection,
} from '../state/agent-state.types';

const MAX_MESSAGE_LENGTH = 10_000;
const DEFAULT_NEW_CONVERSATION_MODEL: AgentComposerModel = {
  policy: 'AUTO',
  preferredModel: null,
};

type ActiveStream = {
  runId: string;
  generation: number;
  controller: AbortController;
};

function commandErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function newRequestId(): string {
  return crypto.randomUUID();
}

function connectionState(state: AgentStreamConnectionState) {
  return state;
}

function conversationTitle(content: string): string {
  const firstLine = content.trim().split(/\r?\n/, 1)[0];
  return firstLine.slice(0, 60);
}

export function useAgentRun(
  conversationId: string | null,
  newConversationModel: AgentComposerModel = DEFAULT_NEW_CONVERSATION_MODEL
) {
  const router = useRouter();
  const state = useAgentState();
  const dispatch = useAgentDispatch();
  const stateRef = useRef(state);
  const activeStreamRef = useRef<ActiveStream | null>(null);
  const streamGenerationRef = useRef(0);
  const lastAutoResumeKeyRef = useRef('');
  const sendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const activeRun = selectActiveRun(state, conversationId);
  const conversation = selectCurrentConversation(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshMessages = useCallback(
    async (targetConversationId: string, authoritative: boolean) => {
      const generation = nextAgentRequestGeneration();
      dispatch({ type: 'MESSAGES_REQUESTED', conversationId: targetConversationId, generation });
      try {
        const result = await agentApi.listMessages({
          conversationId: targetConversationId,
          beforeMessageId: null,
          limit: 50,
        });
        dispatch({
          type: 'MESSAGES_SUCCEEDED',
          conversationId: targetConversationId,
          generation,
          items: result.items,
          nextBeforeMessageId: result.nextBeforeMessageId ?? null,
          mode: 'refresh',
          authoritative,
        });
      } catch (error) {
        dispatch({
          type: 'MESSAGES_FAILED',
          conversationId: targetConversationId,
          generation,
          error: commandErrorMessage(error, '消息快照刷新失败'),
        });
      }
    },
    [dispatch]
  );

  const refreshRunStatus = useCallback(
    async (runId: string, assistantMessageId?: string) => {
      const snapshot = await agentApi.getRunStatus({ runId });
      dispatch({ type: 'RUN_STATUS_RECEIVED', snapshot, assistantMessageId });
      return snapshot;
    },
    [dispatch]
  );

  const startStream = useCallback(
    (
      runId: string,
      afterSequence = 0,
      lastEventId?: string,
      endpoint?: string
    ): void => {
      const current = activeStreamRef.current;
      if (current?.runId === runId && !current.controller.signal.aborted) return;
      current?.controller.abort();

      streamGenerationRef.current += 1;
      const generation = streamGenerationRef.current;
      const controller = new AbortController();
      activeStreamRef.current = { runId, generation, controller };
      dispatch({
        type: 'RUN_CONNECTION_CHANGED',
        runId,
        connectionGeneration: generation,
        connectionState: 'CONNECTING',
      });

      void streamAgentRun({
        runId,
        afterSequence,
        lastEventId,
        signal: controller.signal,
        ...(endpoint === undefined ? {} : { endpoint }),
        callbacks: {
          onConnectionState: (nextState) => {
            dispatch({
              type: 'RUN_CONNECTION_CHANGED',
              runId,
              connectionGeneration: generation,
              connectionState: connectionState(nextState),
            });
          },
          onRecoverableError: (error) => {
            dispatch({
              type: 'RUN_CONNECTION_CHANGED',
              runId,
              connectionGeneration: generation,
              connectionState: 'RETRYING',
              errorMessage: error.message,
            });
          },
          onTelemetry: (telemetry) => {
            dispatch({
              type: 'RUN_CONNECTION_CHANGED',
              runId,
              connectionGeneration: generation,
              connectionState:
                telemetry.type === 'connection.retry'
                  ? 'RETRYING'
                  : telemetry.type === 'stream.terminal'
                    ? 'COMPLETED'
                    : 'OPEN',
              reconnects: telemetry.retryCount,
            });
          },
          onEvent: (event) => {
            dispatch({ type: 'RUN_EVENT_ACCEPTED', event, connectionGeneration: generation });
          },
          onTerminal: (event) => {
            void refreshMessages(event.conversationId, true);
            void refreshRunStatus(runId, event.messageId);
          },
        },
      })
        .catch(async (error: unknown) => {
          if (controller.signal.aborted) return;
          dispatch({
            type: 'RUN_CONNECTION_CHANGED',
            runId,
            connectionGeneration: generation,
            connectionState: 'PAUSED',
            errorMessage: commandErrorMessage(error, '流式连接恢复失败'),
          });
          try {
            const run = stateRef.current.runs.byId[runId];
            const snapshot = await refreshRunStatus(runId, run?.assistantMessageId);
            await refreshMessages(snapshot.conversationId, TERMINAL_RUN_STATUSES.has(snapshot.status));
          } catch (statusError) {
            setCommandError(commandErrorMessage(statusError, '无法确认任务状态'));
          }
        })
        .finally(() => {
          if (activeStreamRef.current?.generation === generation) activeStreamRef.current = null;
        });
    },
    [dispatch, refreshMessages, refreshRunStatus]
  );

  const resumeRun = useCallback(
    async (run: AgentRunProjection) => {
      if (TERMINAL_RUN_STATUSES.has(run.status)) return;
      const current = activeStreamRef.current;
      if (current?.runId === run.runId && !current.controller.signal.aborted) return;

      try {
        const snapshot = await refreshRunStatus(run.runId, run.assistantMessageId);
        await refreshMessages(snapshot.conversationId, false);
        if (!TERMINAL_RUN_STATUSES.has(snapshot.status)) {
          startStream(snapshot.runId, snapshot.latestEventSequence);
        }
      } catch (error) {
        setCommandError(commandErrorMessage(error, '运行恢复失败'));
      }
    },
    [refreshMessages, refreshRunStatus, startStream]
  );

  useEffect(() => {
    if (!conversationId || !activeRun || TERMINAL_RUN_STATUSES.has(activeRun.status)) return;
    const key = `${state.selectionGeneration}:${conversationId}:${activeRun.runId}`;
    if (lastAutoResumeKeyRef.current === key) return;
    lastAutoResumeKeyRef.current = key;
    void resumeRun(activeRun);
  }, [activeRun, conversationId, resumeRun, state.selectionGeneration]);

  useEffect(
    () => () => {
      activeStreamRef.current?.controller.abort();
      activeStreamRef.current = null;
    },
    [conversationId]
  );

  useEffect(() => {
    const handleOnline = () => {
      const run = selectActiveRun(stateRef.current, conversationId);
      if (run) void resumeRun(run);
    };
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const run = selectActiveRun(stateRef.current, conversationId);
      if (run) void resumeRun(run);
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [conversationId, resumeRun]);

  const send = useCallback(
    async (rawContent: string): Promise<boolean> => {
      const content = rawContent.trim();
      if (!content || content.length > MAX_MESSAGE_LENGTH || sendingRef.current) return false;

      sendingRef.current = true;
      setIsSending(true);
      setCommandError(null);
      let targetConversationId = conversationId;
      let localMessageId: string | null = null;
      const modelPolicy = conversation?.modelPolicy ?? newConversationModel.policy;

      try {
        if (targetConversationId && !conversation) {
          setCommandError('会话尚未加载完成');
          return false;
        }
        if (!targetConversationId) {
          const createRequestId = newRequestId();
          const title = conversationTitle(content);
          const preferredModel =
            modelPolicy === 'MANUAL' ? newConversationModel.preferredModel : null;
          const created = await agentApi.createConversation({
            clientRequestId: createRequestId,
            title,
            modelPolicy,
            preferredModel,
          });
          targetConversationId = created.conversationId;
          dispatch({
            type: 'CONVERSATION_CREATED',
            conversation: {
              conversationId: created.conversationId,
              title,
              status: created.status,
              modelPolicy,
              preferredModel,
              messageCount: 0,
              lastMessageAt: created.createdAt,
              createdAt: created.createdAt,
              updatedAt: created.createdAt,
              statusVersion: 1,
            },
          });
          router.replace(`/agent/${created.conversationId}`);
        }

        const clientRequestId = newRequestId();
        localMessageId = `local:${clientRequestId}`;
        const optimistic: AgentMessageEntity = {
          messageId: localMessageId,
          conversationId: targetConversationId,
          role: 'USER',
          status: 'PENDING',
          contentText: content,
          contentBlocks: [],
          version: 1,
          parentMessageId: null,
          modelName: null,
          run: null,
          citations: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
          clientRequestId,
          localId: localMessageId,
          deliveryStatus: 'SENDING',
        };
        dispatch({
          type: 'OPTIMISTIC_USER_MESSAGE_ADDED',
          conversationId: targetConversationId,
          message: optimistic,
        });

        const response = await agentApi.sendMessage({
          clientRequestId,
          conversationId: targetConversationId,
          content,
          modelPolicy,
          allowedCapabilities: [...AGENT_CAPABILITIES],
        });
        dispatch({
          type: 'MESSAGE_SEND_CONFIRMED',
          conversationId: targetConversationId,
          localMessageId,
          response,
        });
        startStream(response.runId, 0, undefined, response.streamEndpoint);
        return true;
      } catch (error) {
        if (localMessageId) dispatch({ type: 'MESSAGE_SEND_FAILED', localMessageId });
        setCommandError(commandErrorMessage(error, '问题发送失败'));
        return false;
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    }, [conversation, conversationId, dispatch, newConversationModel, router, startStream]
  );

  const cancel = useCallback(async (): Promise<void> => {
    const run = selectActiveRun(stateRef.current, conversationId);
    if (!run || run.cancelRequested || !run.canCancel || TERMINAL_RUN_STATUSES.has(run.status)) return;

    dispatch({ type: 'RUN_CANCEL_REQUESTED', runId: run.runId });
    setCommandError(null);
    try {
      let snapshot = await refreshRunStatus(run.runId, run.assistantMessageId);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (TERMINAL_RUN_STATUSES.has(snapshot.status)) {
          await refreshMessages(run.conversationId, true);
          return;
        }
        if (!snapshot.canCancel) return;

        try {
          const result = await agentApi.cancelRun({
            runId: run.runId,
            expectedStatusVersion: snapshot.statusVersion,
          });
          dispatch({
            type: 'RUN_CANCEL_RESOLVED',
            runId: result.runId,
            status: result.status,
            statusVersion: result.statusVersion,
            cancellationAccepted: result.cancellationAccepted,
          });
          if (TERMINAL_RUN_STATUSES.has(result.status)) {
            await refreshMessages(run.conversationId, true);
          }
          return;
        } catch (error) {
          if (attempt === 1) throw error;
          snapshot = await refreshRunStatus(run.runId, run.assistantMessageId);
        }
      }
    } catch (error) {
      try {
        const snapshot = await refreshRunStatus(run.runId, run.assistantMessageId);
        await refreshMessages(run.conversationId, TERMINAL_RUN_STATUSES.has(snapshot.status));
        if (!TERMINAL_RUN_STATUSES.has(snapshot.status) && snapshot.status !== 'CANCEL_REQUESTED') {
          setCommandError(commandErrorMessage(error, '停止请求结果未知，任务可能仍在后台运行'));
        }
      } catch {
        setCommandError(commandErrorMessage(error, '停止请求结果未知，任务可能仍在后台运行'));
      }
    }
  }, [conversationId, dispatch, refreshMessages, refreshRunStatus]);

  const retryUnsent = useCallback(
    async (message: AgentMessageEntity): Promise<boolean> => {
      const content = message.contentText?.trim();
      if (
        !content ||
        !message.clientRequestId ||
        message.deliveryStatus !== 'UNSENT' ||
        selectActiveRun(stateRef.current, message.conversationId)
      ) {
        return false;
      }

      dispatch({ type: 'MESSAGE_RETRY_REQUESTED', messageId: message.messageId });
      setCommandError(null);
      try {
        const response = await agentApi.sendMessage({
          clientRequestId: message.clientRequestId,
          conversationId: message.conversationId,
          content,
          modelPolicy: conversation?.modelPolicy ?? 'AUTO',
          allowedCapabilities: [...AGENT_CAPABILITIES],
        });
        dispatch({
          type: 'MESSAGE_SEND_CONFIRMED',
          conversationId: message.conversationId,
          localMessageId: message.messageId,
          response,
        });
        startStream(response.runId, 0, undefined, response.streamEndpoint);
        return true;
      } catch (error) {
        dispatch({ type: 'MESSAGE_SEND_FAILED', localMessageId: message.messageId });
        setCommandError(commandErrorMessage(error, '消息重试失败'));
        return false;
      }
    },
    [conversation?.modelPolicy, dispatch, startStream]
  );

  const regenerate = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!conversationId || selectActiveRun(stateRef.current, conversationId)) return false;
      setCommandError(null);
      try {
        const response = await agentApi.regenerateMessage({
          clientRequestId: newRequestId(),
          messageId,
          modelPolicy: conversation?.modelPolicy ?? 'AUTO',
        });
        dispatch({
          type: 'RUN_REGENERATION_CONFIRMED',
          conversationId,
          response,
          createdAt: new Date().toISOString(),
        });
        startStream(response.runId, 0, undefined, response.streamEndpoint);
        return true;
      } catch (error) {
        setCommandError(commandErrorMessage(error, '重新生成失败'));
        return false;
      }
    }, [conversation?.modelPolicy, conversationId, dispatch, startStream]
  );

  const continueReceiving = useCallback(() => {
    const run = selectActiveRun(stateRef.current, conversationId);
    if (run) void resumeRun(run);
  }, [conversationId, resumeRun]);

  return {
    send,
    cancel,
    regenerate,
    retryUnsent,
    continueReceiving,
    activeRun,
    isSending,
    commandError,
  };
}
