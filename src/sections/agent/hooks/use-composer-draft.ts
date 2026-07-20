import type { SetStateAction } from 'react';

import { useMemo, useState, useEffect, useCallback } from 'react';

import { agentDraftKey } from 'src/utils/agent-draft-storage';

import { useAuth } from 'src/auth/context';

import type { ComposerDraft } from '../state/agent-state.types';

const DRAFT_SCHEMA_VERSION = 1;

function readDraft(key: string | null): { value: string; recovered: boolean } {
  if (!key || typeof window === 'undefined') return { value: '', recovered: false };
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return { value: '', recovered: false };

  try {
    const draft = JSON.parse(raw) as Partial<ComposerDraft>;
    if (draft.schemaVersion !== DRAFT_SCHEMA_VERSION || typeof draft.value !== 'string') {
      window.sessionStorage.removeItem(key);
      return { value: '', recovered: false };
    }
    return { value: draft.value, recovered: draft.value.length > 0 };
  } catch {
    window.sessionStorage.removeItem(key);
    return { value: '', recovered: false };
  }
}

export function useComposerDraft(scopeKey: string) {
  const { userProfile } = useAuth();
  const storageKey = useMemo(
    () => (userProfile ? agentDraftKey(userProfile.id, scopeKey) : null),
    [scopeKey, userProfile]
  );
  const [draftState, setDraftState] = useState(() => ({ storageKey, ...readDraft(storageKey) }));
  const visibleDraft = useMemo(
    () =>
      draftState.storageKey === storageKey
        ? draftState
        : { storageKey, ...readDraft(storageKey) },
    [draftState, storageKey]
  );

  useEffect(() => {
    setDraftState((current) =>
      current.storageKey === storageKey ? current : { storageKey, ...readDraft(storageKey) }
    );
  }, [storageKey]);

  useEffect(() => {
    if (
      !storageKey ||
      draftState.storageKey !== storageKey ||
      typeof window === 'undefined'
    ) {
      return;
    }
    if (draftState.value.length === 0) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }
    const draft: ComposerDraft = {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      value: draftState.value,
      updatedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draftState, storageKey]);

  const setValue = useCallback(
    (nextValue: SetStateAction<string>) => {
      setDraftState((current) => {
        const base = current.storageKey === storageKey ? current : visibleDraft;
        return {
          ...base,
          storageKey,
          value: typeof nextValue === 'function' ? nextValue(base.value) : nextValue,
        };
      });
    },
    [storageKey, visibleDraft]
  );

  const clear = useCallback(() => {
    setDraftState({ storageKey, value: '', recovered: false });
    if (storageKey) window.sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  return { value: visibleDraft.value, setValue, clear, recovered: visibleDraft.recovered };
}
