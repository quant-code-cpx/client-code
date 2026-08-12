import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';

import {
  useStrategyDetail,
  StrategyDetailProvider,
} from '../contexts/strategy-detail-context';

describe('StrategyDetailContext', () => {
  it('脱离 StrategyDetailProvider 时立即报错', () => {
    expect(() => renderHook(() => useStrategyDetail())).toThrow(
      'useStrategyDetail must be used within StrategyDetailProvider'
    );
  });

  it('在 Provider 内维护 dirty 卡片并透传刷新操作', () => {
    const refresh = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrategyDetailProvider strategy={null} onRefresh={refresh}>
        {children}
      </StrategyDetailProvider>
    );
    const { result } = renderHook(() => useStrategyDetail(), { wrapper });

    act(() => result.current.registerDirty('info'));
    expect(result.current.isAnyCardDirty).toBe(true);

    act(() => result.current.clearDirty('info'));
    expect(result.current.isAnyCardDirty).toBe(false);

    result.current.refresh();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
