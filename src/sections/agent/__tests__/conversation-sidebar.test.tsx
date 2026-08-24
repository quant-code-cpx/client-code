import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ConversationSidebar } from '../components/conversation-sidebar';
import { AgentMuiXProvider } from '../components/mui-x-chat/agent-mui-x-provider';

describe('ConversationSidebar', () => {
  it('使用 MUI X listbox，并把选择事件交回 Agent 层', async () => {
    const onSelect = vi.fn();
    const { container, user } = renderWithProviders(
      <AgentMuiXProvider
        activeConversationId="cm_1"
        composerValue=""
        conversations={[
          {
            id: 'cm_1',
            title: '贵州茅台基本面',
            subtitle: '6 条消息',
            lastMessageAt: '2026-08-04T04:00:00.000Z',
          },
          {
            id: 'cm_2',
            title: '沪深 300 复盘',
            subtitle: '3 条消息',
            lastMessageAt: '2026-08-04T03:00:00.000Z',
          },
        ]}
        messages={[]}
        hasOlder={false}
        onActiveConversationChange={onSelect}
        onComposerValueChange={vi.fn()}
      >
        <ConversationSidebar
          totalItemCount={2}
          visibleItemCount={2}
          query=""
          status="ready"
          error={null}
          hasMore={false}
          loadingMore={false}
          mobileOpen={false}
          mobile={false}
          onClose={vi.fn()}
          onNew={vi.fn()}
          onQueryChange={vi.fn()}
          onRetry={vi.fn()}
          onLoadMore={vi.fn()}
        />
      </AgentMuiXProvider>
    );

    expect(container.querySelector('.MuiChatConversationList-root')).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: '研究会话' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);

    await user.click(screen.getByRole('option', { name: /沪深 300 复盘/ }));
    expect(onSelect).toHaveBeenCalledWith('cm_2');
  });

  it('会话列表失败时显示紧凑错误态并提供重试', async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(
      <AgentMuiXProvider
        activeConversationId={null}
        composerValue=""
        conversations={[]}
        messages={[]}
        hasOlder={false}
        onActiveConversationChange={vi.fn()}
        onComposerValueChange={vi.fn()}
      >
        <ConversationSidebar
          totalItemCount={0}
          visibleItemCount={0}
          query=""
          status="error"
          error="会话列表暂时无法加载，请稍后重试"
          hasMore={false}
          loadingMore={false}
          mobileOpen={false}
          mobile={false}
          onClose={vi.fn()}
          onNew={vi.fn()}
          onQueryChange={vi.fn()}
          onRetry={onRetry}
          onLoadMore={vi.fn()}
        />
      </AgentMuiXProvider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('会话列表暂时无法加载，请稍后重试');

    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
