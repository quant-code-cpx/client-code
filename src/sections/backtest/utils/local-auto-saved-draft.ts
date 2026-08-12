import type { StrategyDraft } from 'src/api/strategy-draft';

import { BACKTEST_AUTOSAVE_ID } from '../constants';

export function toLocalAutoSavedDraft(
  config: Record<string, unknown>,
  updatedAt: string
): StrategyDraft {
  return {
    id: BACKTEST_AUTOSAVE_ID,
    name: '上次编辑（自动保存）',
    config,
    createdAt: updatedAt,
    updatedAt,
    isAutoSave: true,
  };
}

export function readLocalAutoSavedDraft(storageKey: string): StrategyDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { config?: Record<string, unknown>; updatedAt?: string };
    if (!parsed.config || !parsed.updatedAt) return null;
    return toLocalAutoSavedDraft(parsed.config, parsed.updatedAt);
  } catch {
    return null;
  }
}

export function writeLocalAutoSavedDraft(
  storageKey: string,
  config: Record<string, unknown>,
  updatedAt: string
): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ config, updatedAt }));
  } catch {
    // localStorage can be unavailable in private mode or under a restrictive policy.
  }
}
