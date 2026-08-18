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
    latestPersistedEventSequence: 4,
    connectionGeneration: 1,
    connectionState: 'OPEN',
    reconnects: 0,
    stageLabel: '正在组织研究结论',
    planSummary: '先核验行情与财务数据，再形成可验证结论。',
    planningDecision: {
      toolSelectionReason: '需要先读取行情与财务数据，才能形成可验证结论。',
      selectedTools: ['get_stock_price_history', 'get_financial_indicators'],
      plannedTools: ['get_stock_price_history', 'get_financial_indicators'],
      fallback: false,
    },
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

  it('持续显示决策、研究路径、真实进度和已用时间', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T00:00:05.000Z'));

    renderWithProviders(
      <RunActivityPanel run={run()} startedAt="2026-08-05T00:00:00.000Z" onContinue={vi.fn()} />
    );

    expect(screen.getByText('已用时 00:05')).toBeInTheDocument();
    expect(screen.getByLabelText('研究决策与证据')).not.toHaveTextContent(
      '公开决策，不是隐藏推理'
    );
    expect(screen.getByText('需要先读取行情与财务数据，才能形成可验证结论。')).toBeInTheDocument();
    expect(screen.getByText('先核验行情与财务数据，再形成可验证结论。')).toBeInTheDocument();
    expect(screen.getByText('选用：个股历史行情、财务指标')).toBeInTheDocument();
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

    expect(screen.getByText('模型正在处理当前步骤')).toBeInTheDocument();

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

    expect(screen.getByLabelText('模型调用技术明细')).toHaveTextContent('排查模型问题用');
    expect(screen.getByText('结论生成 · research-model')).toBeInTheDocument();
    expect(screen.getByText('结构化校验通过')).toBeInTheDocument();
    expect(screen.getByText('模型供应商限流', { exact: false })).toBeInTheDocument();
  });

  it('明确区分模型单次窗口、本次输出和 Run 累计成本护栏', () => {
    renderWithProviders(
      <RunActivityPanel
        run={run({
          modelDiagnostics: [
            {
              modelCallId: 'model_call_budget',
              provider: 'openai',
              model: 'gpt-5.6-terra',
              purpose: 'PLAN',
              phase: 'REQUEST_DISPATCHED',
              attempt: 1,
              status: 'RUNNING',
              messageCount: 12,
              estimatedInputTokens: 32100,
              contextWindow: 128000,
              maxOutputTokens: 128000,
              inputTokenCountSource: 'OPENAI_INPUT_TOKENS_API',
              inputTokenCountExact: true,
              inputTokenSafetyMarginTokens: 1529,
              runInputReservationTokens: 96200,
              runMaxCumulativeInputTokens: null,
              runInputTokensUsedBeforeCall: 33000,
              runInputGuardrailSource: 'DISABLED_BY_DEFAULT',
            },
          ],
        })}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={vi.fn()}
      />
    );

    const details = screen.getByLabelText('模型调用技术明细');
    expect(details).toHaveTextContent('单次上下文窗口 128,000');
    expect(details).toHaveTextContent('本次最大输出 128,000');
    expect(details).toHaveTextContent('OpenAI 供应商计数');
    expect(details).toHaveTextContent('Run 累计输入护栏未启用');
  });

  it('成功调用真实 usage 越过护栏时展示记账警告，不渲染为调用失败', () => {
    renderWithProviders(
      <RunActivityPanel
        run={run({
          modelDiagnostics: [
            {
              modelCallId: 'model_call_accounted',
              provider: 'openai',
              model: 'gpt-5.6-terra',
              purpose: 'SYNTHESIZE',
              phase: 'COMPLETED',
              attempt: 1,
              status: 'COMPLETED',
              durationMs: 1200,
              repaired: false,
              usage: { inputTokens: 34000, outputTokens: 900 },
              usageSource: 'PROVIDER_ACTUAL',
              accountingWarnings: ['模型调用已成功；真实累计输入超过 Run 成本护栏，后续调用前停止'],
            },
          ],
        })}
        startedAt="2026-08-05T00:00:00.000Z"
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText('结构化校验通过')).toBeInTheDocument();
    expect(screen.getByText(/模型调用已成功；真实累计输入超过 Run 成本护栏/)).toBeInTheDocument();
    expect(screen.queryByText('调用失败')).not.toBeInTheDocument();
  });
});
