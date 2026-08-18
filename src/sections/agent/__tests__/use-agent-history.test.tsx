import type { AgentResponse } from 'src/api/agent';
import type { AgentSseEvent } from 'src/types/agent/generated';

import { waitFor, renderHook } from '@testing-library/react';

import { agentApi } from 'src/api/agent';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

import { useAgentRunEvents } from '../hooks/use-agent-run-events';
import { useAgentToolCalls } from '../hooks/use-agent-tool-calls';
import { AGENT_THINKING_EVENT_TYPES } from '../state/agent-state.types';

import type { AgentThinkingEvent } from '../state/agent-state.types';

function event(
  sequence: number
): Extract<AgentSseEvent, { type: 'model.reasoning.delta' }> {
  const fixture = AGENT_EVENT_FIXTURES.find((item) => item.type === 'model.reasoning.delta');
  if (!fixture) throw new Error('缺少 model.reasoning.delta fixture');
  return {
    ...fixture,
    eventId: `evt_${sequence}`,
    sequence,
    runId: 'run_1',
    conversationId: 'cm_1',
  } as Extract<AgentSseEvent, { type: 'model.reasoning.delta' }>;
}

function toolCall(id: string) {
  return {
    toolCallId: id,
    toolName: 'get_stock_overview',
    toolDisplayName: '个股基础数据',
    toolVersion: '1.0.0',
    status: 'SUCCEEDED' as const,
    attemptCount: 1,
    inputSummary: { tsCode: '600519.SH' },
    outputSummary: { rowCount: 1 },
    errorCode: null,
    errorMessage: null,
    durationMs: 20,
    dataAsOf: null,
    dataThrough: null,
    startedAt: '2026-08-16T01:00:00.000Z',
    finishedAt: '2026-08-16T01:00:00.020Z',
  } satisfies AgentResponse<'/agent/runs/tool-calls/list'>['items'][number];
}

describe('Agent Run 历史分页', () => {
  afterEach(() => vi.restoreAllMocks());

  it('自动加载全部 Run 事件页并按 sequence 合并', async () => {
    const request = vi
      .spyOn(agentApi, 'listRunEvents')
      .mockResolvedValueOnce({ items: [event(1)], nextAfterSequence: 1 })
      .mockResolvedValueOnce({ items: [event(2)], nextAfterSequence: null });

    const { result } = renderHook(() => useAgentRunEvents('run_1', 2, true));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items.map((item) => item.sequence)).toEqual([1, 2]);
    expect(result.current.partial).toBe(false);
    expect(request).toHaveBeenNthCalledWith(
      2,
      {
        runId: 'run_1',
        afterSequence: 1,
        limit: 100,
        eventTypes: [...AGENT_THINKING_EVENT_TYPES],
      },
      expect.any(AbortSignal)
    );
  });

  it('跨页按 eventId 去重，并在异常页内顺序下仍保持 sequence 升序', async () => {
    vi.spyOn(agentApi, 'listRunEvents')
      .mockResolvedValueOnce({ items: [event(2), event(1)], nextAfterSequence: 2 })
      .mockResolvedValueOnce({ items: [event(2), event(3)], nextAfterSequence: null });

    const { result } = renderHook(() => useAgentRunEvents('run_1', 2, true));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items.map((item) => item.sequence)).toEqual([1, 2, 3]);
  });

  it('同一事件的历史推理正文不会被旧连接的字符计数覆盖', async () => {
    const reasoning = event(1);
    const activity = {
      ...reasoning,
      type: 'model.activity' as const,
      payload: {
        modelCallId: reasoning.payload.modelCallId,
        phase: 'REASONING' as const,
        processedCharacters: reasoning.payload.delta.length,
      },
    } as AgentSseEvent;
    vi.spyOn(agentApi, 'listRunEvents').mockResolvedValueOnce({
      items: [reasoning],
      nextAfterSequence: null,
    });

    const { result } = renderHook(() =>
      useAgentRunEvents('run_1', 2, true, [activity as unknown as AgentThinkingEvent])
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual([reasoning]);
  });

  it('超过 10,000 条后仍加载到事件末页且保留尾事件', async () => {
    const total = 10_001;
    const request = vi.spyOn(agentApi, 'listRunEvents').mockImplementation(async (input) => {
      const firstSequence = (input.afterSequence ?? 0) + 1;
      const lastSequence = Math.min(total, firstSequence + 99);
      return {
        items: Array.from(
          { length: lastSequence - firstSequence + 1 },
          (_, index) => event(firstSequence + index)
        ),
        nextAfterSequence: lastSequence < total ? lastSequence : null,
      };
    });

    const { result } = renderHook(() => useAgentRunEvents('run_1', 2, true));

    await waitFor(() => expect(result.current.loaded).toBe(true), { timeout: 10_000 });
    expect(result.current.items).toHaveLength(total);
    expect(result.current.items.at(-1)?.eventId).toBe(`evt_${total}`);
    expect(result.current.partial).toBe(false);
    expect(request).toHaveBeenCalledTimes(101);
  });

  it('Run 事件分页游标循环时停止请求并保留 partial 内容', async () => {
    const request = vi
      .spyOn(agentApi, 'listRunEvents')
      .mockResolvedValueOnce({ items: [event(1)], nextAfterSequence: 1 })
      .mockResolvedValueOnce({ items: [event(2)], nextAfterSequence: 1 });

    const { result } = renderHook(() => useAgentRunEvents('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.sequence)).toEqual([1, 2]);
    expect(result.current.partial).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('Run 事件后续页失败时保留已加载内容并标记 partial', async () => {
    vi.spyOn(agentApi, 'listRunEvents')
      .mockResolvedValueOnce({ items: [event(1)], nextAfterSequence: 1 })
      .mockRejectedValueOnce(new Error('历史页暂不可用'));

    const { result } = renderHook(() => useAgentRunEvents('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.sequence)).toEqual([1]);
    expect(result.current.error).toBe('历史页暂不可用');
    expect(result.current.partial).toBe(true);
  });

  it('长历史逐页展示，并在折叠后保留已完成缓存', async () => {
    let resolveLastPage: (value: { items: AgentSseEvent[]; nextAfterSequence: null }) => void = () => undefined;
    const lastPage = new Promise<{ items: AgentSseEvent[]; nextAfterSequence: null }>((resolve) => {
      resolveLastPage = resolve;
    });
    const request = vi
      .spyOn(agentApi, 'listRunEvents')
      .mockResolvedValueOnce({ items: [event(1)], nextAfterSequence: 1 })
      .mockReturnValueOnce(lastPage);

    const { result, rerender } = renderHook(
      ({ enabled }) => useAgentRunEvents('run_1', 2, enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.items.map((item) => item.sequence)).toEqual([1]));
    expect(result.current.loading).toBe(true);
    resolveLastPage({ items: [event(2)], nextAfterSequence: null });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    rerender({ enabled: false });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ enabled: true });
    expect(result.current.items.map((item) => item.sequence)).toEqual([1, 2]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('历史响应缺少游标时显式报错，不把缺页误判成完整历史', async () => {
    vi.spyOn(agentApi, 'listRunEvents').mockResolvedValueOnce(
      { items: [event(1)] } as unknown as AgentResponse<'/agent/runs/events/list'>
    );

    const { result } = renderHook(() => useAgentRunEvents('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Run 事件历史游标无效');
    expect(result.current.items).toEqual([]);
    expect(result.current.partial).toBe(false);
  });

  it('自动加载全部 Tool Call 页，不截断首 50 条', async () => {
    const request = vi
      .spyOn(agentApi, 'listToolCalls')
      .mockResolvedValueOnce({ items: [toolCall('tool_1')], nextCursor: 'cursor_1', payloadIncluded: false })
      .mockResolvedValueOnce({ items: [toolCall('tool_2')], nextCursor: null, payloadIncluded: false });

    const { result } = renderHook(() => useAgentToolCalls('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.toolCallId)).toEqual(['tool_1', 'tool_2']);
    expect(result.current.partial).toBe(false);
    expect(request).toHaveBeenNthCalledWith(
      2,
      { runId: 'run_1', cursor: 'cursor_1', limit: 100, includePayload: false },
      expect.any(AbortSignal)
    );
  });

  it('超过 1,000 条后仍加载到 Tool 末页且保留尾记录', async () => {
    const total = 1_001;
    const request = vi.spyOn(agentApi, 'listToolCalls').mockImplementation(async (input) => {
      const page = input.cursor ? Number(input.cursor.slice('cursor_'.length)) : 0;
      const first = page * 100;
      const last = Math.min(total, first + 100);
      return {
        items: Array.from({ length: last - first }, (_, index) =>
          toolCall(`tool_${first + index + 1}`)
        ),
        nextCursor: last < total ? `cursor_${page + 1}` : null,
        payloadIncluded: false,
      };
    });

    const { result } = renderHook(() => useAgentToolCalls('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5_000 });
    expect(result.current.items).toHaveLength(total);
    expect(result.current.items.at(-1)?.toolCallId).toBe(`tool_${total}`);
    expect(result.current.partial).toBe(false);
    expect(request).toHaveBeenCalledTimes(11);
  });

  it('Tool 游标循环时停止请求并保留 partial 内容', async () => {
    const request = vi
      .spyOn(agentApi, 'listToolCalls')
      .mockResolvedValueOnce({
        items: [toolCall('tool_1')],
        nextCursor: 'cursor_1',
        payloadIncluded: false,
      })
      .mockResolvedValueOnce({
        items: [toolCall('tool_2')],
        nextCursor: 'cursor_1',
        payloadIncluded: false,
      });

    const { result } = renderHook(() => useAgentToolCalls('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.toolCallId)).toEqual(['tool_1', 'tool_2']);
    expect(result.current.partial).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('Tool 后续页失败时保留已加载内容并标记 partial', async () => {
    vi.spyOn(agentApi, 'listToolCalls')
      .mockResolvedValueOnce({
        items: [toolCall('tool_1')],
        nextCursor: 'cursor_1',
        payloadIncluded: false,
      })
      .mockRejectedValueOnce(new Error('Tool 历史页暂不可用'));

    const { result } = renderHook(() => useAgentToolCalls('run_1', 2, true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.toolCallId)).toEqual(['tool_1']);
    expect(result.current.error).toBe('Tool 历史页暂不可用');
    expect(result.current.partial).toBe(true);
  });
});
