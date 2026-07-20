import { messageStatusForRun, TERMINAL_RUN_STATUSES } from './agent-state.types';

import type {
  AgentState,
  AgentAction,
  AgentMessageEntity,
  AgentRunProjection,
  AgentConversationEntity,
  AgentConversationLoadState,
} from './agent-state.types';

const EMPTY_LOAD: AgentConversationLoadState = {
  detailStatus: 'idle',
  messagesStatus: 'idle',
  error: null,
  detailGeneration: 0,
  messagesGeneration: 0,
  nextBeforeMessageId: null,
};

export function createInitialAgentState(initialConversationId: string | null = null): AgentState {
  return {
    conversations: { byId: {}, orderedIds: [] },
    messages: { byId: {}, orderedIdsByConversation: {} },
    runs: { byId: {}, activeRunIdByConversation: {} },
    currentConversationId: initialConversationId,
    selectionGeneration: 0,
    list: {
      status: 'idle',
      error: null,
      generation: 0,
      nextCursor: null,
      loadingMore: false,
    },
    loadsByConversation: {},
    staleConversationIds: [],
  };
}

function mergeConversation(
  current: AgentConversationEntity | undefined,
  incoming: AgentConversationEntity
): AgentConversationEntity {
  if (!current) return incoming;
  if (
    current.statusVersion !== undefined &&
    incoming.statusVersion !== undefined &&
    incoming.statusVersion < current.statusVersion
  ) {
    return current;
  }

  const currentUpdatedAt = Date.parse(current.updatedAt);
  const incomingUpdatedAt = Date.parse(incoming.updatedAt);
  if (
    Number.isFinite(currentUpdatedAt) &&
    Number.isFinite(incomingUpdatedAt) &&
    incomingUpdatedAt < currentUpdatedAt
  ) {
    return { ...incoming, ...current };
  }
  return { ...current, ...incoming };
}

function loadFor(state: AgentState, conversationId: string): AgentConversationLoadState {
  return state.loadsByConversation[conversationId] ?? EMPTY_LOAD;
}

function replaceMessageIdentity(
  state: AgentState,
  conversationId: string,
  oldId: string,
  message: AgentMessageEntity
): AgentState['messages'] {
  const byId = { ...state.messages.byId };
  delete byId[oldId];
  byId[message.messageId] = message;

  const currentOrder = state.messages.orderedIdsByConversation[conversationId] ?? [];
  const nextOrder = currentOrder.map((id) => (id === oldId ? message.messageId : id));
  return {
    byId,
    orderedIdsByConversation: {
      ...state.messages.orderedIdsByConversation,
      [conversationId]: [...new Set(nextOrder)],
    },
  };
}

function createRun(
  runId: string,
  conversationId: string,
  assistantMessageId: string,
  status: AgentRunProjection['status'],
  statusVersion = 1
): AgentRunProjection {
  return {
    runId,
    conversationId,
    assistantMessageId,
    status,
    statusVersion,
    canCancel: status === 'QUEUED' || status === 'RUNNING',
    currentStep: null,
    latestEventSequence: 0,
    connectionGeneration: 0,
    connectionState: 'IDLE',
    reconnects: 0,
    stageLabel: status === 'QUEUED' ? '等待开始' : '正在研究',
    needsFinalSnapshot: false,
    cancelRequested: false,
  };
}

function assistantPlaceholder(
  conversationId: string,
  messageId: string,
  runId: string,
  status: AgentRunProjection['status'],
  createdAt: string
): AgentMessageEntity {
  return {
    messageId,
    conversationId,
    role: 'ASSISTANT',
    status: messageStatusForRun(status),
    contentText: '',
    contentBlocks: [],
    citations: [],
    version: 1,
    parentMessageId: null,
    modelName: null,
    run: { runId, status, statusVersion: 1, endedAt: null },
    createdAt,
    completedAt: null,
  };
}

function withMessage(
  state: AgentState,
  conversationId: string,
  message: AgentMessageEntity
): AgentState['messages'] {
  const order = state.messages.orderedIdsByConversation[conversationId] ?? [];
  return {
    byId: { ...state.messages.byId, [message.messageId]: message },
    orderedIdsByConversation: {
      ...state.messages.orderedIdsByConversation,
      [conversationId]: order.includes(message.messageId) ? order : [...order, message.messageId],
    },
  };
}

function mergeMessages(
  state: AgentState,
  conversationId: string,
  items: AgentMessageEntity[],
  mode: 'replace' | 'prepend' | 'refresh',
  authoritative: boolean
): AgentState['messages'] {
  const byId = { ...state.messages.byId };
  const incomingIds: string[] = [];

  items.forEach((incoming) => {
    const existing = byId[incoming.messageId];
    const keepStreamingText =
      !authoritative &&
      existing?.status === 'STREAMING' &&
      (existing.contentText?.length ?? 0) > (incoming.contentText?.length ?? 0);
    byId[incoming.messageId] = keepStreamingText
      ? { ...incoming, contentText: existing.contentText, status: existing.status }
      : { ...existing, ...incoming };
    incomingIds.push(incoming.messageId);
  });

  const currentIds = state.messages.orderedIdsByConversation[conversationId] ?? [];
  const localOrPendingIds = currentIds.filter((id) => {
    if (incomingIds.includes(id)) return false;
    const message = byId[id];
    return message?.localId !== undefined || message?.status === 'PENDING';
  });
  const orderedIds =
    mode === 'prepend'
      ? [...incomingIds, ...currentIds]
      : mode === 'refresh'
        ? [...incomingIds, ...localOrPendingIds]
        : [...incomingIds, ...localOrPendingIds];

  return {
    byId,
    orderedIdsByConversation: {
      ...state.messages.orderedIdsByConversation,
      [conversationId]: [...new Set(orderedIds)],
    },
  };
}

function updateRunMessage(
  messages: AgentState['messages'],
  run: AgentRunProjection,
  patch: Partial<AgentMessageEntity>
): AgentState['messages'] {
  const message = messages.byId[run.assistantMessageId];
  if (!message) return messages;
  return {
    ...messages,
    byId: {
      ...messages.byId,
      [message.messageId]: { ...message, ...patch },
    },
  };
}

export function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'CONVERSATION_SELECTED':
      if (state.currentConversationId === action.conversationId) return state;
      return {
        ...state,
        currentConversationId: action.conversationId,
        selectionGeneration: state.selectionGeneration + 1,
      };

    case 'CONVERSATION_LIST_REQUESTED':
      return {
        ...state,
        list: {
          ...state.list,
          status: action.append && state.list.status === 'ready' ? 'ready' : 'loading',
          error: null,
          generation: action.generation,
          loadingMore: action.append,
        },
      };

    case 'CONVERSATION_LIST_SUCCEEDED': {
      if (state.list.generation !== action.generation) return state;
      const byId = { ...state.conversations.byId };
      action.items.forEach((item) => {
        byId[item.conversationId] = mergeConversation(byId[item.conversationId], item);
      });
      const incomingIds = action.items.map((item) => item.conversationId);
      const orderedIds = action.append
        ? [...new Set([...state.conversations.orderedIds, ...incomingIds])]
        : incomingIds;
      return {
        ...state,
        conversations: { byId, orderedIds },
        list: {
          ...state.list,
          status: 'ready',
          error: null,
          nextCursor: action.nextCursor,
          loadingMore: false,
        },
      };
    }

    case 'CONVERSATION_LIST_FAILED':
      if (state.list.generation !== action.generation) return state;
      return {
        ...state,
        list: { ...state.list, status: 'error', error: action.error, loadingMore: false },
      };

    case 'CONVERSATION_CREATED':
      return {
        ...state,
        conversations: {
          byId: {
            ...state.conversations.byId,
            [action.conversation.conversationId]: action.conversation,
          },
          orderedIds: [
            action.conversation.conversationId,
            ...state.conversations.orderedIds.filter(
              (id) => id !== action.conversation.conversationId
            ),
          ],
        },
        currentConversationId: action.conversation.conversationId,
        selectionGeneration: state.selectionGeneration + 1,
      };

    case 'CONVERSATION_DETAIL_REQUESTED': {
      const current = loadFor(state, action.conversationId);
      return {
        ...state,
        loadsByConversation: {
          ...state.loadsByConversation,
          [action.conversationId]: {
            ...current,
            detailStatus: 'loading',
            detailGeneration: action.generation,
            error: null,
          },
        },
      };
    }

    case 'CONVERSATION_DETAIL_SUCCEEDED': {
      const current = loadFor(state, action.conversationId);
      if (current.detailGeneration !== action.generation) return state;
      return {
        ...state,
        conversations: {
          byId: {
            ...state.conversations.byId,
            [action.conversationId]: mergeConversation(
              state.conversations.byId[action.conversationId],
              action.conversation
            ),
          },
          orderedIds: state.conversations.orderedIds.includes(action.conversationId)
            ? state.conversations.orderedIds
            : [action.conversationId, ...state.conversations.orderedIds],
        },
        loadsByConversation: {
          ...state.loadsByConversation,
          [action.conversationId]: { ...current, detailStatus: 'ready', error: null },
        },
        staleConversationIds: state.staleConversationIds.filter(
          (id) => id !== action.conversationId
        ),
      };
    }

    case 'CONVERSATION_DETAIL_FAILED': {
      const current = loadFor(state, action.conversationId);
      if (current.detailGeneration !== action.generation) return state;
      return {
        ...state,
        loadsByConversation: {
          ...state.loadsByConversation,
          [action.conversationId]: {
            ...current,
            detailStatus: 'error',
            error: action.error,
          },
        },
      };
    }

    case 'MESSAGES_REQUESTED': {
      const current = loadFor(state, action.conversationId);
      return {
        ...state,
        loadsByConversation: {
          ...state.loadsByConversation,
          [action.conversationId]: {
            ...current,
            messagesStatus: 'loading',
            messagesGeneration: action.generation,
            error: null,
          },
        },
      };
    }

    case 'MESSAGES_SUCCEEDED': {
      const current = loadFor(state, action.conversationId);
      if (current.messagesGeneration !== action.generation) return state;
      const items = action.items.map((item) => ({ ...item, conversationId: action.conversationId }));
      return {
        ...state,
        messages: mergeMessages(
          state,
          action.conversationId,
          items,
          action.mode,
          action.authoritative ?? false
        ),
        loadsByConversation: {
          ...state.loadsByConversation,
          [action.conversationId]: {
            ...current,
            messagesStatus: 'ready',
            error: null,
            nextBeforeMessageId: action.nextBeforeMessageId,
          },
        },
      };
    }

    case 'MESSAGES_FAILED': {
      const current = loadFor(state, action.conversationId);
      if (current.messagesGeneration !== action.generation) return state;
      return {
        ...state,
        loadsByConversation: {
          ...state.loadsByConversation,
          [action.conversationId]: {
            ...current,
            messagesStatus: 'error',
            error: action.error,
          },
        },
      };
    }

    case 'OPTIMISTIC_USER_MESSAGE_ADDED':
      return {
        ...state,
        messages: withMessage(state, action.conversationId, action.message),
      };

    case 'MESSAGE_SEND_CONFIRMED': {
      const local = state.messages.byId[action.localMessageId];
      if (!local) return state;
      const confirmedUser: AgentMessageEntity = {
        ...local,
        messageId: action.response.userMessageId,
        status: 'COMPLETED',
        deliveryStatus: undefined,
        localId: action.localMessageId,
      };
      let messages = replaceMessageIdentity(
        state,
        action.conversationId,
        action.localMessageId,
        confirmedUser
      );
      const placeholder = assistantPlaceholder(
        action.conversationId,
        action.response.assistantMessageId,
        action.response.runId,
        action.response.runStatus,
        new Date().toISOString()
      );
      const order = messages.orderedIdsByConversation[action.conversationId] ?? [];
      messages = {
        byId: { ...messages.byId, [placeholder.messageId]: placeholder },
        orderedIdsByConversation: {
          ...messages.orderedIdsByConversation,
          [action.conversationId]: order.includes(placeholder.messageId)
            ? order
            : [...order, placeholder.messageId],
        },
      };
      const run = createRun(
        action.response.runId,
        action.conversationId,
        action.response.assistantMessageId,
        action.response.runStatus
      );
      return {
        ...state,
        messages,
        runs: {
          byId: { ...state.runs.byId, [run.runId]: run },
          activeRunIdByConversation: {
            ...state.runs.activeRunIdByConversation,
            [action.conversationId]: run.runId,
          },
        },
      };
    }

    case 'MESSAGE_SEND_FAILED': {
      const message = state.messages.byId[action.localMessageId];
      if (!message) return state;
      return {
        ...state,
        messages: {
          ...state.messages,
          byId: {
            ...state.messages.byId,
            [action.localMessageId]: {
              ...message,
              status: 'FAILED',
              deliveryStatus: 'UNSENT',
            },
          },
        },
      };
    }

    case 'MESSAGE_RETRY_REQUESTED': {
      const message = state.messages.byId[action.messageId];
      if (!message || !message.clientRequestId) return state;
      return {
        ...state,
        messages: {
          ...state.messages,
          byId: {
            ...state.messages.byId,
            [action.messageId]: {
              ...message,
              status: 'PENDING',
              deliveryStatus: 'SENDING',
            },
          },
        },
      };
    }

    case 'RUN_REGENERATION_CONFIRMED': {
      const run = createRun(
        action.response.runId,
        action.conversationId,
        action.response.assistantMessageId,
        action.response.runStatus
      );
      const placeholder = assistantPlaceholder(
        action.conversationId,
        action.response.assistantMessageId,
        action.response.runId,
        action.response.runStatus,
        action.createdAt
      );
      return {
        ...state,
        messages: withMessage(state, action.conversationId, placeholder),
        runs: {
          byId: { ...state.runs.byId, [run.runId]: run },
          activeRunIdByConversation: {
            ...state.runs.activeRunIdByConversation,
            [action.conversationId]: run.runId,
          },
        },
      };
    }

    case 'RUN_DISCOVERED': {
      const existing = state.runs.byId[action.runId];
      const run = existing ??
        createRun(
          action.runId,
          action.conversationId,
          action.assistantMessageId,
          action.status,
          action.statusVersion
        );
      return {
        ...state,
        runs: {
          byId: { ...state.runs.byId, [run.runId]: run },
          activeRunIdByConversation: TERMINAL_RUN_STATUSES.has(action.status)
            ? state.runs.activeRunIdByConversation
            : {
                ...state.runs.activeRunIdByConversation,
                [action.conversationId]: action.runId,
              },
        },
      };
    }

    case 'RUN_STATUS_RECEIVED': {
      const existing = state.runs.byId[action.snapshot.runId];
      if (existing && action.snapshot.statusVersion < existing.statusVersion) return state;
      if (existing && TERMINAL_RUN_STATUSES.has(existing.status)) {
        if (!TERMINAL_RUN_STATUSES.has(action.snapshot.status)) return state;
      }
      const assistantMessageId = action.assistantMessageId ?? existing?.assistantMessageId;
      if (!assistantMessageId) return state;
      const run: AgentRunProjection = {
        ...(existing ??
          createRun(
            action.snapshot.runId,
            action.snapshot.conversationId,
            assistantMessageId,
            action.snapshot.status,
            action.snapshot.statusVersion
          )),
        assistantMessageId,
        status: action.snapshot.status,
        statusVersion: action.snapshot.statusVersion,
        canCancel: action.snapshot.canCancel,
        currentStep: action.snapshot.currentStep,
        latestEventSequence: Math.max(
          existing?.latestEventSequence ?? 0,
          action.snapshot.latestEventSequence
        ),
        errorCode: action.snapshot.errorCode,
        errorMessage: action.snapshot.errorMessage,
        cancelRequested: action.snapshot.status === 'CANCEL_REQUESTED',
        needsFinalSnapshot: TERMINAL_RUN_STATUSES.has(action.snapshot.status),
        stageLabel:
          action.snapshot.currentStep?.stepKey ??
          (TERMINAL_RUN_STATUSES.has(action.snapshot.status) ? '研究结束' : '正在研究'),
      };
      const active = { ...state.runs.activeRunIdByConversation };
      if (TERMINAL_RUN_STATUSES.has(run.status)) delete active[run.conversationId];
      else active[run.conversationId] = run.runId;
      return {
        ...state,
        messages: updateRunMessage(state.messages, run, {
          status: messageStatusForRun(run.status),
          run: {
            runId: run.runId,
            status: run.status,
            statusVersion: run.statusVersion,
            endedAt: action.snapshot.endedAt,
          },
          completedAt: action.snapshot.endedAt,
        }),
        runs: { byId: { ...state.runs.byId, [run.runId]: run }, activeRunIdByConversation: active },
      };
    }

    case 'RUN_CONNECTION_CHANGED': {
      const run = state.runs.byId[action.runId];
      if (!run || action.connectionGeneration < run.connectionGeneration) return state;
      return {
        ...state,
        runs: {
          ...state.runs,
          byId: {
            ...state.runs.byId,
            [run.runId]: {
              ...run,
              connectionGeneration: action.connectionGeneration,
              connectionState: action.connectionState,
              reconnects: action.reconnects ?? run.reconnects,
              errorMessage: action.errorMessage ?? run.errorMessage,
            },
          },
        },
      };
    }

    case 'RUN_EVENT_ACCEPTED': {
      const run = state.runs.byId[action.event.runId];
      if (!run || action.event.conversationId !== run.conversationId) return state;
      if (action.connectionGeneration !== run.connectionGeneration) return state;
      if (action.event.sequence !== run.latestEventSequence + 1) return state;

      let nextRun: AgentRunProjection = {
        ...run,
        latestEventSequence: action.event.sequence,
        lastEventId: action.event.eventId,
        errorMessage: null,
      };
      let messages = state.messages;

      switch (action.event.type) {
        case 'message.created': {
          const messageId = action.event.messageId ?? action.event.payload.messageId;
          if (!messages.byId[messageId]) {
            messages = withMessage(
              { ...state, messages },
              run.conversationId,
              {
                messageId,
                conversationId: run.conversationId,
                role: action.event.payload.role,
                status: action.event.payload.status,
                contentText: '',
                contentBlocks: [],
                citations: [],
                version: 1,
                parentMessageId: null,
                modelName: null,
                run: {
                  runId: run.runId,
                  status: run.status,
                  statusVersion: run.statusVersion,
                  endedAt: null,
                },
                createdAt: action.event.occurredAt,
                completedAt: null,
              }
            );
          }
          nextRun = { ...nextRun, assistantMessageId: messageId };
          break;
        }
        case 'agent.started':
          nextRun = { ...nextRun, status: 'RUNNING', canCancel: true, stageLabel: '正在规划研究' };
          break;
        case 'agent.planning':
          nextRun = {
            ...nextRun,
            stageLabel: '研究计划已生成',
            planSummary: action.event.payload.planSummary,
          };
          break;
        case 'agent.progress':
          nextRun = {
            ...nextRun,
            stageLabel: action.event.payload.label,
            progress: {
              label: action.event.payload.label,
              completed: action.event.payload.completed,
              total: action.event.payload.total,
            },
          };
          break;
        case 'tool.started':
          nextRun = { ...nextRun, stageLabel: `正在调用 ${action.event.payload.toolName}` };
          break;
        case 'tool.completed':
          nextRun = { ...nextRun, stageLabel: '数据处理完成' };
          break;
        case 'tool.failed':
          nextRun = {
            ...nextRun,
            stageLabel: action.event.payload.willRetry ? '数据调用重试中' : '部分数据调用失败',
            errorCode: action.event.payload.error.code,
            errorMessage: action.event.payload.error.message,
            retryable: action.event.payload.error.retryable,
          };
          break;
        case 'model.started':
          nextRun = { ...nextRun, stageLabel: '正在组织研究结论' };
          break;
        case 'model.delta': {
          const messageId = action.event.messageId ?? nextRun.assistantMessageId;
          const message = messages.byId[messageId];
          if (message) {
            messages = {
              ...messages,
              byId: {
                ...messages.byId,
                [messageId]: {
                  ...message,
                  status: 'STREAMING',
                  contentText: `${message.contentText ?? ''}${action.event.payload.delta}`,
                },
              },
            };
          }
          break;
        }
        case 'agent.completed': {
          const previousMessageId = nextRun.assistantMessageId;
          const finalMessageId = action.event.payload.finalMessageId;
          const previousMessage = messages.byId[previousMessageId];
          if (previousMessage && previousMessageId !== finalMessageId) {
            messages = replaceMessageIdentity(
              { ...state, messages },
              run.conversationId,
              previousMessageId,
              { ...previousMessage, messageId: finalMessageId }
            );
          }
          nextRun = {
            ...nextRun,
            assistantMessageId: finalMessageId,
            status: 'COMPLETED',
            canCancel: false,
            cancelRequested: false,
            needsFinalSnapshot: true,
            connectionState: 'COMPLETED',
            stageLabel: '研究完成',
          };
          break;
        }
        case 'agent.failed':
          nextRun = {
            ...nextRun,
            status: 'FAILED',
            canCancel: false,
            cancelRequested: false,
            needsFinalSnapshot: true,
            connectionState: 'COMPLETED',
            stageLabel: '研究失败',
            errorCode: action.event.payload.error.code,
            errorMessage: action.event.payload.error.message,
            retryable: action.event.payload.retryable,
          };
          break;
        case 'agent.cancelled':
          nextRun = {
            ...nextRun,
            status: 'CANCELLED',
            canCancel: false,
            cancelRequested: false,
            needsFinalSnapshot: true,
            connectionState: 'COMPLETED',
            stageLabel: '已停止',
          };
          break;
        default:
          break;
      }

      if (TERMINAL_RUN_STATUSES.has(nextRun.status)) {
        messages = updateRunMessage(messages, nextRun, {
          status: messageStatusForRun(nextRun.status),
          completedAt: action.event.occurredAt,
        });
      }
      const active = { ...state.runs.activeRunIdByConversation };
      if (TERMINAL_RUN_STATUSES.has(nextRun.status)) delete active[nextRun.conversationId];
      return {
        ...state,
        messages,
        runs: {
          byId: { ...state.runs.byId, [nextRun.runId]: nextRun },
          activeRunIdByConversation: active,
        },
      };
    }

    case 'RUN_CANCEL_REQUESTED': {
      const run = state.runs.byId[action.runId];
      if (!run || TERMINAL_RUN_STATUSES.has(run.status)) return state;
      return {
        ...state,
        runs: {
          ...state.runs,
          byId: {
            ...state.runs.byId,
            [run.runId]: {
              ...run,
              cancelRequested: true,
              stageLabel: '正在停止',
            },
          },
        },
      };
    }

    case 'RUN_CANCEL_RESOLVED': {
      const run = state.runs.byId[action.runId];
      if (!run || action.statusVersion < run.statusVersion) return state;
      if (TERMINAL_RUN_STATUSES.has(run.status) && !TERMINAL_RUN_STATUSES.has(action.status)) {
        return state;
      }
      const nextRun: AgentRunProjection = {
        ...run,
        status: action.status,
        statusVersion: action.statusVersion,
        canCancel: action.status === 'QUEUED' || action.status === 'RUNNING',
        cancelRequested: action.cancellationAccepted && action.status === 'CANCEL_REQUESTED',
        stageLabel:
          action.status === 'CANCEL_REQUESTED'
            ? '正在停止'
            : TERMINAL_RUN_STATUSES.has(action.status)
              ? '研究结束'
              : run.stageLabel,
      };
      return {
        ...state,
        messages: updateRunMessage(state.messages, nextRun, {
          status: messageStatusForRun(nextRun.status),
        }),
        runs: {
          ...state.runs,
          byId: { ...state.runs.byId, [run.runId]: nextRun },
        },
      };
    }

    case 'CONVERSATION_INVALIDATED':
      return state.staleConversationIds.includes(action.conversationId)
        ? state
        : {
            ...state,
            staleConversationIds: [...state.staleConversationIds, action.conversationId],
          };

    case 'AGENT_STATE_RESET':
      return createInitialAgentState();

    default:
      return state;
  }
}
