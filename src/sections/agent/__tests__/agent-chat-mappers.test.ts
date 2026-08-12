import { toChatMessages, toChatConversations } from '../components/mui-x-chat/agent-chat-mappers';

import type { AgentMessageEntity, AgentConversationEntity } from '../state/agent-state.types';

const conversation: AgentConversationEntity = {
  conversationId: 'cm_1',
  title: '贵州茅台基本面',
  status: 'ACTIVE',
  modelPolicy: 'AUTO',
  preferredModel: null,
  reasoningEffort: null,
  messageCount: 6,
  lastMessageAt: '2026-08-04T04:00:00.000Z',
  createdAt: '2026-08-04T03:00:00.000Z',
  updatedAt: '2026-08-04T04:00:00.000Z',
};

function agentMessage(overrides: Partial<AgentMessageEntity> = {}): AgentMessageEntity {
  return {
    messageId: 'msg_1',
    conversationId: 'cm_1',
    role: 'ASSISTANT',
    status: 'COMPLETED',
    contentText: '研究结论',
    contentBlocks: [],
    version: 1,
    parentMessageId: null,
    modelName: null,
    run: null,
    citations: [],
    createdAt: '2026-08-04T04:00:00.000Z',
    completedAt: '2026-08-04T04:00:01.000Z',
    ...overrides,
  };
}

describe('MUI X Chat projection mappers', () => {
  it('会话映射只投影既有字段和运行提示', () => {
    const result = toChatConversations([conversation], {
      activeConversationIds: new Set(['cm_1']),
    });

    expect(result).toEqual([
      {
        id: 'cm_1',
        title: '贵州茅台基本面',
        subtitle: '后台运行中 · 6 条消息',
        lastMessageAt: '2026-08-04T04:00:00.000Z',
      },
    ]);
  });

  it('本地已加载消息比列表快时，侧栏使用较大的真实消息数', () => {
    const result = toChatConversations([{ ...conversation, messageCount: 2 }], {
      messageCountByConversation: { cm_1: 6 },
    });

    expect(result[0]?.subtitle).toBe('6 条消息');
  });

  it.each([
    ['PENDING', undefined, 'pending'],
    ['STREAMING', undefined, 'streaming'],
    ['COMPLETED', 'SENDING', 'sending'],
    ['FAILED', undefined, 'error'],
    ['CANCELLED', undefined, 'cancelled'],
  ] as const)('把 Agent %s 状态映射为 MUI X %s', (status, deliveryStatus, expected) => {
    const result = toChatMessages([agentMessage({ status, deliveryStatus })]);
    expect(result[0].status).toBe(expected);
  });

  it('不把工具消息伪装成 Assistant 思考过程', () => {
    const [result] = toChatMessages([agentMessage({ role: 'TOOL' })]);

    expect(result.role).toBe('system');
    expect(result.parts).toEqual([{ type: 'text', text: '研究结论' }]);
  });
});
