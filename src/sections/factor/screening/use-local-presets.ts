import type { FactorCondition } from 'src/api/factor';

import { useMemo, useState, useEffect, useCallback } from 'react';

import { LOCAL_PRESET_KEY, MAX_LOCAL_PRESETS } from './screening-constants';

import type { ScreeningQueryState } from './use-screening-state';

// ----------------------------------------------------------------------

export type LocalPreset = {
  id: string;
  name: string;
  createdAt: number;
  state: Pick<
    ScreeningQueryState,
    | 'tradeDate'
    | 'universe'
    | 'conditions'
    | 'sortMode'
    | 'sortBy'
    | 'sortOrder'
    | 'tradeConstraints'
  >;
};

function readPresets(): LocalPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is LocalPreset =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as LocalPreset).id === 'string' &&
        typeof (p as LocalPreset).name === 'string' &&
        typeof (p as LocalPreset).state === 'object'
    );
  } catch {
    return [];
  }
}

function writePresets(items: LocalPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PRESET_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function useLocalPresets() {
  const [presets, setPresets] = useState<LocalPreset[]>(() => readPresets());

  useEffect(() => {
    setPresets(readPresets());
  }, []);

  const save = useCallback(
    (
      name: string,
      state: LocalPreset['state']
    ): { ok: boolean; reason?: string; presets: LocalPreset[] } => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, reason: '请输入预设名称', presets };
      const existing = readPresets();
      // 同名覆盖
      const filtered = existing.filter((p) => p.name !== trimmed);
      if (filtered.length >= MAX_LOCAL_PRESETS) {
        // 删除最旧的一条
        filtered.sort((a, b) => a.createdAt - b.createdAt);
        filtered.shift();
      }
      const next: LocalPreset[] = [
        ...filtered,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: trimmed,
          createdAt: Date.now(),
          state: {
            tradeDate: state.tradeDate,
            universe: state.universe,
            conditions: state.conditions.filter((c: FactorCondition) => c.factorName),
            sortMode: state.sortMode,
            sortBy: state.sortBy,
            sortOrder: state.sortOrder,
            tradeConstraints: state.tradeConstraints,
          },
        },
      ].sort((a, b) => b.createdAt - a.createdAt);
      writePresets(next);
      setPresets(next);
      return { ok: true, presets: next };
    },
    [presets]
  );

  const remove = useCallback((id: string) => {
    const next = readPresets().filter((p) => p.id !== id);
    writePresets(next);
    setPresets(next);
  }, []);

  const sorted = useMemo(() => [...presets].sort((a, b) => b.createdAt - a.createdAt), [presets]);

  return { presets: sorted, save, remove };
}
