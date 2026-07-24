import type { ReactNode } from 'react';
import type { StreamAgentRunOptions } from 'src/api/agent-stream';

import { MemoryRouter } from 'react-router';
import { act, waitFor, renderHook } from '@testing-library/react';

import { useAgentRun } from '../hooks/use-agent-run';
import { AgentProvider, useAgentState, useAgentDispatch } from '../state/agent-provider';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  cancelRun: vi.fn(),
  streamAgentRun: vi.fn(),
  getRunStatus: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock('src/api/agent', () => ({
  agentApi: {
    sendMessage: mocks.sendMessage,
    cancelRun: mocks.cancelRun,
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

function conversation() {
  return {
    conversationId: 'cm_1',
    title: '测试会话',
    status: 'ACTIVE' as const,
    modelPolicy: 'AUTO' as const,
    preferredModel: null,
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
    errorCode: null,
    errorMessage: null,
    queuedAt: '2026-07-20T01:00:01.000Z',
    startedAt: '2026-07-20T01:00:02.000Z',
    endedAt: null,
  };
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
    hook.unmount();

    await waitFor(() => expect(streamOptions.signal?.aborted).toBe(true));
    expect(mocks.cancelRun).not.toHaveBeenCalled();
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
});
