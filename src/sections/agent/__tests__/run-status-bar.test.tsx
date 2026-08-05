import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RunStatusBar } from '../components/run-status-bar';

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

describe('RunStatusBar', () => {
  it('只展示服务端计划摘要与进度，不生成私有思考过程', () => {
    renderWithProviders(<RunStatusBar run={run()} onContinue={vi.fn()} />);

    expect(screen.getByText('正在组织研究结论')).toBeInTheDocument();
    expect(screen.getByText('先核验行情与财务数据，再形成可验证结论。')).toBeInTheDocument();
    expect(screen.getByText('合成研究回答 · 4 / 8')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '合成研究回答' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );
  });

  it('连接暂停时保留继续接收动作', async () => {
    const onContinue = vi.fn();
    const { user } = renderWithProviders(
      <RunStatusBar run={run({ connectionState: 'PAUSED' })} onContinue={onContinue} />
    );

    await user.click(screen.getByRole('button', { name: '继续接收' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
