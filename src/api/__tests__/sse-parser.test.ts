import { parseSseStream } from '../sse-parser';

import type { ParsedSseFrame } from '../sse-parser';

const encoder = new TextEncoder();

function byteStream(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<ParsedSseFrame[]> {
  const frames = [];
  for await (const frame of parseSseStream(stream)) frames.push(frame);
  return frames;
}

describe('parseSseStream', () => {
  it('parses the same Chinese event across every possible byte boundary', async () => {
    const source = 'id: 42\nevent: model.delta\ndata: {"delta":"中文"}\n\n';
    const bytes = encoder.encode(source);

    for (let split = 1; split < bytes.length; split += 1) {
      const frames = await collect(byteStream([bytes.slice(0, split), bytes.slice(split)]));
      expect(frames).toEqual([
        {
          id: '42',
          event: 'model.delta',
          data: '{"delta":"中文"}',
          dataLines: ['{"delta":"中文"}'],
        },
      ]);
    }
  });

  it('strips a UTF-8 BOM even when the BOM itself is split across chunks', async () => {
    const bytes = encoder.encode('\uFEFFdata: ready\n\n');

    for (let split = 1; split <= 3; split += 1) {
      const frames = await collect(byteStream([bytes.slice(0, split), bytes.slice(split)]));
      expect(frames).toEqual([{ data: 'ready', dataLines: ['ready'] }]);
    }
  });

  it('handles CRLF split across chunks, comments, multi-line data and empty data', async () => {
    const chunks = [
      encoder.encode(': heart'),
      encoder.encode('beat\r'),
      encoder.encode('\nevent: note\r\ndata: first\r\ndata: second\r'),
      encoder.encode('\n\r\ndata:\r\n\r\n'),
    ];

    await expect(collect(byteStream(chunks))).resolves.toEqual([
      {
        event: 'note',
        data: 'first\nsecond',
        dataLines: ['first', 'second'],
      },
      { data: '', dataLines: [''] },
    ]);
  });

  it('dispatches a valid final frame at EOF without a trailing blank line', async () => {
    const stream = byteStream([encoder.encode('id: eof\ndata: done')]);

    await expect(collect(stream)).resolves.toEqual([
      { id: 'eof', data: 'done', dataLines: ['done'] },
    ]);
  });

  it('ignores empty frames, unknown fields, malformed retry and null ids', async () => {
    const stream = byteStream([
      encoder.encode('\nunknown: ignored\nretry: nope\nid: bad\0id\ndata: ok\n\n'),
    ]);

    await expect(collect(stream)).resolves.toEqual([{ data: 'ok', dataLines: ['ok'] }]);
  });

  it('keeps valid retry hints', async () => {
    const stream = byteStream([encoder.encode('retry: 2500\ndata: ok\n\n')]);

    await expect(collect(stream)).resolves.toEqual([
      { retry: 2500, data: 'ok', dataLines: ['ok'] },
    ]);
  });

  it('cancels the reader and rejects with caller abort reason', async () => {
    const cancelled = vi.fn();
    const controller = new AbortController();
    const stream = new ReadableStream<Uint8Array>({
      cancel: cancelled,
    });
    const iterator = parseSseStream(stream, controller.signal);
    const pending = iterator.next();

    controller.abort(new DOMException('route changed', 'AbortError'));

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('cancels the reader when the consumer stops before network EOF', async () => {
    const cancelled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: terminal\n\n'));
      },
      cancel: cancelled,
    });
    const iterator = parseSseStream(stream);

    await expect(iterator.next()).resolves.toMatchObject({
      done: false,
      value: { data: 'terminal' },
    });
    await iterator.return(undefined);

    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized frames before unbounded buffering', async () => {
    const stream = byteStream([encoder.encode('data: 123456789\n\n')]);
    const consume = async (): Promise<void> => {
      const iterator = parseSseStream(stream, undefined, { maxFrameBytes: 8 });
      while (!(await iterator.next()).done) {
        // consume
      }
    };

    await expect(consume()).rejects.toThrow('SSE frame exceeds size limit');
  });

  it('enforces the frame limit in UTF-8 bytes rather than JavaScript characters', async () => {
    const stream = byteStream([encoder.encode('data: 中文\n\n')]);
    const consume = async (): Promise<void> => {
      const iterator = parseSseStream(stream, undefined, { maxFrameBytes: 10 });
      while (!(await iterator.next()).done) {
        // consume
      }
    };

    await expect(consume()).rejects.toThrow('SSE frame exceeds size limit');
  });
});
