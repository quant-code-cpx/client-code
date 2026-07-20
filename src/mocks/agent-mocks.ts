import type { AgentResponse } from 'src/api/agent';
import type { AgentSseEvent } from 'src/types/agent/generated';

import { http, HttpResponse } from 'msw';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

const encoder = new TextEncoder();

function fixture(type: AgentSseEvent['type'], sequence: number): AgentSseEvent {
  const value = AGENT_EVENT_FIXTURES.find((event) => event.type === type);
  if (!value) throw new Error(`Missing Agent event fixture: ${type}`);
  return {
    ...value,
    eventId: `evt_mock_${sequence}`,
    sequence,
    runId: 'run_mock_1',
    conversationId: 'cm_mock_1',
    messageId: 'msg_assistant_mock_1',
  } as AgentSseEvent;
}

export const agentMockEvents: AgentSseEvent[] = [
  fixture('message.created', 1),
  fixture('agent.started', 2),
  fixture('model.started', 3),
  fixture('model.delta', 4),
  fixture('agent.completed', 5),
];

const agentMockConversationSummary = {
  conversationId: 'cm_mock_1',
  status: 'ACTIVE',
  title: '贵州茅台估值研究',
  modelPolicy: 'AUTO',
  preferredModel: null,
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:05.000Z',
  messageCount: 2,
  lastMessageAt: '2026-07-20T00:00:05.000Z',
} as const;

export const agentMockConversation = {
  ...agentMockConversationSummary,
  statusVersion: 1,
} satisfies AgentResponse<'/agent/conversations/detail'>;

function ok(data: unknown) {
  return HttpResponse.json({ code: 0, data, message: '' });
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function eventFrame(event: AgentSseEvent): Uint8Array {
  return encoder.encode(
    `id: ${event.eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  );
}

export const agentHandlers = [
  http.post('*/api/agent/conversations/create', () =>
    ok({
      conversationId: agentMockConversation.conversationId,
      status: agentMockConversation.status,
      createdAt: agentMockConversation.createdAt,
    } satisfies AgentResponse<'/agent/conversations/create'>)
  ),
  http.post('*/api/agent/conversations/list', () =>
    ok({
      items: [agentMockConversationSummary],
      nextCursor: null,
    } satisfies AgentResponse<'/agent/conversations/list'>)
  ),
  http.post('*/api/agent/conversations/detail', () => ok(agentMockConversation)),
  http.post('*/api/agent/conversations/messages/list', () =>
    ok({ items: [], nextCursor: null })
  ),
  http.post('*/api/agent/conversations/model/update', () =>
    ok({
      conversationId: 'cm_mock_1',
      modelPolicy: 'AUTO',
      preferredModel: null,
      updatedAt: '2026-07-20T00:00:05.000Z',
    } satisfies AgentResponse<'/agent/conversations/model/update'>)
  ),
  http.post('*/api/agent/messages/send', () =>
    ok({
      conversationId: 'cm_mock_1',
      userMessageId: 'msg_user_mock_1',
      assistantMessageId: 'msg_assistant_mock_1',
      runId: 'run_mock_1',
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    } satisfies AgentResponse<'/agent/messages/send'>)
  ),
  http.post('*/api/agent/runs/regenerate', () =>
    ok({
      conversationId: 'cm_mock_1',
      sourceMessageId: 'msg_assistant_mock_1',
      assistantMessageId: 'msg_assistant_mock_2',
      runId: 'run_mock_2',
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    } satisfies AgentResponse<'/agent/runs/regenerate'>)
  ),
  http.post('*/api/agent/runs/status', () =>
    ok({
      runId: 'run_mock_1',
      conversationId: 'cm_mock_1',
      status: 'COMPLETED',
      statusVersion: 3,
      currentStep: null,
      finalMessageId: 'msg_assistant_mock_1',
      latestEventSequence: 5,
      canCancel: false,
      errorCode: null,
      errorMessage: null,
      queuedAt: '2026-07-20T00:00:00.000Z',
      startedAt: '2026-07-20T00:00:01.000Z',
      endedAt: '2026-07-20T00:00:05.000Z',
    } satisfies AgentResponse<'/agent/runs/status'>)
  ),
  http.post('*/api/agent/runs/cancel', () =>
    ok({
      runId: 'run_mock_1',
      status: 'CANCEL_REQUESTED',
      statusVersion: 4,
      cancellationAccepted: true,
    } satisfies AgentResponse<'/agent/runs/cancel'>)
  ),
  http.post('*/api/agent/runs/tool-calls/list', () => ok({ items: [] })),
  http.post('*/api/agent/runs/events', async ({ request }) => {
    const body = await requestBody(request);
    const lastEventId = request.headers.get('Last-Event-ID');
    const lastEvent = lastEventId
      ? agentMockEvents.find((event) => event.eventId === lastEventId)
      : undefined;
    const afterSequence = lastEvent?.sequence ?? Number(body.afterSequence ?? 0);
    const events = agentMockEvents.filter((event) => event.sequence > afterSequence);

    return new HttpResponse(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
          events.forEach((event) => controller.enqueue(eventFrame(event)));
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } }
    );
  }),
];
