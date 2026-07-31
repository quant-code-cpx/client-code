import { apiClient } from './client';

export type ModelProviderKind = 'openai-compatible';
export type ModelProviderCostTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type ModelProviderCapability =
  | 'STREAMING'
  | 'STRUCTURED_OUTPUT'
  | 'TOOL_CALLING'
  | 'PARALLEL_TOOL_CALLING'
  | 'VISION'
  | 'REASONING_EFFORT';
export type ModelProviderReasoningEffort = 'LOW' | 'MEDIUM' | 'HIGH';
export type ModelProviderDataClass = 'PUBLIC' | 'USER_PRIVATE' | 'PORTFOLIO_SENSITIVE';

export interface ModelProvider {
  id: string;
  providerId: string;
  kind: ModelProviderKind;
  displayName: string;
  model: string;
  priority: number;
  costTier: ModelProviderCostTier;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  apiKeyLastFour: string | null;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelProviderCapability[];
  reasoningEfforts: ModelProviderReasoningEffort[];
  dataClasses: ModelProviderDataClass[];
  timeoutMs: number;
  maxRetries: number;
  retryBaseMs: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ModelProviderPayload = Omit<
  ModelProvider,
  'apiKeyConfigured' | 'apiKeyLastFour' | 'baseUrl' | 'createdAt' | 'updatedAt'
> & {
  baseUrl?: string | null;
  apiKey?: string;
};

export type CreateModelProviderPayload = Omit<ModelProviderPayload, 'id'>;
export type UpdateModelProviderPayload = Partial<Omit<ModelProviderPayload, 'id'>> & { id: string };

export const listModelProviders = () =>
  apiClient.post<{ items: ModelProvider[] }>('/api/agent/admin/model-providers/list', {});

export const createModelProvider = (payload: CreateModelProviderPayload) =>
  apiClient.post<ModelProvider>('/api/agent/admin/model-providers/create', payload);

export const updateModelProvider = (payload: UpdateModelProviderPayload) =>
  apiClient.post<ModelProvider>('/api/agent/admin/model-providers/update', payload);

export const deleteModelProvider = (id: string) =>
  apiClient.post<{ id: string; deleted: boolean }>('/api/agent/admin/model-providers/delete', { id });

export const reloadModelProviders = () =>
  apiClient.post<{ reloaded: boolean; models: string[] }>('/api/agent/admin/model-providers/reload', {});
