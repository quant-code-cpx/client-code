import type { AgentStreamConnectionState } from 'src/api/agent-stream';

import { useRef, useState, useEffect, useCallback } from 'react';

import { useRouter } from 'src/routes/hooks';

import { agentApi } from 'src/api/agent';
import { streamAgentRun } from 'src/api/agent-stream';
import { AgentClientError } from 'src/api/agent-error';

import { AGENT_CAPABILITIES } from 'src/types/agent/generated';

import { nextAgentRequestGeneration } from '../lib/request-generation';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';
import { selectActiveRun, selectCurrentConversation } from '../state/agent-selectors';
import { isTerminalRunStatus, TERMINAL_RUN_STATUSES } from '../state/agent-state.types';

import type {
  AgentState,
  AgentRunRetried,
  AgentComposerModel,
  AgentMessageEntity,
  AgentRunProjection,
  AgentRunRegenerated,
  AgentMessageSnapshot,
  AgentMessageListSnapshot,
  AgentMessageProjectionState,
} from '../state/agent-state.types';

const MAX_MESSAGE_LENGTH = 10_000;
const DEFAULT_RESEARCH_DEPTH = 'STANDARD' as const;
const DEFAULT_ANSWER_DETAIL = 'STANDARD' as const;
const FINAL_SNAPSHOT_RETRY_DELAYS_MS = [250, 1_000] as const;
const DEFAULT_NEW_CONVERSATION_MODEL: AgentComposerModel = {
  preferredModel: null,
  reasoningEffort: null,
};

type ActiveStream = {
  runId: string;
  generation: number;
  controller: AbortController;
};

type BranchAdoptionIntent = {
  runId: string;
  conversationId: string;
  targetMessageId: string;
  expectedBranchVersion: number;
};

type MessageRefreshOptions = {
  expectedMessageId?: string;
  displayMessageId?: string | null;
  finalRunId?: string;
  retryDelaysMs?: readonly number[];
  abortSignal?: AbortSignal;
  onExpectedMessage?: (message: AgentMessageSnapshot) => void;
};

function commandErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function projectionFromSnapshot(
  result: AgentMessageListSnapshot,
  fallback?: { activeLeafMessageId?: string | null; branchVersion?: number }
): AgentMessageProjectionState {
  const snapshot = result as Partial<AgentMessageListSnapshot>;
  const activeLeafMessageId =
    snapshot.activeLeafMessageId === undefined
      ? (fallback?.activeLeafMessageId ?? null)
      : (snapshot.activeLeafMessageId ?? null);
  return {
    projection: snapshot.projection ?? 'ACTIVE_BRANCH',
    activeLeafMessageId,
    branchVersion: snapshot.branchVersion ?? fallback?.branchVersion ?? 0,
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

function isBranchCasConflict(error: unknown): error is AgentClientError {
  return (
    error instanceof AgentClientError &&
    (error.code === 6051 || (error.code === undefined && error.status === 409))
  );
}

function isActiveRunConflict(error: unknown): error is AgentClientError {
  return error instanceof AgentClientError && error.code === 6050;
}

function newRequestId(): string {
  return crypto.randomUUID();
}

function connectionState(state: AgentStreamConnectionState) {
  return state;
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve(true);
    }, delayMs);
    const handleAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', handleAbort);
      resolve(false);
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function conversationTitle(content: string): string {
  const firstLine = content.trim().split(/\r?\n/, 1)[0];
  return firstLine.slice(0, 60);
}

function stateBranchAdoptionIntent(
  state: AgentState,
  targetConversationId: string
): BranchAdoptionIntent | null {
  const runs = Object.values(state.runs.byId);
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index];
    if (
      run?.conversationId === targetConversationId &&
      run.branchAdoption &&
      (run.branchAdoption.status === 'PENDING' || run.branchAdoption.status === 'UNCERTAIN')
    ) {
      return {
        runId: run.runId,
        conversationId: targetConversationId,
        targetMessageId: run.branchAdoption.targetMessageId,
        expectedBranchVersion: run.branchAdoption.expectedBranchVersion,
      };
    }
  }
  return null;
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
  const finalSnapshotAbortRef = useRef<AbortController | null>(null);
  const streamGenerationRef = useRef(0);
  const lastAutoResumeKeyRef = useRef('');
  const sendingRef = useRef(false);
  const branchAdoptionInFlightRef = useRef(new Set<string>());
  const branchAdoptionIntentRef = useRef(new Map<string, BranchAdoptionIntent>());
  const [isSending, setIsSending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const activeRun = selectActiveRun(state, conversationId);
  const conversation = selectCurrentConversation(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const controller = new AbortController();
    finalSnapshotAbortRef.current = controller;
    return () => {
      controller.abort();
      if (finalSnapshotAbortRef.current === controller) finalSnapshotAbortRef.current = null;
    };
  }, [conversationId]);

  const refreshMessages = useCallback(
    async (
      targetConversationId: string,
      authoritative: boolean,
      options: MessageRefreshOptions = {}
    ): Promise<boolean> => {
      if (options.abortSignal?.aborted) return false;
      const generation = nextAgentRequestGeneration();
      dispatch({ type: 'MESSAGES_REQUESTED', conversationId: targetConversationId, generation });
      const retryDelaysMs = options.retryDelaysMs ?? [];
      let lastError: unknown;

      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        if (
          attempt > 0 &&
          !(await waitForRetry(retryDelaysMs[attempt - 1]!, options.abortSignal))
        ) {
          return false;
        }
        try {
          const result = await agentApi.listMessages({
            conversationId: targetConversationId,
            projection: 'ACTIVE_BRANCH',
            beforeMessageId: null,
            displayMessageId: options.displayMessageId ?? null,
            limit: 50,
          });
          if (options.abortSignal?.aborted) return false;
          if (options.expectedMessageId) {
            const finalMessage = result.items.find(
              (item) => item.messageId === options.expectedMessageId
            );
            if (!finalMessage?.run || !isTerminalRunStatus(finalMessage.run.status)) {
              throw new Error('最终消息尚未出现在权威快照中');
            }
            options.onExpectedMessage?.(finalMessage);
          }
          dispatch({
            type: 'MESSAGES_SUCCEEDED',
            conversationId: targetConversationId,
            generation,
            items: result.items,
            nextBeforeMessageId: result.nextBeforeMessageId ?? null,
            projection: projectionFromSnapshot(
              result,
              stateRef.current.conversations.byId[targetConversationId]
            ),
            mode: 'refresh',
            authoritative,
          });
          return true;
        } catch (error) {
          if (options.abortSignal?.aborted) return false;
          lastError = error;
        }
      }

      const error = commandErrorMessage(lastError, '消息快照刷新失败');
      dispatch({
        type: 'MESSAGES_FAILED',
        conversationId: targetConversationId,
        generation,
        error,
      });
      if (options.finalRunId) {
        dispatch({
          type: 'RUN_FINAL_SNAPSHOT_FAILED',
          runId: options.finalRunId,
          error: `最终快照同步失败：${error}。当前回答与引用可能不完整。`,
        });
      }
      return false;
    },
    [dispatch]
  );

  const refreshConversationDetail = useCallback(
    async (targetConversationId: string) => {
      const generation = nextAgentRequestGeneration();
      dispatch({
        type: 'CONVERSATION_DETAIL_REQUESTED',
        conversationId: targetConversationId,
        generation,
      });
      try {
        const result = await agentApi.getConversation({ conversationId: targetConversationId });
        dispatch({
          type: 'CONVERSATION_DETAIL_SUCCEEDED',
          conversationId: targetConversationId,
          generation,
          conversation: result,
        });
        return result;
      } catch (error) {
        dispatch({
          type: 'CONVERSATION_DETAIL_FAILED',
          conversationId: targetConversationId,
          generation,
          error: commandErrorMessage(error, '会话分支状态刷新失败'),
        });
        throw error;
      }
    },
    [dispatch]
  );

  const recoverSendBranchConflict = useCallback(
    async (
      localMessageId: string,
      targetConversationId: string,
      branchOverride: BranchAdoptionIntent | null
    ) => {
      if (branchOverride) {
        branchAdoptionIntentRef.current.delete(branchOverride.runId);
        dispatch({ type: 'RUN_BRANCH_ADOPTION_CONFLICTED', runId: branchOverride.runId });
      }
      const branch = await refreshConversationDetail(targetConversationId);
      if (!branch.activeLeafMessageId) return;
      dispatch({
        type: 'MESSAGE_BRANCH_REBASED',
        localMessageId,
        clientRequestId: newRequestId(),
        baseAssistantMessageId: branch.activeLeafMessageId,
        expectedBranchVersion: branch.branchVersion,
      });
      await refreshMessages(targetConversationId, false);
    },
    [dispatch, refreshConversationDetail, refreshMessages]
  );

  const settleRegeneratedBranch = useCallback(
    async (
      adoption: BranchAdoptionIntent,
      observedBranch: Awaited<ReturnType<typeof agentApi.getConversation>>
    ) => {
      const { runId, conversationId: targetConversationId } = adoption;
      if (branchAdoptionInFlightRef.current.has(runId)) return;

      const resolveAdopted = (activeLeafMessageId: string, branchVersion: number) => {
        branchAdoptionIntentRef.current.delete(runId);
        dispatch({
          type: 'RUN_BRANCH_ADOPTION_RESOLVED',
          runId,
          conversationId: targetConversationId,
          activeLeafMessageId,
          branchVersion,
        });
      };
      const refreshAfterAmbiguousResult = async (): Promise<boolean> => {
        const refreshed = await refreshConversationDetail(targetConversationId);
        if (refreshed.activeLeafMessageId === adoption.targetMessageId) {
          resolveAdopted(adoption.targetMessageId, refreshed.branchVersion);
          return true;
        }
        return false;
      };

      branchAdoptionInFlightRef.current.add(runId);
      dispatch({ type: 'RUN_BRANCH_ADOPTION_STARTED', runId });
      try {
        if (observedBranch.activeLeafMessageId === adoption.targetMessageId) {
          resolveAdopted(adoption.targetMessageId, observedBranch.branchVersion);
          return;
        }

        const adopt = () =>
          agentApi.adoptConversationBranch({
            conversationId: targetConversationId,
            messageId: adoption.targetMessageId,
            expectedBranchVersion: adoption.expectedBranchVersion,
          });
        let adoptionError: unknown;
        try {
          const adopted = await adopt();
          resolveAdopted(adopted.activeLeafMessageId, adopted.branchVersion);
          return;
        } catch (error) {
          adoptionError = error;
        }
        if (await refreshAfterAmbiguousResult()) return;

        const retryAmbiguousRequest =
          adoptionError instanceof AgentClientError &&
          (adoptionError.kind === 'NETWORK' ||
            (adoptionError.kind === 'HTTP' && (adoptionError.status ?? 0) >= 500));
        if (retryAmbiguousRequest) {
          try {
            const adopted = await adopt();
            resolveAdopted(adopted.activeLeafMessageId, adopted.branchVersion);
            return;
          } catch (error) {
            adoptionError = error;
          }
          if (await refreshAfterAmbiguousResult()) return;
        }

        const definitiveConflict = isBranchCasConflict(adoptionError);
        if (definitiveConflict) {
          branchAdoptionIntentRef.current.delete(runId);
          dispatch({ type: 'RUN_BRANCH_ADOPTION_CONFLICTED', runId });
          setCommandError('重新生成结果未设为当前分支：会话已在其他页面切换');
          return;
        }

        dispatch({ type: 'RUN_BRANCH_ADOPTION_UNCERTAIN', runId });
        setCommandError(
          isActiveRunConflict(adoptionError)
            ? '会话已有其他任务运行中；已保留重新生成结果，可在任务结束后重试采纳'
            : '无法确认重新生成结果是否已设为当前分支；已保留该结果，可稍后重试'
        );
      } catch (error) {
        dispatch({ type: 'RUN_BRANCH_ADOPTION_UNCERTAIN', runId });
        setCommandError(commandErrorMessage(error, '无法确认重新生成结果的分支状态'));
      } finally {
        branchAdoptionInFlightRef.current.delete(runId);
      }
    },
    [dispatch, refreshConversationDetail]
  );

  const refreshFinalSnapshot = useCallback(
    async (runId: string, targetConversationId: string, expectedMessageId?: string) => {
      const adoption =
        branchAdoptionIntentRef.current.get(runId) ??
        stateBranchAdoptionIntent(stateRef.current, targetConversationId);
      let expectedMessageStatus: AgentMessageSnapshot['status'] | null = null;
      const [refreshed, branch] = await Promise.all([
        refreshMessages(targetConversationId, true, {
          expectedMessageId,
          displayMessageId: adoption?.targetMessageId ?? null,
          finalRunId: runId,
          retryDelaysMs: FINAL_SNAPSHOT_RETRY_DELAYS_MS,
          abortSignal: finalSnapshotAbortRef.current?.signal,
          onExpectedMessage: (message) => {
            expectedMessageStatus = message.status;
          },
        }),
        adoption ? refreshConversationDetail(targetConversationId) : Promise.resolve(null),
      ]);
      if (refreshed && adoption && !finalSnapshotAbortRef.current?.signal.aborted) {
        if (expectedMessageStatus === 'COMPLETED' && branch) {
          await settleRegeneratedBranch(adoption, branch);
        } else if (expectedMessageStatus === 'FAILED' || expectedMessageStatus === 'CANCELLED') {
          branchAdoptionIntentRef.current.delete(runId);
          dispatch({ type: 'RUN_BRANCH_ADOPTION_ABANDONED', runId });
        }
      }
      return refreshed;
    },
    [dispatch, refreshConversationDetail, refreshMessages, settleRegeneratedBranch]
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
    (runId: string, afterSequence = 0, lastEventId?: string, endpoint?: string): void => {
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
        includeReasoning: true,
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
            const finalMessageId =
              event.type === 'agent.completed'
                ? event.payload.finalMessageId
                : (event.messageId ?? stateRef.current.runs.byId[runId]?.assistantMessageId);
            void Promise.allSettled([
              refreshRunStatus(runId, finalMessageId),
              refreshFinalSnapshot(runId, event.conversationId, finalMessageId),
            ]);
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
            if (TERMINAL_RUN_STATUSES.has(snapshot.status)) {
              await refreshFinalSnapshot(
                runId,
                snapshot.conversationId,
                snapshot.finalMessageId ?? run?.assistantMessageId
              );
            } else {
              await refreshMessages(snapshot.conversationId, false);
            }
          } catch (statusError) {
            setCommandError(commandErrorMessage(statusError, '无法确认任务状态'));
          }
        })
        .finally(() => {
          if (activeStreamRef.current?.generation === generation) activeStreamRef.current = null;
        });
    },
    [dispatch, refreshFinalSnapshot, refreshMessages, refreshRunStatus]
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
          startStream(snapshot.runId, run.latestEventSequence, run.lastEventId);
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
      let baseAssistantMessageId: string | null = null;
      let expectedBranchVersion = 0;
      let branchOverride: BranchAdoptionIntent | null = null;
      const modelPolicy = 'MANUAL' as const;

      try {
        if (targetConversationId && !conversation) {
          setCommandError('会话尚未加载完成');
          return false;
        }
        if (targetConversationId) {
          const branch = await refreshConversationDetail(targetConversationId);
          const refOverrides = [...branchAdoptionIntentRef.current.values()].reverse();
          branchOverride =
            refOverrides.find((item) => item.conversationId === targetConversationId) ??
            stateBranchAdoptionIntent(stateRef.current, targetConversationId);
          if (branchOverride && branch.activeLeafMessageId === branchOverride.targetMessageId) {
            branchAdoptionIntentRef.current.delete(branchOverride.runId);
            dispatch({
              type: 'RUN_BRANCH_ADOPTION_RESOLVED',
              runId: branchOverride.runId,
              conversationId: targetConversationId,
              activeLeafMessageId: branchOverride.targetMessageId,
              branchVersion: branch.branchVersion,
            });
            branchOverride = null;
          }
          baseAssistantMessageId =
            branchOverride?.targetMessageId ?? branch.activeLeafMessageId ?? null;
          expectedBranchVersion = branchOverride?.expectedBranchVersion ?? branch.branchVersion;
        }
        if (!targetConversationId) {
          const createRequestId = newRequestId();
          const title = conversationTitle(content);
          const preferredModel = newConversationModel.preferredModel;
          if (!preferredModel) {
            setCommandError('暂无可用模型，请先配置或选择模型');
            return false;
          }
          const created = await agentApi.createConversation({
            clientRequestId: createRequestId,
            title,
            modelPolicy,
            preferredModel,
            reasoningEffort: newConversationModel.reasoningEffort,
            researchDepth: DEFAULT_RESEARCH_DEPTH,
            answerDetail: DEFAULT_ANSWER_DETAIL,
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
              reasoningEffort: newConversationModel.reasoningEffort,
              researchDepth: DEFAULT_RESEARCH_DEPTH,
              answerDetail: DEFAULT_ANSWER_DETAIL,
              activeLeafMessageId: null,
              branchVersion: 0,
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
          contextParentMessageId: baseAssistantMessageId,
          baseAssistantMessageId,
          expectedBranchVersion,
          ...(branchOverride === null ? {} : { branchAdoptionRunId: branchOverride.runId }),
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
          ...(baseAssistantMessageId === null ? {} : { baseAssistantMessageId }),
          ...(baseAssistantMessageId === null ? {} : { expectedBranchVersion }),
        });
        dispatch({
          type: 'MESSAGE_SEND_CONFIRMED',
          conversationId: targetConversationId,
          localMessageId,
          response,
        });
        if (branchOverride && baseAssistantMessageId === branchOverride.targetMessageId) {
          branchAdoptionIntentRef.current.delete(branchOverride.runId);
          dispatch({
            type: 'RUN_BRANCH_ADOPTION_RESOLVED',
            runId: branchOverride.runId,
            conversationId: targetConversationId,
            activeLeafMessageId: baseAssistantMessageId,
            branchVersion: response.branchVersion,
          });
        }
        startStream(response.runId, 0, undefined, response.streamEndpoint);
        return true;
      } catch (error) {
        if (localMessageId) dispatch({ type: 'MESSAGE_SEND_FAILED', localMessageId });
        if (isBranchCasConflict(error) && localMessageId && targetConversationId) {
          try {
            await recoverSendBranchConflict(localMessageId, targetConversationId, branchOverride);
          } catch {
            // Keep the original conflict visible; a later full refresh can recover the branch state.
          }
          setCommandError('会话分支已在其他页面变更，状态已刷新，请确认后重试');
        } else if (isActiveRunConflict(error)) {
          setCommandError('会话已有任务运行中；已保留本次请求，请在任务结束后重试');
        } else {
          setCommandError(commandErrorMessage(error, '问题发送失败'));
        }
        return false;
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [
      conversation,
      conversationId,
      dispatch,
      newConversationModel,
      recoverSendBranchConflict,
      refreshConversationDetail,
      router,
      startStream,
    ]
  );

  const cancel = useCallback(async (): Promise<void> => {
    const run = selectActiveRun(stateRef.current, conversationId);
    if (!run || run.cancelRequested || !run.canCancel || TERMINAL_RUN_STATUSES.has(run.status))
      return;

    dispatch({ type: 'RUN_CANCEL_REQUESTED', runId: run.runId });
    setCommandError(null);
    try {
      let snapshot = await refreshRunStatus(run.runId, run.assistantMessageId);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (TERMINAL_RUN_STATUSES.has(snapshot.status)) {
          await refreshFinalSnapshot(
            run.runId,
            run.conversationId,
            snapshot.finalMessageId ?? run.assistantMessageId
          );
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
            await refreshFinalSnapshot(run.runId, run.conversationId, run.assistantMessageId);
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
        if (TERMINAL_RUN_STATUSES.has(snapshot.status)) {
          await refreshFinalSnapshot(
            run.runId,
            run.conversationId,
            snapshot.finalMessageId ?? run.assistantMessageId
          );
        } else {
          await refreshMessages(run.conversationId, false);
        }
        if (!TERMINAL_RUN_STATUSES.has(snapshot.status) && snapshot.status !== 'CANCEL_REQUESTED') {
          setCommandError(commandErrorMessage(error, '停止请求结果未知，任务可能仍在后台运行'));
        }
      } catch {
        setCommandError(commandErrorMessage(error, '停止请求结果未知，任务可能仍在后台运行'));
      }
    }
  }, [conversationId, dispatch, refreshFinalSnapshot, refreshMessages, refreshRunStatus]);

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
      const branchOverride = message.branchAdoptionRunId
        ? (branchAdoptionIntentRef.current.get(message.branchAdoptionRunId) ??
          stateBranchAdoptionIntent(stateRef.current, message.conversationId))
        : null;
      try {
        const response = await agentApi.sendMessage({
          clientRequestId: message.clientRequestId,
          conversationId: message.conversationId,
          content,
          modelPolicy: 'MANUAL',
          allowedCapabilities: [...AGENT_CAPABILITIES],
          ...(message.baseAssistantMessageId == null
            ? {}
            : { baseAssistantMessageId: message.baseAssistantMessageId }),
          ...(message.baseAssistantMessageId == null || message.expectedBranchVersion === undefined
            ? {}
            : { expectedBranchVersion: message.expectedBranchVersion }),
        });
        dispatch({
          type: 'MESSAGE_SEND_CONFIRMED',
          conversationId: message.conversationId,
          localMessageId: message.messageId,
          response,
        });
        if (message.branchAdoptionRunId && message.baseAssistantMessageId) {
          branchAdoptionIntentRef.current.delete(message.branchAdoptionRunId);
          dispatch({
            type: 'RUN_BRANCH_ADOPTION_RESOLVED',
            runId: message.branchAdoptionRunId,
            conversationId: message.conversationId,
            activeLeafMessageId: message.baseAssistantMessageId,
            branchVersion: response.branchVersion,
          });
        }
        startStream(response.runId, 0, undefined, response.streamEndpoint);
        return true;
      } catch (error) {
        dispatch({ type: 'MESSAGE_SEND_FAILED', localMessageId: message.messageId });
        if (isBranchCasConflict(error)) {
          try {
            await recoverSendBranchConflict(
              message.messageId,
              message.conversationId,
              branchOverride
            );
          } catch {
            // Keep the failed local message and let a later conversation refresh recover.
          }
          setCommandError('会话分支已在其他页面变更，状态已刷新，请再次重试');
        } else if (isActiveRunConflict(error)) {
          setCommandError('会话已有任务运行中；已保留本次请求，请在任务结束后重试');
        } else {
          setCommandError(commandErrorMessage(error, '消息重试失败'));
        }
        return false;
      }
    },
    [dispatch, recoverSendBranchConflict, startStream]
  );

  const regenerate = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!conversationId || selectActiveRun(stateRef.current, conversationId)) return false;
      setCommandError(null);
      try {
        const message = stateRef.current.messages.byId[messageId];
        const projection =
          stateRef.current.loadsByConversation[conversationId]?.messageProjection ?? null;
        const currentConversation = stateRef.current.conversations.byId[conversationId];
        const projectionMatchesConversation = Boolean(
          projection &&
            currentConversation &&
            projection.branchVersion === currentConversation.branchVersion &&
            projection.activeLeafMessageId === currentConversation.activeLeafMessageId
        );
        const orderedIds = stateRef.current.messages.orderedIdsByConversation[conversationId] ?? [];
        const triggerMessage = message?.parentMessageId
          ? stateRef.current.messages.byId[message.parentMessageId]
          : null;
        const retryingCompatibleAttempt =
          projection?.displayLeafMessageId === messageId &&
          projection.displayBranchCompatible &&
          (message?.status === 'FAILED' || message?.status === 'CANCELLED');
        if (
          !message ||
          !message.parentMessageId ||
          !triggerMessage ||
          triggerMessage.role !== 'USER' ||
          !orderedIds.includes(triggerMessage.messageId) ||
          !orderedIds.includes(messageId) ||
          !projectionMatchesConversation ||
          !projection?.lineageComplete ||
          (!projection.isActiveBranch && !retryingCompatibleAttempt)
        ) {
          setCommandError('该版本不是可继续的当前分支，请先切换或采纳对应版本');
          return false;
        }
        const sourceRunId = message?.status === 'FAILED' ? message.run?.runId : null;
        const clientRequestId = newRequestId();
        let response: AgentRunRegenerated | AgentRunRetried;
        if (sourceRunId) {
          const snapshot = await refreshRunStatus(sourceRunId, messageId);
          response = snapshot.canRetry
            ? await agentApi.retryRun({ clientRequestId, runId: sourceRunId })
            : await agentApi.regenerateMessage({
                clientRequestId,
                messageId,
                modelPolicy: 'MANUAL',
              });
        } else {
          response = await agentApi.regenerateMessage({
            clientRequestId,
            messageId,
            modelPolicy: 'MANUAL',
          });
        }
        if ('sourceMessageId' in response) {
          branchAdoptionIntentRef.current.set(response.runId, {
            runId: response.runId,
            conversationId,
            targetMessageId: response.assistantMessageId,
            expectedBranchVersion: response.branchVersion,
          });
        }
        dispatch({
          type: 'RUN_REGENERATION_CONFIRMED',
          conversationId,
          response,
          createdAt: new Date().toISOString(),
          sourceMessageId: messageId,
          contextParentMessageId: message.parentMessageId,
          baseAssistantMessageId: triggerMessage.contextParentMessageId ?? null,
          expectedBranchVersion: response.branchVersion,
        });
        startStream(response.runId, 0, undefined, response.streamEndpoint);
        return true;
      } catch (error) {
        if (isBranchCasConflict(error)) {
          await Promise.allSettled([
            refreshConversationDetail(conversationId),
            refreshMessages(conversationId, false),
          ]);
          setCommandError('会话分支已在其他页面变更，状态已刷新，请确认后重试');
        } else {
          setCommandError(commandErrorMessage(error, '重试或重新生成失败'));
        }
        return false;
      }
    },
    [
      conversationId,
      dispatch,
      refreshConversationDetail,
      refreshMessages,
      refreshRunStatus,
      startStream,
    ]
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
