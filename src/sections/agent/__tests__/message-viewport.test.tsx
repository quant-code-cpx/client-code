import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MessageViewport } from '../components/message-viewport';

import type { AgentMessageEntity } from '../state/agent-state.types';

const virtuosoCapture = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: Record<string, unknown>) => {
    virtuosoCapture.props = props;
    const data = props.data as AgentMessageEntity[];
    const itemContent = props.itemContent as (
      index: number,
      message: AgentMessageEntity
    ) => React.ReactNode;
    return (
      <div data-testid="virtuoso">
        {data.length > 0 ? itemContent(0, data[0]) : null}
        {data.length > 1 ? itemContent(data.length - 1, data[data.length - 1]) : null}
      </div>
    );
  },
}));

function message(index: number, contentText = `消息 ${index}`): AgentMessageEntity {
  return {
    messageId: `msg_${index}`,
    conversationId: 'cm_1',
    role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
    status: 'COMPLETED',
    contentText,
    contentBlocks: [],
    version: 1,
    parentMessageId: null,
    modelName: null,
    run: null,
    citations: [],
    createdAt: '2026-07-20T01:00:00.000Z',
    completedAt: '2026-07-20T01:00:01.000Z',
  };
}

function renderViewport(messages: AgentMessageEntity[]) {
  return renderWithProviders(
    <MessageViewport
      messages={messages}
      status="ready"
      error={null}
      hasOlder={false}
      onLoadOlder={vi.fn()}
      onRetryLoad={vi.fn()}
      onRegenerate={vi.fn()}
      onRetryMessage={vi.fn()}
      onSaveReport={vi.fn()}
    />
  );
}

describe('MessageViewport', () => {
  it('长会话交给 react-virtuoso，不在页面层直接展开全部消息', () => {
    const messages = Array.from({ length: 200 }, (_, index) => message(index));
    renderViewport(messages);

    expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
    expect((virtuosoCapture.props?.data as AgentMessageEntity[]).length).toBe(200);
    expect(screen.getByText('消息 0')).toBeInTheDocument();
    expect(screen.getByText('消息 199')).toBeInTheDocument();
  });

  it('只有位于底部时跟随增量，离开底部时返回 false', () => {
    renderViewport([message(1)]);
    const followOutput = virtuosoCapture.props?.followOutput as (atBottom: boolean) => unknown;

    expect(followOutput(true)).toBe('auto');
    expect(followOutput(false)).toBe(false);
  });

  it('Batch 017 对助手内容启用安全 Markdown，raw HTML 不进入 DOM', () => {
    renderViewport([message(1, '<img src=x onerror=alert(1)>')]);

    expect(document.querySelector('img')).toBeNull();
    expect(document.body).not.toHaveTextContent('onerror');
  });
});
