import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { agentMockToolCalls } from 'src/mocks/agent-mocks';

import { ToolCallCard } from '../components/tool-call-card';

describe('ToolCallCard', () => {
  it('展示状态、attempt、耗时和脱敏摘要，不展开数组 payload', async () => {
    const { user } = renderWithProviders(<ToolCallCard toolCall={agentMockToolCalls[0]} />);

    expect(screen.getByText('get_stock_overview')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('第 1 次尝试')).toBeInTheDocument();
    expect(screen.getByText('128 ms')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /get_stock_overview/ }));
    expect(screen.getByText('600519.SH')).toBeInTheDocument();
    expect(screen.getByText('列表（3 项）')).toBeInTheDocument();
    expect(screen.queryByText('close')).not.toBeInTheDocument();
  });
});
