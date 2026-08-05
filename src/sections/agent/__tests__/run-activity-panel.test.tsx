import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RunActivityPanel } from '../components/run-activity-panel';

import type { AgentRunProjection } from '../state/agent-state.types';

function run(overrides: Partial<AgentRunProjection> = {}): AgentRunProjection {
  return {
    runId: 'run_1',
    conversationId: 'cm_1',
    assistantMessageId: 'msg_1',
    status: 'RUNNING',
    statusVersion: 4,
    canCancel: true,
    currentStep: null,
    latestEventSequence: 4,
    connectionGeneration: 1,
    connectionState: 'OPEN',
    reconnects: 0,
    stageLabel: '正在组织研究结论',
    planSummary: '先核验行情与财务数据，再形成可验证结论。',
    progress: { label: '合成研究回答', completed: 4, total: 8 },
    needsFinalSnapshot: false,
    cancelRequested: false,
    ...overrides,
  };
}

describe('RunActivityPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('持续显示公开阶段、计划摘要、真实进度和已用时间', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T00:00:05.000Z'));

    renderWithProviders(
      <RunActivityPanel
        run={run()}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText('已用时 00:05')).toBeInTheDocument();
    expect(screen.getByText('计划摘要：先核验行情与财务数据，再形成可验证结论。')).toBeInTheDocument();
    expect(screen.getByText('合成研究回答 · 4 / 8')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '合成研究回答' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText('已用时 00:07')).toBeInTheDocument();
  });

  it('连接暂停时说明状态并允许继续接收', async () => {
    const onContinue = vi.fn();
    const { user } = renderWithProviders(
      <RunActivityPanel
        run={run({ connectionState: 'PAUSED', progress: undefined })}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={onContinue}
      />
    );

    expect(screen.getByText('实时连接已暂停')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Agent 执行进度' })).not.toHaveAttribute(
      'aria-valuenow'
    );
    await user.click(screen.getByRole('button', { name: '继续接收' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('安全说明与未校验草稿独立展示，不把草稿伪装成最终回答', () => {
    const { rerender } = renderWithProviders(
      <RunActivityPanel
        run={run({
          modelActivity: {
            modelCallId: 'model_call_1',
            phase: 'REASONING',
            processedCharacters: 2048,
          },
        })}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={vi.fn()}
      />
    );

    expect(
      screen.getByText('深度分析信号持续更新，原始推理内容不会发送到页面')
    ).toBeInTheDocument();

    rerender(
      <RunActivityPanel
        run={run({
          modelActivity: undefined,
          draftPreview: {
            modelCallId: 'model_call_1',
            attempt: 1,
            text: '这是一段尚未完成引用校验的草稿。',
          },
        })}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByLabelText('答案草稿预览')).toHaveTextContent('答案草稿（引用校验前）');
    expect(screen.getByText('这是一段尚未完成引用校验的草稿。')).toBeInTheDocument();
  });

  it('显示可诊断模型轨迹，不渲染 Prompt 或原始推理', () => {
    renderWithProviders(
      <RunActivityPanel
        run={run({
          modelDiagnostics: [
            {
              modelCallId: 'model_call_1',
              provider: 'openai-compatible',
              model: 'research-model',
              purpose: 'SYNTHESIZE',
              phase: 'COMPLETED',
              attempt: 1,
              status: 'COMPLETED',
              durationMs: 812,
              repaired: true,
              usage: { inputTokens: 1200, outputTokens: 360, reasoningTokens: 90 },
            },
            {
              modelCallId: 'model_call_2',
              provider: 'secondary',
              model: 'backup-model',
              purpose: 'PLAN',
              phase: 'FAILED',
              attempt: 1,
              status: 'FAILED',
              error: { code: 6006, message: '模型供应商限流', retryable: true, category: 'MODEL' },
              willFallback: true,
            },
          ],
        })}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByLabelText('模型执行轨迹')).toHaveTextContent('不含原始推理或 Prompt');
    expect(screen.getByText('结论生成 · research-model')).toBeInTheDocument();
    expect(screen.getByText('结构化校验通过')).toBeInTheDocument();
    expect(screen.getByText('模型供应商限流 · 将切换模型重试')).toBeInTheDocument();
  });
});
