import type { AgentSseEvent } from 'src/types/agent/generated';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

import { agentReducer, createInitialAgentState } from '../state/agent-reducer';

import type {
  AgentRunCreated,
  AgentMessageEntity,
  AgentConversationDetail,
} from '../state/agent-state.types';

const CONVERSATION_ID = 'cm_test_1';
const LOCAL_MESSAGE_ID = 'local:req-1';

function optimisticMessage(): AgentMessageEntity {
  return {
    messageId: LOCAL_MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    role: 'USER',
    status: 'PENDING',
    contentText: '分析贵州茅台',
    contentBlocks: [],
    version: 1,
    parentMessageId: null,
    modelName: null,
    run: null,
    citations: [],
    createdAt: '2026-07-20T01:00:00.000Z',
    completedAt: null,
    clientRequestId: '00000000-0000-4000-8000-000000000001',
    localId: LOCAL_MESSAGE_ID,
    deliveryStatus: 'SENDING',
  };
}

function runCreated(): AgentRunCreated {
  return {
    conversationId: CONVERSATION_ID,
    userMessageId: 'msg_user_1',
    assistantMessageId: 'msg_assistant_1',
    runId: 'run_1',
    runStatus: 'QUEUED',
    streamEndpoint: '/api/agent/runs/events',
  };
}

function streamEvent(type: AgentSseEvent['type'], sequence: number): AgentSseEvent {
  const fixture = AGENT_EVENT_FIXTURES.find((item) => item.type === type);
  if (!fixture) throw new Error(`缺少事件 fixture: ${type}`);
  const event = {
    ...fixture,
    eventId: `evt_${sequence}`,
    sequence,
    runId: 'run_1',
    conversationId: CONVERSATION_ID,
    messageId: 'msg_assistant_1',
  } as AgentSseEvent;
  if (event.type !== 'agent.completed') return event;
  return { ...event, payload: { ...event.payload, finalMessageId: 'msg_assistant_1' } };
}

function stateWithConfirmedRun() {
  let state = createInitialAgentState(CONVERSATION_ID);
  state = agentReducer(state, {
    type: 'OPTIMISTIC_USER_MESSAGE_ADDED',
    conversationId: CONVERSATION_ID,
    message: optimisticMessage(),
  });
  state = agentReducer(state, {
    type: 'MESSAGE_SEND_CONFIRMED',
    conversationId: CONVERSATION_ID,
    localMessageId: LOCAL_MESSAGE_ID,
    response: runCreated(),
  });
  state = agentReducer(state, {
    type: 'RUN_CONNECTION_CHANGED',
    runId: 'run_1',
    connectionGeneration: 2,
    connectionState: 'OPEN',
  });
  return state;
}

describe('Agent reducer', () => {
  it('服务端确认后原位替换乐观用户消息，不追加重复消息', () => {
    const state = stateWithConfirmedRun();
    const ids = state.messages.orderedIdsByConversation[CONVERSATION_ID];

    expect(ids).toEqual(['msg_user_1', 'msg_assistant_1']);
    expect(state.messages.byId[LOCAL_MESSAGE_ID]).toBeUndefined();
    expect(state.messages.byId.msg_user_1).toMatchObject({
      contentText: '分析贵州茅台',
      status: 'COMPLETED',
      localId: LOCAL_MESSAGE_ID,
    });
  });

  it('只接受当前连接代次的连续 sequence，拒绝重复、缺口和旧连接事件', () => {
    let state = stateWithConfirmedRun();
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.delta', 1),
      connectionGeneration: 2,
    });
    const firstText = state.messages.byId.msg_assistant_1.contentText;

    const duplicate = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.delta', 1),
      connectionGeneration: 2,
    });
    const gap = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.delta', 3),
      connectionGeneration: 2,
    });
    const staleConnection = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.delta', 2),
      connectionGeneration: 1,
    });

    expect(duplicate).toBe(state);
    expect(gap).toBe(state);
    expect(staleConnection).toBe(state);

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.delta', 2),
      connectionGeneration: 2,
    });
    expect(state.messages.byId.msg_assistant_1.contentText).toBe(`${firstText}${firstText}`);
    expect(state.runs.byId.run_1.latestEventSequence).toBe(2);
  });

  it('模型降级事件更新运行状态，不把模型切换伪装成文本输出', () => {
    const state = agentReducer(stateWithConfirmedRun(), {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.fallback', 1),
      connectionGeneration: 2,
    });

    expect(state.runs.byId.run_1.stageLabel).toBe('正在切换到 secondary-model');
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');
  });

  it('会话压缩事件把整理进度和失败原因明确投影到运行状态', () => {
    let state = agentReducer(stateWithConfirmedRun(), {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('context.compaction.started', 1),
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.stageLabel).toBe('正在整理历史会话以适配 research-model');

    const summaryStarted = streamEvent('model.started', 2);
    if (summaryStarted.type !== 'model.started') throw new Error('model.started fixture 类型错误');
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: { ...summaryStarted, payload: { ...summaryStarted.payload, purpose: 'SUMMARIZE' } },
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.stageLabel).toBe('正在整理历史会话');

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('context.compaction.failed', 3),
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1).toMatchObject({
      stageLabel: '历史会话整理失败',
      errorCode: 6047,
      errorMessage: '会话整理失败，请重试或切换到上下文更大的模型',
      retryable: true,
    });
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');
  });

  it('推理活动只更新安全阶段信号，不把思维链写入正式消息', () => {
    const state = agentReducer(stateWithConfirmedRun(), {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.activity', 1),
      connectionGeneration: 2,
    });

    expect(state.runs.byId.run_1.stageLabel).toBe('模型正在深度分析（推理内容已隐藏）');
    expect(state.runs.byId.run_1.modelActivity).toMatchObject({
      phase: 'REASONING',
      processedCharacters: 2048,
    });
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');
  });

  it('模型执行轨迹公开可诊断元数据，不写入 Prompt 或推理文本', () => {
    let state = stateWithConfirmedRun();
    const started = streamEvent('model.started', 1);
    const trace = streamEvent('model.trace', 2);
    const completed = streamEvent('model.completed', 3);
    if (
      started.type !== 'model.started' ||
      trace.type !== 'model.trace' ||
      completed.type !== 'model.completed'
    ) {
      throw new Error('模型诊断 fixture 类型错误');
    }

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: started,
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: trace,
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: completed,
      connectionGeneration: 2,
    });

    expect(state.runs.byId.run_1.modelDiagnostics).toEqual([
      expect.objectContaining({
        modelCallId: 'model_call_fixture',
        provider: 'openai-compatible',
        model: 'research-model',
        phase: 'COMPLETED',
        status: 'COMPLETED',
        messageCount: 4,
        estimatedInputTokens: 1024,
        usage: { inputTokens: 1000, outputTokens: 500, reasoningTokens: 120 },
      }),
    ]);
    expect(JSON.stringify(state.runs.byId.run_1.modelDiagnostics)).not.toContain('reasoning_content');
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');
  });

  it('草稿流独立累加、修复重置，最终正文开始后清除草稿', () => {
    let state = stateWithConfirmedRun();
    const reset = streamEvent('model.preview.reset', 1);
    const firstDelta = streamEvent('model.preview.delta', 2);
    if (reset.type !== 'model.preview.reset' || firstDelta.type !== 'model.preview.delta') {
      throw new Error('model preview fixture 类型错误');
    }
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: reset,
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: firstDelta,
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.draftPreview?.text).toBe('正在形成研究结论');
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');

    const repairedReset = streamEvent('model.preview.reset', 3);
    if (repairedReset.type !== 'model.preview.reset') {
      throw new Error('model.preview.reset fixture 类型错误');
    }
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: { ...repairedReset, payload: { ...repairedReset.payload, attempt: 2 } },
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.draftPreview?.text).toBe('');

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('model.delta', 4),
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.draftPreview).toBeUndefined();
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('贵州茅台');
  });

  it('Run 已完成后不被迟到的取消响应回退为 CANCEL_REQUESTED', () => {
    let state = stateWithConfirmedRun();
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('agent.completed', 1),
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_CANCEL_RESOLVED',
      runId: 'run_1',
      status: 'CANCEL_REQUESTED',
      statusVersion: 9,
      cancellationAccepted: true,
    });

    expect(state.runs.byId.run_1.status).toBe('COMPLETED');
    expect(state.messages.byId.msg_assistant_1.status).toBe('COMPLETED');
  });

  it('按模型调用 purpose 区分规划与结论阶段', () => {
    let state = stateWithConfirmedRun();
    const planStarted = streamEvent('model.started', 1);
    if (planStarted.type !== 'model.started') throw new Error('model.started fixture 类型错误');
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: { ...planStarted, payload: { ...planStarted.payload, purpose: 'PLAN' } },
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.stageLabel).toBe('正在规划研究');

    const synthesisStarted = streamEvent('model.started', 2);
    if (synthesisStarted.type !== 'model.started') throw new Error('model.started fixture 类型错误');
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: { ...synthesisStarted, payload: { ...synthesisStarted.payload, purpose: 'SYNTHESIZE' } },
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.stageLabel).toBe('正在组织研究结论');
  });

  it('快速切换会话后，旧会话详情响应不能改变当前选择', () => {
    const detail: AgentConversationDetail = {
      conversationId: 'cm_a',
      title: '会话 A',
      status: 'ACTIVE',
      modelPolicy: 'AUTO',
      preferredModel: null,
      messageCount: 0,
      lastMessageAt: '2026-07-20T01:00:00.000Z',
      createdAt: '2026-07-20T01:00:00.000Z',
      updatedAt: '2026-07-20T01:00:00.000Z',
      statusVersion: 1,
    };
    let state = createInitialAgentState('cm_a');
    state = agentReducer(state, {
      type: 'CONVERSATION_DETAIL_REQUESTED',
      conversationId: 'cm_a',
      generation: 1,
    });
    state = agentReducer(state, { type: 'CONVERSATION_SELECTED', conversationId: 'cm_b' });
    state = agentReducer(state, {
      type: 'CONVERSATION_DETAIL_SUCCEEDED',
      conversationId: 'cm_a',
      generation: 1,
      conversation: detail,
    });

    expect(state.currentConversationId).toBe('cm_b');
    expect(state.conversations.byId.cm_a.title).toBe('会话 A');
  });

  it('同一会话的旧消息请求代次不能覆盖较新的快照', () => {
    let state = createInitialAgentState(CONVERSATION_ID);
    state = agentReducer(state, {
      type: 'MESSAGES_REQUESTED',
      conversationId: CONVERSATION_ID,
      generation: 2,
    });
    const stale = agentReducer(state, {
      type: 'MESSAGES_SUCCEEDED',
      conversationId: CONVERSATION_ID,
      generation: 1,
      items: [],
      nextBeforeMessageId: null,
      mode: 'replace',
    });

    expect(stale).toBe(state);
    expect(stale.loadsByConversation[CONVERSATION_ID].messagesStatus).toBe('loading');
  });
});
