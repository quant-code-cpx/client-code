import { apiClient } from './client';

// ----------------------------------------------------------------------

export type ResearchNote = {
  id: number;
  tsCode: string | null;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResearchNoteListResult = {
  notes: ResearchNote[];
  total: number;
  page: number;
  pageSize: number;
};

export type ResearchNoteQuery = {
  tsCode?: string;
  tags?: string[];
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export function listNotes(query: ResearchNoteQuery) {
  return apiClient.post<ResearchNoteListResult>('/api/research-note/list', query);
}

export function getNoteById(id: number) {
  return apiClient.post<ResearchNote>('/api/research-note/detail', { id });
}

export function createNote(data: {
  tsCode?: string;
  title: string;
  content: string;
  tags?: string[];
  isPinned?: boolean;
}) {
  return apiClient.post<ResearchNote>('/api/research-note/create', data);
}

export function updateNote(data: {
  id: number;
  tsCode?: string | null;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
}) {
  return apiClient.post<ResearchNote>('/api/research-note/update', data);
}

export function deleteNote(id: number) {
  return apiClient.post<{ message: string }>('/api/research-note/delete', { id });
}

export function getUserTags() {
  return apiClient.post<{ tags: string[] }>('/api/research-note/tags');
}

export function getStockNotes(tsCode: string) {
  return apiClient.post<ResearchNote[]>('/api/research-note/by-stock', { tsCode });
}
