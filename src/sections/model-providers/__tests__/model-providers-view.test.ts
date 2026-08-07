import type { ModelProbeResult } from 'src/api/model-provider';

import { getModelProbeFeedback } from '../view/model-providers-view';

describe('getModelProbeFeedback', () => {
  it('探测失败时展示失败状态与供应商返回的具体原因', () => {
    const result: Pick<ModelProbeResult, 'status' | 'steps'> = {
      status: 'FAILED',
      steps: [
        {
          key: 'MODEL',
          status: 'FAILED',
          durationMs: 41,
          message: '供应商返回 401：API key 无效',
        },
      ],
    };

    const feedback = getModelProbeFeedback('gpt-5.6-luna', '深度探测', result);

    expect(feedback.severity).toBe('error');
    expect(feedback.message).toContain('供应商返回 401：API key 无效');
  });

  it('探测通过时展示成功状态', () => {
    const result: Pick<ModelProbeResult, 'status' | 'steps'> = {
      status: 'PASSED',
      steps: [],
    };

    expect(getModelProbeFeedback('fishxcode', '连接测试', result)).toEqual({
      severity: 'success',
      message: 'fishxcode 连接测试通过。',
    });
  });
});
