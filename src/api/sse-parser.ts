export type ParsedSseFrame = {
  id?: string;
  event?: string;
  retry?: number;
  data: string;
  dataLines: string[];
};

export type SseParserOptions = {
  maxFrameBytes?: number;
  onActivity?: () => void;
};

const DEFAULT_MAX_FRAME_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

type PendingFrame = {
  id?: string;
  event?: string;
  retry?: number;
  dataLines: string[];
  hasDataField: boolean;
  size: number;
};

function createPendingFrame(): PendingFrame {
  return { dataLines: [], hasDataField: false, size: 0 };
}

function toFrame(frame: PendingFrame): ParsedSseFrame | null {
  if (!frame.hasDataField) return null;

  return {
    ...(frame.id === undefined ? {} : { id: frame.id }),
    ...(frame.event === undefined ? {} : { event: frame.event }),
    ...(frame.retry === undefined ? {} : { retry: frame.retry }),
    data: frame.dataLines.join('\n'),
    dataLines: [...frame.dataLines],
  };
}

function parseLine(
  frame: PendingFrame,
  line: string,
  lineEndingBytes: number,
  maxFrameBytes: number
): void {
  frame.size += encoder.encode(line).byteLength + lineEndingBytes;
  if (frame.size > maxFrameBytes) throw new Error('SSE frame exceeds size limit');
  if (line.startsWith(':')) return;

  const colon = line.indexOf(':');
  const field = colon === -1 ? line : line.slice(0, colon);
  let value = colon === -1 ? '' : line.slice(colon + 1);
  if (value.startsWith(' ')) value = value.slice(1);

  if (field === 'data') {
    frame.hasDataField = true;
    frame.dataLines.push(value);
    return;
  }
  if (field === 'event') {
    frame.event = value;
    return;
  }
  if (field === 'id' && !value.includes('\0')) {
    frame.id = value;
    return;
  }
  if (field === 'retry' && /^\d+$/.test(value)) frame.retry = Number(value);
}

function findLineEnding(buffer: string): { index: number; length: number } | null {
  for (let index = 0; index < buffer.length; index += 1) {
    const character = buffer[index];
    if (character === '\n') return { index, length: 1 };
    if (character === '\r') {
      if (index === buffer.length - 1) return null;
      return { index, length: buffer[index + 1] === '\n' ? 2 : 1 };
    }
  }
  return null;
}

/** Parses a byte stream according to SSE line and frame rules. */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  options: SseParserOptions = {}
): AsyncGenerator<ParsedSseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES;
  let buffer = '';
  let frame = createPendingFrame();
  let firstText = true;
  let reachedEof = false;

  const handleAbort = (): void => {
    void reader.cancel(signal?.reason).catch(() => {});
  };

  signal?.addEventListener('abort', handleAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');

      const { done, value } = await reader.read();
      if (done) {
        if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
        reachedEof = true;
        break;
      }
      options.onActivity?.();

      let text = decoder.decode(value, { stream: true });
      if (firstText && text.length > 0) {
        firstText = false;
        if (text.startsWith('\uFEFF')) text = text.slice(1);
      }
      buffer += text;

      while (true) {
        const ending = findLineEnding(buffer);
        if (!ending) break;

        const line = buffer.slice(0, ending.index);
        buffer = buffer.slice(ending.index + ending.length);

        if (line === '') {
          const parsed = toFrame(frame);
          frame = createPendingFrame();
          if (parsed) yield parsed;
        } else {
          parseLine(frame, line, ending.length, maxFrameBytes);
        }
      }

      if (encoder.encode(buffer).byteLength + frame.size > maxFrameBytes) {
        throw new Error('SSE frame exceeds size limit');
      }
    }

    buffer += decoder.decode();
    let eofLineEndingBytes = 0;
    if (buffer.endsWith('\r')) {
      buffer = buffer.slice(0, -1);
      eofLineEndingBytes = 1;
    }
    if (buffer.length > 0) parseLine(frame, buffer, eofLineEndingBytes, maxFrameBytes);

    const parsed = toFrame(frame);
    if (parsed) yield parsed;
  } finally {
    signal?.removeEventListener('abort', handleAbort);
    if (!reachedEof) await reader.cancel(signal?.reason).catch(() => {});
    reader.releaseLock();
  }
}
