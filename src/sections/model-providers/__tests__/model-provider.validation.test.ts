import { ApiError } from 'src/api/client';

import {
  apiFieldErrors,
  validateConnectionFields,
  validateDeploymentFields,
} from '../model-provider.validation';

describe('model provider validation', () => {
  it('accepts a Chinese display name with an ASCII connection key', () => {
    expect(
      validateConnectionFields({
        connectionKey: 'primary-model-connection',
        displayName: '主模型连接',
        baseUrl: 'https://models.example.com/v1',
        apiKey: 'secret',
        requireApiKey: true,
      })
    ).toEqual({});
  });

  it('rejects a Chinese connection key before a request is sent', () => {
    expect(
      validateConnectionFields({
        connectionKey: '中转站',
        displayName: '主模型连接',
        baseUrl: 'https://models.example.com/v1',
        apiKey: 'secret',
        requireApiKey: true,
      })
    ).toMatchObject({ connectionKey: expect.stringContaining('允许英文') });
  });

  it.each(['gpt-5.6-sol', 'openai/gpt-5.6', 'vendor:model@2026'])(
    'accepts real-world model ID %s',
    (modelId) => {
      expect(
        validateDeploymentFields({
          modelId,
          displayName: '模型',
          reasoningMode: 'EFFORT',
          reasoningEfforts: ['LOW', 'XHIGH', 'MAX'],
          defaultReasoningEffort: 'MAX',
          maxOutputTokens: 8192,
        })
      ).toEqual({});
    }
  );

  it('validates token budget and custom effort boundaries', () => {
    expect(
      validateDeploymentFields({
        modelId: 'claude-model',
        displayName: 'Claude',
        reasoningMode: 'TOKEN_BUDGET',
        reasoningEfforts: ['vendor effort'],
        reasoningBudgetTokens: 8192,
        maxOutputTokens: 8192,
      })
    ).toMatchObject({
      reasoningEfforts: expect.any(String),
      reasoningBudgetTokens: expect.any(String),
    });
  });

  it('maps standard data.details entries to field errors', () => {
    const error = new ApiError('请求参数校验失败', {
      status: 400,
      details: [{ field: 'modelId', code: 'MODEL_ID_INVALID', message: '模型 ID 非法' }],
    });

    expect(apiFieldErrors(error)).toEqual({ modelId: '模型 ID 非法' });
  });
});
