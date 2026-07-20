import { setupServer } from 'msw/node';

import { agentHandlers } from '../agent-mocks';

const server = setupServer(...agentHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Agent MSW handlers', () => {
  it('returns conversation messages with the generated pagination field', async () => {
    const response = await fetch('http://localhost/api/agent/conversations/messages/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: 'cm_mock_1', beforeMessageId: null, limit: 50 }),
    });

    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        items: [
          { messageId: 'msg_user_mock_1', role: 'USER' },
          {
            messageId: 'msg_assistant_mock_1',
            role: 'ASSISTANT',
            contentBlocks: expect.arrayContaining([
              expect.objectContaining({ type: 'MARKDOWN' }),
              expect.objectContaining({ type: 'KLINE' }),
              expect.objectContaining({ type: 'RISK_NOTICE' }),
            ]),
          },
        ],
        nextBeforeMessageId: null,
      },
    });
  });

  it('returns redacted Tool summaries without raw payload', async () => {
    const response = await fetch('http://localhost/api/agent/runs/tool-calls/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'run_mock_1', includePayload: false }),
    });

    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        payloadIncluded: false,
        items: [
          {
            toolCallId: 'tool_call_mock_1',
            status: 'SUCCEEDED',
            inputSummary: { tsCode: '600519.SH' },
          },
        ],
      },
    });
  });

  it('returns the canonical run status shape', async () => {
    const response = await fetch('http://localhost/api/agent/runs/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'run_mock_1' }),
    });

    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        runId: 'run_mock_1',
        conversationId: 'cm_mock_1',
        statusVersion: 3,
        latestEventSequence: 5,
        canCancel: false,
      },
    });
  });

  it('uses persistent eventId frames and gives Last-Event-ID precedence over body sequence', async () => {
    const response = await fetch('http://localhost/api/agent/runs/events', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        'Last-Event-ID': 'evt_mock_4',
      },
      body: JSON.stringify({ runId: 'run_mock_1', afterSequence: 0 }),
    });
    const body = await response.text();

    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(body).toContain('id: evt_mock_5');
    expect(body).not.toContain('id: evt_mock_4');
    expect(body).not.toContain('id: 5');
  });
});
