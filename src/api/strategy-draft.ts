import { apiClient } from './client';

export type StrategyDraft = {
  id: number;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export function getDrafts() {
  return apiClient.post<{ drafts: StrategyDraft[] }>('/api/strategy-draft/list');
}

export function getDraftById(id: number) {
  return apiClient.post<StrategyDraft>('/api/strategy-draft/detail', { id });
}

export function createDraft(data: { name: string; config: Record<string, unknown> }) {
  return apiClient.post<StrategyDraft>('/api/strategy-draft/create', data);
}

export function updateDraft(data: { id: number; name?: string; config?: Record<string, unknown> }) {
  return apiClient.post<StrategyDraft>('/api/strategy-draft/update', data);
}

export function deleteDraft(id: number) {
  return apiClient.post<{ message: string }>('/api/strategy-draft/delete', { id });
}

export function submitDraft(draftId: number, name?: string) {
  return apiClient.post<{ id: string; status: 'QUEUED'; jobId: string }>(
    '/api/strategy-draft/submit',
    { id: draftId, name }
  );
}
