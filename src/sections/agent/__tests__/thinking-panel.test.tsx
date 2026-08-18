import type { ReactNode, ComponentType } from 'react';

import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

import { ThinkingPanel } from '../components/thinking-panel';

import type {
  AgentRunEvent,
  AgentRunProjection,
  AgentReasoningDeltaEvent,
} from '../state/agent-state.types';

const mocks = vi.hoisted(() => ({
  events: [] as AgentRunEvent[],
  tools: [] as Array<Record<string, unknown>>,
}));

const virtuosoMocks = vi.hoisted(() => ({
  windowStart: 0,
  timelineDataLength: 0,
  toolDataLength: 0,
  atBottomStateChange: null as ((atBottom: boolean) => void) | null,
  manualScrollAway: null as (() => void) | null,
  autoscrollToBottom: vi.fn(),
}));

vi.mock('react-virtuoso', async () => {
  const React = await import('react');
  type MockProps = {
    data?: Array<{ type?: string; key?: string }>;
    itemContent: (index: number, item: { type?: string; key?: string }) => ReactNode;
    components?: { Scroller?: ComponentType<Record<string, unknown>> };
    context?: { onManualScrollAway?: () => void };
    atBottomStateChange?: (atBottom: boolean) => void;
    style?: React.CSSProperties;
  };
  const Virtuoso = React.forwardRef<{ autoscrollToBottom: () => void }, MockProps>(
    ({ data = [], itemContent, components, context, atBottomStateChange, style }, ref) => {
      const isTimeline = data[0]?.type === 'REASONING' || data[0]?.type === 'EVENT';
      if (isTimeline) {
        virtuosoMocks.timelineDataLength = data.length;
        virtuosoMocks.atBottomStateChange = atBottomStateChange ?? null;
        virtuosoMocks.manualScrollAway = context?.onManualScrollAway ?? null;
      } else {
        virtuosoMocks.toolDataLength = data.length;
      }
      React.useImperativeHandle(ref, () => ({
        autoscrollToBottom: virtuosoMocks.autoscrollToBottom,
      }));
      const Scroller = components?.Scroller ?? 'div';
      const start = virtuosoMocks.windowStart;
      return (
        <Scroller
          data-testid={isTimeline ? 'timeline-virtuoso' : 'tool-virtuoso'}
          style={{ height: style?.height, overflowY: 'auto' }}
        >
          {data.slice(start, start + 30).map((item, index) => (
            <React.Fragment key={item.key ?? start + index}>
              {itemContent(start + index, item)}
            </React.Fragment>
          ))}
        </Scroller>
      );
    }
  );
  Virtuoso.displayName = 'MockVirtuoso';
  return { Virtuoso };
});

vi.mock('../hooks/use-agent-run-events', () => ({
  useAgentRunEvents: () => ({
    items: mocks.events,
    loaded: true,
    loading: false,
    error: null,
    partial: false,
    nextAfterSequence: null,
  }),
}));

vi.mock('../hooks/use-agent-tool-calls', () => ({
  useAgentToolCalls: () => ({
    items: mocks.tools,
    loading: false,
    error: null,
    partial: false,
  }),
}));

function reasoning(delta: string, sequence = 1): AgentReasoningDeltaEvent {
  return {
    schemaVersion: '1.0',
    eventId: `evt_${sequence}_${delta}`,
    sequence,
    type: 'model.reasoning.delta',
    runId: 'run_1',
    conversationId: 'cm_1',
    messageId: 'msg_1',
    occurredAt: '2026-08-16T01:00:00.000Z',
    traceId: 'trace_1',
    payload: { modelCallId: 'call_1', attempt: 1, kind: 'FULL', delta },
  };
}

function toolStarted(sequence: number): AgentRunEvent {
  return {
    schemaVersion: '1.0',
    eventId: `evt_tool_${sequence}`,
    sequence,
    type: 'tool.started',
    runId: 'run_1',
    conversationId: 'cm_1',
    messageId: 'msg_1',
    occurredAt: '2026-08-16T01:00:01.000Z',
    traceId: 'trace_1',
    payload: {
      toolCallId: 'tool_1',
      toolName: 'get_stock_overview',
      toolDisplayName: '个股基础数据',
      inputSummary: '查询 600519.SH',
      attempt: 1,
    },
  };
}

function persistedTool(index: number) {
  return {
    toolCallId: `tool_${index}`,
    reusedFromRunId: null,
    toolName: `get_stock_overview_${index}`,
    toolDisplayName: `研究工具 ${index}`,
    toolVersion: '1',
    status: 'SUCCEEDED',
    attemptCount: 1,
    inputSummary: { symbol: '600519.SH' },
    outputSummary: { rowCount: 1 },
    errorCode: null,
    errorMessage: null,
    durationMs: 20,
    dataAsOf: null,
    dataThrough: null,
    startedAt: '2026-08-16T01:00:01.000Z',
    finishedAt: '2026-08-16T01:00:01.020Z',
  };
}

function longTimeline(total: number): AgentRunEvent[] {
  return Array.from({ length: total }, (_, index) => {
    const sequence = index + 1;
    return sequence % 2 === 0 ? toolStarted(sequence) : reasoning(`推理 ${sequence}`, sequence);
  });
}

function fixtureEvent(type: AgentRunEvent['type'], sequence: number): AgentRunEvent {
  const value = AGENT_EVENT_FIXTURES.find((event) => event.type === type);
  if (!value) throw new Error(`缺少事件 fixture: ${type}`);
  return {
    ...value,
    eventId: `evt_fixture_${sequence}`,
    sequence,
    runId: 'run_1',
    conversationId: 'cm_1',
    messageId: 'msg_1',
  } as AgentRunEvent;
}

function run(): AgentRunProjection {
  return {
    runId: 'run_1',
    conversationId: 'cm_1',
    assistantMessageId: 'msg_1',
    status: 'RUNNING',
    statusVersion: 2,
    canCancel: true,
    currentStep: null,
    latestEventSequence: 1,
    latestPersistedEventSequence: 1,
    connectionGeneration: 1,
    connectionState: 'OPEN',
    reconnects: 0,
    stageLabel: '模型正在思考',
    needsFinalSnapshot: false,
    cancelRequested: false,
  };
}

describe('ThinkingPanel', () => {
  beforeEach(() => {
    mocks.events = [];
    mocks.tools = [];
    virtuosoMocks.windowStart = 0;
    virtuosoMocks.timelineDataLength = 0;
    virtuosoMocks.toolDataLength = 0;
    virtuosoMocks.atBottomStateChange = null;
    virtuosoMocks.manualScrollAway = null;
    virtuosoMocks.autoscrollToBottom.mockReset();
  });

  it('运行中默认展开并按纯文本连续展示供应商推理', () => {
    mocks.events = [reasoning('<script>不是 HTML</script>')];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /正在思考/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByLabelText('模型思考与工具轨迹')).toHaveTextContent(
      '<script>不是 HTML</script>'
    );
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('完成态默认折叠，用户展开后仍能回看完整过程', async () => {
    mocks.events = [reasoning('完成后保留的推理文本')];
    const { user } = renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={3}
        messageStatus="COMPLETED"
        run={{ ...run(), status: 'COMPLETED', canCancel: false }}
        onContinue={vi.fn()}
      />
    );

    const summary = screen.getByRole('button', { name: /思考过程/ });
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    await user.click(summary);
    expect(summary).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('完成后保留的推理文本')).toBeInTheDocument();
  });

  it('旧运行只有字符计数时不再把计数冒充思考内容', async () => {
    mocks.events = [fixtureEvent('model.activity', 1)];
    const { user } = renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={3}
        messageStatus="COMPLETED"
        run={{ ...run(), status: 'COMPLETED', canCancel: false }}
        onContinue={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /思考过程/ }));

    expect(screen.queryByText(/已处理 .* 个字符/)).not.toBeInTheDocument();
    expect(
      screen.getByText('本次运行未保存思考正文，字符计数无法还原为内容。')
    ).toBeInTheDocument();
  });

  it('按 sequence 在同一时间线交错展示推理与工具事件', () => {
    mocks.events = [reasoning('第一段推理', 1), toolStarted(2), reasoning('第二段推理', 3)];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    const timeline = screen.getByLabelText('模型思考与工具轨迹');
    const text = timeline.textContent ?? '';
    expect(text.indexOf('第一段推理')).toBeLessThan(text.indexOf('调用工具'));
    expect(text.indexOf('调用工具')).toBeLessThan(text.indexOf('第二段推理'));
  });

  it('在同一时间线展示进度、上下文整理和模型诊断事件', () => {
    mocks.events = [
      fixtureEvent('agent.progress', 1),
      fixtureEvent('context.compaction.started', 2),
      fixtureEvent('context.compaction.completed', 3),
      fixtureEvent('model.started', 4),
      fixtureEvent('model.trace', 5),
      fixtureEvent('model.activity', 6),
      reasoning('供应商可见推理', 7),
    ];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    const timeline = screen.getByLabelText('模型思考与工具轨迹');
    expect(timeline).toHaveTextContent('整理历史上下文');
    expect(timeline).toHaveTextContent('历史上下文整理完成');
    expect(timeline).toHaveTextContent('模型请求已发送');
    expect(timeline).not.toHaveTextContent('已处理');
    expect(timeline).toHaveTextContent('供应商可见推理');
  });

  it('以实时事件覆盖同一工具的陈旧持久状态', () => {
    mocks.tools = [
      {
        toolCallId: 'tool_1',
        reusedFromRunId: null,
        toolName: 'get_stock_overview',
        toolDisplayName: '个股基础数据',
        toolVersion: '1',
        status: 'RUNNING',
        attemptCount: 1,
        inputSummary: { symbol: '600519.SH' },
        outputSummary: null,
        errorCode: null,
        errorMessage: null,
        durationMs: null,
        dataAsOf: null,
        dataThrough: null,
        startedAt: '2026-08-16T01:00:01.000Z',
        finishedAt: null,
      },
    ];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={{
          ...run(),
          toolActivities: [
            {
              toolCallId: 'tool_1',
              toolName: 'get_stock_overview',
              status: 'COMPLETED',
              attempt: 1,
              durationMs: 120,
              outputSummary: '已返回行情',
            },
          ],
        }}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.queryByText('执行中')).not.toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('已返回行情')).toBeInTheDocument();
  });

  it.each([
    ['COMPLETED', 'RUNNING'],
    ['COMPLETED', 'FAILED'],
    ['FAILED', 'RUNNING'],
    ['FAILED', 'FAILED'],
    ['CANCELLED', 'RUNNING'],
    ['CANCELLED', 'FAILED'],
  ] as const)(
    '%s 终态以持久 ToolCall 为准，不受陈旧 %s 实时状态覆盖',
    async (messageStatus, liveStatus) => {
      mocks.tools = [persistedTool(1)];
      const terminalRun = {
        ...run(),
        status: messageStatus,
        canCancel: false,
      };
      const props = {
        runId: 'run_1',
        statusVersion: 3,
        messageStatus,
        onContinue: vi.fn(),
      };
      const activity =
        liveStatus === 'RUNNING'
          ? {
              toolCallId: 'tool_1',
              toolName: 'get_stock_overview' as const,
              status: 'RUNNING' as const,
              attempt: 2,
            }
          : {
              toolCallId: 'tool_1',
              toolName: 'get_stock_overview' as const,
              status: 'FAILED' as const,
              attempt: 2,
              error: {
                code: 6007,
                message: '陈旧失败状态',
                retryable: true,
                category: 'TOOL',
              },
              willRetry: true,
            };
      const { user } = renderWithProviders(
        <ThinkingPanel
          {...props}
          run={{
            ...terminalRun,
            toolActivities: [activity],
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: /思考过程/ }));
      expect(screen.getByText('成功')).toBeInTheDocument();
      expect(screen.queryByText('执行中')).not.toBeInTheDocument();
      expect(screen.queryByText('失败，准备重试')).not.toBeInTheDocument();
      expect(screen.queryByText('陈旧失败状态')).not.toBeInTheDocument();
    }
  );

  it('终态不展示没有持久记录的陈旧 live-only Tool', async () => {
    const { user } = renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={3}
        messageStatus="COMPLETED"
        run={{
          ...run(),
          status: 'COMPLETED',
          canCancel: false,
          toolActivities: [
            {
              toolCallId: 'tool_live_only',
              toolName: 'get_stock_overview',
              status: 'RUNNING',
              attempt: 1,
            },
          ],
        }}
        onContinue={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /思考过程/ }));
    expect(screen.getByText('此次运行没有工具调用')).toBeInTheDocument();
    expect(screen.queryByText('正在执行')).not.toBeInTheDocument();
  });

  it('展示 checkpoint 精确复用的上游工具，不显示空调用文案', () => {
    mocks.tools = [{ ...persistedTool(1), reusedFromRunId: 'run_source_1' }];
    renderWithProviders(
      <ThinkingPanel
        runId="run_retry_1"
        statusVersion={4}
        messageStatus="COMPLETED"
        run={{ ...run(), runId: 'run_retry_1', status: 'COMPLETED', canCancel: false }}
        onContinue={vi.fn()}
      />
    );

    expect(screen.queryByText('此次运行没有工具调用')).not.toBeInTheDocument();
    expect(screen.getByText('从上一轮复用')).toBeInTheDocument();
    expect(screen.getByText(/1 个工具/)).toBeInTheDocument();
  });

  it('超过 10,000 条轨迹时使用窗口化且 DOM 行数有界', () => {
    mocks.events = longTimeline(10_001);
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    expect(virtuosoMocks.timelineDataLength).toBe(10_001);
    expect(screen.getAllByTestId('thinking-timeline-row').length).toBeLessThan(100);
    expect(screen.getByTestId('timeline-virtuoso')).toHaveAttribute(
      'aria-label',
      '模型思考与工具轨迹'
    );
  });

  it('连续超长 reasoning 拆为 continuation 行但只计为一段推理', () => {
    mocks.events = [reasoning('思'.repeat(70_000))];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('thinking-timeline-row')).toHaveLength(3);
    expect(screen.getByText(/1 段推理/)).toBeInTheDocument();
    expect(screen.getAllByText('思考（续）')).toHaveLength(2);
  });

  it('continuation 边界不拆断 UTF-16 surrogate pair 且全文精确', () => {
    const first = 'a'.repeat(32 * 1024 - 1);
    mocks.events = [reasoning(first, 1), reasoning('😀b', 2)];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    const chunks = screen
      .getAllByTestId('thinking-reasoning-text')
      .map((element) => element.textContent ?? '');
    expect(chunks).toHaveLength(2);
    expect(chunks.join('')).toBe(`${first}😀b`);
    expect(chunks[0]?.endsWith('\ud83d')).toBe(false);
    expect(chunks[1]?.startsWith('\ude00')).toBe(false);
  });

  it('reasoning 总文本超过阈值时即使行数较少也启用窗口化', () => {
    mocks.events = [reasoning('思'.repeat(200_000))];
    renderWithProviders(
      <ThinkingPanel
        runId="run_1"
        statusVersion={2}
        messageStatus="STREAMING"
        run={run()}
        onContinue={vi.fn()}
      />
    );

    expect(virtuosoMocks.timelineDataLength).toBe(7);
    expect(screen.getByTestId('timeline-virtuoso')).toBeInTheDocument();
    expect(screen.getByText(/1 段推理/)).toBeInTheDocument();
  });

  it('窗口时间线运行时跟随末尾，用户上滚后不再强拉', async () => {
    mocks.events = longTimeline(81);
    const props = {
      runId: 'run_1',
      statusVersion: 2,
      messageStatus: 'STREAMING' as const,
      run: run(),
      onContinue: vi.fn(),
    };
    const { user } = renderWithProviders(<ThinkingPanel {...props} />);
    const initialScrollCalls = virtuosoMocks.autoscrollToBottom.mock.calls.length;
    const summary = screen.getByRole('button', { name: /正在思考/ });

    act(() => virtuosoMocks.manualScrollAway?.());
    mocks.events = [...mocks.events, toolStarted(82)];
    await user.click(summary);
    await user.click(summary);
    expect(virtuosoMocks.autoscrollToBottom).toHaveBeenCalledTimes(initialScrollCalls);

    act(() => virtuosoMocks.atBottomStateChange?.(true));
    mocks.events = [...mocks.events, reasoning('最新推理', 83)];
    await user.click(summary);
    await user.click(summary);
    expect(virtuosoMocks.autoscrollToBottom.mock.calls.length).toBeGreaterThan(initialScrollCalls);
  });

  it('超过 1,000 个工具卡时使用窗口化且保留卸载项展开状态', async () => {
    mocks.tools = Array.from({ length: 1_001 }, (_, index) => persistedTool(index));
    const props = {
      runId: 'run_1',
      statusVersion: 2,
      messageStatus: 'STREAMING' as const,
      run: run(),
      onContinue: vi.fn(),
    };
    const { user } = renderWithProviders(<ThinkingPanel {...props} />);

    expect(virtuosoMocks.toolDataLength).toBe(1_001);
    expect(screen.getAllByTestId('thinking-tool-row').length).toBeLessThan(100);
    const firstTool = screen.getByRole('button', { name: /研究工具 0/ });
    virtuosoMocks.windowStart = 100;
    await user.click(firstTool);
    expect(screen.queryByRole('button', { name: /研究工具 0/ })).not.toBeInTheDocument();

    virtuosoMocks.windowStart = 0;
    await user.click(screen.getByRole('button', { name: /研究工具 100/ }));
    expect(screen.getByRole('button', { name: /研究工具 0/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
