const AGENT_MODEL_SELECTION_PREFIX = 'quant-agent:model-selection:v1:';

function storageKey(userId: number): string {
  return `${AGENT_MODEL_SELECTION_PREFIX}${userId}`;
}

export function readAgentModelSelection(userId: number): string | null {
  try {
    const value = window.localStorage.getItem(storageKey(userId));
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function writeAgentModelSelection(userId: number, model: string): void {
  const value = model.trim();
  if (!value) return;
  try {
    window.localStorage.setItem(storageKey(userId), value);
  } catch {
    // 存储被禁用或空间不足时，本次会话仍使用内存中的选择。
  }
}
