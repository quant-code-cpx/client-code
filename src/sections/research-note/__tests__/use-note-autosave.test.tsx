import { act, waitFor, renderHook } from '@testing-library/react';

import {
  readResearchNoteDraft,
  writeResearchNoteDraft,
} from 'src/utils/research-note-draft-storage';

vi.mock('src/api/research-note', () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
}));

import type { ResearchNote } from 'src/api/research-note';

import { createNote, updateNote } from 'src/api/research-note';

import { useNoteAutosave } from '../use-note-autosave';

import type { AutosavePayload } from '../use-note-autosave';

// ----------------------------------------------------------------------

const initial: AutosavePayload = {
  title: '',
  content: '',
  tsCode: null,
  tags: [],
  isPinned: false,
};

const draft: AutosavePayload = {
  title: '未同步笔记',
  content: '本地草稿内容',
  tsCode: '600000.SH',
  tags: ['研究'],
  isPinned: true,
};

const savedNote: ResearchNote = {
  id: 12,
  ...draft,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
};

const latestDraft: AutosavePayload = {
  ...draft,
  title: 'create 期间继续编辑',
  content: '只允许最后一版成为服务端终态',
  tags: ['研究', '异步'],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderAutosave(userId: number | null, onRestore = vi.fn()) {
  return renderHook(() =>
    useNoteAutosave({
      noteId: 12,
      userId,
      initial,
      onRestore,
      debounceMs: 60_000,
    })
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('useNoteAutosave — 本地草稿', () => {
  it('只向当前用户展示草稿，并在恢复时回传完整内容', async () => {
    writeResearchNoteDraft(7, 12, draft);
    const onRestore = vi.fn();
    const { result } = renderAutosave(7, onRestore);

    await waitFor(() => {
      expect(result.current.restorableDraft).toMatchObject(draft);
    });

    act(() => result.current.restoreDraft());

    expect(onRestore).toHaveBeenCalledWith(draft);
    expect(result.current.restorableDraft).toBeNull();
    expect(result.current.status).toBe('dirty');
  });

  it('不会读取另一位用户的草稿', async () => {
    writeResearchNoteDraft(7, 12, draft);
    const { result } = renderAutosave(8);

    await waitFor(() => {
      expect(result.current.restorableDraft).toBeNull();
    });
  });

  it('保存失败时按当前用户和笔记写入草稿', async () => {
    vi.mocked(updateNote).mockRejectedValueOnce(new Error('network unavailable'));
    const { result } = renderAutosave(7);

    act(() => result.current.schedule(draft));
    await act(async () => {
      await result.current.flush();
    });

    expect(readResearchNoteDraft(7, 12)).toMatchObject(draft);
    expect(result.current.status).toBe('error');
  });

  it('保存成功后清理当前用户的本地草稿', async () => {
    writeResearchNoteDraft(7, 12, draft);
    vi.mocked(updateNote).mockResolvedValueOnce(savedNote);
    const { result } = renderAutosave(7);

    act(() => result.current.schedule(draft));
    await act(async () => {
      await result.current.flush();
    });

    expect(readResearchNoteDraft(7, 12)).toBeNull();
    expect(result.current.status).toBe('saved');
  });

  it('允许用户显式丢弃草稿', async () => {
    writeResearchNoteDraft(7, 12, draft);
    const { result } = renderAutosave(7);

    await waitFor(() => {
      expect(result.current.restorableDraft).not.toBeNull();
    });

    act(() => result.current.discardDraft());

    expect(readResearchNoteDraft(7, 12)).toBeNull();
    expect(result.current.restorableDraft).toBeNull();
  });

  it('create 期间继续编辑时只创建一次，并串行把最后一版更新到新 id', async () => {
    const pendingCreate = deferred<ResearchNote>();
    vi.mocked(createNote).mockReturnValueOnce(pendingCreate.promise);
    vi.mocked(updateNote).mockResolvedValueOnce({ ...savedNote, ...latestDraft });
    const onCreated = vi.fn();
    const { result } = renderHook(() =>
      useNoteAutosave({
        noteId: null,
        userId: 7,
        initial,
        onCreated,
        debounceMs: 60_000,
      })
    );

    let flushPromise!: Promise<void>;
    act(() => {
      result.current.schedule(draft);
      flushPromise = result.current.flush();
    });
    await waitFor(() => expect(createNote).toHaveBeenCalledTimes(1));

    act(() => result.current.schedule(latestDraft));
    expect(updateNote).not.toHaveBeenCalled();

    await act(async () => {
      pendingCreate.resolve(savedNote);
      await flushPromise;
    });

    expect(createNote).toHaveBeenCalledTimes(1);
    expect(updateNote).toHaveBeenCalledWith({ id: 12, ...latestDraft });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('已有笔记的并发 flush 合并为单飞，并按 last-write-wins 串行保存', async () => {
    const firstUpdate = deferred<ResearchNote>();
    const secondUpdate = deferred<ResearchNote>();
    vi.mocked(updateNote)
      .mockReturnValueOnce(firstUpdate.promise)
      .mockReturnValueOnce(secondUpdate.promise);
    const { result } = renderAutosave(7);

    let firstFlush!: Promise<void>;
    let secondFlush!: Promise<void>;
    act(() => {
      result.current.schedule(draft);
      firstFlush = result.current.flush();
    });
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.schedule(latestDraft);
      secondFlush = result.current.flush();
    });
    expect(updateNote).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstUpdate.resolve(savedNote);
      await firstUpdate.promise;
    });
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondUpdate.resolve({ ...savedNote, ...latestDraft });
      await Promise.all([firstFlush, secondFlush]);
    });

    expect(vi.mocked(updateNote).mock.calls[1]?.[0]).toEqual({ id: 12, ...latestDraft });
    expect(result.current.status).toBe('saved');
  });

  it('页面隐藏时仅落本地，恢复可见后立即续传最新草稿', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    vi.mocked(updateNote).mockResolvedValueOnce(savedNote);
    const { result } = renderAutosave(7);

    act(() => result.current.schedule(draft));

    expect(updateNote).not.toHaveBeenCalled();
    expect(readResearchNoteDraft(7, 12)).toMatchObject(draft);

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('请求期间转入后台时不串起下一次保存，恢复可见后再续传最新版本', async () => {
    const firstUpdate = deferred<ResearchNote>();
    vi.mocked(updateNote)
      .mockReturnValueOnce(firstUpdate.promise)
      .mockResolvedValueOnce({ ...savedNote, ...latestDraft });
    const { result } = renderAutosave(7);

    let flushPromise!: Promise<void>;
    act(() => {
      result.current.schedule(draft);
      flushPromise = result.current.flush();
    });
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.schedule(latestDraft);
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      firstUpdate.resolve(savedNote);
      await flushPromise;
    });

    expect(updateNote).toHaveBeenCalledTimes(1);
    expect(readResearchNoteDraft(7, 12)).toMatchObject(latestDraft);

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(2));
    expect(vi.mocked(updateNote).mock.calls[1]?.[0]).toEqual({ id: 12, ...latestDraft });
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('卸载时先持久化未保存内容，并在请求完成后清理草稿且不更新已卸载组件', async () => {
    const pendingUpdate = deferred<ResearchNote>();
    vi.mocked(updateNote).mockReturnValueOnce(pendingUpdate.promise);
    const { result, unmount } = renderAutosave(7);

    act(() => result.current.schedule(draft));
    unmount();

    expect(readResearchNoteDraft(7, 12)).toMatchObject(draft);
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith({ id: 12, ...draft }));

    pendingUpdate.resolve(savedNote);
    await pendingUpdate.promise;
    await waitFor(() => expect(readResearchNoteDraft(7, 12)).toBeNull());
  });
});
