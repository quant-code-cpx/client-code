import type { ReactNode } from 'react';
import type { AgentSseEvent } from 'src/types/agent/generated';
import type { StreamAgentRunOptions } from 'src/api/agent-stream';

import { MemoryRouter } from 'react-router';
import { act, waitFor, renderHook } from '@testing-library/react';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

import { useAgentRun } from '../hooks/use-agent-run';
import { AgentProvider, useAgentState, useAgentDispatch } from '../state/agent-provider';

import type { AgentReasoningDeltaEvent } from '../state/agent-state.types';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  createConversation: vi.fn(),
  cancelRun: vi.fn(),
  regenerateMessage: vi.fn(),
  retryRun: vi.fn(),
  streamAgentRun: vi.fn(),
  getRunStatus: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock('src/api/agent', () => ({
  agentApi: {
    sendMessage: mocks.sendMessage,
    createConversation: mocks.createConversation,
    cancelRun: mocks.cancelRun,
    regenerateMessage: mocks.regenerateMessage,
    retryRun: mocks.retryRun,
    getRunStatus: mocks.getRunStatus,
    listMessages: mocks.listMessages,
  },
}));
vi.mock('src/api/agent-stream', () => ({ streamAgentRun: mocks.streamAgentRun }));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AgentProvider initialConversationId="cm_1">{children}</AgentProvider>
    </MemoryRouter>
  );
}

function newConversationWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AgentProvider initialConversationId={null}>{children}</AgentProvider>
    </MemoryRouter>
  );
}

function conversation() {
  return {
    conversationId: 'cm_1',
    title: '测试会话',
    status: 'ACTIVE' as const,
    modelPolicy: 'AUTO' as const,
    preferredModel: null,
    reasoningEffort: null,
    researchDepth: 'STANDARD' as const,
    answerDetail: 'STANDARD' as const,
    messageCount: 0,
    lastMessageAt: '2026-07-20T01:00:00.000Z',
    createdAt: '2026-07-20T01:00:00.000Z',
    updatedAt: '2026-07-20T01:00:00.000Z',
    statusVersion: 1,
  };
}

function setupRunResponse() {
  mocks.sendMessage.mockResolvedValue({
    conversationId: 'cm_1',
    userMessageId: 'msg_user_1',
    assistantMessageId: 'msg_assistant_1',
    runId: 'run_1',
    runStatus: 'QUEUED',
    streamEndpoint: '/api/agent/runs/events',
  });
  mocks.streamAgentRun.mockImplementation(
    (options: StreamAgentRunOptions) =>
      new Promise((resolve) => {
        options.signal?.addEventListener(
          'abort',
          () =>
            resolve({
              status: 'aborted',
              cursor: {
                runId: options.runId,
                lastAppliedSequence: 0,
                connectionGeneration: 1,
              },
              reconnects: 0,
            }),
          { once: true }
        );
      })
  );
}

function runningSnapshot(statusVersion = 2) {
  return {
    runId: 'run_1',
    conversationId: 'cm_1',
    status: 'RUNNING' as const,
    statusVersion,
    currentStep: null,
    finalMessageId: null,
    latestEventSequence: statusVersion,
    canCancel: true,
    canRetry: false,
    retryDepth: 0,
    researchDepth: 'STANDARD' as const,
    answerDetail: 'STANDARD' as const,
    errorCode: null,
    errorMessage: null,
    queuedAt: '2026-07-20T01:00:01.000Z',
    startedAt: '2026-07-20T01:00:02.000Z',
    endedAt: null,
  };
}

function reasoningEvent(sequence: number): AgentReasoningDeltaEvent {
  return {
    schemaVersion: '1.0',
    eventId: `evt_reasoning_${sequence}`,
    sequence,
    type: 'model.reasoning.delta',
    runId: 'run_1',
    conversationId: 'cm_1',
    messageId: 'msg_assistant_1',
    occurredAt: '2026-08-16T01:00:00.000Z',
    traceId: 'trace_reasoning_1',
    payload: {
      modelCallId: 'model_call_1',
      attempt: 1,
      kind: 'FULL',
      delta: `推理片段 ${sequence}`,
    },
  };
}

function completedEvent(sequence: number): AgentSseEvent {
  const fixture = AGENT_EVENT_FIXTURES.find((event) => event.type === 'agent.completed');
  if (!fixture || fixture.type !== 'agent.completed')
    throw new Error('缺少 agent.completed fixture');
  return {
    ...fixture,
    eventId: `evt_completed_${sequence}`,
    sequence,
    runId: 'run_1',
    conversationId: 'cm_1',
    messageId: 'msg_assistant_1',
    payload: { ...fixture.payload, finalMessageId: 'msg_assistant_1' },
  };
}

function completedSnapshot(statusVersion = 4) {
  return {
    ...runningSnapshot(statusVersion),
    status: 'COMPLETED' as const,
    statusVersion,
    finalMessageId: 'msg_assistant_1',
    latestEventSequence: 1,
    canCancel: false,
    endedAt: '2026-08-16T01:00:05.000Z',
  };
}

function finalAssistantMessage() {
  return {
    messageId: 'msg_assistant_1',
    role: 'ASSISTANT' as const,
    status: 'COMPLETED' as const,
    contentText: '权威最终研究结论',
    contentBlocks: [],
    version: 2,
    parentMessageId: 'msg_user_1',
    modelName: 'gpt-5.6-sol',
    run: {
      runId: 'run_1',
      status: 'COMPLETED' as const,
      statusVersion: 4,
      endedAt: '2026-08-16T01:00:05.000Z',
    },
    citations: [
      {
        citationId: 'citation_1',
        blockId: 'markdown_1',
        claimKey: 'claim_1',
        conclusionLevel: 'FACT' as const,
        sourceType: 'DATABASE' as const,
        title: '行情数据库',
        canonicalUrl: null,
        publisher: 'Apex Quant',
        retrievedAt: '2026-08-16T01:00:04.000Z',
        locator: { factId: 'fact_1' },
      },
    ],
    createdAt: '2026-08-16T01:00:01.000Z',
    completedAt: '2026-08-16T01:00:05.000Z',
  };
}

function failedSnapshot(canRetry: boolean) {
  return {
    runId: 'run_failed',
    conversationId: 'cm_1',
    status: 'FAILED' as const,
    statusVersion: 3,
    currentStep: null,
    finalMessageId: 'msg_failed',
    latestEventSequence: 9,
    canCancel: false,
    canRetry,
    retryOfRunId: null,
    retryMode: null,
    retryDepth: 0,
    researchDepth: 'STANDARD' as const,
    answerDetail: 'STANDARD' as const,
    errorCode: canRetry ? 6007 : 6019,
    errorMessage: canRetry ? '模型调用超时' : 'Tool 调用额度已用尽',
    queuedAt: '2026-08-10T23:00:00.000Z',
    startedAt: '2026-08-10T23:00:01.000Z',
    endedAt: '2026-08-10T23:02:01.000Z',
  };
}

function assistantMessage(status: 'COMPLETED' | 'FAILED') {
  return {
    messageId: 'msg_failed',
    role: 'ASSISTANT' as const,
    status,
    contentText: status === 'FAILED' ? null : '研究结论',
    contentBlocks: [],
    version: 1,
    parentMessageId: 'msg_user_1',
    modelName: 'gpt-5.6-sol',
    run: {
      runId: 'run_failed',
      status,
      statusVersion: 3,
      endedAt: '2026-08-10T23:02:01.000Z',
      errorCode: status === 'FAILED' ? '6007' : null,
      errorMessage: status === 'FAILED' ? '模型调用超时' : null,
    },
    citations: [],
    createdAt: '2026-08-10T23:00:00.000Z',
    completedAt: '2026-08-10T23:02:01.000Z',
  };
}

function loadAssistantMessage(
  dispatch: ReturnType<typeof useAgentDispatch>,
  status: 'COMPLETED' | 'FAILED'
) {
  dispatch({ type: 'MESSAGES_REQUESTED', conversationId: 'cm_1', generation: 1 });
  dispatch({
    type: 'MESSAGES_SUCCEEDED',
    conversationId: 'cm_1',
    generation: 1,
    items: [assistantMessage(status)],
    nextBeforeMessageId: null,
    mode: 'replace',
    authoritative: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupRunResponse();
  mocks.getRunStatus.mockResolvedValue(runningSnapshot());
  mocks.listMessages.mockResolvedValue({ items: [], nextBeforeMessageId: null });
  mocks.cancelRun.mockResolvedValue({
    runId: 'run_1',
    status: 'CANCEL_REQUESTED',
    statusVersion: 2,
    cancellationAccepted: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAgentRun', () => {
  it('发送确认后建立 Run；页面卸载只中止 reader，不调用取消 API', async () => {
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        state: useAgentState(),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });

    await act(async () => {
      await hook.result.current.runner.send('分析贵州茅台');
    });

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
    expect(mocks.streamAgentRun).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.messages.orderedIdsByConversation.cm_1).toEqual([
      'msg_user_1',
      'msg_assistant_1',
    ]);

    const streamOptions = mocks.streamAgentRun.mock.calls[0][0] as StreamAgentRunOptions;
    expect(streamOptions.includeReasoning).toBe(true);
    hook.unmount();

    await waitFor(() => expect(streamOptions.signal?.aborted).toBe(true));
    expect(mocks.cancelRun).not.toHaveBeenCalled();
  });

  it('终态快照暂不可见或请求失败时有限重试，最终以权威消息补齐正文、模型与引用', async () => {
    vi.useFakeTimers();
    mocks.getRunStatus.mockResolvedValue(completedSnapshot());
    mocks.listMessages
      .mockResolvedValueOnce({ items: [], nextBeforeMessageId: null })
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockResolvedValueOnce({ items: [finalAssistantMessage()], nextBeforeMessageId: null });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        state: useAgentState(),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('验证最终快照重试');
    });

    const streamOptions = mocks.streamAgentRun.mock.calls[0][0] as StreamAgentRunOptions;
    const terminal = completedEvent(1);
    await act(async () => {
      streamOptions.callbacks.onEvent(terminal, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: terminal.eventId,
        connectionGeneration: 1,
      });
      streamOptions.callbacks.onTerminal?.(terminal, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: terminal.eventId,
        connectionGeneration: 1,
      });
      await vi.runAllTimersAsync();
    });

    expect(mocks.listMessages).toHaveBeenCalledTimes(3);
    expect(hook.result.current.state.messages.byId.msg_assistant_1).toMatchObject({
      status: 'COMPLETED',
      contentText: '权威最终研究结论',
      modelName: 'gpt-5.6-sol',
      citations: [expect.objectContaining({ citationId: 'citation_1' })],
    });
    expect(hook.result.current.state.runs.byId.run_1).toMatchObject({
      status: 'COMPLETED',
      needsFinalSnapshot: false,
      finalSnapshotError: null,
    });
    hook.unmount();
  });

  it('终态快照重试耗尽时保留不完整标记与可见错误，不把失败静默吞掉', async () => {
    vi.useFakeTimers();
    mocks.getRunStatus.mockResolvedValue(completedSnapshot());
    mocks.listMessages.mockRejectedValue(new Error('HTTP 503'));
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        state: useAgentState(),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('验证最终快照失败');
    });

    const streamOptions = mocks.streamAgentRun.mock.calls[0][0] as StreamAgentRunOptions;
    const terminal = completedEvent(1);
    await act(async () => {
      streamOptions.callbacks.onEvent(terminal, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: terminal.eventId,
        connectionGeneration: 1,
      });
      streamOptions.callbacks.onTerminal?.(terminal, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: terminal.eventId,
        connectionGeneration: 1,
      });
      await vi.runAllTimersAsync();
    });

    expect(mocks.listMessages).toHaveBeenCalledTimes(3);
    expect(hook.result.current.state.runs.byId.run_1).toMatchObject({
      status: 'COMPLETED',
      needsFinalSnapshot: true,
      finalSnapshotError: '最终快照同步失败：HTTP 503。当前回答与引用可能不完整。',
    });
    expect(hook.result.current.state.loadsByConversation.cm_1).toMatchObject({
      messagesStatus: 'error',
      error: 'HTTP 503',
    });
    hook.unmount();
  });

  it('流异常断开后 REST 已收敛终态时，仍通过权威快照补齐最终消息', async () => {
    vi.useFakeTimers();
    let rejectStream: ((error: Error) => void) | undefined;
    mocks.streamAgentRun.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectStream = reject;
        })
    );
    mocks.getRunStatus.mockResolvedValue(completedSnapshot());
    mocks.listMessages
      .mockResolvedValueOnce({ items: [], nextBeforeMessageId: null })
      .mockResolvedValueOnce({ items: [finalAssistantMessage()], nextBeforeMessageId: null });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        state: useAgentState(),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('验证断线后终态收敛');
    });

    await act(async () => {
      rejectStream?.(new Error('流连接已断开'));
      await vi.runAllTimersAsync();
    });

    expect(mocks.getRunStatus).toHaveBeenCalledWith({ runId: 'run_1' });
    expect(mocks.listMessages).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.messages.byId.msg_assistant_1).toMatchObject({
      status: 'COMPLETED',
      contentText: '权威最终研究结论',
      modelName: 'gpt-5.6-sol',
      citations: [expect.objectContaining({ citationId: 'citation_1' })],
    });
    expect(hook.result.current.state.runs.byId.run_1).toMatchObject({
      status: 'COMPLETED',
      needsFinalSnapshot: false,
      finalSnapshotError: null,
    });
    hook.unmount();
  });

  it('组件卸载时取消终态快照重试，不继续请求或回写旧会话', async () => {
    vi.useFakeTimers();
    mocks.getRunStatus.mockResolvedValue(completedSnapshot());
    mocks.listMessages.mockResolvedValue({ items: [], nextBeforeMessageId: null });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('验证卸载取消重试');
    });

    const streamOptions = mocks.streamAgentRun.mock.calls[0][0] as StreamAgentRunOptions;
    const terminal = completedEvent(1);
    await act(async () => {
      streamOptions.callbacks.onEvent(terminal, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: terminal.eventId,
        connectionGeneration: 1,
      });
      streamOptions.callbacks.onTerminal?.(terminal, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: terminal.eventId,
        connectionGeneration: 1,
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.listMessages).toHaveBeenCalledTimes(1);

    hook.unmount();
    await vi.runAllTimersAsync();

    expect(mocks.listMessages).toHaveBeenCalledTimes(1);
  });

  it('显式停止先查询权威状态，再携带最新 statusVersion 调用 cancelRun', async () => {
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('比较估值');
    });
    await act(async () => {
      await hook.result.current.runner.cancel();
    });

    expect(mocks.getRunStatus).toHaveBeenCalledWith({ runId: 'run_1' });
    expect(mocks.cancelRun).toHaveBeenCalledWith({ runId: 'run_1', expectedStatusVersion: 2 });
    hook.unmount();
  });

  it('页面刷新发现运行中任务时，从客户端尚未应用事件的起点重放', async () => {
    mocks.getRunStatus.mockResolvedValue(runningSnapshot(7));
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        state: useAgentState(),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );

    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
      hook.result.current.dispatch({
        type: 'RUN_DISCOVERED',
        runId: 'run_1',
        conversationId: 'cm_1',
        assistantMessageId: 'msg_assistant_1',
        status: 'RUNNING',
        statusVersion: 1,
      });
    });

    await waitFor(() => expect(mocks.streamAgentRun).toHaveBeenCalledTimes(1));
    expect(mocks.streamAgentRun.mock.calls[0][0]).toMatchObject({
      runId: 'run_1',
      afterSequence: 0,
    });
    expect(hook.result.current.state.runs.byId.run_1).toMatchObject({
      latestEventSequence: 0,
      latestPersistedEventSequence: 7,
    });
    hook.unmount();
  });

  it('断线刷新服务端水位后，继续接收仍从最后已应用事件续接', async () => {
    mocks.getRunStatus.mockResolvedValue(runningSnapshot(5));
    let firstStreamOptions: StreamAgentRunOptions | undefined;
    let rejectFirstStream: ((error: Error) => void) | undefined;
    mocks.streamAgentRun.mockImplementationOnce(
      (options: StreamAgentRunOptions) =>
        new Promise((_resolve, reject) => {
          firstStreamOptions = options;
          rejectFirstStream = reject;
        })
    );

    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        state: useAgentState(),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('分析断线恢复');
    });

    const event = reasoningEvent(1);
    act(() => {
      firstStreamOptions?.callbacks.onEvent(event, {
        runId: 'run_1',
        lastAppliedSequence: 1,
        lastEventId: event.eventId,
        connectionGeneration: 1,
      });
    });
    expect(hook.result.current.state.runs.byId.run_1.latestEventSequence).toBe(1);

    await act(async () => {
      rejectFirstStream?.(new Error('流连接已断开'));
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    await waitFor(() => {
      expect(hook.result.current.state.runs.byId.run_1).toMatchObject({
        connectionState: 'PAUSED',
        latestEventSequence: 1,
        latestPersistedEventSequence: 5,
      });
    });

    act(() => {
      hook.result.current.runner.continueReceiving();
    });
    await waitFor(() => expect(mocks.streamAgentRun).toHaveBeenCalledTimes(2));
    expect(mocks.streamAgentRun.mock.calls[1][0]).toMatchObject({
      runId: 'run_1',
      afterSequence: 1,
      lastEventId: 'evt_reasoning_1',
    });
    hook.unmount();
  });

  it('取消遇到 statusVersion 冲突时刷新权威状态并只重试一次', async () => {
    mocks.getRunStatus
      .mockResolvedValueOnce(runningSnapshot(2))
      .mockResolvedValueOnce(runningSnapshot(3));
    mocks.cancelRun
      .mockRejectedValueOnce(new Error('Agent Run statusVersion 冲突'))
      .mockResolvedValueOnce({
        runId: 'run_1',
        status: 'CANCEL_REQUESTED',
        statusVersion: 4,
        cancellationAccepted: true,
      });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
    });
    await act(async () => {
      await hook.result.current.runner.send('比较估值');
    });
    await act(async () => {
      await hook.result.current.runner.cancel();
    });

    expect(mocks.cancelRun.mock.calls).toEqual([
      [{ runId: 'run_1', expectedStatusVersion: 2 }],
      [{ runId: 'run_1', expectedStatusVersion: 3 }],
    ]);
    hook.unmount();
  });

  it('深链会话尚未加载时保留输入，不以 AUTO 策略误发', async () => {
    const hook = renderHook(() => useAgentRun('cm_1'), { wrapper });
    let accepted = true;
    await act(async () => {
      accepted = await hook.result.current.send('立即发送');
    });

    expect(accepted).toBe(false);
    expect(hook.result.current.commandError).toBe('会话尚未加载完成');
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it('失败 Run 可安全重试时续跑检查点，不重新执行完整研究', async () => {
    mocks.getRunStatus.mockResolvedValue(failedSnapshot(true));
    mocks.retryRun.mockResolvedValue({
      conversationId: 'cm_1',
      sourceRunId: 'run_failed',
      assistantMessageId: 'msg_retry',
      runId: 'run_retry',
      runStatus: 'QUEUED',
      retryMode: 'SAFE_CHECKPOINT',
      streamEndpoint: '/api/agent/runs/events',
    });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
      loadAssistantMessage(hook.result.current.dispatch, 'FAILED');
    });

    let accepted = false;
    await act(async () => {
      accepted = await hook.result.current.runner.regenerate('msg_failed');
    });

    expect(accepted).toBe(true);
    expect(mocks.getRunStatus).toHaveBeenCalledWith({ runId: 'run_failed' });
    expect(mocks.retryRun).toHaveBeenCalledWith({
      clientRequestId: expect.any(String),
      runId: 'run_failed',
    });
    expect(mocks.regenerateMessage).not.toHaveBeenCalled();
    expect(mocks.streamAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run_retry' })
    );
    hook.unmount();
  });

  it('失败 Run 不可安全重试时才回退到完整重新生成', async () => {
    mocks.getRunStatus.mockResolvedValue(failedSnapshot(false));
    mocks.regenerateMessage.mockResolvedValue({
      conversationId: 'cm_1',
      sourceMessageId: 'msg_failed',
      assistantMessageId: 'msg_regenerated',
      runId: 'run_regenerated',
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
      loadAssistantMessage(hook.result.current.dispatch, 'FAILED');
    });

    await act(async () => {
      await hook.result.current.runner.regenerate('msg_failed');
    });

    expect(mocks.getRunStatus).toHaveBeenCalledWith({ runId: 'run_failed' });
    expect(mocks.regenerateMessage).toHaveBeenCalledWith({
      clientRequestId: expect.any(String),
      messageId: 'msg_failed',
      modelPolicy: 'AUTO',
    });
    expect(mocks.retryRun).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('已完成回答仍执行完整重新生成，不查询失败 Run 状态', async () => {
    mocks.regenerateMessage.mockResolvedValue({
      conversationId: 'cm_1',
      sourceMessageId: 'msg_failed',
      assistantMessageId: 'msg_regenerated',
      runId: 'run_regenerated',
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    });
    const hook = renderHook(
      () => ({
        runner: useAgentRun('cm_1'),
        dispatch: useAgentDispatch(),
      }),
      { wrapper }
    );
    act(() => {
      hook.result.current.dispatch({ type: 'CONVERSATION_CREATED', conversation: conversation() });
      loadAssistantMessage(hook.result.current.dispatch, 'COMPLETED');
    });

    await act(async () => {
      await hook.result.current.runner.regenerate('msg_failed');
    });

    expect(mocks.regenerateMessage).toHaveBeenCalledWith({
      clientRequestId: expect.any(String),
      messageId: 'msg_failed',
      modelPolicy: 'AUTO',
    });
    expect(mocks.getRunStatus).not.toHaveBeenCalled();
    expect(mocks.retryRun).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('新建会话将手动模型偏好同时传给创建和首条消息', async () => {
    mocks.createConversation.mockResolvedValue({
      conversationId: 'cm_new',
      status: 'ACTIVE',
      createdAt: '2026-08-07T01:00:00.000Z',
    });
    mocks.sendMessage.mockResolvedValue({
      conversationId: 'cm_new',
      userMessageId: 'msg_user_new',
      assistantMessageId: 'msg_assistant_new',
      runId: 'run_new',
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    });
    const hook = renderHook(
      () =>
        useAgentRun(null, {
          policy: 'MANUAL',
          preferredModel: 'research-fast-v1',
          reasoningEffort: 'HIGH',
        }),
      { wrapper: newConversationWrapper }
    );

    let accepted = false;
    await act(async () => {
      accepted = await hook.result.current.send('分析贵州茅台');
    });

    expect(accepted).toBe(true);
    expect(mocks.createConversation).toHaveBeenCalledWith({
      clientRequestId: expect.any(String),
      title: '分析贵州茅台',
      modelPolicy: 'MANUAL',
      preferredModel: 'research-fast-v1',
      reasoningEffort: 'HIGH',
      researchDepth: 'STANDARD',
      answerDetail: 'STANDARD',
    });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'cm_new',
        modelPolicy: 'MANUAL',
      })
    );
    hook.unmount();
  });
});
