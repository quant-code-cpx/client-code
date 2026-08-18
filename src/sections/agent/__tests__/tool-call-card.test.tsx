import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { agentMockToolCalls } from 'src/mocks/agent-mocks';

import { ToolCallCard } from '../components/tool-call-card';

describe('ToolCallCard', () => {
  it('展示状态、attempt、耗时和脱敏摘要，不展开数组 payload', async () => {
    const { user } = renderWithProviders(<ToolCallCard toolCall={agentMockToolCalls[0]} />);

    expect(screen.getByText('个股基础数据')).toBeInTheDocument();
    expect(screen.queryByText('get_stock_overview')).not.toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('第 1 次尝试')).toBeInTheDocument();
    expect(screen.getByText('128 ms')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /个股基础数据/ }));
    expect(screen.getByText('600519.SH')).toBeInTheDocument();
    expect(screen.getByText('列表（3 项）')).toBeInTheDocument();
    expect(screen.queryByText('close')).not.toBeInTheDocument();
  });

  it('SAFE_CHECKPOINT Tool 明确标注从上一轮复用且不冒充本轮执行', async () => {
    const reused = {
      ...agentMockToolCalls[0],
      reusedFromRunId: 'run_source_1',
    };
    const { user } = renderWithProviders(<ToolCallCard toolCall={reused} />);

    expect(screen.getByText('从上一轮复用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /个股基础数据/ }));
    expect(screen.getByText(/复用来源 Run：run_source_1/)).toBeInTheDocument();
    expect(screen.getByText(/本轮未重新执行此工具/)).toBeInTheDocument();
  });

  it('新工具直接展示后端中文名，不暴露内部 key', () => {
    renderWithProviders(
      <ToolCallCard
        toolCall={{
          ...agentMockToolCalls[0],
          toolName: 'get_stock_realtime_quote',
          toolDisplayName: '个股准实时行情',
        }}
      />
    );

    expect(screen.getByText('个股准实时行情')).toBeInTheDocument();
    expect(screen.queryByText('get_stock_realtime_quote')).not.toBeInTheDocument();
  });
});
