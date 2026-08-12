import type { Strategy } from 'src/api/strategy';

import { useState, useContext, useCallback, createContext } from 'react';

// ----------------------------------------------------------------------

type StrategyDetailContextValue = {
  strategy: Strategy | null;
  refresh: () => void;
  /** 注册某张编辑卡为 dirty（有未保存更改） */
  registerDirty: (cardId: string) => void;
  /** 清除某张卡的 dirty 状态 */
  clearDirty: (cardId: string) => void;
  /** 是否存在任何未保存的卡片 */
  isAnyCardDirty: boolean;
};

export const StrategyDetailContext = createContext<StrategyDetailContextValue | null>(null);

export function useStrategyDetail() {
  const context = useContext(StrategyDetailContext);

  if (!context) {
    throw new Error('useStrategyDetail must be used within StrategyDetailProvider');
  }

  return context;
}

// ----------------------------------------------------------------------

interface StrategyDetailProviderProps {
  strategy: Strategy | null;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function StrategyDetailProvider({
  strategy,
  onRefresh,
  children,
}: StrategyDetailProviderProps) {
  const [dirtyCards, setDirtyCards] = useState<Set<string>>(new Set());

  const registerDirty = useCallback((cardId: string) => {
    setDirtyCards((prev) => new Set(prev).add(cardId));
  }, []);

  const clearDirty = useCallback((cardId: string) => {
    setDirtyCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  return (
    <StrategyDetailContext.Provider
      value={{
        strategy,
        refresh: onRefresh,
        registerDirty,
        clearDirty,
        isAnyCardDirty: dirtyCards.size > 0,
      }}
    >
      {children}
    </StrategyDetailContext.Provider>
  );
}
