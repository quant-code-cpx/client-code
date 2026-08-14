import type { CreateModelDeploymentPayload } from 'src/api/model-provider';

export type DeploymentDraft = CreateModelDeploymentPayload & { customEffort: string };

export type DeploymentDraftUpdater = <K extends keyof DeploymentDraft>(
  key: K,
  value: DeploymentDraft[K]
) => void;

export const EMPTY_DEPLOYMENT_DRAFT: DeploymentDraft = {
  connectionId: '',
  modelId: '',
  displayName: '',
  priority: 10,
  costTier: 'MEDIUM',
  contextWindow: 128000,
  maxOutputTokens: 8192,
  capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING'],
  reasoningMode: 'AUTO',
  reasoningEfforts: ['LOW', 'MEDIUM', 'HIGH'],
  defaultReasoningEffort: 'MEDIUM',
  dataClasses: ['PUBLIC', 'USER_PRIVATE'],
  timeoutMs: 120000,
  maxRetries: 2,
  retryBaseMs: 200,
  enabled: false,
  customEffort: '',
};
