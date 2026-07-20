import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';

import { clearAgentDrafts } from 'src/utils/agent-draft-storage';

import { createAuthenticatedContext } from 'src/test/factories/auth-context';

import { AuthContext } from 'src/auth/context';

import { useComposerDraft } from '../hooks/use-composer-draft';

function authWrapper(userId: number) {
  const value = createAuthenticatedContext({
    userProfile: createAuthenticatedContext().userProfile
      ? { ...createAuthenticatedContext().userProfile!, id: userId }
      : null,
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };
}

describe('useComposerDraft', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('按用户与会话隔离，并在同一作用域恢复', () => {
    const first = renderHook(() => useComposerDraft('cm_1'), { wrapper: authWrapper(1) });
    act(() => first.result.current.setValue('用户一草稿'));
    first.unmount();

    const recovered = renderHook(() => useComposerDraft('cm_1'), { wrapper: authWrapper(1) });
    expect(recovered.result.current.value).toBe('用户一草稿');
    expect(recovered.result.current.recovered).toBe(true);
    recovered.unmount();

    const otherUser = renderHook(() => useComposerDraft('cm_1'), { wrapper: authWrapper(2) });
    expect(otherUser.result.current.value).toBe('');
    expect(otherUser.result.current.recovered).toBe(false);
  });

  it('清理函数删除所有 Agent 草稿', () => {
    const draft = renderHook(() => useComposerDraft('new'), { wrapper: authWrapper(1) });
    act(() => draft.result.current.setValue('敏感研究草稿'));
    expect(window.sessionStorage.length).toBe(1);

    clearAgentDrafts();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('同一组件切换会话时不把旧草稿写入新作用域', () => {
    const draft = renderHook(({ scope }) => useComposerDraft(scope), {
      initialProps: { scope: 'cm_a' },
      wrapper: authWrapper(1),
    });
    act(() => draft.result.current.setValue('会话 A 草稿'));
    window.sessionStorage.setItem(
      'quant-agent:draft:v1:1:cm_b',
      JSON.stringify({
        schemaVersion: 1,
        value: '会话 B 草稿',
        updatedAt: '2026-07-20T01:00:00.000Z',
      })
    );

    draft.rerender({ scope: 'cm_b' });

    expect(draft.result.current.value).toBe('会话 B 草稿');
    expect(JSON.parse(window.sessionStorage.getItem('quant-agent:draft:v1:1:cm_b') ?? '{}')).toMatchObject({
      value: '会话 B 草稿',
    });
  });
});
