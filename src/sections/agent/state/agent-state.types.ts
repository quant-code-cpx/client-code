import type { AgentResponse } from 'src/api/agent';
import type {
  ModelPolicy,
  MessageStatus,
  AgentSseEvent,
  AgentRunStatus,
} from 'src/types/agent/generated';

export type AgentConversationSummary = AgentResponse<'/agent/conversations/list'>['items'][number];
export type AgentConversationDetail = AgentResponse<'/agent/conversations/detail'>;
export type AgentMessageSnapshot =
  AgentResponse<'/agent/conversations/messages/list'>['items'][number];
export type AgentRunStatusSnapshot = AgentResponse<'/agent/runs/status'>;
export type AgentRunCreated = AgentResponse<'/agent/messages/send'>;
export type AgentRunRegenerated = AgentResponse<'/agent/runs/regenerate'>;

export type AgentConversationEntity = AgentConversationSummary & {
  statusVersion?: number;
};

export type AgentMessageDeliveryStatus = 'SENDING' | 'UNSENT';

export type AgentMessageEntity = AgentMessageSnapshot & {
  conversationId: string;
  clientRequestId?: string;
  localId?: string;
  deliveryStatus?: AgentMessageDeliveryStatus;
};

export type AgentRunConnectionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'OPEN'
  | 'RETRYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED';

export type AgentRunProgress = {
  label: string;
  completed: number;
  total: number | null;
};

export type AgentModelActivity = {
  modelCallId: string;
  phase: 'REASONING';
  processedCharacters: number;
};

export type AgentDraftPreview = {
  modelCallId: string;
  attempt: number;
  text: string;
};

export type AgentModelDiagnosticPhase =
  | 'STARTED'
  | 'REQUEST_DISPATCHED'
  | 'FIRST_PROVIDER_CHUNK'
  | 'REASONING'
  | 'DRAFT_STREAMING'
  | 'STRUCTURED_REPAIR'
  | 'PROVIDER_COMPLETED'
  | 'COMPLETED'
  | 'FAILED';

export type AgentModelDiagnostic = {
  modelCallId: string;
  provider: string;
  model: string;
  purpose: string;
  phase: AgentModelDiagnosticPhase;
  attempt: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  messageCount?: number;
  estimatedInputTokens?: number;
  maxOutputTokens?: number;
  contextWindow?: number;
  firstChunkType?: 'REASONING' | 'OUTPUT' | 'TOOL_CALL' | 'USAGE' | 'COMPLETED';
  finishReason?: string | null;
  durationMs?: number;
  repaired?: boolean;
  usage?: { inputTokens: number; outputTokens: number; cachedTokens?: number; reasoningTokens?: number } | null;
  error?: { code: number; message: string; retryable: boolean; category: string };
  willFallback?: boolean;
};

export type AgentRunProjection = {
  runId: string;
  conversationId: string;
  assistantMessageId: string;
  status: AgentRunStatus;
  statusVersion: number;
  canCancel: boolean;
  currentStep: AgentRunStatusSnapshot['currentStep'];
  latestEventSequence: number;
  lastEventId?: string;
  connectionGeneration: number;
  connectionState: AgentRunConnectionState;
  reconnects: number;
  stageLabel: string;
  planSummary?: string;
  progress?: AgentRunProgress;
  modelActivity?: AgentModelActivity;
  modelDiagnostics?: AgentModelDiagnostic[];
  draftPreview?: AgentDraftPreview;
  errorCode?: number | null;
  errorMessage?: string | null;
  retryable?: boolean;
  needsFinalSnapshot: boolean;
  cancelRequested: boolean;
};

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AgentListState = {
  status: AsyncStatus;
  error: string | null;
  generation: number;
  nextCursor: string | null;
  loadingMore: boolean;
};

export type AgentConversationLoadState = {
  detailStatus: AsyncStatus;
  messagesStatus: AsyncStatus;
  error: string | null;
  detailGeneration: number;
  messagesGeneration: number;
  nextBeforeMessageId: string | null;
};

export type AgentState = {
  conversations: {
    byId: Record<string, AgentConversationEntity>;
    orderedIds: string[];
  };
  messages: {
    byId: Record<string, AgentMessageEntity>;
    orderedIdsByConversation: Record<string, string[]>;
  };
  runs: {
    byId: Record<string, AgentRunProjection>;
    activeRunIdByConversation: Record<string, string>;
  };
  currentConversationId: string | null;
  selectionGeneration: number;
  list: AgentListState;
  loadsByConversation: Record<string, AgentConversationLoadState>;
  staleConversationIds: string[];
};

export type AgentAction =
  | { type: 'CONVERSATION_SELECTED'; conversationId: string | null }
  | { type: 'CONVERSATION_LIST_REQUESTED'; generation: number; append: boolean }
  | {
      type: 'CONVERSATION_LIST_SUCCEEDED';
      generation: number;
      append: boolean;
      items: AgentConversationSummary[];
      nextCursor: string | null;
    }
  | { type: 'CONVERSATION_LIST_FAILED'; generation: number; error: string }
  | { type: 'CONVERSATION_CREATED'; conversation: AgentConversationEntity }
  | { type: 'CONVERSATION_DETAIL_REQUESTED'; conversationId: string; generation: number }
  | {
      type: 'CONVERSATION_DETAIL_SUCCEEDED';
      conversationId: string;
      generation: number;
      conversation: AgentConversationDetail;
    }
  | {
      type: 'CONVERSATION_DETAIL_FAILED';
      conversationId: string;
      generation: number;
      error: string;
    }
  | { type: 'MESSAGES_REQUESTED'; conversationId: string; generation: number }
  | {
      type: 'MESSAGES_SUCCEEDED';
      conversationId: string;
      generation: number;
      items: AgentMessageSnapshot[];
      nextBeforeMessageId: string | null;
      mode: 'replace' | 'prepend' | 'refresh';
      authoritative?: boolean;
    }
  | {
      type: 'MESSAGES_FAILED';
      conversationId: string;
      generation: number;
      error: string;
    }
  | {
      type: 'OPTIMISTIC_USER_MESSAGE_ADDED';
      conversationId: string;
      message: AgentMessageEntity;
    }
  | {
      type: 'MESSAGE_SEND_CONFIRMED';
      conversationId: string;
      localMessageId: string;
      response: AgentRunCreated;
    }
  | { type: 'MESSAGE_RETRY_REQUESTED'; messageId: string }
  | { type: 'MESSAGE_SEND_FAILED'; localMessageId: string }
  | {
      type: 'RUN_REGENERATION_CONFIRMED';
      conversationId: string;
      response: AgentRunRegenerated;
      createdAt: string;
    }
  | {
      type: 'RUN_DISCOVERED';
      runId: string;
      conversationId: string;
      assistantMessageId: string;
      status: AgentRunStatus;
      statusVersion: number;
    }
  | {
      type: 'RUN_STATUS_RECEIVED';
      snapshot: AgentRunStatusSnapshot;
      assistantMessageId?: string;
    }
  | {
      type: 'RUN_CONNECTION_CHANGED';
      runId: string;
      connectionGeneration: number;
      connectionState: AgentRunConnectionState;
      reconnects?: number;
      errorMessage?: string;
    }
  | {
      type: 'RUN_EVENT_ACCEPTED';
      event: AgentSseEvent;
      connectionGeneration: number;
    }
  | { type: 'RUN_CANCEL_REQUESTED'; runId: string }
  | {
      type: 'RUN_CANCEL_RESOLVED';
      runId: string;
      status: AgentRunStatus;
      statusVersion: number;
      cancellationAccepted: boolean;
    }
  | { type: 'CONVERSATION_INVALIDATED'; conversationId: string }
  | { type: 'AGENT_STATE_RESET' };

export type ComposerDraft = {
  schemaVersion: 1;
  value: string;
  updatedAt: string;
};

export type AgentComposerModel = {
  policy: ModelPolicy;
  preferredModel: string | null;
};

export const TERMINAL_RUN_STATUSES = new Set<AgentRunStatus>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export function messageStatusForRun(status: AgentRunStatus): MessageStatus {
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'FAILED') return 'FAILED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'RUNNING' || status === 'CANCEL_REQUESTED') return 'STREAMING';
  return 'PENDING';
}
