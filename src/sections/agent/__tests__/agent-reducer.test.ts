import type { AgentSseEvent } from 'src/types/agent/generated';

import { AGENT_EVENT_FIXTURES } from 'src/types/agent/generated';

import { agentReducer, createInitialAgentState } from '../state/agent-reducer';

import type {
  AgentRunCreated,
  AgentMessageEntity,
  AgentRunStatusSnapshot,
  AgentConversationDetail,
  AgentReasoningDeltaEvent,
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

function finalMessageSnapshot() {
  return {
    messageId: 'msg_assistant_1',
    role: 'ASSISTANT' as const,
    status: 'COMPLETED' as const,
    contentText: '权威最终研究结论',
    contentBlocks: [],
    version: 2,
    parentMessageId: 'msg_user_1',
    modelName: 'gpt-5.6-sol',
    run: {
      runId: 'run_1',
      status: 'COMPLETED' as const,
      statusVersion: 4,
      endedAt: '2026-08-16T01:00:05.000Z',
    },
    citations: [],
    createdAt: '2026-08-16T01:00:01.000Z',
    completedAt: '2026-08-16T01:00:05.000Z',
  };
}

function runCreated(): AgentRunCreated {
  return {
    conversationId: CONVERSATION_ID,
    userMessageId: 'msg_user_1',
    assistantMessageId: 'msg_assistant_1',
    runId: 'run_1',
    runStatus: 'QUEUED',
    branchVersion: 0,
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

function reasoningEvent(sequence: number, delta: string): AgentReasoningDeltaEvent {
  return {
    schemaVersion: '1.0',
    eventId: `evt_reasoning_${sequence}`,
    sequence,
    type: 'model.reasoning.delta',
    runId: 'run_1',
    conversationId: CONVERSATION_ID,
    messageId: 'msg_assistant_1',
    occurredAt: '2026-08-16T01:00:00.000Z',
    traceId: 'trace_reasoning_1',
    payload: { modelCallId: 'model_call_1', attempt: 1, kind: 'FULL', delta },
  };
}

function runningSnapshot(latestEventSequence: number): AgentRunStatusSnapshot {
  return {
    runId: 'run_1',
    conversationId: CONVERSATION_ID,
    status: 'RUNNING',
    statusVersion: 3,
    currentStep: null,
    finalMessageId: null,
    latestEventSequence,
    canCancel: true,
    canRetry: false,
    retryDepth: 0,
    researchDepth: 'STANDARD',
    answerDetail: 'STANDARD',
    errorCode: null,
    errorMessage: null,
    queuedAt: '2026-08-16T01:00:00.000Z',
    startedAt: '2026-08-16T01:00:01.000Z',
    endedAt: null,
  };
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
    expect(state.runs.byId.run_1.latestPersistedEventSequence).toBe(2);
  });

  it('状态快照只推进服务端水位，不跳过客户端尚未应用的事件', () => {
    let state = agentReducer(stateWithConfirmedRun(), {
      type: 'RUN_EVENT_ACCEPTED',
      event: reasoningEvent(1, '已收到的推理。'),
      connectionGeneration: 2,
    });

    state = agentReducer(state, {
      type: 'RUN_STATUS_RECEIVED',
      snapshot: runningSnapshot(5),
      assistantMessageId: 'msg_assistant_1',
    });

    expect(state.runs.byId.run_1).toMatchObject({
      latestEventSequence: 1,
      latestPersistedEventSequence: 5,
      lastEventId: 'evt_reasoning_1',
    });

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: reasoningEvent(2, '断线后补回的推理。'),
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1).toMatchObject({
      latestEventSequence: 2,
      latestPersistedEventSequence: 5,
    });
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

    expect(state.runs.byId.run_1.stageLabel).toBe('模型正在思考');
    expect(state.runs.byId.run_1.modelActivity).toMatchObject({
      phase: 'REASONING',
      processedCharacters: 2048,
    });
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');
  });

  it('实时保留完整供应商推理事件，Run 完成后仍可回看', () => {
    let state = stateWithConfirmedRun();
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: reasoningEvent(1, '先核对估值口径。'),
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: reasoningEvent(2, '再检查盈利质量。'),
      connectionGeneration: 2,
    });

    expect(state.runs.byId.run_1.thinkingEvents).toHaveLength(2);
    expect(state.runs.byId.run_1.stageLabel).toBe('模型正在思考');
    expect(state.messages.byId.msg_assistant_1.contentText).toBe('');

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('agent.completed', 3),
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.status).toBe('COMPLETED');
    expect(state.runs.byId.run_1.thinkingEvents).toHaveLength(2);
  });

  it('权威终态消息清除不完整标记，随后到达的同终态状态快照不会把标记重新置回', () => {
    let state = agentReducer(stateWithConfirmedRun(), {
      type: 'RUN_EVENT_ACCEPTED',
      event: streamEvent('agent.completed', 1),
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_FINAL_SNAPSHOT_FAILED',
      runId: 'run_1',
      error: '最终快照同步失败',
    });
    expect(state.runs.byId.run_1).toMatchObject({
      needsFinalSnapshot: true,
      finalSnapshotError: '最终快照同步失败',
    });

    state = agentReducer(state, {
      type: 'MESSAGES_REQUESTED',
      conversationId: CONVERSATION_ID,
      generation: 7,
    });
    state = agentReducer(state, {
      type: 'MESSAGES_SUCCEEDED',
      conversationId: CONVERSATION_ID,
      generation: 7,
      items: [finalMessageSnapshot()],
      nextBeforeMessageId: null,
      mode: 'refresh',
      authoritative: true,
    });
    expect(state.runs.byId.run_1).toMatchObject({
      needsFinalSnapshot: false,
      finalSnapshotError: null,
    });

    state = agentReducer(state, {
      type: 'RUN_STATUS_RECEIVED',
      assistantMessageId: 'msg_assistant_1',
      snapshot: {
        ...runningSnapshot(1),
        status: 'COMPLETED',
        statusVersion: 4,
        finalMessageId: 'msg_assistant_1',
        canCancel: false,
        endedAt: '2026-08-16T01:00:05.000Z',
      },
    });
    expect(state.runs.byId.run_1).toMatchObject({
      needsFinalSnapshot: false,
      finalSnapshotError: null,
    });
  });

  it('公开展示模型已返回的决策理由、计划与工具执行结果', () => {
    let state = stateWithConfirmedRun();
    const planning = streamEvent('agent.planning', 1);
    const toolStarted = streamEvent('tool.started', 2);
    const toolCompleted = streamEvent('tool.completed', 3);
    if (
      planning.type !== 'agent.planning' ||
      toolStarted.type !== 'tool.started' ||
      toolCompleted.type !== 'tool.completed'
    ) {
      throw new Error('公开决策 fixture 类型错误');
    }

    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: planning,
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: toolStarted,
      connectionGeneration: 2,
    });
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: toolCompleted,
      connectionGeneration: 2,
    });

    expect(state.runs.byId.run_1.planningDecision).toMatchObject({
      toolSelectionReason: '需要先读取行情，再核验技术指标。',
      selectedTools: ['get_stock_price_history', 'get_stock_technical_indicators'],
      fallback: false,
    });
    expect(state.runs.byId.run_1.toolActivities).toEqual([
      expect.objectContaining({
        toolCallId: 'tool_call_fixture',
        toolName: 'get_stock_overview',
        toolDisplayName: '个股基础数据',
        status: 'COMPLETED',
        outputSummary: '返回个股概览',
      }),
    ]);
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
        contextWindow: 32768,
        maxOutputTokens: 2048,
        inputTokenCountSource: 'LOCAL_CONSERVATIVE_V1',
        inputTokenSafetyMarginTokens: 128,
        runMaxCumulativeInputTokens: null,
        runInputGuardrailSource: 'DISABLED_BY_DEFAULT',
        usage: { inputTokens: 1000, outputTokens: 500, reasoningTokens: 120 },
        usageSource: 'PROVIDER_ACTUAL',
      }),
    ]);
    expect(JSON.stringify(state.runs.byId.run_1.modelDiagnostics)).not.toContain(
      'reasoning_content'
    );
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

  it('发现已终态 Run 时移除遗留的侧栏运行标记', () => {
    const state = agentReducer(stateWithConfirmedRun(), {
      type: 'RUN_DISCOVERED',
      runId: 'run_1',
      conversationId: CONVERSATION_ID,
      assistantMessageId: 'msg_assistant_1',
      status: 'COMPLETED',
      statusVersion: 2,
    });

    expect(state.runs.activeRunIdByConversation[CONVERSATION_ID]).toBeUndefined();
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
    if (synthesisStarted.type !== 'model.started')
      throw new Error('model.started fixture 类型错误');
    state = agentReducer(state, {
      type: 'RUN_EVENT_ACCEPTED',
      event: {
        ...synthesisStarted,
        payload: { ...synthesisStarted.payload, purpose: 'SYNTHESIZE' },
      },
      connectionGeneration: 2,
    });
    expect(state.runs.byId.run_1.stageLabel).toBe('正在组织研究结论');
  });

  it('快速切换会话后，旧会话详情响应不能改变当前选择', () => {
    const detail: AgentConversationDetail = {
      conversationId: 'cm_a',
      title: '会话 A',
      status: 'ACTIVE',
      modelPolicy: 'MANUAL',
      preferredModel: 'gpt-5.6-sol',
      reasoningEffort: null,
      researchDepth: 'STANDARD',
      answerDetail: 'STANDARD',
      activeLeafMessageId: null,
      branchVersion: 0,
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

  it('较旧或同版本异叶的消息投影不能回退已知会话分支', () => {
    const detail = {
      conversationId: CONVERSATION_ID,
      title: '分支单调性测试',
      status: 'ACTIVE' as const,
      modelPolicy: 'MANUAL' as const,
      preferredModel: 'gpt-5.6-sol',
      reasoningEffort: null,
      researchDepth: 'STANDARD' as const,
      answerDetail: 'STANDARD' as const,
      activeLeafMessageId: 'answer-v6',
      branchVersion: 6,
      messageCount: 1,
      lastMessageAt: '2026-08-24T01:00:00.000Z',
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T01:00:00.000Z',
      statusVersion: 1,
    };
    let state = createInitialAgentState(CONVERSATION_ID);
    state = agentReducer(state, {
      type: 'CONVERSATION_DETAIL_REQUESTED',
      conversationId: CONVERSATION_ID,
      generation: 1,
    });
    state = agentReducer(state, {
      type: 'CONVERSATION_DETAIL_SUCCEEDED',
      conversationId: CONVERSATION_ID,
      generation: 1,
      conversation: detail,
    });

    for (const [generation, branchVersion, activeLeafMessageId] of [
      [2, 5, 'answer-v5'],
      [3, 6, 'answer-split-brain'],
    ] as const) {
      state = agentReducer(state, {
        type: 'MESSAGES_REQUESTED',
        conversationId: CONVERSATION_ID,
        generation,
      });
      state = agentReducer(state, {
        type: 'MESSAGES_SUCCEEDED',
        conversationId: CONVERSATION_ID,
        generation,
        items: [{ ...finalMessageSnapshot(), messageId: activeLeafMessageId }],
        nextBeforeMessageId: 'stale-cursor',
        mode: 'replace',
        projection: {
          projection: 'ACTIVE_BRANCH',
          activeLeafMessageId,
          branchVersion,
          displayLeafMessageId: activeLeafMessageId,
          lineageComplete: true,
          isActiveBranch: true,
          displayBranchCompatible: true,
          canAdoptDisplay: false,
          siblingGroups: [],
        },
      });

      expect(state.conversations.byId[CONVERSATION_ID]).toMatchObject({
        activeLeafMessageId: 'answer-v6',
        branchVersion: 6,
      });
      expect(state.messages.byId[activeLeafMessageId]).toBeUndefined();
      expect(state.loadsByConversation[CONVERSATION_ID]).toMatchObject({
        messagesStatus: 'error',
        nextBeforeMessageId: null,
      });
    }
  });

  it('只保存 ACTIVE_BRANCH 返回的可见链，并保留同一快照的版本元数据', () => {
    let state = createInitialAgentState(CONVERSATION_ID);
    state = agentReducer(state, {
      type: 'MESSAGES_REQUESTED',
      conversationId: CONVERSATION_ID,
      generation: 1,
    });
    state = agentReducer(state, {
      type: 'MESSAGES_SUCCEEDED',
      conversationId: CONVERSATION_ID,
      generation: 1,
      items: [
        {
          ...finalMessageSnapshot(),
          messageId: 'answer-v2',
          parentMessageId: 'question-1',
          contextParentMessageId: 'question-1',
          version: 2,
        },
      ],
      nextBeforeMessageId: null,
      mode: 'replace',
      projection: {
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: 'answer-v2',
        branchVersion: 2,
        displayLeafMessageId: 'answer-v2',
        lineageComplete: true,
        isActiveBranch: true,
        displayBranchCompatible: true,
        canAdoptDisplay: false,
        siblingGroups: [
          {
            parentMessageId: 'question-1',
            selectedMessageId: 'answer-v2',
            selectedVersion: 2,
            activeMessageId: 'answer-v2',
            totalVersions: 2,
            versions: [
              {
                messageId: 'answer-v1',
                version: 1,
                status: 'COMPLETED',
                isActive: false,
                isDisplayed: false,
                canAdopt: true,
                createdAt: '2026-08-16T01:00:00.000Z',
              },
              {
                messageId: 'answer-v2',
                version: 2,
                status: 'COMPLETED',
                isActive: true,
                isDisplayed: true,
                canAdopt: false,
                createdAt: '2026-08-16T01:01:00.000Z',
              },
            ],
          },
        ],
      },
    });

    expect(state.messages.orderedIdsByConversation[CONVERSATION_ID]).toEqual(['answer-v2']);
    expect(
      state.loadsByConversation[CONVERSATION_ID].messageProjection?.siblingGroups[0]?.totalVersions
    ).toBe(2);
  });

  it('跨 Tab adopt 改变 frozen leaf/version 后丢弃不兼容 optimistic tail', () => {
    let state = createInitialAgentState(CONVERSATION_ID);
    state = agentReducer(state, {
      type: 'MESSAGES_REQUESTED',
      conversationId: CONVERSATION_ID,
      generation: 1,
    });
    state = agentReducer(state, {
      type: 'MESSAGES_SUCCEEDED',
      conversationId: CONVERSATION_ID,
      generation: 1,
      items: [],
      nextBeforeMessageId: null,
      mode: 'replace',
      projection: {
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: 'answer-v1',
        branchVersion: 1,
        displayLeafMessageId: 'answer-v1',
        lineageComplete: true,
        isActiveBranch: true,
        displayBranchCompatible: true,
        canAdoptDisplay: false,
        siblingGroups: [],
      },
    });
    state = agentReducer(state, {
      type: 'OPTIMISTIC_USER_MESSAGE_ADDED',
      conversationId: CONVERSATION_ID,
      message: {
        ...optimisticMessage(),
        contextParentMessageId: 'answer-v1',
        baseAssistantMessageId: 'answer-v1',
        expectedBranchVersion: 1,
      },
    });
    state = agentReducer(state, {
      type: 'MESSAGES_REQUESTED',
      conversationId: CONVERSATION_ID,
      generation: 2,
    });
    state = agentReducer(state, {
      type: 'MESSAGES_SUCCEEDED',
      conversationId: CONVERSATION_ID,
      generation: 2,
      items: [],
      nextBeforeMessageId: null,
      mode: 'refresh',
      projection: {
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: 'answer-other-tab',
        branchVersion: 2,
        displayLeafMessageId: 'answer-other-tab',
        lineageComplete: true,
        isActiveBranch: true,
        displayBranchCompatible: true,
        canAdoptDisplay: false,
        siblingGroups: [],
      },
    });

    expect(state.messages.orderedIdsByConversation[CONVERSATION_ID]).toEqual([]);
  });
});
