import type { AgentState } from './agent-state.types';

const EMPTY_IDS: string[] = [];

export function selectConversationList(state: AgentState) {
  return state.conversations.orderedIds
    .map((id) => state.conversations.byId[id])
    .filter((item) => item !== undefined);
}

export function selectCurrentConversation(state: AgentState) {
  return state.currentConversationId
    ? (state.conversations.byId[state.currentConversationId] ?? null)
    : null;
}

export function selectOrderedMessages(state: AgentState, conversationId: string | null) {
  if (!conversationId) return [];
  const ids = state.messages.orderedIdsByConversation[conversationId] ?? EMPTY_IDS;
  return ids.map((id) => state.messages.byId[id]).filter((item) => item !== undefined);
}

export function selectRun(state: AgentState, runId: string | null) {
  return runId ? (state.runs.byId[runId] ?? null) : null;
}

export function selectActiveRun(state: AgentState, conversationId: string | null) {
  if (!conversationId) return null;
  return selectRun(state, state.runs.activeRunIdByConversation[conversationId] ?? null);
}

export function selectConversationLoad(state: AgentState, conversationId: string | null) {
  if (!conversationId) return null;
  return state.loadsByConversation[conversationId] ?? null;
}
