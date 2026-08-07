import { ApiError } from 'src/api/client';

import {
  MODEL_ID_PATTERN,
  CONNECTION_KEY_PATTERN,
  REASONING_EFFORT_PATTERN,
} from './model-provider.constants';

export type ModelProviderFieldErrors = Record<string, string>;

export function validateConnectionFields(input: {
  connectionKey: string;
  displayName: string;
  baseUrl: string;
  apiKey?: string;
  requireApiKey: boolean;
}): ModelProviderFieldErrors {
  const errors: ModelProviderFieldErrors = {};
  if (!CONNECTION_KEY_PATTERN.test(input.connectionKey.trim())) {
    errors.connectionKey = '仅允许英文、数字、下划线和连字符，例如 primary-model-connection';
  }
  if (!input.displayName.trim()) errors.displayName = '请输入面向管理员的显示名称，支持中文';
  try {
    const url = new URL(input.baseUrl.trim());
    if (!['https:', 'http:'].includes(url.protocol)) errors.baseUrl = '请输入 HTTP(S) URL';
  } catch {
    errors.baseUrl = '请输入完整 URL，例如 https://api.example.com/v1';
  }
  if (input.requireApiKey && !input.apiKey?.trim()) errors.apiKey = '首次创建连接必须填写 API key';
  return errors;
}

export function validateDeploymentFields(input: {
  modelId: string;
  displayName: string;
  reasoningMode: string;
  reasoningEfforts: string[];
  defaultReasoningEffort?: string;
  reasoningBudgetTokens?: number;
  maxOutputTokens: number;
}): ModelProviderFieldErrors {
  const errors: ModelProviderFieldErrors = {};
  if (!MODEL_ID_PATTERN.test(input.modelId.trim())) {
    errors.modelId = '仅允许字母、数字及 . _ : / @ -；gpt-5.6-sol 是合法值';
  }
  if (!input.displayName.trim()) errors.displayName = '请输入模型显示名称';
  if (input.reasoningEfforts.some((effort) => !REASONING_EFFORT_PATTERN.test(effort))) {
    errors.reasoningEfforts = '自定义档位仅允许字母、数字及 . _ : -';
  }
  if (input.reasoningMode === 'EFFORT') {
    if (!input.defaultReasoningEffort) errors.defaultReasoningEffort = '请选择默认推理档位';
    else if (
      !input.reasoningEfforts.some(
        (effort) => effort.toLowerCase() === input.defaultReasoningEffort?.toLowerCase()
      )
    ) {
      errors.defaultReasoningEffort = '默认档位必须包含在支持档位中';
    }
  }
  if (input.reasoningMode === 'TOKEN_BUDGET') {
    if (!input.reasoningBudgetTokens || input.reasoningBudgetTokens < 1) {
      errors.reasoningBudgetTokens = '请输入正整数 Token 预算';
    } else if (input.reasoningBudgetTokens >= input.maxOutputTokens) {
      errors.reasoningBudgetTokens = 'Token 预算必须小于最大输出';
    }
  }
  return errors;
}

export function apiFieldErrors(error: unknown): ModelProviderFieldErrors {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {};
  return error.details.reduce<ModelProviderFieldErrors>((result, detail) => {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return result;
    const field = (detail as { field?: unknown }).field;
    const message = (detail as { message?: unknown }).message;
    if (typeof field === 'string' && typeof message === 'string') result[field] = message;
    return result;
  }, {});
}

export function hasFieldErrors(errors: ModelProviderFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
