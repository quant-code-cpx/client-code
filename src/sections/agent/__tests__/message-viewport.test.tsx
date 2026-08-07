import { useState } from 'react';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MessageViewport } from '../components/message-viewport';
import { toChatMessages } from '../components/mui-x-chat/agent-chat-mappers';
import { AgentMuiXProvider } from '../components/mui-x-chat/agent-mui-x-provider';

import type { AgentMessageEntity, AgentRunProjection } from '../state/agent-state.types';

const { scrollToBottom } = vi.hoisted(() => ({ scrollToBottom: vi.fn() }));

vi.mock('@mui/x-chat/ChatMessageList', async () => {
  const React = await import('react');

  return {
    ChatMessageList: React.forwardRef<
      { scrollToBottom: () => void },
      {
        items: string[];
        renderItem: ({ id, index }: { id: string; index: number }) => React.ReactNode;
      }
    >(({ items, renderItem }, ref) => {
      React.useImperativeHandle(ref, () => ({ scrollToBottom }));

      return (
        <div className="MuiChatMessageList-root">
          {items.map((id, index) => (
            <React.Fragment key={id}>{renderItem({ id, index })}</React.Fragment>
          ))}
        </div>
      );
    }),
  };
});

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

type MessageViewportFixtureProps = {
  messages: AgentMessageEntity[];
  activeRun?: AgentRunProjection | null;
  runsById?: Record<string, AgentRunProjection>;
};

function MessageViewportFixture({ messages, activeRun = null, runsById = {} }: MessageViewportFixtureProps) {
  return (
    <AgentMuiXProvider
      activeConversationId="cm_1"
      composerValue=""
      conversations={[]}
      messages={toChatMessages(messages)}
      hasOlder={false}
      onActiveConversationChange={vi.fn()}
      onComposerValueChange={vi.fn()}
    >
      <MessageViewport
        messages={messages}
        activeRun={activeRun}
        runsById={runsById}
        status="ready"
        error={null}
        hasOlder={false}
        onLoadOlder={vi.fn()}
        onRetryLoad={vi.fn()}
        onRegenerate={vi.fn()}
        onRetryMessage={vi.fn()}
        onSaveReport={vi.fn()}
        onContinue={vi.fn()}
      />
    </AgentMuiXProvider>
  );
}

function FollowLatestFixture() {
  const [messages, setMessages] = useState([message(0)]);

  return (
    <>
      <button type="button" onClick={() => setMessages((current) => [...current, message(1)])}>
        追加消息
      </button>
      <MessageViewportFixture messages={messages} />
    </>
  );
}

function renderViewport(
  messages: AgentMessageEntity[],
  activeRun: AgentRunProjection | null = null,
  runsById: Record<string, AgentRunProjection> = {}
) {
  return renderWithProviders(
    <MessageViewportFixture messages={messages} activeRun={activeRun} runsById={runsById} />
  );
}

describe('MessageViewport', () => {
  beforeEach(() => {
    scrollToBottom.mockReset();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('使用 MUI X ChatMessageList 和自定义研究消息 renderer', () => {
    const messages = [message(0), message(1)];
    const { container } = renderViewport(messages);

    expect(container.querySelector('.MuiChatMessageList-root')).toBeInTheDocument();
    expect(container.querySelectorAll('.MuiChatMessage-root')).toHaveLength(2);
    expect(screen.getByText('消息 0')).toBeInTheDocument();
    expect(screen.getByText('消息 1')).toBeInTheDocument();
  });

  it('保留消息列表 roving focus 的 article 语义', () => {
    renderViewport([message(0), message(1)]);

    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByLabelText('你的消息')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent 回答')).toBeInTheDocument();
  });

  it('Batch 017 对助手内容启用安全 Markdown，raw HTML 不进入 DOM', () => {
    renderViewport([message(1, '<img src=x onerror=alert(1)>')]);

    expect(document.querySelector('img')).toBeNull();
    expect(document.body).not.toHaveTextContent('onerror');
  });

  it('将当前 Run 的公开执行状态投影到对应的助手占位消息', () => {
    const assistantMessage: AgentMessageEntity = {
      ...message(1, ''),
      status: 'PENDING',
      run: { runId: 'run_1', status: 'RUNNING', statusVersion: 3, endedAt: null },
    };
    const activeRun: AgentRunProjection = {
      runId: 'run_1',
      conversationId: 'cm_1',
      assistantMessageId: assistantMessage.messageId,
      status: 'RUNNING',
      statusVersion: 3,
      canCancel: true,
      currentStep: null,
      latestEventSequence: 3,
      connectionGeneration: 1,
      connectionState: 'OPEN',
      reconnects: 0,
      stageLabel: '正在组织研究结论',
      planSummary: '核验行情与财务数据后形成结论。',
      progress: { label: '研究数据', completed: 2, total: 4 },
      needsFinalSnapshot: false,
      cancelRequested: false,
    };

    renderViewport([assistantMessage], activeRun);

    expect(screen.getByLabelText('实时执行进度')).toBeInTheDocument();
    expect(screen.getByText('正在组织研究结论')).toBeInTheDocument();
    expect(screen.getByText('核验行情与财务数据后形成结论。')).toBeInTheDocument();
    expect(screen.queryByText('等待研究开始…')).not.toBeInTheDocument();
  });

  it('终态研究失败时展示后端返回的具体错误，而不是空内容提示', () => {
    const assistantMessage: AgentMessageEntity = {
      ...message(1, ''),
      status: 'FAILED',
      run: { runId: 'run_failed', status: 'FAILED', statusVersion: 4, endedAt: '2026-07-20T01:00:04.000Z' },
    };
    const failedRun: AgentRunProjection = {
      runId: 'run_failed',
      conversationId: 'cm_1',
      assistantMessageId: assistantMessage.messageId,
      status: 'FAILED',
      statusVersion: 4,
      canCancel: false,
      currentStep: null,
      latestEventSequence: 4,
      connectionGeneration: 1,
      connectionState: 'COMPLETED',
      reconnects: 0,
      stageLabel: '研究失败',
      errorCode: 4012,
      errorMessage: '供应商返回 401：API key 无效',
      retryable: true,
      needsFinalSnapshot: true,
      cancelRequested: false,
    };

    renderViewport([assistantMessage], null, { [failedRun.runId]: failedRun });

    expect(screen.getByRole('alert')).toHaveTextContent('错误 4012 · 供应商返回 401：API key 无效');
    expect(screen.queryByText('暂无可展示内容')).not.toBeInTheDocument();
  });

  it('刷新后没有实时 Run 投影时，仍展示历史消息携带的失败原因', () => {
    const assistantMessage: AgentMessageEntity = {
      ...message(1, ''),
      status: 'FAILED',
      run: {
        runId: 'run_historical_failed',
        status: 'FAILED',
        statusVersion: 8,
        endedAt: '2026-08-07T12:00:04.000Z',
        errorCode: 'MODEL_PROVIDER_UNAVAILABLE',
        errorMessage: '模型供应商返回 HTTP 502，请检查上游服务状态或协议兼容日志',
      },
    };

    renderViewport([assistantMessage]);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '错误 MODEL_PROVIDER_UNAVAILABLE · 模型供应商返回 HTTP 502，请检查上游服务状态或协议兼容日志'
    );
    expect(screen.queryByText('研究执行失败，暂未收到具体原因。')).not.toBeInTheDocument();
  });

  it('发送乐观用户消息后自动滚动到底部', () => {
    const optimisticMessage = {
      ...message(0),
      messageId: 'local:request_1',
      role: 'USER' as const,
      deliveryStatus: 'SENDING' as const,
    };

    renderViewport([optimisticMessage]);

    expect(scrollToBottom).toHaveBeenCalled();
  });

  it('已在底部时跟随新消息维持在底部', () => {
    renderWithProviders(<FollowLatestFixture />);
    scrollToBottom.mockReset();

    fireEvent.click(screen.getByRole('button', { name: '追加消息' }));

    expect(scrollToBottom).toHaveBeenCalled();
  });
});
