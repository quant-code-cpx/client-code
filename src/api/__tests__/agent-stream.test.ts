import type { AgentSseEvent } from 'src/types/agent/generated';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

import { streamAgentRun } from '../agent-stream';
import { tokenStorage, setAuthCallbacks } from '../client';

const encoder = new TextEncoder();
const mockFetch = vi.fn();

function requestPath(url: string): string {
  return new URL(url, 'http://test.local').pathname;
}

function agentEvent(type: AgentSseEvent['type'], sequence: number): AgentSseEvent {
  const fixture = AGENT_EVENT_FIXTURES.find((event) => event.type === type);
  if (!fixture) throw new Error(`Missing fixture for ${type}`);
  return {
    ...fixture,
    eventId: `evt_${sequence}`,
    sequence,
    runId: 'run_fixture',
  } as AgentSseEvent;
}

function sseFrame(event: AgentSseEvent, id = event.eventId): Uint8Array {
  return encoder.encode(
    `id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  );
}

function streamResponse(events: AgentSseEvent[], chunks?: number[]): Response {
  const bytes = events.map((event) => sseFrame(event));
  const source = new Uint8Array(bytes.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  bytes.forEach((chunk) => {
    source.set(chunk, offset);
    offset += chunk.length;
  });

  const parts: Uint8Array[] = [];
  if (chunks) {
    let cursor = 0;
    chunks.forEach((size) => {
      parts.push(source.slice(cursor, cursor + size));
      cursor += size;
    });
    if (cursor < source.length) parts.push(source.slice(cursor));
  } else {
    parts.push(source);
  }

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        parts.forEach((part) => controller.enqueue(part));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } }
  );
}

function callbacks() {
  return {
    onEvent: vi.fn(),
    onConnectionState: vi.fn(),
    onRecoverableError: vi.fn(),
    onTerminal: vi.fn(),
    onTelemetry: vi.fn(),
  };
}

describe('streamAgentRun', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    tokenStorage.clear();
    setAuthCallbacks({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a POST Fetch SSE stream and returns only after a terminal event', async () => {
    tokenStorage.set('stream-token');
    mockFetch.mockResolvedValueOnce(
      streamResponse([agentEvent('message.created', 1), agentEvent('agent.completed', 2)], [1, 2, 5])
    );
    const cb = callbacks();

    const result = await streamAgentRun({ runId: 'run_fixture', callbacks: cb });

    expect(result).toMatchObject({
      status: 'completed',
      reconnects: 0,
      cursor: { lastAppliedSequence: 2, lastEventId: 'evt_2', connectionGeneration: 1 },
    });
    expect(cb.onEvent.mock.calls.map(([event]) => event.type)).toEqual([
      'message.created',
      'agent.completed',
    ]);
    expect(cb.onTerminal).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(requestPath(url)).toBe('/api/agent/runs/events');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      runId: 'run_fixture',
      afterSequence: 0,
      includeReasoning: true,
    });
    const headers = new Headers(init.headers);
    expect(headers.get('Accept')).toBe('text/event-stream');
    expect(headers.get('Authorization')).toBe('Bearer stream-token');
  });

  it.each([
    ['agent.failed', 'failed'],
    ['agent.cancelled', 'cancelled'],
  ] as const)('maps %s to the matching terminal result', async (eventType, expectedStatus) => {
    mockFetch.mockResolvedValueOnce(streamResponse([agentEvent(eventType, 1)]));

    await expect(
      streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() })
    ).resolves.toMatchObject({ status: expectedStatus });
  });

  it('drops duplicate and descending sequences without duplicate business actions', async () => {
    const first = agentEvent('message.created', 1);
    const duplicate = { ...first } as AgentSseEvent;
    mockFetch.mockResolvedValueOnce(
      streamResponse([first, duplicate, agentEvent('agent.completed', 2)])
    );
    const cb = callbacks();

    const result = await streamAgentRun({ runId: 'run_fixture', callbacks: cb });

    expect(result.cursor.lastAppliedSequence).toBe(2);
    expect(cb.onEvent).toHaveBeenCalledTimes(2);
  });

  it('recovers a sequence gap from the last contiguous cursor', async () => {
    mockFetch
      .mockResolvedValueOnce(
        streamResponse([agentEvent('message.created', 1), agentEvent('agent.planning', 3)])
      )
      .mockResolvedValueOnce(
        streamResponse([
          agentEvent('agent.started', 2),
          agentEvent('agent.planning', 3),
          agentEvent('agent.completed', 4),
        ])
      );
    const cb = callbacks();
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await streamAgentRun({
      runId: 'run_fixture',
      callbacks: cb,
      sleep,
      random: () => 0.5,
    });

    expect(result).toMatchObject({ status: 'completed', reconnects: 1 });
    expect(cb.onEvent.mock.calls.map(([event]) => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(cb.onRecoverableError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'SEQUENCE_GAP', retryable: true }),
      expect.objectContaining({ lastAppliedSequence: 1 })
    );
    expect(sleep).toHaveBeenCalledWith(300, undefined);

    const [, retryInit] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(retryInit.body))).toEqual({
      runId: 'run_fixture',
      afterSequence: 1,
      includeReasoning: true,
    });
    expect(new Headers(retryInit.headers).get('Last-Event-ID')).toBe('evt_1');
  });

  it('resumes from Last-Event-ID when the caller does not know its sequence', async () => {
    mockFetch.mockResolvedValueOnce(streamResponse([agentEvent('agent.completed', 8)]));

    const result = await streamAgentRun({
      runId: 'run_fixture',
      lastEventId: 'evt_7',
      callbacks: callbacks(),
    });

    expect(result).toMatchObject({
      status: 'completed',
      cursor: { lastAppliedSequence: 8, lastEventId: 'evt_8' },
    });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Last-Event-ID')).toBe('evt_7');
  });

  it('treats EOF before terminal as recoverable and resumes', async () => {
    mockFetch
      .mockResolvedValueOnce(streamResponse([agentEvent('message.created', 1)]))
      .mockResolvedValueOnce(streamResponse([agentEvent('agent.completed', 2)]));
    const cb = callbacks();

    const result = await streamAgentRun({
      runId: 'run_fixture',
      callbacks: cb,
      sleep: async () => {},
    });

    expect(result.reconnects).toBe(1);
    expect(cb.onRecoverableError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'NETWORK' }),
      expect.objectContaining({ lastAppliedSequence: 1 })
    );
  });

  it('uses the server retry hint for the next recoverable reconnect', async () => {
    const first = agentEvent('message.created', 1);
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          `retry: 2500\nid: ${first.eventId}\nevent: ${first.type}\ndata: ${JSON.stringify(first)}\n\n`,
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
      )
      .mockResolvedValueOnce(streamResponse([agentEvent('agent.completed', 2)]));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await streamAgentRun({
      runId: 'run_fixture',
      callbacks: callbacks(),
      sleep,
      random: () => 0.5,
    });

    expect(sleep).toHaveBeenCalledWith(2500, undefined);
  });

  it('rejects HTTP 200 responses with the wrong media type', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{}', { headers: { 'Content-Type': 'application/json' } })
    );

    await expect(
      streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() })
    ).rejects.toMatchObject({ kind: 'PROTOCOL', retryable: false });
  });

  it('rejects unsupported schema versions with safe protocol metadata', async () => {
    const invalid = {
      ...agentEvent('agent.completed', 1),
      schemaVersion: '2.0',
      traceId: 'trace_safe',
    };
    mockFetch.mockResolvedValueOnce(
      new Response(
        `event: agent.completed\ndata: ${JSON.stringify(invalid)}\n\n`,
        { headers: { 'Content-Type': 'text/event-stream' } }
      )
    );

    await expect(
      streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() })
    ).rejects.toMatchObject({
      kind: 'PROTOCOL',
      safeDetails: {
        schemaVersion: '2.0',
        eventId: 'evt_1',
        traceId: 'trace_safe',
      },
    });
  });

  it('rejects frames whose SSE id differs from the persistent payload eventId', async () => {
    const event = agentEvent('agent.completed', 1);
    mockFetch.mockResolvedValueOnce(
      new Response(sseFrame(event, 'evt_wrong'), {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );

    await expect(
      streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() })
    ).rejects.toMatchObject({ kind: 'PROTOCOL', retryable: false });
  });

  it('requires both SSE id and event fields on business frames', async () => {
    const event = agentEvent('agent.completed', 1);
    const data = JSON.stringify(event);

    for (const frame of [`event: ${event.type}\ndata: ${data}\n\n`, `id: ${event.eventId}\ndata: ${data}\n\n`]) {
      mockFetch.mockResolvedValueOnce(
        new Response(frame, { headers: { 'Content-Type': 'text/event-stream' } })
      );
      await expect(
        streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() })
      ).rejects.toMatchObject({ kind: 'PROTOCOL' });
    }
  });

  it('drops unknown top-level event fields before invoking business callbacks', async () => {
    const event = { ...agentEvent('agent.completed', 1), internalDebug: 'secret' };
    mockFetch.mockResolvedValueOnce(
      new Response(
        `id: ${event.eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        { headers: { 'Content-Type': 'text/event-stream' } }
      )
    );
    const cb = callbacks();

    await streamAgentRun({ runId: 'run_fixture', callbacks: cb });

    expect(cb.onEvent.mock.calls[0][0]).not.toHaveProperty('internalDebug');
  });

  it('refreshes a 401 stream once and replays the POST with the new Bearer token', async () => {
    tokenStorage.set('expired-token');
    mockFetch
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: { accessToken: 'fresh-token' } }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(streamResponse([agentEvent('agent.completed', 1)]));

    const result = await streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() });

    expect(result.status).toBe('completed');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    const [retryUrl, retryInit] = mockFetch.mock.calls[2] as [string, RequestInit];
    expect(requestPath(retryUrl)).toBe('/api/agent/runs/events');
    expect(new Headers(retryInit.headers).get('Authorization')).toBe('Bearer fresh-token');
    expect(JSON.parse(String(retryInit.body))).toEqual({
      runId: 'run_fixture',
      afterSequence: 0,
      includeReasoning: true,
    });
  });

  it('stops without reconnecting when caller aborts and releases the reader', async () => {
    const cancelled = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel: cancelled,
        }),
        { headers: { 'Content-Type': 'text/event-stream' } }
      )
    );
    const controller = new AbortController();
    const cb = callbacks();
    const pending = streamAgentRun({
      runId: 'run_fixture',
      callbacks: cb,
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    controller.abort(new DOMException('route changed', 'AbortError'));

    await expect(pending).resolves.toMatchObject({ status: 'aborted', reconnects: 0 });
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(cb.onConnectionState).toHaveBeenLastCalledWith(
      'ABORTED',
      expect.objectContaining({ connectionGeneration: 1 })
    );
  });

  it('cancels an open network body immediately after receiving a terminal event', async () => {
    const cancelled = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(sseFrame(agentEvent('agent.completed', 1)));
          },
          cancel: cancelled,
        }),
        { headers: { 'Content-Type': 'text/event-stream' } }
      )
    );

    await expect(
      streamAgentRun({ runId: 'run_fixture', callbacks: callbacks() })
    ).resolves.toMatchObject({ status: 'completed' });
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('uses heartbeat activity to keep a slow stream alive', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            const heartbeat = window.setInterval(
              () => controller.enqueue(encoder.encode(': heartbeat\n\n')),
              5
            );
            window.setTimeout(() => {
              window.clearInterval(heartbeat);
              controller.enqueue(sseFrame(agentEvent('agent.completed', 1)));
              controller.close();
            }, 25);
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } }
      )
    );

    const result = await streamAgentRun({
      runId: 'run_fixture',
      callbacks: callbacks(),
      staleMs: 12,
    });

    expect(result).toMatchObject({ status: 'completed', reconnects: 0 });
  });

  it('reconnects after heartbeat timeout and ignores the stale generation', async () => {
    const firstCancelled = vi.fn();
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream<Uint8Array>({
            cancel: firstCancelled,
          }),
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
      )
      .mockResolvedValueOnce(streamResponse([agentEvent('agent.completed', 1)]));
    const cb = callbacks();

    const result = await streamAgentRun({
      runId: 'run_fixture',
      callbacks: cb,
      staleMs: 10,
      sleep: async () => {},
    });

    expect(result).toMatchObject({ status: 'completed', reconnects: 1 });
    expect(firstCancelled).toHaveBeenCalledTimes(1);
    expect(cb.onRecoverableError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'STALE_STREAM' }),
      expect.any(Object)
    );
    expect(cb.onEvent).toHaveBeenCalledTimes(1);
  });

  it('aborts during retry backoff without starting another request', async () => {
    mockFetch.mockResolvedValueOnce(streamResponse([]));
    const controller = new AbortController();
    let releaseSleep: (() => void) | undefined;
    const sleepStarted = new Promise<void>((resolve) => {
      releaseSleep = resolve;
    });
    const sleep = vi.fn((_delay: number, signal?: AbortSignal) => {
      releaseSleep?.();
      return new Promise<void>((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    });
    const pending = streamAgentRun({
      runId: 'run_fixture',
      callbacks: callbacks(),
      signal: controller.signal,
      sleep,
    });
    await sleepStarted;

    controller.abort(new DOMException('route changed', 'AbortError'));

    await expect(pending).resolves.toMatchObject({ status: 'aborted', reconnects: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fails with RETRY_EXHAUSTED after the bounded recovery budget', async () => {
    mockFetch
      .mockResolvedValueOnce(streamResponse([]))
      .mockResolvedValueOnce(streamResponse([]));

    await expect(
      streamAgentRun({
        runId: 'run_fixture',
        callbacks: callbacks(),
        maxRetries: 1,
        sleep: async () => {},
      })
    ).rejects.toMatchObject({
      kind: 'RETRY_EXHAUSTED',
      retryable: false,
      safeDetails: { lastSequence: 0, retryCount: 1 },
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
