import type { AgentResponse } from 'src/api/agent';

export type AgentMemory = AgentResponse<'/agent/memories/list'>['items'][number];
export type MemoryCategory = AgentMemory['category'];
export type MemorySensitivity = AgentMemory['sensitivity'];

export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  PREFERENCE: '回答偏好',
  PROFILE: '用户画像',
  CONSTRAINT: '研究约束',
  DOMAIN_FACT: '领域事实',
};

export const SENSITIVITY_LABELS: Record<MemorySensitivity, string> = {
  NORMAL: '普通',
  PERSONAL: '个人',
  FINANCIAL: '金融敏感',
};

export const STATUS_LABELS: Record<AgentMemory['status'], string> = {
  CANDIDATE: '待确认',
  CONFIRMED: '生效中',
  REVOKED: '已撤销',
  EXPIRED: '已过期',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [MemoryCategory, string][];
export const SENSITIVITY_OPTIONS = Object.entries(SENSITIVITY_LABELS) as [
  MemorySensitivity,
  string,
][];

export function formatMemoryJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function getMemorySourceLabel(memory: AgentMemory): string {
  if (memory.sourceMessageId) return '来自会话消息';
  if (memory.sourceConversationId) return '来自研究会话';
  return '由你手动保存';
}

export function getSelectableSensitivities(
  category: MemoryCategory
): [MemorySensitivity, string][] {
  if (category === 'PREFERENCE' || category === 'CONSTRAINT') return SENSITIVITY_OPTIONS;
  return SENSITIVITY_OPTIONS.filter(([value]) => value !== 'FINANCIAL');
}
