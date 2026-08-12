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

type DraftLocation = {
  userId: number;
  scope: number | 'new';
};

const DEBOUNCE_DEFAULT = 3000;

function clonePayload(payload: AutosavePayload): AutosavePayload {
  return { ...payload, tags: [...payload.tags] };
}

function isEqual(a: AutosavePayload, b: AutosavePayload): boolean {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.tsCode === b.tsCode &&
    a.isPinned === b.isPinned &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, index) => tag === b.tags[index])
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
  const inFlightRef = useRef<Promise<void> | null>(null);
  const saveLoopRef = useRef<(() => Promise<void>) | null>(null);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const userIdRef = useRef(userId);
  const debounceMsRef = useRef(debounceMs);
  const onCreatedRef = useRef(onCreated);
  const onRestoreRef = useRef(onRestore);
  const lastSavedSnapshotRef = useRef<AutosavePayload>(clonePayload(initial));
  const currentPayloadRef = useRef<AutosavePayload>(clonePayload(initial));
  const currentRevisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const noteIdRef = useRef<number | null>(noteId);
  const draftScopeRef = useRef<number | 'new'>(noteId ?? 'new');
  const draftLocationsRef = useRef<DraftLocation[]>([]);

  enabledRef.current = enabled;
  userIdRef.current = userId;
  debounceMsRef.current = debounceMs;
  onCreatedRef.current = onCreated;
  onRestoreRef.current = onRestore;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const rememberDraftLocation = useCallback((location: DraftLocation) => {
    if (
      !draftLocationsRef.current.some(
        (item) => item.userId === location.userId && item.scope === location.scope
      )
    ) {
      draftLocationsRef.current.push(location);
    }
  }, []);

  const persistDraftLocally = useCallback(
    (payload: AutosavePayload) => {
      const currentUserId = userIdRef.current;
      if (currentUserId === null) return;
      const location = { userId: currentUserId, scope: draftScopeRef.current };
      rememberDraftLocation(location);
      writeResearchNoteDraft(location.userId, location.scope, clonePayload(payload));
    },
    [rememberDraftLocation]
  );

  const clearDraftLocally = useCallback(() => {
    for (const location of draftLocationsRef.current) {
      removeResearchNoteDraft(location.userId, location.scope);
    }
    draftLocationsRef.current = [];
  }, []);

  const hasUnsavedChanges = useCallback(
    () => currentRevisionRef.current !== savedRevisionRef.current,
    []
  );

  const setStatusIfMounted = useCallback((nextStatus: AutosaveStatus) => {
    if (mountedRef.current) setStatus(nextStatus);
  }, []);

  const setErrorIfMounted = useCallback((message: string) => {
    if (mountedRef.current) setErrorMsg(message);
  }, []);

  const runSaveLoop = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    const task = (async () => {
      while (hasUnsavedChanges()) {
        const latestPayload = currentPayloadRef.current;
        if (!enabledRef.current) {
          persistDraftLocally(latestPayload);
          return;
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setStatusIfMounted('offline');
          persistDraftLocally(latestPayload);
          return;
        }
        if (document.visibilityState !== 'visible') {
          setStatusIfMounted('dirty');
          persistDraftLocally(latestPayload);
          return;
        }

        const payload = clonePayload(latestPayload);
        const revision = currentRevisionRef.current;
        if (!payload.title.trim()) {
          persistDraftLocally(payload);
          return;
        }

        setStatusIfMounted('saving');
        setErrorIfMounted('');

        try {
          if (noteIdRef.current === null) {
            const previousScope = draftScopeRef.current;
            const note = await createNote({
              title: payload.title.trim(),
              content: payload.content,
              tsCode: payload.tsCode ?? undefined,
              tags: payload.tags,
              isPinned: payload.isPinned,
            });
            noteIdRef.current = note.id;
            draftScopeRef.current = note.id;
            const currentUserId = userIdRef.current;
            if (currentUserId !== null) {
              rememberDraftLocation({ userId: currentUserId, scope: previousScope });
              rememberDraftLocation({ userId: currentUserId, scope: note.id });
            }
            if (mountedRef.current) onCreatedRef.current?.(note);
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

          lastSavedSnapshotRef.current = payload;
          savedRevisionRef.current = revision;

          if (!hasUnsavedChanges()) {
            clearDraftLocally();
            setStatusIfMounted('saved');
            if (mountedRef.current) setLastSavedAt(new Date());
          } else {
            // 请求期间继续编辑：先把最新内容落本地，再串行保存最新 revision。
            persistDraftLocally(currentPayloadRef.current);
          }
        } catch (error) {
          setStatusIfMounted('error');
          setErrorIfMounted(error instanceof Error ? error.message : '自动保存失败');
          persistDraftLocally(currentPayloadRef.current);
          return;
        }
      }
    })();

    inFlightRef.current = task;
    try {
      await task;
    } finally {
      if (inFlightRef.current === task) inFlightRef.current = null;
    }
  }, [clearDraftLocally, hasUnsavedChanges, persistDraftLocally, rememberDraftLocation, setErrorIfMounted, setStatusIfMounted]);

  saveLoopRef.current = runSaveLoop;

  const armTimer = useCallback(() => {
    clearTimer();
    if (!enabledRef.current || !hasUnsavedChanges()) return;
    if (document.visibilityState !== 'visible') {
      persistDraftLocally(currentPayloadRef.current);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (document.visibilityState !== 'visible') {
        persistDraftLocally(currentPayloadRef.current);
        return;
      }
      void saveLoopRef.current?.();
    }, debounceMsRef.current);
  }, [clearTimer, hasUnsavedChanges, persistDraftLocally]);

  const schedule = useCallback(
    (nextPayload: AutosavePayload) => {
      const payload = clonePayload(nextPayload);
      if (!isEqual(payload, currentPayloadRef.current)) {
        currentPayloadRef.current = payload;
        currentRevisionRef.current += 1;
      }
      if (!enabledRef.current) return;
      if (!hasUnsavedChanges()) {
        clearTimer();
        setStatusIfMounted('idle');
        return;
      }

      setStatusIfMounted(inFlightRef.current ? 'saving' : 'dirty');
      if (document.visibilityState !== 'visible') {
        clearTimer();
        persistDraftLocally(payload);
        return;
      }
      if (!inFlightRef.current) armTimer();
    },
    [armTimer, clearTimer, hasUnsavedChanges, persistDraftLocally, setStatusIfMounted]
  );

  const flush = useCallback(async (): Promise<void> => {
    clearTimer();
    if (!enabledRef.current || !hasUnsavedChanges()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatusIfMounted('offline');
      persistDraftLocally(currentPayloadRef.current);
      return;
    }
    await runSaveLoop();
  }, [clearTimer, hasUnsavedChanges, persistDraftLocally, runSaveLoop, setStatusIfMounted]);

  useEffect(() => {
    noteIdRef.current = noteId;
    draftScopeRef.current = noteId ?? 'new';
    if (userId !== null) rememberDraftLocation({ userId, scope: draftScopeRef.current });
  }, [noteId, rememberDraftLocation, userId]);

  useEffect(() => {
    if (!enabled || userId === null) {
      setRestorableDraft(null);
      return;
    }
    setRestorableDraft(readResearchNoteDraft(userId, noteId ?? 'new'));
  }, [enabled, noteId, userId]);

  // 详情首次加载完成时建立 baseline；保存中或已有编辑时不能用外部值覆盖最新输入。
  useEffect(() => {
    if (inFlightRef.current || hasUnsavedChanges()) return;
    const payload = clonePayload(initial);
    lastSavedSnapshotRef.current = payload;
    currentPayloadRef.current = payload;
    currentRevisionRef.current = 0;
    savedRevisionRef.current = 0;
    setStatus('idle');
  }, [hasUnsavedChanges, initial]);

  const restoreDraft = useCallback(() => {
    if (!restorableDraft) return;
    const payload: AutosavePayload = {
      title: restorableDraft.title,
      content: restorableDraft.content,
      tsCode: restorableDraft.tsCode,
      tags: [...restorableDraft.tags],
      isPinned: restorableDraft.isPinned,
    };
    onRestoreRef.current?.(payload);
    setRestorableDraft(null);
    schedule(payload);
  }, [restorableDraft, schedule]);

  const discardDraft = useCallback(() => {
    clearDraftLocally();
    setRestorableDraft(null);
  }, [clearDraftLocally]);

  // 隐藏时保留本地草稿；恢复可见或重新联网时立即续传，不启动并发请求。
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        clearTimer();
        if (hasUnsavedChanges()) persistDraftLocally(currentPayloadRef.current);
        return;
      }
      if (enabledRef.current && hasUnsavedChanges()) void saveLoopRef.current?.();
    };
    const handleOffline = () => {
      setStatusIfMounted('offline');
      if (hasUnsavedChanges()) persistDraftLocally(currentPayloadRef.current);
    };
    const handleOnline = () => {
      if (!enabledRef.current || !hasUnsavedChanges()) return;
      setStatusIfMounted('dirty');
      void saveLoopRef.current?.();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [clearTimer, hasUnsavedChanges, persistDraftLocally, setStatusIfMounted]);

  // 路由切走时落本地并继续已有的串行保存；异步完成后不再更新已卸载组件。
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
      if (!hasUnsavedChanges()) return;
      persistDraftLocally(currentPayloadRef.current);
      if (enabledRef.current && navigator.onLine !== false) void saveLoopRef.current?.();
    };
  }, [clearTimer, hasUnsavedChanges, persistDraftLocally]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (status === 'dirty' || status === 'saving' || status === 'error') {
        event.preventDefault();
        event.returnValue = '';
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
