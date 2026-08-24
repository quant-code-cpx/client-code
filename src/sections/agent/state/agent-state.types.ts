import type { AgentResponse } from 'src/api/agent';
import type {
  AgentToolKey,
  MessageStatus,
  AgentSseEvent,
  AgentRunStatus,
} from 'src/types/agent/generated';

export type AgentConversationSummary = AgentResponse<'/agent/conversations/list'>['items'][number];
export type AgentConversationDetail = AgentResponse<'/agent/conversations/detail'>;
export type AgentMessageSnapshot =
  AgentResponse<'/agent/conversations/messages/list'>['items'][number];
export type AgentMessageListSnapshot = AgentResponse<'/agent/conversations/messages/list'>;
export type AgentMessageSiblingGroup = AgentMessageListSnapshot['siblingGroups'][number];
export type AgentMessageProjectionState = Pick<
  AgentMessageListSnapshot,
  | 'projection'
  | 'branchVersion'
  | 'lineageComplete'
  | 'isActiveBranch'
  | 'displayBranchCompatible'
  | 'canAdoptDisplay'
  | 'siblingGroups'
> & {
  activeLeafMessageId: string | null;
  displayLeafMessageId: string | null;
};
export type AgentRunStatusSnapshot = AgentResponse<'/agent/runs/status'>;
export type AgentRunCreated = AgentResponse<'/agent/messages/send'>;
export type AgentRunRegenerated = AgentResponse<'/agent/runs/regenerate'>;
export type AgentRunRetried = AgentResponse<'/agent/runs/retry'>;

export type AgentConversationEntity = AgentConversationSummary & {
  statusVersion?: number;
};

export type AgentMessageDeliveryStatus = 'SENDING' | 'UNSENT';

export type AgentReasoningDeltaEvent = Extract<AgentSseEvent, { type: 'model.reasoning.delta' }>;
export type AgentRunEvent = AgentSseEvent;

export function isAgentReasoningDeltaEvent(
  event: AgentRunEvent
): event is AgentReasoningDeltaEvent {
  return event.type === 'model.reasoning.delta';
}

type ExistingThinkingEvent = Extract<
  AgentSseEvent,
  {
    type: (typeof AGENT_THINKING_EVENT_TYPES)[number];
  }
>;

export const AGENT_THINKING_EVENT_TYPES = [
  'agent.started',
  'agent.planning',
  'agent.progress',
  'context.compaction.started',
  'context.compaction.completed',
  'context.compaction.failed',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'model.started',
  'model.trace',
  'model.fallback',
  'model.reasoning.delta',
  'model.completed',
  'model.failed',
] as const satisfies readonly AgentSseEvent['type'][];

export type AgentThinkingEvent = ExistingThinkingEvent;

export function isAgentThinkingEvent(event: AgentRunEvent): event is AgentThinkingEvent {
  return (AGENT_THINKING_EVENT_TYPES as readonly string[]).includes(event.type);
}

export type AgentMessageEntity = AgentMessageSnapshot & {
  conversationId: string;
  clientRequestId?: string;
  localId?: string;
  deliveryStatus?: AgentMessageDeliveryStatus;
  /** Frozen branch admission used to replay an unsent request with the same idempotency hash. */
  baseAssistantMessageId?: string | null;
  expectedBranchVersion?: number;
  branchAdoptionRunId?: string;
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
  inputTokenCountSource?:
    | 'OPENAI_INPUT_TOKENS_API'
    | 'ANTHROPIC_COUNT_TOKENS_API'
    | 'LOCAL_CONSERVATIVE_V1';
  inputTokenCountExact?: boolean;
  inputTokenSafetyMarginTokens?: number;
  runInputReservationTokens?: number;
  runMaxCumulativeInputTokens?: number | null;
  runInputTokensUsedBeforeCall?: number;
  runInputGuardrailSource?:
    | 'RUN_SNAPSHOT'
    | 'LEGACY_RUN'
    | 'ENV'
    | 'LEGACY_ENV'
    | 'DISABLED_BY_DEFAULT';
  firstChunkType?: 'REASONING' | 'OUTPUT' | 'TOOL_CALL' | 'USAGE' | 'COMPLETED';
  finishReason?: string | null;
  durationMs?: number;
  repaired?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  } | null;
  usageSource?: 'PROVIDER_ACTUAL' | 'PREFLIGHT_ESTIMATE';
  accountingWarnings?: string[];
  error?: { code: number; message: string; retryable: boolean; category: string };
  willFallback?: boolean;
};

export type AgentPlanningDecision = Extract<
  AgentSseEvent,
  { type: 'agent.planning' }
>['payload']['decision'];

export type AgentToolActivity = {
  toolCallId: string;
  toolName: AgentToolKey;
  toolDisplayName?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  attempt: number;
  inputSummary?: string;
  outputSummary?: string;
  rowCount?: number;
  durationMs?: number;
  error?: { code: number; message: string; retryable: boolean; category: string };
  willRetry?: boolean;
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
  latestPersistedEventSequence: number;
  lastEventId?: string;
  connectionGeneration: number;
  connectionState: AgentRunConnectionState;
  reconnects: number;
  stageLabel: string;
  planSummary?: string;
  planningDecision?: AgentPlanningDecision;
  progress?: AgentRunProgress;
  modelActivity?: AgentModelActivity;
  modelDiagnostics?: AgentModelDiagnostic[];
  toolActivities?: AgentToolActivity[];
  thinkingEvents?: AgentThinkingEvent[];
  draftPreview?: AgentDraftPreview;
  errorCode?: number | null;
  errorMessage?: string | null;
  retryable?: boolean;
  needsFinalSnapshot: boolean;
  finalSnapshotError?: string | null;
  cancelRequested: boolean;
  branchAdoption?: {
    targetMessageId: string;
    expectedBranchVersion: number;
    status: 'PENDING' | 'ADOPTING' | 'ADOPTED' | 'UNCERTAIN' | 'CONFLICT' | 'ABANDONED';
  };
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
  messageProjection: AgentMessageProjectionState | null;
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
      projection?: AgentMessageProjectionState;
      mode: 'replace' | 'prepend' | 'refresh';
      authoritative?: boolean;
    }
  | {
      type: 'MESSAGES_FAILED';
      conversationId: string;
      generation: number;
      error: string;
    }
  | { type: 'MESSAGE_CURSOR_INVALIDATED'; conversationId: string; generation: number }
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
      type: 'MESSAGE_BRANCH_REBASED';
      localMessageId: string;
      clientRequestId: string;
      baseAssistantMessageId: string;
      expectedBranchVersion: number;
    }
  | {
      type: 'RUN_REGENERATION_CONFIRMED';
      conversationId: string;
      response: AgentRunRegenerated | AgentRunRetried;
      createdAt: string;
      sourceMessageId: string;
      contextParentMessageId: string | null;
      baseAssistantMessageId: string | null;
      expectedBranchVersion: number;
    }
  | { type: 'RUN_BRANCH_ADOPTION_STARTED'; runId: string }
  | {
      type: 'RUN_BRANCH_ADOPTION_RESOLVED';
      runId: string;
      conversationId: string;
      activeLeafMessageId: string;
      branchVersion: number;
    }
  | { type: 'RUN_BRANCH_ADOPTION_UNCERTAIN'; runId: string }
  | { type: 'RUN_BRANCH_ADOPTION_CONFLICTED'; runId: string }
  | { type: 'RUN_BRANCH_ADOPTION_ABANDONED'; runId: string }
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
      event: AgentRunEvent;
      connectionGeneration: number;
    }
  | { type: 'RUN_FINAL_SNAPSHOT_FAILED'; runId: string; error: string }
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
  preferredModel: string | null;
  reasoningEffort: string | null;
};

export const TERMINAL_RUN_STATUSES = new Set<AgentRunStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);

export function isTerminalRunStatus(status: string): status is AgentRunStatus {
  return TERMINAL_RUN_STATUSES.has(status as AgentRunStatus);
}

export function messageStatusForRun(status: AgentRunStatus): MessageStatus {
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'FAILED') return 'FAILED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'RUNNING' || status === 'CANCEL_REQUESTED') return 'STREAMING';
  return 'PENDING';
}
