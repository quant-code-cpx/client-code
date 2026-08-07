import { apiClient } from './client';

export type ModelAdapterKind =
  | 'openai-responses'
  | 'openai-chat-compatible'
  | 'anthropic-messages';
export type ModelProviderCostTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type ModelProviderCapability =
  | 'STREAMING'
  | 'STRUCTURED_OUTPUT'
  | 'TOOL_CALLING'
  | 'PARALLEL_TOOL_CALLING'
  | 'VISION'
  | 'REASONING_EFFORT';
export type ModelProviderDataClass = 'PUBLIC' | 'USER_PRIVATE' | 'PORTFOLIO_SENSITIVE';
export type ModelReasoningMode = 'AUTO' | 'DISABLED' | 'EFFORT' | 'TOKEN_BUDGET';
export type ModelProbeStatus = 'PASSED' | 'FAILED' | 'MIGRATED_UNVERIFIED';

export const MODEL_PROBE_STEP_KEYS = [
  'URL_POLICY',
  'TLS',
  'AUTH',
  'MODEL',
  'REASONING',
  'STRUCTURED_OUTPUT',
  'TOOLS',
  'VISION',
  'STREAM',
] as const;

export type ModelProbeStepKey = (typeof MODEL_PROBE_STEP_KEYS)[number];

export interface ModelAdapterDefinition {
  kind: ModelAdapterKind;
  label: string;
  transport: 'RESPONSES' | 'CHAT_COMPLETIONS' | 'MESSAGES';
  native: boolean;
  defaultBaseUrl: string | null;
  reasoningModes: ModelReasoningMode[];
  builtInEfforts: string[];
  capabilities: ModelProviderCapability[];
  probeLevels: string[];
  summary: string;
}

export interface ModelProbeStep {
  key: ModelProbeStepKey;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  message: string;
}

export interface ModelProbeResult {
  id: string;
  status: ModelProbeStatus;
  durationMs: number;
  checkedAt: string;
  steps: ModelProbeStep[];
  providerRequestId?: string | null;
}

export interface ModelConnection {
  id: string;
  connectionKey: string;
  adapterKind: ModelAdapterKind;
  displayName: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  apiKeyLastFour: string | null;
  enabled: boolean;
  version: number;
  deploymentCount: number;
  lastProbe: Omit<ModelProbeResult, 'id'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelDeployment {
  id: string;
  connectionId: string;
  connectionKey: string;
  connectionName: string;
  adapterKind: ModelAdapterKind;
  modelId: string;
  displayName: string;
  priority: number;
  costTier: ModelProviderCostTier;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelProviderCapability[];
  reasoningMode: ModelReasoningMode;
  reasoningEfforts: string[];
  defaultReasoningEffort: string | null;
  reasoningBudgetTokens: number | null;
  dataClasses: ModelProviderDataClass[];
  timeoutMs: number;
  maxRetries: number;
  retryBaseMs: number;
  enabled: boolean;
  version: number;
  lastProbe: Pick<ModelProbeResult, 'status' | 'checkedAt' | 'durationMs'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRoutingSummary {
  activeDeployments: number;
  verifiedConnections: number;
  failedProbes: number;
  configurationIssues: number;
  activeVersion: string | null;
}

export interface CreateModelConnectionPayload {
  connectionKey: string;
  adapterKind: ModelAdapterKind;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  enabled?: boolean;
}

export type UpdateModelConnectionPayload = Partial<CreateModelConnectionPayload> & {
  id: string;
  version: number;
};

export interface CreateModelDeploymentPayload {
  connectionId: string;
  modelId: string;
  displayName: string;
  priority: number;
  costTier: ModelProviderCostTier;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelProviderCapability[];
  reasoningMode: ModelReasoningMode;
  reasoningEfforts: string[];
  defaultReasoningEffort?: string;
  reasoningBudgetTokens?: number;
  dataClasses: ModelProviderDataClass[];
  timeoutMs: number;
  maxRetries: number;
  retryBaseMs: number;
  enabled?: boolean;
}

export type UpdateModelDeploymentPayload = Partial<CreateModelDeploymentPayload> & {
  id: string;
  version: number;
};

export const listModelAdapters = () =>
  apiClient.post<{ items: ModelAdapterDefinition[] }>('/api/agent/admin/model-adapters/list', {});

export const listModelConnections = (status: 'ALL' | 'ENABLED' | 'DISABLED' | 'FAILED' = 'ALL') =>
  apiClient.post<{ items: ModelConnection[] }>('/api/agent/admin/model-connections/list', {
    status,
  });

export const createModelConnection = (payload: CreateModelConnectionPayload) =>
  apiClient.post<ModelConnection>('/api/agent/admin/model-connections/create', payload);

export const updateModelConnection = (payload: UpdateModelConnectionPayload) =>
  apiClient.post<ModelConnection>('/api/agent/admin/model-connections/update', payload);

export const testModelConnection = (id: string) =>
  apiClient.post<ModelProbeResult>('/api/agent/admin/model-connections/test', {
    id,
    level: 'AUTH',
  });

export const getModelConnectionDeleteImpact = (id: string) =>
  apiClient.post<{ id: string; canDelete: boolean; message: string }>(
    '/api/agent/admin/model-connections/delete-impact',
    { id }
  );

export const deleteModelConnection = (id: string) =>
  apiClient.post<{ id: string; deleted: boolean }>('/api/agent/admin/model-connections/delete', {
    id,
  });

export const listModelDeployments = (connectionId?: string) =>
  apiClient.post<{ items: ModelDeployment[] }>('/api/agent/admin/model-deployments/list', {
    ...(connectionId ? { connectionId } : {}),
  });

export const createModelDeployment = (payload: CreateModelDeploymentPayload) =>
  apiClient.post<ModelDeployment>('/api/agent/admin/model-deployments/create', payload);

export const updateModelDeployment = (payload: UpdateModelDeploymentPayload) =>
  apiClient.post<ModelDeployment>('/api/agent/admin/model-deployments/update', payload);

export const probeModelDeployment = (id: string, confirmBillable = true) =>
  apiClient.post<ModelProbeResult>('/api/agent/admin/model-deployments/probe', {
    id,
    confirmBillable,
  });

export const getModelDeploymentDeleteImpact = (id: string) =>
  apiClient.post<{ id: string; canDelete: boolean; message: string }>(
    '/api/agent/admin/model-deployments/delete-impact',
    { id }
  );

export const deleteModelDeployment = (id: string) =>
  apiClient.post<{ id: string; deleted: boolean }>('/api/agent/admin/model-deployments/delete', {
    id,
  });

export const getModelRoutingSummary = () =>
  apiClient.post<ModelRoutingSummary>('/api/agent/admin/model-routing/summary', {});

export const publishModelRouting = () =>
  apiClient.post<{ activeVersion: string; deployments: string[] }>(
    '/api/agent/admin/model-routing/publish',
    {}
  );
