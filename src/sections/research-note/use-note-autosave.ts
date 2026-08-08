import type { ResearchNote } from 'src/api/research-note';
import type {
  StoredResearchNoteDraft,
  ResearchNoteDraftPayload,
} from 'src/utils/research-note-draft-storage';

import { useRef, useState, useEffect, useCallback } from 'react';

import {
  readResearchNoteDraft,
  writeResearchNoteDraft,
  removeResearchNoteDraft,
} from 'src/utils/research-note-draft-storage';

import { updateNote, createNote } from 'src/api/research-note';

// ----------------------------------------------------------------------

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'offline';

export type AutosavePayload = ResearchNoteDraftPayload;

type Options = {
  noteId: number | null; // null = 尚未创建
  userId: number | null;
  initial: AutosavePayload;
  onCreated?: (note: ResearchNote) => void; // 首次保存返回 id 后回调
  onRestore?: (draft: AutosavePayload) => void;
  enabled?: boolean;
  debounceMs?: number;
};

const DEBOUNCE_DEFAULT = 3000;

function isEqual(a: AutosavePayload, b: AutosavePayload): boolean {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.tsCode === b.tsCode &&
    a.isPinned === b.isPinned &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i])
  );
}

export function useNoteAutosave({
  noteId,
  userId,
  initial,
  onCreated,
  onRestore,
  enabled = true,
  debounceMs = DEBOUNCE_DEFAULT,
}: Options) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [restorableDraft, setRestorableDraft] = useState<StoredResearchNoteDraft | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshot = useRef<AutosavePayload>(initial);
  const currentPayload = useRef<AutosavePayload>(initial);
  const noteIdRef = useRef<number | null>(noteId);
  const draftScopeRef = useRef<number | 'new'>(noteId ?? 'new');
  const creatingRef = useRef(false);

  useEffect(() => {
    noteIdRef.current = noteId;
    draftScopeRef.current = noteId ?? 'new';
  }, [noteId]);

  useEffect(() => {
    if (!enabled || userId === null) {
      setRestorableDraft(null);
      return;
    }
    setRestorableDraft(readResearchNoteDraft(userId, noteId ?? 'new'));
  }, [enabled, noteId, userId]);

  // 初始 snapshot 也跟随外部初始值变化（详情加载完成后）
  useEffect(() => {
    lastSavedSnapshot.current = initial;
    currentPayload.current = initial;
    setStatus('idle');
  }, [initial]);

  // 在线 / 离线监听
  useEffect(() => {
    const handleOffline = () => setStatus('offline');
    const handleOnline = () => setStatus((s) => (s === 'offline' ? 'dirty' : s));
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const persistDraftLocally = useCallback((payload: AutosavePayload) => {
    if (userId === null) return;
    writeResearchNoteDraft(userId, draftScopeRef.current, payload);
  }, [userId]);

  const clearDraftLocally = useCallback(() => {
    if (userId === null) return;
    removeResearchNoteDraft(userId, draftScopeRef.current);
  }, [userId]);

  const restoreDraft = useCallback(() => {
    if (!restorableDraft) return;
    const payload: AutosavePayload = {
      title: restorableDraft.title,
      content: restorableDraft.content,
      tsCode: restorableDraft.tsCode,
      tags: restorableDraft.tags,
      isPinned: restorableDraft.isPinned,
    };
    currentPayload.current = payload;
    onRestore?.(payload);
    setRestorableDraft(null);
    setStatus('dirty');
  }, [onRestore, restorableDraft]);

  const discardDraft = useCallback(() => {
    clearDraftLocally();
    setRestorableDraft(null);
  }, [clearDraftLocally]);

  const flush = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('offline');
      persistDraftLocally(currentPayload.current);
      return;
    }
    const payload = currentPayload.current;
    if (!payload.title.trim()) {
      // 标题为空，禁止首次保存（防止脏数据）
      return;
    }
    if (isEqual(payload, lastSavedSnapshot.current) && noteIdRef.current !== null) {
      return;
    }

    setStatus('saving');
    setErrorMsg('');
    try {
      if (noteIdRef.current === null) {
        if (creatingRef.current) return;
        creatingRef.current = true;
        try {
          const note = await createNote({
            title: payload.title.trim(),
            content: payload.content,
            tsCode: payload.tsCode ?? undefined,
            tags: payload.tags,
            isPinned: payload.isPinned,
          });
          noteIdRef.current = note.id;
          onCreated?.(note);
        } finally {
          creatingRef.current = false;
        }
      } else {
        await updateNote({
          id: noteIdRef.current,
          title: payload.title.trim(),
          content: payload.content,
          tsCode: payload.tsCode,
          tags: payload.tags,
          isPinned: payload.isPinned,
        });
      }
      lastSavedSnapshot.current = payload;
      setStatus('saved');
      setLastSavedAt(new Date());
      clearDraftLocally();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '自动保存失败');
      persistDraftLocally(payload);
    }
  }, [enabled, onCreated, persistDraftLocally, clearDraftLocally]);

  const schedule = useCallback(
    (payload: AutosavePayload) => {
      currentPayload.current = payload;
      if (!enabled) return;
      if (isEqual(payload, lastSavedSnapshot.current)) {
        setStatus('idle');
        return;
      }
      setStatus('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // tab 切到后台不保存，等回到前台再触发
        if (document.visibilityState !== 'visible') return;
        void flush();
      }, debounceMs);
    },
    [enabled, debounceMs, flush]
  );

  // 卸载或路由切走时立即保存
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush();
    },
    [flush]
  );

  // 离开前提示
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === 'dirty' || status === 'saving' || status === 'error') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  return {
    status,
    lastSavedAt,
    errorMsg,
    restorableDraft,
    schedule,
    flush,
    restoreDraft,
    discardDraft,
  };
}
