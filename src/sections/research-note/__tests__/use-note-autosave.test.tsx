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

import { updateNote } from 'src/api/research-note';

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
});
