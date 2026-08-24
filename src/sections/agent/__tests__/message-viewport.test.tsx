import { useState } from 'react';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MessageViewport } from '../components/message-viewport';
import { toChatMessages } from '../components/mui-x-chat/agent-chat-mappers';
import { AgentMuiXProvider } from '../components/mui-x-chat/agent-mui-x-provider';

import type {
  AgentMessageEntity,
  AgentRunProjection,
  AgentMessageProjectionState,
} from '../state/agent-state.types';

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
  onRetryLoad?: () => void;
  onSaveReport?: (runId: string) => void;
  branchProjection?: AgentMessageProjectionState | null;
};

function MessageViewportFixture({
  messages,
  activeRun = null,
  runsById = {},
  onRetryLoad = vi.fn(),
  onSaveReport = vi.fn(),
  branchProjection = null,
}: MessageViewportFixtureProps) {
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
        onRetryLoad={onRetryLoad}
        onRegenerate={vi.fn()}
        onRetryMessage={vi.fn()}
        onSaveReport={onSaveReport}
        onContinue={vi.fn()}
        branchProjection={branchProjection}
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
  runsById: Record<string, AgentRunProjection> = {},
  branchProjection: AgentMessageProjectionState | null = null
) {
  return renderWithProviders(
    <MessageViewportFixture
      messages={messages}
      activeRun={activeRun}
      runsById={runsById}
      branchProjection={branchProjection}
    />
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

  it('仅对已有持久化引用的完成回答开放报告保存入口', () => {
    const onSaveReport = vi.fn();
    const completed = {
      ...message(1, '研究结论'),
      run: { runId: 'run_report', status: 'COMPLETED' as const, statusVersion: 2, endedAt: null },
    };
    const { unmount } = renderWithProviders(
      <MessageViewportFixture messages={[completed]} onSaveReport={onSaveReport} />
    );

    expect(screen.queryByRole('button', { name: '保存研究报告' })).not.toBeInTheDocument();
    unmount();

    const cited = {
      ...completed,
      citations: [
        {
          citationId: 'citation_report',
          blockId: 'block_report',
          claimKey: 'claim_report',
          conclusionLevel: 'FACT' as const,
          sourceType: 'DATABASE' as const,
          title: 'get_stock_price_history',
          retrievedAt: '2026-08-23T08:00:00.000Z',
          locator: { factId: 'fact_report' },
        },
      ],
    };
    renderWithProviders(<MessageViewportFixture messages={[cited]} onSaveReport={onSaveReport} />);

    fireEvent.click(screen.getByRole('button', { name: '保存研究报告' }));
    expect(onSaveReport).toHaveBeenCalledWith('run_report');
  });

  it('将当前 Run 的公开执行状态投影到默认展开的思考面板', async () => {
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
      latestPersistedEventSequence: 3,
      connectionGeneration: 1,
      connectionState: 'OPEN',
      reconnects: 0,
      stageLabel: '正在组织研究结论',
      planSummary: '核验行情与财务数据后形成结论。',
      progress: { label: '研究数据', completed: 2, total: 4 },
      needsFinalSnapshot: false,
      cancelRequested: false,
    };
    const streamingProjection: AgentMessageProjectionState = {
      projection: 'ACTIVE_BRANCH',
      activeLeafMessageId: null,
      branchVersion: 0,
      displayLeafMessageId: assistantMessage.messageId,
      lineageComplete: true,
      isActiveBranch: false,
      displayBranchCompatible: true,
      canAdoptDisplay: false,
      siblingGroups: [
        {
          parentMessageId: 'msg_user_0',
          selectedMessageId: assistantMessage.messageId,
          selectedVersion: 1,
          activeMessageId: null,
          totalVersions: 1,
          versions: [
            {
              messageId: assistantMessage.messageId,
              version: 1,
              status: 'PENDING',
              isActive: false,
              isDisplayed: true,
              canAdopt: false,
              createdAt: assistantMessage.createdAt,
            },
          ],
        },
      ],
    };

    renderViewport([assistantMessage], activeRun, {}, streamingProjection);

    expect(await screen.findByRole('button', { name: /正在思考/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText('正在组织研究结论')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '研究数据' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );
    expect(screen.queryByText('等待研究开始…')).not.toBeInTheDocument();
    expect(screen.getByText('生成中 · V1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '回到最新' })).not.toBeInTheDocument();
    expect(screen.queryByText(/此历史版本/)).not.toBeInTheDocument();
  });

  it('终态研究失败时展示后端返回的具体错误，而不是空内容提示', () => {
    const assistantMessage: AgentMessageEntity = {
      ...message(1, ''),
      status: 'FAILED',
      run: {
        runId: 'run_failed',
        status: 'FAILED',
        statusVersion: 4,
        endedAt: '2026-07-20T01:00:04.000Z',
      },
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
      latestPersistedEventSequence: 4,
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
        errorCode: 6005,
        errorMessage: '模型供应商返回 HTTP 502，请检查上游服务状态或协议兼容日志',
      },
    };

    renderViewport([assistantMessage]);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '错误 6005 · 模型供应商返回 HTTP 502，请检查上游服务状态或协议兼容日志'
    );
    expect(screen.queryByText('研究执行失败，暂未收到具体原因。')).not.toBeInTheDocument();
  });

  it('终态权威快照重试耗尽时明确提示结果不完整，并提供重新加载入口', () => {
    const onRetryLoad = vi.fn();
    const assistantMessage: AgentMessageEntity = {
      ...message(1, '流内暂存结论'),
      run: {
        runId: 'run_incomplete',
        status: 'COMPLETED',
        statusVersion: 4,
        endedAt: '2026-08-16T01:00:05.000Z',
      },
    };
    const incompleteRun: AgentRunProjection = {
      runId: 'run_incomplete',
      conversationId: 'cm_1',
      assistantMessageId: assistantMessage.messageId,
      status: 'COMPLETED',
      statusVersion: 4,
      canCancel: false,
      currentStep: null,
      latestEventSequence: 8,
      latestPersistedEventSequence: 8,
      connectionGeneration: 1,
      connectionState: 'COMPLETED',
      reconnects: 0,
      stageLabel: '研究完成',
      needsFinalSnapshot: true,
      finalSnapshotError: '最终快照同步失败：HTTP 503。当前回答与引用可能不完整。',
      cancelRequested: false,
    };

    renderWithProviders(
      <MessageViewportFixture
        messages={[assistantMessage]}
        runsById={{ [incompleteRun.runId]: incompleteRun }}
        onRetryLoad={onRetryLoad}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('当前回答与引用可能不完整');
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }));
    expect(onRetryLoad).toHaveBeenCalledTimes(1);
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

  it('完成的历史 sibling 提供采纳与返回动作，并保留版本切换', async () => {
    const onViewBranch = vi.fn();
    const onAdoptDisplayedBranch = vi.fn();
    const onReturnToActiveBranch = vi.fn();
    const historical = {
      ...message(1, '历史回答'),
      messageId: 'answer-v2',
      version: 2,
      parentMessageId: 'question-1',
      contextParentMessageId: 'question-1',
    };
    const branchProjection: AgentMessageProjectionState = {
      projection: 'ACTIVE_BRANCH',
      activeLeafMessageId: 'answer-v1',
      branchVersion: 4,
      displayLeafMessageId: 'answer-v2',
      lineageComplete: true,
      isActiveBranch: false,
      displayBranchCompatible: false,
      canAdoptDisplay: true,
      siblingGroups: [
        {
          parentMessageId: 'question-1',
          selectedMessageId: 'answer-v2',
          selectedVersion: 2,
          activeMessageId: 'answer-v1',
          totalVersions: 2,
          versions: [
            {
              messageId: 'answer-v1',
              version: 1,
              status: 'COMPLETED',
              isActive: true,
              isDisplayed: false,
              canAdopt: false,
              createdAt: '2026-08-20T01:00:01.000Z',
            },
            {
              messageId: 'answer-v2',
              version: 2,
              status: 'COMPLETED',
              isActive: false,
              isDisplayed: true,
              canAdopt: true,
              createdAt: '2026-08-20T01:00:02.000Z',
            },
          ],
        },
      ],
    };

    renderWithProviders(
      <AgentMuiXProvider
        activeConversationId="cm_1"
        composerValue=""
        conversations={[]}
        messages={toChatMessages([historical])}
        hasOlder={false}
        onActiveConversationChange={vi.fn()}
        onComposerValueChange={vi.fn()}
      >
        <MessageViewport
          messages={[historical]}
          activeRun={null}
          runsById={{}}
          status="ready"
          error={null}
          hasOlder={false}
          onLoadOlder={vi.fn()}
          onRetryLoad={vi.fn()}
          onRegenerate={vi.fn()}
          onRetryMessage={vi.fn()}
          onSaveReport={vi.fn()}
          onContinue={vi.fn()}
          branchProjection={branchProjection}
          branchError={null}
          onViewBranch={onViewBranch}
          onAdoptDisplayedBranch={onAdoptDisplayedBranch}
          onReturnToActiveBranch={onReturnToActiveBranch}
        />
      </AgentMuiXProvider>
    );

    expect(screen.getByText('历史版本 · V2')).toBeInTheDocument();
    expect(
      screen.getByText('正在查看历史版本。设为当前分支后，后续问题将从此版本继续。')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '从此版本继续' }));
    expect(onAdoptDisplayedBranch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '回到最新' }));
    expect(onReturnToActiveBranch).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '回答版本' }));
    fireEvent.click(await screen.findByRole('option', { name: 'V1 · 当前分支' }));
    expect(onViewBranch).toHaveBeenCalledWith('answer-v1');
  });

  it('已停止且不可采纳的历史版本只允许回到最新，不暴露保存或重新生成', () => {
    const onReturnToActiveBranch = vi.fn();
    const stopped = {
      ...message(1, ''),
      messageId: 'answer-v1-stopped',
      status: 'CANCELLED' as const,
      version: 1,
      parentMessageId: 'question-1',
      contextParentMessageId: 'question-1',
    };
    const branchProjection: AgentMessageProjectionState = {
      projection: 'ACTIVE_BRANCH',
      activeLeafMessageId: 'answer-v2',
      branchVersion: 4,
      displayLeafMessageId: stopped.messageId,
      lineageComplete: true,
      isActiveBranch: false,
      displayBranchCompatible: true,
      canAdoptDisplay: false,
      siblingGroups: [
        {
          parentMessageId: 'question-1',
          selectedMessageId: stopped.messageId,
          selectedVersion: 1,
          activeMessageId: 'answer-v2',
          totalVersions: 2,
          versions: [
            {
              messageId: stopped.messageId,
              version: 1,
              status: 'CANCELLED',
              isActive: false,
              isDisplayed: true,
              canAdopt: false,
              createdAt: stopped.createdAt,
            },
            {
              messageId: 'answer-v2',
              version: 2,
              status: 'COMPLETED',
              isActive: true,
              isDisplayed: false,
              canAdopt: false,
              createdAt: '2026-08-20T01:00:02.000Z',
            },
          ],
        },
      ],
    };

    renderWithProviders(
      <AgentMuiXProvider
        activeConversationId="cm_1"
        composerValue=""
        conversations={[]}
        messages={toChatMessages([stopped])}
        hasOlder={false}
        onActiveConversationChange={vi.fn()}
        onComposerValueChange={vi.fn()}
      >
        <MessageViewport
          messages={[stopped]}
          activeRun={null}
          runsById={{}}
          status="ready"
          error={null}
          hasOlder={false}
          onLoadOlder={vi.fn()}
          onRetryLoad={vi.fn()}
          onRegenerate={vi.fn()}
          onRetryMessage={vi.fn()}
          onSaveReport={vi.fn()}
          onContinue={vi.fn()}
          branchProjection={branchProjection}
          onReturnToActiveBranch={onReturnToActiveBranch}
        />
      </AgentMuiXProvider>
    );

    expect(
      screen.getByText('此历史版本已停止，不能设为当前分支。请回到最新后继续。')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '从此版本继续' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重新生成回答' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存研究报告' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '回到最新' }));
    expect(onReturnToActiveBranch).toHaveBeenCalledTimes(1);
  });
});
