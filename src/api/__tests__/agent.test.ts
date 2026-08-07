import { agentApi } from '../agent';
import { tokenStorage, setAuthCallbacks } from '../client';
import { AgentClientError, toAgentClientError } from '../agent-error';

import type { AgentRequest } from '../agent';

const mockFetch = vi.fn();

function requestPath(url: string): string {
  return new URL(url, 'http://test.local').pathname;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('agentApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    tokenStorage.clear();
    setAuthCallbacks({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts semantic conversation requests and unwraps the shared JSON envelope', async () => {
    tokenStorage.set('agent-token');
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: {
          conversationId: 'cm_1',
          status: 'ACTIVE',
          createdAt: '2026-07-20T00:00:00.000Z',
        },
      })
    );
    const input = {
      clientRequestId: '8e598a53-84d5-45bd-b06a-d8d10d3fb125',
      title: '估值研究',
      modelPolicy: 'AUTO',
      preferredModel: null,
    } satisfies AgentRequest<'/agent/conversations/create'>;

    const result = await agentApi.createConversation(input);

    expect(result).toEqual({
      conversationId: 'cm_1',
      status: 'ACTIVE',
      createdAt: '2026-07-20T00:00:00.000Z',
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(requestPath(url)).toBe('/api/agent/conversations/create');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer agent-token');
    expect(new Headers(init.headers).get('Accept')).toBe('application/json');
  });

  it('passes caller AbortSignal to fetch', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 0, data: { items: [] } }));
    const controller = new AbortController();

    await agentApi.listConversations({ cursor: null, limit: 30, includeArchived: false }, controller.signal);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it('posts models list through the canonical Agent facade', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: { items: [] },
      })
    );

    await agentApi.listModels();

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(requestPath(url)).toBe('/api/agent/models/list');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it('posts memory list requests through canonical Agent facade', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 0, data: { items: [], nextCursor: null } }));

    await agentApi.listMemories({ cursor: null, limit: 100, includeInactive: false });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(requestPath(url)).toBe('/api/agent/memories/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ cursor: null, limit: 100, includeInactive: false });
  });

  it('maps successful HTTP responses with Agent business error codes', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: 6006, data: null, message: '模型供应商限流' })
    );

    const input = {
      clientRequestId: '04907f45-c978-4058-8a4a-454625f27a2d',
      conversationId: 'cm_1',
      content: 'test',
      modelPolicy: 'AUTO',
      allowedCapabilities: ['INTERNAL_DATA'],
    } satisfies AgentRequest<'/agent/messages/send'>;

    const error = await agentApi.sendMessage(input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AgentClientError);
    expect(error).toMatchObject({
      kind: 'BUSINESS',
      code: 6006,
      retryable: true,
      category: 'MODEL',
      message: '模型供应商限流',
    });
  });

  it('rejects non-JSON success responses as protocol errors', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('not-json', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    );

    await expect(agentApi.getRunStatus({ runId: 'run_1' })).rejects.toMatchObject({
      kind: 'PROTOCOL',
    });
  });

  it('rejects JSON success responses that are not canonical object envelopes', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null));

    await expect(agentApi.getRunStatus({ runId: 'run_1' })).rejects.toMatchObject({
      kind: 'PROTOCOL',
    });
  });

  it('rejects successful Agent envelopes that omit the data field', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 0, message: '' }));

    await expect(agentApi.getRunStatus({ runId: 'run_1' })).rejects.toMatchObject({
      kind: 'PROTOCOL',
    });
  });

  it('maps HTTP errors without exposing arbitrary response text', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: 6002, message: 'Run 不存在', traceId: 'trace_safe' }, 404)
    );

    await expect(agentApi.getRunStatus({ runId: 'missing' })).rejects.toMatchObject({
      kind: 'BUSINESS',
      status: 404,
      code: 6002,
      traceId: 'trace_safe',
      message: 'Run 不存在',
    });
  });

  it('shows safe validation details instead of only the generic 9001 message', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          code: 9001,
          message: '请求参数校验失败',
          data: { details: ['preferredModel 未注册或不可用'] },
        },
        400
      )
    );

    await expect(agentApi.regenerateMessage({
      clientRequestId: '60d92dab-4bf7-4c7b-a440-2913f5fae98d',
      messageId: 'cmshw7ppw000yqw1hnorlhi2i',
      modelPolicy: 'MANUAL',
    })).rejects.toMatchObject({
      message: '请求参数校验失败：preferredModel 未注册或不可用',
    });
  });
});

describe('toAgentClientError', () => {
  it('classifies browser AbortError separately from network failure', async () => {
    await expect(
      toAgentClientError(new DOMException('route changed', 'AbortError'))
    ).resolves.toMatchObject({ kind: 'ABORTED', retryable: false });
    await expect(toAgentClientError(new TypeError('Failed to fetch'))).resolves.toMatchObject({
      kind: 'NETWORK',
      retryable: true,
    });
  });
});
