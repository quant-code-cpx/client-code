import { Route, Routes } from 'react-router';
import { act, screen, waitFor } from '@testing-library/react';

import { agentApi } from 'src/api/agent';
import { renderWithProviders } from 'src/test/test-utils';
import { createAuthenticatedContext } from 'src/test/factories/auth-context';
import { agentMockMessages, agentMockConversation } from 'src/mocks/agent-mocks';

import { AgentView } from '../view/agent-view';

const mocks = vi.hoisted(() => ({
  useConversation: vi.fn(),
  useConversationList: vi.fn(),
  useAgentRun: vi.fn(),
  useComposerDraft: vi.fn(),
}));

const modelCatalog = {
  items: [
    {
      model: 'gpt-5.6-sol',
      displayName: 'gpt-5.6-sol',
      provider: 'openai',
      capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'REASONING_EFFORT'],
      reasoningEfforts: ['LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'MAX'],
      defaultReasoningEffort: 'XHIGH',
      contextWindow: 256000,
      maxOutputTokens: 54000,
      contextAccountingMode: 'SHARED_WINDOW',
      completionTokenAccounting: 'REASONING_AND_VISIBLE',
      supportedVerbosityLevels: ['LOW', 'MEDIUM', 'HIGH'],
      costTier: 'HIGH',
      status: 'AVAILABLE',
      reason: null,
    },
  ],
} satisfies Awaited<ReturnType<typeof agentApi.listModels>>;
const listModelsSpy = vi.spyOn(agentApi, 'listModels');

vi.mock('../hooks/use-conversation', () => ({ useConversation: mocks.useConversation }));
vi.mock('../hooks/use-conversation-list', () => ({
  useConversationList: mocks.useConversationList,
}));
vi.mock('../hooks/use-agent-run', () => ({ useAgentRun: mocks.useAgentRun }));
vi.mock('../hooks/use-composer-draft', () => ({ useComposerDraft: mocks.useComposerDraft }));
vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({ lastAgentRunUpdate: null }),
}));

function renderAgent(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/agent" element={<AgentView />} />
      <Route path="/agent/:conversationId" element={<AgentView />} />
    </Routes>,
    { initialEntries: [path], authContext: createAuthenticatedContext() }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  listModelsSpy.mockResolvedValue(modelCatalog);
  mocks.useConversationList.mockReturnValue({
    items: [],
    status: 'ready',
    error: null,
    hasMore: false,
    loadingMore: false,
    refresh: vi.fn(),
    loadMore: vi.fn(),
  });
  mocks.useConversation.mockReturnValue({
    conversation: null,
    messages: [],
    loadState: null,
    refresh: vi.fn(),
    loadOlder: vi.fn(),
    hasOlder: false,
    branchProjection: null,
    branchChanging: false,
    branchError: null,
    viewBranch: vi.fn(),
    returnToActiveBranch: vi.fn(),
    adoptDisplayedBranch: vi.fn(),
  });
  mocks.useAgentRun.mockReturnValue({
    send: vi.fn(),
    cancel: vi.fn(),
    regenerate: vi.fn(),
    retryUnsent: vi.fn(),
    continueReceiving: vi.fn(),
    activeRun: null,
    isSending: false,
    commandError: null,
  });
  mocks.useComposerDraft.mockReturnValue({
    value: '',
    recovered: false,
    setValue: vi.fn(),
    clear: vi.fn(),
  });
});

describe('AgentView', () => {
  it('新建态展示研究空态、Composer 与首个可用模型', async () => {
    renderAgent('/agent');

    expect(screen.getByRole('heading', { name: 'AI 量化研究' })).toBeInTheDocument();
    expect(screen.getByText('开始一次量化研究')).toBeInTheDocument();
    expect(screen.getByLabelText('研究问题')).toBeInTheDocument();
    expect(screen.getByLabelText('管理长期记忆')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'gpt-5.6-sol' })).toBeInTheDocument();
  });

  it('切换会话后清理新建态的模型配置提示', async () => {
    mocks.useConversationList.mockReturnValue({
      items: [agentMockConversation],
      status: 'ready',
      error: null,
      hasMore: false,
      loadingMore: false,
      refresh: vi.fn(),
      loadMore: vi.fn(),
    });

    const { user } = renderAgent('/agent');
    await user.click(await screen.findByRole('button', { name: 'gpt-5.6-sol' }));
    const saveButton = await screen.findByRole('button', { name: '保存' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(
      await screen.findByText('已选择 gpt-5.6-sol；首条消息将使用此配置。')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /贵州茅台估值研究/ }));

    await waitFor(() =>
      expect(
        screen.queryByText('已选择 gpt-5.6-sol；首条消息将使用此配置。')
      ).not.toBeInTheDocument()
    );
  });

  it('深链把指定 conversationId 交给加载 hook', async () => {
    renderAgent('/agent/cm_deep_link');
    await act(async () => Promise.resolve());
    expect(mocks.useConversation).toHaveBeenCalledWith('cm_deep_link');
  });

  it('已有会话绑定不可用模型时锁定 Composer 并提示切换模型', async () => {
    listModelsSpy.mockResolvedValueOnce({
      items: [
        {
          ...modelCatalog.items[0],
          status: 'UNAVAILABLE',
          reason: '模型供应商暂时不可用',
        },
      ],
    });
    mocks.useConversation.mockReturnValue({
      conversation: agentMockConversation,
      messages: agentMockMessages.map((message) => ({
        ...message,
        conversationId: agentMockConversation.conversationId,
      })),
      loadState: { detailStatus: 'ready', messagesStatus: 'ready', error: null },
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      hasOlder: false,
      branchProjection: null,
      branchChanging: false,
      branchError: null,
      viewBranch: vi.fn(),
      returnToActiveBranch: vi.fn(),
      adoptDisplayedBranch: vi.fn(),
    });

    renderAgent('/agent/cm_mock_1');

    await waitFor(() => expect(screen.getByLabelText('研究问题')).toBeDisabled());
    expect(screen.getByText(/模型供应商暂时不可用/)).toBeInTheDocument();
  });

  it('历史版本查看态暴露分支动作，并锁定 Composer 防止发送到其他分支', async () => {
    const adoptDisplayedBranch = vi.fn().mockResolvedValue(true);
    const returnToActiveBranch = vi.fn().mockResolvedValue(true);
    const historicalAssistant = {
      ...agentMockMessages[1],
      conversationId: 'cm_mock_1',
      messageId: 'msg_assistant_v1',
      version: 1,
    };
    mocks.useConversation.mockReturnValue({
      conversation: {
        ...agentMockConversation,
        activeLeafMessageId: 'msg_assistant_v2',
        branchVersion: 2,
      },
      messages: [{ ...agentMockMessages[0], conversationId: 'cm_mock_1' }, historicalAssistant],
      loadState: { detailStatus: 'ready', messagesStatus: 'ready', error: null },
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      hasOlder: false,
      branchProjection: {
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: 'msg_assistant_v2',
        branchVersion: 2,
        displayLeafMessageId: historicalAssistant.messageId,
        lineageComplete: true,
        isActiveBranch: false,
        displayBranchCompatible: false,
        canAdoptDisplay: true,
        siblingGroups: [
          {
            parentMessageId: 'msg_user_mock_1',
            selectedMessageId: historicalAssistant.messageId,
            selectedVersion: 1,
            activeMessageId: 'msg_assistant_v2',
            totalVersions: 2,
            versions: [
              {
                messageId: historicalAssistant.messageId,
                version: 1,
                status: 'COMPLETED',
                isActive: false,
                isDisplayed: true,
                canAdopt: true,
                createdAt: historicalAssistant.createdAt,
              },
              {
                messageId: 'msg_assistant_v2',
                version: 2,
                status: 'COMPLETED',
                isActive: true,
                isDisplayed: false,
                canAdopt: false,
                createdAt: '2026-07-20T00:00:06.000Z',
              },
            ],
          },
        ],
      },
      branchChanging: false,
      branchError: null,
      viewBranch: vi.fn(),
      returnToActiveBranch,
      adoptDisplayedBranch,
    });

    const { user } = renderAgent('/agent/cm_mock_1');

    expect(screen.getByLabelText('研究问题')).toBeDisabled();
    expect(
      screen.getByText('当前正在查看历史版本；请先选择“从此版本继续”或回到最新。')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '从此版本继续' }));
    expect(adoptDisplayedBranch).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '回到最新' }));
    expect(returnToActiveBranch).toHaveBeenCalledTimes(1);
  });

  it('全新会话流式 V1 不误判为历史版本，Composer 仍可编辑草稿', async () => {
    const listRunEvents = vi
      .spyOn(agentApi, 'listRunEvents')
      .mockResolvedValue({ items: [], nextAfterSequence: null });
    const listToolCalls = vi
      .spyOn(agentApi, 'listToolCalls')
      .mockResolvedValue({ items: [], nextCursor: null, payloadIncluded: false });
    const streamingAssistant = {
      ...agentMockMessages[1],
      conversationId: 'cm_mock_1',
      status: 'PENDING' as const,
      contentText: '',
      contentBlocks: [],
      citations: [],
      completedAt: null,
      run: { runId: 'run_streaming', status: 'RUNNING' as const, statusVersion: 1, endedAt: null },
    };
    const activeRun = {
      runId: 'run_streaming',
      conversationId: 'cm_mock_1',
      assistantMessageId: streamingAssistant.messageId,
      status: 'RUNNING' as const,
      statusVersion: 1,
      canCancel: true,
      currentStep: null,
      latestEventSequence: 1,
      latestPersistedEventSequence: 1,
      connectionGeneration: 1,
      connectionState: 'OPEN' as const,
      reconnects: 0,
      stageLabel: '正在研究',
      needsFinalSnapshot: false,
      cancelRequested: false,
    };
    mocks.useConversation.mockReturnValue({
      conversation: {
        ...agentMockConversation,
        activeLeafMessageId: null,
        branchVersion: 0,
      },
      messages: [{ ...agentMockMessages[0], conversationId: 'cm_mock_1' }, streamingAssistant],
      loadState: { detailStatus: 'ready', messagesStatus: 'ready', error: null },
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      hasOlder: false,
      branchProjection: {
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: null,
        branchVersion: 0,
        displayLeafMessageId: streamingAssistant.messageId,
        lineageComplete: true,
        isActiveBranch: false,
        displayBranchCompatible: true,
        canAdoptDisplay: false,
        siblingGroups: [
          {
            parentMessageId: 'msg_user_mock_1',
            selectedMessageId: streamingAssistant.messageId,
            selectedVersion: 1,
            activeMessageId: null,
            totalVersions: 1,
            versions: [
              {
                messageId: streamingAssistant.messageId,
                version: 1,
                status: 'PENDING',
                isActive: false,
                isDisplayed: true,
                canAdopt: false,
                createdAt: streamingAssistant.createdAt,
              },
            ],
          },
        ],
      },
      branchChanging: false,
      branchError: null,
      viewBranch: vi.fn(),
      returnToActiveBranch: vi.fn(),
      adoptDisplayedBranch: vi.fn(),
    });
    mocks.useAgentRun.mockReturnValue({
      send: vi.fn(),
      cancel: vi.fn(),
      regenerate: vi.fn(),
      retryUnsent: vi.fn(),
      continueReceiving: vi.fn(),
      activeRun,
      isSending: false,
      commandError: null,
    });

    renderAgent('/agent/cm_mock_1');

    expect(await screen.findByLabelText('研究问题')).not.toBeDisabled();
    await waitFor(() => {
      expect(listRunEvents).toHaveBeenCalled();
      expect(listToolCalls).toHaveBeenCalled();
    });
    expect(screen.getByRole('button', { name: '停止研究' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '回到最新' })).not.toBeInTheDocument();
    expect(screen.queryByText(/此历史版本/)).not.toBeInTheDocument();
  });

  it('全新会话首次 V1 执行失败不误判为历史版本', async () => {
    const failedAssistant = {
      ...agentMockMessages[1],
      conversationId: 'cm_mock_1',
      status: 'FAILED' as const,
      contentText: '',
      contentBlocks: [],
      citations: [],
      completedAt: '2026-08-24T01:00:04.000Z',
      run: {
        runId: 'run_failed',
        status: 'FAILED' as const,
        statusVersion: 4,
        endedAt: '2026-08-24T01:00:04.000Z',
        errorCode: 6005,
        errorMessage: '模型供应商返回 HTTP 503',
      },
    };
    mocks.useConversation.mockReturnValue({
      conversation: {
        ...agentMockConversation,
        activeLeafMessageId: null,
        branchVersion: 0,
      },
      messages: [{ ...agentMockMessages[0], conversationId: 'cm_mock_1' }, failedAssistant],
      loadState: { detailStatus: 'ready', messagesStatus: 'ready', error: null },
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      hasOlder: false,
      branchProjection: {
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: null,
        branchVersion: 0,
        displayLeafMessageId: failedAssistant.messageId,
        lineageComplete: true,
        isActiveBranch: false,
        displayBranchCompatible: true,
        canAdoptDisplay: false,
        siblingGroups: [
          {
            parentMessageId: 'msg_user_mock_1',
            selectedMessageId: failedAssistant.messageId,
            selectedVersion: 1,
            activeMessageId: null,
            totalVersions: 1,
            versions: [
              {
                messageId: failedAssistant.messageId,
                version: 1,
                status: 'FAILED',
                isActive: false,
                isDisplayed: true,
                canAdopt: false,
                createdAt: failedAssistant.createdAt,
              },
            ],
          },
        ],
      },
      branchChanging: false,
      branchError: null,
      viewBranch: vi.fn(),
      returnToActiveBranch: vi.fn(),
      adoptDisplayedBranch: vi.fn(),
    });
    mocks.useAgentRun.mockReturnValue({
      send: vi.fn(),
      cancel: vi.fn(),
      regenerate: vi.fn(),
      retryUnsent: vi.fn(),
      continueReceiving: vi.fn(),
      activeRun: {
        runId: 'run_failed',
        conversationId: 'cm_mock_1',
        assistantMessageId: failedAssistant.messageId,
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
        errorCode: 6005,
        errorMessage: '模型供应商返回 HTTP 503',
        retryable: true,
        needsFinalSnapshot: false,
        cancelRequested: false,
      },
      isSending: false,
      commandError: null,
    });

    renderAgent('/agent/cm_mock_1');

    expect(await screen.findByLabelText('研究问题')).not.toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('错误 6005');
    expect(screen.queryByRole('button', { name: '回到最新' })).not.toBeInTheDocument();
    expect(screen.queryByText(/此历史版本/)).not.toBeInTheDocument();
  });

  it('深链无权限或不存在时展示页面错误，不回退到其他会话', async () => {
    mocks.useConversation.mockReturnValue({
      conversation: null,
      messages: [],
      loadState: {
        detailStatus: 'error',
        messagesStatus: 'error',
        error: '会话不存在或无权访问',
      },
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      hasOlder: false,
    });

    renderAgent('/agent/cm_forbidden');
    await act(async () => Promise.resolve());

    expect(screen.getByText('会话不存在或无权访问')).toBeInTheDocument();
    expect(screen.queryByLabelText('研究问题')).not.toBeInTheDocument();
  });

  it('模型切换需要压缩时显示明确提示', async () => {
    const refresh = vi.fn();
    vi.spyOn(agentApi, 'updateConversationModel').mockResolvedValue({
      conversationId: 'cm_mock_1',
      modelPolicy: 'MANUAL',
      preferredModel: 'gpt-5.6-sol',
      reasoningEffort: null,
      researchDepth: 'STANDARD',
      answerDetail: 'STANDARD',
      contextPreparation: {
        status: 'COMPACTION_REQUIRED',
        targetModel: 'research-model',
        contextWindow: 128000,
        estimatedRecentTokens: 92000,
        triggerTokens: 88473,
        targetTokens: 58982,
        willAutoCompactOnNextRun: true,
        message: '下一轮发送前会自动整理历史会话，原始消息不会删除',
      },
      updatedAt: '2026-07-20T00:00:05.000Z',
    });
    mocks.useConversation.mockReturnValue({
      conversation: agentMockConversation,
      messages: [],
      loadState: { detailStatus: 'ready', messagesStatus: 'ready', error: null },
      refresh,
      loadOlder: vi.fn(),
      hasOlder: false,
    });

    const { user } = renderAgent('/agent/cm_mock_1');
    await user.click(await screen.findByRole('button', { name: 'gpt-5.6-sol' }));
    const saveButton = await screen.findByRole('button', { name: '保存' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(
      await screen.findByText(/下一轮发送前会自动整理历史会话，原始消息不会删除/)
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
