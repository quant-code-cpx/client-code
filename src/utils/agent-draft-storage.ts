const AGENT_DRAFT_PREFIX = 'quant-agent:draft:v1:';

export function clearAgentDrafts(): void {
  if (typeof window === 'undefined') return;

  const keys: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(AGENT_DRAFT_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => window.sessionStorage.removeItem(key));
}

export function agentDraftKey(userId: string | number, scopeKey: string): string {
  return `${AGENT_DRAFT_PREFIX}${userId}:${scopeKey}`;
}
