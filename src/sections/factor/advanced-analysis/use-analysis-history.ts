import { useState, useEffect, useCallback } from 'react';

import { HISTORY_MAX, HISTORY_STORAGE_KEY } from './constants';

// ----------------------------------------------------------------------
// 高级分析运行历史（localStorage 兜底；BE-6 上线后切换为远端）
// ----------------------------------------------------------------------

export type AnalysisRunType = 'orthogonalize' | 'fama-macbeth' | 'optimization';

export type AnalysisHistoryItem = {
  id: string;
  type: AnalysisRunType;
  /** 该面板的请求 JSON（任意类型，仅用于回填参数） */
  request: unknown;
  /** 关键摘要（如显著因子数 / 平均 R² / Sharpe / 权重 Top） */
  summary: string;
  status: 'success' | 'error';
  errorMessage?: string;
  elapsedMs: number | null;
  createdAt: number;
};

function loadHistory(): AnalysisHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is AnalysisHistoryItem => x && typeof x === 'object');
  } catch {
    return [];
  }
}

function saveHistory(items: AnalysisHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    // localStorage 满 / 隐身模式 → 静默失败
  }
}

export function useAnalysisHistory() {
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    setItems(loadHistory());
  }, []);

  const add = useCallback((entry: Omit<AnalysisHistoryItem, 'id' | 'createdAt'>) => {
    setItems((prev) => {
      const next: AnalysisHistoryItem[] = [
        {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
        },
        ...prev,
      ].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    saveHistory([]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  return { items, add, clear, remove };
}
