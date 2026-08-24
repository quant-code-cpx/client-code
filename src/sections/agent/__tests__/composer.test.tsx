import { vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { Composer } from '../components/composer';
import { AgentMuiXProvider } from '../components/mui-x-chat/agent-mui-x-provider';

function renderComposer(overrides?: Partial<React.ComponentProps<typeof Composer>>) {
  const props: React.ComponentProps<typeof Composer> = {
    value: '',
    recovered: false,
    isSending: false,
    isRunning: false,
    stopping: false,
    error: null,
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    ...overrides,
  };
  return {
    props,
    ...renderWithProviders(
      <AgentMuiXProvider
        activeConversationId={null}
        composerValue={props.value}
        conversations={[]}
        messages={[]}
        hasOlder={false}
        onActiveConversationChange={vi.fn()}
        onComposerValueChange={vi.fn()}
      >
        <Composer {...props} />
      </AgentMuiXProvider>
    ),
  };
}

describe('Agent Composer', () => {
  it('渲染真实 MUI X ChatComposer 根节点', () => {
    const { container } = renderComposer();
    expect(container.querySelector('.MuiChatComposer-root')).toBeInTheDocument();
  });

  it('空白内容不能发送', () => {
    const { props } = renderComposer({ value: '   ' });

    expect(screen.getByRole('button', { name: '发送问题' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '发送研究问题' }));
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('Enter 发送，Shift+Enter 保留为换行', () => {
    const { props } = renderComposer({ value: '比较两家公司' });
    const input = screen.getByLabelText('研究问题');

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(props.onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('中文输入法 composition 期间按 Enter 不误发送', () => {
    const { props } = renderComposer({ value: '贵州茅台' });
    const input = screen.getByLabelText('研究问题');

    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('输入事件不被取消，允许中文输入法完成组词', () => {
    renderComposer();
    const input = screen.getByLabelText('研究问题');

    expect(fireEvent.change(input, { target: { value: 'zhongwen' } })).toBe(true);
  });

  it('超过 10,000 字显示原地错误并禁用发送', () => {
    renderComposer({ value: '股'.repeat(10_001) });

    expect(screen.getByText('已超过 10,000 字限制')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送问题' })).toBeDisabled();
  });

  it('运行中仍可编辑下一条草稿，并提供停止动作', async () => {
    const { props, user } = renderComposer({ value: '下一条问题', isRunning: true });

    expect(screen.getByLabelText('研究问题')).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: '停止研究' }));
    expect(props.onStop).toHaveBeenCalledTimes(1);
  });

  it('取消请求已提交时禁用重复停止', () => {
    renderComposer({ value: '下一条问题', isRunning: true, stopping: true });
    expect(screen.getByRole('button', { name: '停止研究' })).toBeDisabled();
  });

  it('历史或不完整分支锁定整个输入区，而不只禁用发送按钮', () => {
    renderComposer({ value: '不应发到历史分支', blockedReason: '当前为历史分支' });

    expect(screen.getByLabelText('研究问题')).toBeDisabled();
    expect(screen.getByRole('button', { name: '发送问题' })).toBeDisabled();
    expect(screen.getByText('当前为历史分支')).toBeInTheDocument();
  });

  it('恢复草稿时显示恢复状态', () => {
    renderComposer({ value: '未发送内容', recovered: true });
    expect(screen.getByText('已恢复未发送草稿')).toBeInTheDocument();
  });
});
