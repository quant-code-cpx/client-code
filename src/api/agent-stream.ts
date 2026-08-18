import type { AgentSseEvent } from 'src/types/agent/generated';

import { parseAgentSseEvent } from 'src/types/agent/generated';

import { authenticatedFetch } from './client';
import { parseSseStream } from './sse-parser';
import { AgentClientError, toAgentClientError } from './agent-error';

export type AgentStreamCursor = {
  runId: string;
  lastAppliedSequence: number;
  lastEventId?: string;
  connectionGeneration: number;
};

export type AgentStreamConnectionState =
  | 'CONNECTING'
  | 'OPEN'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED';

export type AgentStreamTelemetry = {
  type: 'connection.open' | 'connection.retry' | 'stream.terminal';
  runId: string;
  generation: number;
  retryCount: number;
  lastSequence: number;
  durationMs?: number;
  terminalType?: AgentSseEvent['type'];
};

export type AgentStreamCallbacks = {
  onEvent: (event: AgentSseEvent, cursor: AgentStreamCursor) => void;
  onConnectionState?: (
    state: AgentStreamConnectionState,
    cursor: AgentStreamCursor
  ) => void;
  onRecoverableError?: (error: AgentClientError, cursor: AgentStreamCursor) => void;
  onTerminal?: (event: AgentSseEvent, cursor: AgentStreamCursor) => void;
  onTelemetry?: (telemetry: AgentStreamTelemetry) => void;
};

export type StreamAgentRunOptions = {
  runId: string;
  afterSequence?: number;
  lastEventId?: string;
  includeReasoning?: boolean;
  signal?: AbortSignal;
  callbacks: AgentStreamCallbacks;
  endpoint?: string;
  maxRetries?: number;
  staleMs?: number;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
};

export type AgentStreamResult = {
  status: 'completed' | 'failed' | 'cancelled' | 'aborted';
  cursor: AgentStreamCursor;
  reconnects: number;
  terminalEvent?: AgentSseEvent;
};

const TERMINAL_EVENT_TYPES = new Set<AgentSseEvent['type']>([
  'agent.completed',
  'agent.failed',
  'agent.cancelled',
]);

function readEnvNumber(name: keyof ImportMetaEnv, fallback: number, min: number, max: number): number {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

const DEFAULT_MAX_RETRIES = readEnvNumber('VITE_AGENT_STREAM_MAX_RETRIES', 3, 0, 10);
const DEFAULT_STALE_MS = readEnvNumber('VITE_AGENT_STREAM_STALE_MS', 30_000, 1_000, 120_000);

function defaultSleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    const handleAbort = (): void => {
      window.clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function validatedOption(name: string, value: number, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function safeProtocolDetails(input: unknown): Record<string, unknown> | undefined {
  if (input === null || typeof input !== 'object') return undefined;
  const value = input as Record<string, unknown>;
  const details: Record<string, unknown> = {};

  if (typeof value.schemaVersion === 'string') details.schemaVersion = value.schemaVersion;
  if (typeof value.eventId === 'string') details.eventId = value.eventId;
  if (typeof value.traceId === 'string') details.traceId = value.traceId;
  return Object.keys(details).length > 0 ? details : undefined;
}

function parseEventData(data: string): AgentSseEvent {
  let input: unknown;
  try {
    input = JSON.parse(data);
  } catch (error) {
    throw new AgentClientError('SSE 事件包含无效 JSON', {
      kind: 'PROTOCOL',
      cause: error,
    });
  }

  try {
    const event = parseAgentSseEvent(input);
    return {
      schemaVersion: event.schemaVersion,
      eventId: event.eventId,
      sequence: event.sequence,
      type: event.type,
      runId: event.runId,
      conversationId: event.conversationId,
      ...(event.messageId === undefined ? {} : { messageId: event.messageId }),
      occurredAt: event.occurredAt,
      traceId: event.traceId,
      payload: event.payload,
    } as AgentSseEvent;
  } catch (error) {
    throw new AgentClientError('SSE 事件不符合 Agent 契约', {
      kind: 'PROTOCOL',
      safeDetails: safeProtocolDetails(input),
      cause: error,
    });
  }
}

function resultStatus(event: AgentSseEvent): AgentStreamResult['status'] {
  if (event.type === 'agent.completed') return 'completed';
  if (event.type === 'agent.cancelled') return 'cancelled';
  return 'failed';
}

function retryDelay(retryCount: number, retryHint: number | undefined, random: () => number): number {
  const base = retryHint ?? Math.min(300 * 2 ** Math.max(0, retryCount - 1), 5_000);
  return Math.round(base * (0.8 + random() * 0.4));
}

function cloneCursor(cursor: AgentStreamCursor): AgentStreamCursor {
  return { ...cursor };
}

export async function streamAgentRun(options: StreamAgentRunOptions): Promise<AgentStreamResult> {
  const endpoint = options.endpoint ?? '/api/agent/runs/events';
  const maxRetries = validatedOption(
    'maxRetries',
    options.maxRetries ?? DEFAULT_MAX_RETRIES,
    0,
    10
  );
  const staleMs = validatedOption('staleMs', options.staleMs ?? DEFAULT_STALE_MS, 1, 120_000);
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const seenEventIds = new Set<string>();
  const seenEventIdQueue: string[] = [];
  const cursor: AgentStreamCursor = {
    runId: options.runId,
    lastAppliedSequence: options.afterSequence ?? 0,
    ...(options.lastEventId === undefined ? {} : { lastEventId: options.lastEventId }),
    connectionGeneration: 0,
  };
  let lastSequenceKnown = options.afterSequence !== undefined || options.lastEventId === undefined;
  if (options.lastEventId !== undefined) {
    seenEventIds.add(options.lastEventId);
    seenEventIdQueue.push(options.lastEventId);
  }
  let retryCount = 0;
  let retryHint: number | undefined;

  while (true) {
    if (options.signal?.aborted) {
      options.callbacks.onConnectionState?.('ABORTED', cloneCursor(cursor));
      return { status: 'aborted', cursor: cloneCursor(cursor), reconnects: retryCount };
    }

    cursor.connectionGeneration += 1;
    const generation = cursor.connectionGeneration;
    const connectionStartedAt = performance.now();
    const connectionController = new AbortController();
    let staleTimer: number | undefined;

    const abortFromCaller = (): void => connectionController.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });

    const resetStaleTimer = (): void => {
      if (staleTimer !== undefined) window.clearTimeout(staleTimer);
      staleTimer = window.setTimeout(() => {
        connectionController.abort(
          new AgentClientError('Agent SSE 心跳超时', {
            kind: 'STALE_STREAM',
            retryable: true,
          })
        );
      }, staleMs);
    };

    options.callbacks.onConnectionState?.(
      retryCount === 0 ? 'CONNECTING' : 'RETRYING',
      cloneCursor(cursor)
    );
    resetStaleTimer();

    try {
      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(cursor.lastEventId === undefined ? {} : { 'Last-Event-ID': cursor.lastEventId }),
        },
        body: JSON.stringify({
          runId: options.runId,
          afterSequence: cursor.lastAppliedSequence,
          includeReasoning: options.includeReasoning ?? true,
        }),
        signal: connectionController.signal,
      });

      if (!response.ok) throw await toAgentClientError(response);

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('text/event-stream')) {
        throw new AgentClientError('Agent 流返回了错误媒体类型', {
          kind: 'PROTOCOL',
          status: response.status,
        });
      }
      if (!response.body) {
        throw new AgentClientError('Agent 流响应缺少 body', { kind: 'PROTOCOL' });
      }

      options.callbacks.onConnectionState?.('OPEN', cloneCursor(cursor));
      options.callbacks.onTelemetry?.({
        type: 'connection.open',
        runId: options.runId,
        generation,
        retryCount,
        lastSequence: cursor.lastAppliedSequence,
        durationMs: performance.now() - connectionStartedAt,
      });

      for await (const frame of parseSseStream(response.body, connectionController.signal, {
        onActivity: resetStaleTimer,
      })) {
        if (generation !== cursor.connectionGeneration) continue;
        if (frame.retry !== undefined) retryHint = frame.retry;

        const event = parseEventData(frame.data);
        if (event.runId !== options.runId) {
          throw new AgentClientError('SSE 事件 runId 与请求不一致', {
            kind: 'PROTOCOL',
            safeDetails: safeProtocolDetails(event),
          });
        }
        if (frame.id === undefined || frame.event === undefined) {
          throw new AgentClientError('SSE 业务事件缺少 id 或 event 字段', {
            kind: 'PROTOCOL',
            safeDetails: safeProtocolDetails(event),
          });
        }
        if (frame.id !== event.eventId) {
          throw new AgentClientError('SSE id 与 payload eventId 不一致', {
            kind: 'PROTOCOL',
            safeDetails: safeProtocolDetails(event),
          });
        }
        if (frame.event !== event.type) {
          throw new AgentClientError('SSE event 字段与 payload type 不一致', {
            kind: 'PROTOCOL',
            safeDetails: safeProtocolDetails(event),
          });
        }
        if (seenEventIds.has(event.eventId)) continue;
        if (!lastSequenceKnown) {
          cursor.lastAppliedSequence = event.sequence - 1;
          lastSequenceKnown = true;
        }
        if (event.sequence <= cursor.lastAppliedSequence) continue;
        if (event.sequence !== cursor.lastAppliedSequence + 1) {
          throw new AgentClientError('SSE 事件序号存在缺口', {
            kind: 'SEQUENCE_GAP',
            retryable: true,
            safeDetails: {
              expectedSequence: cursor.lastAppliedSequence + 1,
              receivedSequence: event.sequence,
              eventId: event.eventId,
              traceId: event.traceId,
            },
          });
        }

        cursor.lastAppliedSequence = event.sequence;
        cursor.lastEventId = frame.id;
        seenEventIds.add(event.eventId);
        seenEventIdQueue.push(event.eventId);
        if (seenEventIdQueue.length > 2_048) {
          const oldestEventId = seenEventIdQueue.shift();
          if (oldestEventId) seenEventIds.delete(oldestEventId);
        }

        options.callbacks.onEvent(event, cloneCursor(cursor));

        if (TERMINAL_EVENT_TYPES.has(event.type)) {
          options.callbacks.onTerminal?.(event, cloneCursor(cursor));
          options.callbacks.onConnectionState?.('COMPLETED', cloneCursor(cursor));
          options.callbacks.onTelemetry?.({
            type: 'stream.terminal',
            runId: options.runId,
            generation,
            retryCount,
            lastSequence: cursor.lastAppliedSequence,
            terminalType: event.type,
          });
          return {
            status: resultStatus(event),
            terminalEvent: event,
            cursor: cloneCursor(cursor),
            reconnects: retryCount,
          };
        }
      }

      throw new AgentClientError('Agent 流在终态前断开', {
        kind: 'NETWORK',
        retryable: true,
      });
    } catch (error) {
      if (options.signal?.aborted) {
        options.callbacks.onConnectionState?.('ABORTED', cloneCursor(cursor));
        return { status: 'aborted', cursor: cloneCursor(cursor), reconnects: retryCount };
      }

      const reason = connectionController.signal.reason;
      const clientError =
        reason instanceof AgentClientError ? reason : await toAgentClientError(error);

      if (!clientError.retryable) {
        options.callbacks.onConnectionState?.('FAILED', cloneCursor(cursor));
        throw clientError;
      }
      if (retryCount >= maxRetries) {
        options.callbacks.onConnectionState?.('FAILED', cloneCursor(cursor));
        throw new AgentClientError('Agent 流恢复次数已耗尽', {
          kind: 'RETRY_EXHAUSTED',
          retryable: false,
          safeDetails: {
            lastSequence: cursor.lastAppliedSequence,
            retryCount,
          },
          cause: clientError,
        });
      }

      options.callbacks.onRecoverableError?.(clientError, cloneCursor(cursor));
      retryCount += 1;
      options.callbacks.onTelemetry?.({
        type: 'connection.retry',
        runId: options.runId,
        generation,
        retryCount,
        lastSequence: cursor.lastAppliedSequence,
      });
      try {
        await sleep(retryDelay(retryCount, retryHint, random), options.signal);
      } catch (sleepError) {
        if (options.signal?.aborted) {
          options.callbacks.onConnectionState?.('ABORTED', cloneCursor(cursor));
          return { status: 'aborted', cursor: cloneCursor(cursor), reconnects: retryCount };
        }
        throw sleepError;
      }
    } finally {
      if (staleTimer !== undefined) window.clearTimeout(staleTimer);
      options.signal?.removeEventListener('abort', abortFromCaller);
      connectionController.abort();
    }
  }
}
