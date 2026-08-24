import { AGENT_ERROR_DEFINITIONS } from 'src/types/agent/generated';

export type AgentClientErrorKind =
  | 'ABORTED'
  | 'AUTH'
  | 'BUSINESS'
  | 'HTTP'
  | 'NETWORK'
  | 'PROTOCOL'
  | 'RETRY_EXHAUSTED'
  | 'SEQUENCE_GAP'
  | 'STALE_STREAM';

export type AgentErrorCategory =
  | 'VALIDATION'
  | 'AUTH'
  | 'MODEL'
  | 'TOOL'
  | 'SEARCH'
  | 'TIMEOUT'
  | 'INTERNAL';

export type AgentClientErrorOptions = {
  kind: AgentClientErrorKind;
  status?: number;
  code?: number;
  retryable?: boolean;
  category?: AgentErrorCategory;
  traceId?: string;
  safeDetails?: Record<string, unknown>;
  cause?: unknown;
};

export class AgentClientError extends Error {
  readonly kind: AgentClientErrorKind;
  readonly status?: number;
  readonly code?: number;
  readonly retryable: boolean;
  readonly category?: AgentErrorCategory;
  readonly traceId?: string;
  readonly safeDetails?: Record<string, unknown>;

  constructor(message: string, options: AgentClientErrorOptions) {
    super(message);
    this.name = 'AgentClientError';
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.category = options.category;
    this.traceId = options.traceId;
    this.safeDetails = options.safeDetails;
    if (options.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause;
  }
}

type ErrorPayload = {
  code?: number;
  message?: string | string[];
  retryable?: boolean;
  category?: AgentErrorCategory;
  traceId?: string;
  safeDetails?: Record<string, unknown>;
  details?: unknown;
  data?: unknown;
};

const errorDefinitionByCode = new Map<number, (typeof AGENT_ERROR_DEFINITIONS)[number]>(
  AGENT_ERROR_DEFINITIONS.map((definition) => [definition.code, definition])
);

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function normalizePayload(input: unknown): ErrorPayload {
  if (!isRecord(input)) return {};

  const nested = isRecord(input.data) ? input.data : null;
  const source = nested && ('code' in nested || 'message' in nested) ? nested : input;
  return {
    ...(typeof source.code === 'number' ? { code: source.code } : {}),
    ...(typeof source.message === 'string' || Array.isArray(source.message)
      ? { message: source.message as string | string[] }
      : {}),
    ...(typeof source.retryable === 'boolean' ? { retryable: source.retryable } : {}),
    ...(typeof source.category === 'string'
      ? { category: source.category as AgentErrorCategory }
      : {}),
    ...(typeof source.traceId === 'string' ? { traceId: source.traceId } : {}),
    ...(isRecord(source.safeDetails) ? { safeDetails: source.safeDetails } : {}),
    ...('details' in input
      ? { details: input.details }
      : nested && 'details' in nested
        ? { details: nested.details }
        : {}),
  };
}

function payloadMessage(payload: ErrorPayload, fallback: string): string {
  const message = Array.isArray(payload.message)
    ? payload.message.join('；')
    : payload.message ?? fallback;
  if (payload.code !== 9001) return message;
  const details = validationDetailMessages(payload.details);
  return details.length > 0 ? `${message}：${details.join('；')}` : message;
}

function validationDetailMessages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .flatMap((item) => {
      if (typeof item === 'string') return [item.trim()];
      if (!isRecord(item) || typeof item.message !== 'string') return [];
      return [item.message.trim()];
    })
    .filter(Boolean)
    .slice(0, 3);
}

function categoryForCode(code?: number): AgentErrorCategory | undefined {
  if (code === undefined) return undefined;
  if (
    [
      6001, 6002, 6003, 6004, 6013, 6014, 6018, 6019, 6021, 6022, 6024, 6025, 6030, 6031,
      6050, 6051,
    ].includes(code)
  ) {
    return 'VALIDATION';
  }
  if ([6005, 6006, 6007].includes(code)) return 'MODEL';
  if ([6008, 6009, 6010, 6011, 6012, 6026, 6027, 6028, 6029].includes(code)) {
    return 'TOOL';
  }
  if ([6015, 6016, 6017].includes(code)) return 'SEARCH';
  if (code === 6020) return 'TIMEOUT';
  if (code === 6099) return 'INTERNAL';
  return undefined;
}

async function payloadFromResponse(response: Response): Promise<ErrorPayload> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return {};

  try {
    const text = await response.text();
    if (text.length > 64 * 1024) return {};
    return normalizePayload(JSON.parse(text));
  } catch {
    return {};
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export async function toAgentClientError(input: Response | unknown): Promise<AgentClientError> {
  if (input instanceof AgentClientError) return input;

  if (input instanceof Response) {
    const payload = await payloadFromResponse(input);
    const definition = payload.code === undefined ? undefined : errorDefinitionByCode.get(payload.code);
    const retryable =
      payload.retryable ??
      definition?.retryable ??
      (input.status === 408 || input.status === 429 || input.status >= 500);

    return new AgentClientError(payloadMessage(payload, `请求失败（HTTP ${input.status}）`), {
      kind: input.status === 401 || input.status === 403 ? 'AUTH' : payload.code ? 'BUSINESS' : 'HTTP',
      status: input.status,
      code: payload.code,
      retryable,
      category:
        payload.category ?? categoryForCode(payload.code) ??
        (input.status === 401 || input.status === 403 ? 'AUTH' : undefined),
      traceId: payload.traceId,
      safeDetails: payload.safeDetails,
    });
  }

  if (isAbortError(input)) {
    return new AgentClientError('请求已取消', {
      kind: 'ABORTED',
      retryable: false,
      cause: input,
    });
  }

  if (input instanceof TypeError) {
    return new AgentClientError('网络连接失败', {
      kind: 'NETWORK',
      retryable: true,
      cause: input,
    });
  }

  const payload = normalizePayload(input);
  if (payload.code !== undefined || payload.message !== undefined) {
    const definition = payload.code === undefined ? undefined : errorDefinitionByCode.get(payload.code);
    return new AgentClientError(payloadMessage(payload, definition?.message ?? '请求失败'), {
      kind: 'BUSINESS',
      code: payload.code,
      retryable: payload.retryable ?? definition?.retryable ?? false,
      category: payload.category ?? categoryForCode(payload.code),
      traceId: payload.traceId,
      safeDetails: payload.safeDetails,
    });
  }

  return new AgentClientError(input instanceof Error ? input.message : 'Agent 请求失败', {
    kind: 'PROTOCOL',
    retryable: false,
    cause: input,
  });
}
