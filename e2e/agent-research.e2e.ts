import { test, expect, type Page, type Route } from '@playwright/test';

import { type AgentSseEvent, AGENT_EVENT_FIXTURES } from '../src/types/agent/generated';

const USER_ID = 903;

type RunFixture = {
  conversationId: string;
  runId: string;
  userMessageId: string;
  assistantMessageId: string;
};

function ok(data: unknown): string {
  return JSON.stringify({ code: 0, data, message: '' });
}

function event(
  fixture: RunFixture,
  type: AgentSseEvent['type'],
  sequence: number,
  payload?: Record<string, unknown>
): AgentSseEvent {
  const base = AGENT_EVENT_FIXTURES.find((item) => item.type === type);
  if (!base) throw new Error(`缺少 Agent E2E fixture: ${type}`);
  return {
    ...base,
    eventId: `evt_${fixture.runId}_${sequence}`,
    sequence,
    runId: fixture.runId,
    conversationId: fixture.conversationId,
    messageId: fixture.assistantMessageId,
    payload: { ...base.payload, ...payload },
  } as AgentSseEvent;
}

function frame(item: AgentSseEvent, retry?: number): string {
  return `${retry === undefined ? '' : `retry: ${retry}\n`}id: ${item.eventId}\nevent: ${item.type}\ndata: ${JSON.stringify(item)}\n\n`;
}

function userMessage(fixture: RunFixture, content: string) {
  return {
    messageId: fixture.userMessageId,
    role: 'USER',
    status: 'COMPLETED',
    contentText: content,
    contentBlocks: [],
    version: 1,
    parentMessageId: null,
    modelName: null,
    run: null,
    citations: [],
    createdAt: '2026-07-20T01:00:01.000Z',
    completedAt: '2026-07-20T01:00:01.000Z',
  };
}

function assistantMessage(
  fixture: RunFixture,
  status: 'STREAMING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  contentText: string | null,
  statusVersion: number
) {
  return {
    messageId: fixture.assistantMessageId,
    role: 'ASSISTANT',
    status,
    contentText,
    contentBlocks: [],
    version: 1,
    parentMessageId: fixture.userMessageId,
    modelName: status === 'COMPLETED' ? 'fixture-model' : null,
    run: {
      runId: fixture.runId,
      status: status === 'STREAMING' ? 'RUNNING' : status,
      statusVersion,
      endedAt: status === 'STREAMING' ? null : '2026-07-20T01:00:08.000Z',
    },
    citations: [],
    createdAt: '2026-07-20T01:00:02.000Z',
    completedAt: status === 'STREAMING' ? null : '2026-07-20T01:00:08.000Z',
  };
}

function conversation(fixture: RunFixture, messageCount: number) {
  return {
    conversationId: fixture.conversationId,
    title: 'Batch 018 Agent 研究',
    status: 'ACTIVE',
    modelPolicy: 'AUTO',
    preferredModel: null,
    messageCount,
    lastMessageAt: '2026-07-20T01:00:08.000Z',
    createdAt: '2026-07-20T01:00:00.000Z',
    updatedAt: '2026-07-20T01:00:08.000Z',
    statusVersion: 1,
  };
}

function runStatus(
  fixture: RunFixture,
  status: 'RUNNING' | 'FAILED' | 'CANCELLED' | 'COMPLETED',
  latestEventSequence: number,
  statusVersion: number
) {
  return {
    runId: fixture.runId,
    conversationId: fixture.conversationId,
    status,
    statusVersion,
    currentStep: null,
    finalMessageId: status === 'COMPLETED' ? fixture.assistantMessageId : null,
    latestEventSequence,
    canCancel: status === 'RUNNING',
    errorCode: status === 'FAILED' ? 6005 : null,
    errorMessage: status === 'FAILED' ? '模型暂不可用' : null,
    queuedAt: '2026-07-20T01:00:01.000Z',
    startedAt: '2026-07-20T01:00:02.000Z',
    endedAt: status === 'RUNNING' ? null : '2026-07-20T01:00:08.000Z',
  };
}

async function fulfillJson(route: Route, data: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: 'application/json', body: ok(data) });
}

async function mockAuth(page: Page): Promise<void> {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, { accessToken: 'agent-research-e2e-token' })
  );
  await page.route('**/api/user/profile/detail', (route) =>
    fulfillJson(route, {
      id: USER_ID,
      account: 'agent-research-e2e',
      nickname: 'Agent Research E2E',
      email: 'agent-research@example.com',
      wechat: null,
      role: 'USER',
      status: 'ACTIVE',
      backtestQuota: 10,
      watchlistLimit: 5,
    })
  );
}

async function mockConversationList(page: Page): Promise<void> {
  await page.route('**/api/agent/conversations/list', (route) =>
    fulfillJson(route, { items: [], nextCursor: null })
  );
}

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await mockConversationList(page);
});

test('AR-001：运行中刷新后从权威 sequence 恢复，正文不重不漏', async ({ page }) => {
  const fixture: RunFixture = {
    conversationId: 'cm_research_resume',
    runId: 'run_research_resume',
    userMessageId: 'msg_research_resume_user',
    assistantMessageId: 'msg_research_resume_assistant',
  };
  const finalAnswer = '前半段中段后半段';
  const streamBodies: Array<{ runId: string; afterSequence: number }> = [];
  let streamCalls = 0;
  let completed = false;

  await page.route('**/api/agent/conversations/detail', (route) =>
    fulfillJson(route, conversation(fixture, 2))
  );
  await page.route('**/api/agent/conversations/messages/list', (route) => {
    const content = completed ? finalAnswer : streamCalls > 0 ? '前半段中段' : '前半段';
    const status = completed ? 'COMPLETED' : 'STREAMING';
    return fulfillJson(route, {
      items: [
        userMessage(fixture, '继续分析贵州茅台'),
        assistantMessage(fixture, status, content, completed ? 3 : 2),
      ],
      nextBeforeMessageId: null,
    });
  });
  await page.route('**/api/agent/runs/status', (route) =>
    fulfillJson(
      route,
      runStatus(fixture, completed ? 'COMPLETED' : 'RUNNING', completed ? 7 : streamCalls > 0 ? 5 : 4, completed ? 3 : 2)
    )
  );
  await page.route('**/api/agent/runs/events', async (route) => {
    streamCalls += 1;
    streamBodies.push(route.request().postDataJSON() as { runId: string; afterSequence: number });
    if (streamCalls === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: frame(
          event(fixture, 'model.delta', 5, {
            modelCallId: 'model_resume',
            blockIndex: 0,
            delta: '中段',
          }),
          10_000
        ),
      });
      return;
    }
    completed = true;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: [
        frame(
          event(fixture, 'model.delta', 6, {
            modelCallId: 'model_resume',
            blockIndex: 0,
            delta: '后半段',
          })
        ),
        frame(
          event(fixture, 'agent.completed', 7, {
            finalMessageId: fixture.assistantMessageId,
          })
        ),
      ].join(''),
    });
  });

  await page.goto(`/agent/${fixture.conversationId}`);
  await expect(page.getByText('前半段中段')).toBeVisible();
  await expect.poll(() => streamCalls).toBe(1);

  await page.reload();

  await expect(page.getByText(finalAnswer, { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Response complete');
  expect(streamBodies).toEqual([
    { runId: fixture.runId, afterSequence: 4 },
    { runId: fixture.runId, afterSequence: 5 },
  ]);
  await expect(page.getByText(`${finalAnswer}后半段`, { exact: true })).toHaveCount(0);
});

test('AR-002：取消终态后重新生成，新旧回答独立且历史保留', async ({ page }) => {
  const first: RunFixture = {
    conversationId: 'cm_research_regenerate',
    runId: 'run_research_cancelled',
    userMessageId: 'msg_research_regenerate_user',
    assistantMessageId: 'msg_research_cancelled_assistant',
  };
  const second: RunFixture = {
    ...first,
    runId: 'run_research_regenerated',
    assistantMessageId: 'msg_research_regenerated_assistant',
  };
  let cancelRequested = false;
  let firstTerminal = false;
  let secondTerminal = false;
  let releaseCancelled!: () => void;
  const cancelled = new Promise<void>((resolve) => {
    releaseCancelled = resolve;
  });
  let regenerateBody: Record<string, unknown> | null = null;

  await page.route('**/api/agent/conversations/create', (route) =>
    fulfillJson(route, {
      conversationId: first.conversationId,
      status: 'ACTIVE',
      createdAt: '2026-07-20T01:00:00.000Z',
    })
  );
  await page.route('**/api/agent/conversations/detail', (route) =>
    fulfillJson(route, conversation(first, secondTerminal ? 3 : firstTerminal ? 2 : 0))
  );
  await page.route('**/api/agent/conversations/messages/list', (route) => {
    const items = firstTerminal
      ? [
          userMessage(first, '分析贵州茅台并允许停止'),
          assistantMessage(first, 'CANCELLED', null, 3),
          ...(secondTerminal
            ? [assistantMessage(second, 'COMPLETED', '重新生成后的可审计结论', 3)]
            : []),
        ]
      : [];
    return fulfillJson(route, { items, nextBeforeMessageId: null });
  });
  await page.route('**/api/agent/messages/send', (route) =>
    fulfillJson(route, {
      conversationId: first.conversationId,
      userMessageId: first.userMessageId,
      assistantMessageId: first.assistantMessageId,
      runId: first.runId,
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    })
  );
  await page.route('**/api/agent/runs/cancel', async (route) => {
    cancelRequested = true;
    releaseCancelled();
    await fulfillJson(route, {
      runId: first.runId,
      status: 'CANCEL_REQUESTED',
      statusVersion: 2,
      cancellationAccepted: true,
    });
  });
  await page.route('**/api/agent/runs/regenerate', async (route) => {
    regenerateBody = route.request().postDataJSON() as Record<string, unknown>;
    await fulfillJson(route, {
      conversationId: second.conversationId,
      sourceMessageId: first.assistantMessageId,
      assistantMessageId: second.assistantMessageId,
      runId: second.runId,
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    });
  });
  await page.route('**/api/agent/runs/status', async (route) => {
    const body = route.request().postDataJSON() as { runId: string };
    if (body.runId === second.runId) {
      await fulfillJson(route, runStatus(second, secondTerminal ? 'COMPLETED' : 'RUNNING', secondTerminal ? 4 : 0, 3));
      return;
    }
    await fulfillJson(route, runStatus(first, firstTerminal ? 'CANCELLED' : 'RUNNING', firstTerminal ? 3 : 2, 3));
  });
  let streamCalls = 0;
  await page.route('**/api/agent/runs/events', async (route) => {
    streamCalls += 1;
    if (streamCalls === 1) {
      await cancelled;
      firstTerminal = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: [
          frame(
            event(first, 'message.created', 1, {
              messageId: first.assistantMessageId,
              role: 'ASSISTANT',
              status: 'PENDING',
            })
          ),
          frame(event(first, 'agent.started', 2)),
          frame(event(first, 'agent.cancelled', 3, { cancelledBy: 'USER', reason: '用户取消' })),
        ].join(''),
      });
      return;
    }
    secondTerminal = true;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: [
        frame(
          event(second, 'message.created', 1, {
            messageId: second.assistantMessageId,
            role: 'ASSISTANT',
            status: 'PENDING',
          })
        ),
        frame(event(second, 'model.started', 2, { modelCallId: 'model_regenerated' })),
        frame(
          event(second, 'model.delta', 3, {
            modelCallId: 'model_regenerated',
            blockIndex: 0,
            delta: '重新生成后的可审计结论',
          })
        ),
        frame(
          event(second, 'agent.completed', 4, {
            finalMessageId: second.assistantMessageId,
          })
        ),
      ].join(''),
    });
  });

  await page.goto('/agent');
  await page.getByRole('textbox', { name: '研究问题' }).fill('分析贵州茅台并允许停止');
  await page.getByRole('button', { name: '发送问题' }).click();
  await page.getByRole('button', { name: '停止研究' }).click();

  await expect.poll(() => cancelRequested).toBe(true);
  await expect(page.getByLabel('Agent 回答').getByText('已停止')).toBeVisible();
  await page.getByRole('button', { name: '重新生成回答' }).click();

  await expect(page.getByText('重新生成后的可审计结论', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Agent 回答')).toHaveCount(2);
  expect(regenerateBody).toMatchObject({ messageId: first.assistantMessageId, modelPolicy: 'AUTO' });
});

test('AR-003：sequence gap 使用 Last-Event-ID 恢复，duplicate 不重复应用', async ({ page }) => {
  const fixture: RunFixture = {
    conversationId: 'cm_research_gap',
    runId: 'run_research_gap',
    userMessageId: 'msg_research_gap_user',
    assistantMessageId: 'msg_research_gap_assistant',
  };
  const answer = '缺口恢复后的唯一结论';
  const requests: Array<{ body: { runId: string; afterSequence: number }; lastEventId?: string }> = [];
  let completed = false;
  let streamCalls = 0;

  await page.route('**/api/agent/conversations/create', (route) =>
    fulfillJson(route, {
      conversationId: fixture.conversationId,
      status: 'ACTIVE',
      createdAt: '2026-07-20T01:00:00.000Z',
    })
  );
  await page.route('**/api/agent/conversations/detail', (route) =>
    fulfillJson(route, conversation(fixture, completed ? 2 : 0))
  );
  await page.route('**/api/agent/conversations/messages/list', (route) =>
    fulfillJson(route, {
      items: completed
        ? [
            userMessage(fixture, '验证协议恢复'),
            assistantMessage(fixture, 'COMPLETED', answer, 3),
          ]
        : [],
      nextBeforeMessageId: null,
    })
  );
  await page.route('**/api/agent/messages/send', (route) =>
    fulfillJson(route, {
      conversationId: fixture.conversationId,
      userMessageId: fixture.userMessageId,
      assistantMessageId: fixture.assistantMessageId,
      runId: fixture.runId,
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    })
  );
  await page.route('**/api/agent/runs/status', (route) =>
    fulfillJson(route, runStatus(fixture, completed ? 'COMPLETED' : 'RUNNING', completed ? 4 : 1, completed ? 3 : 2))
  );
  await page.route('**/api/agent/runs/events', async (route) => {
    streamCalls += 1;
    requests.push({
      body: route.request().postDataJSON() as { runId: string; afterSequence: number },
      ...(route.request().headers()['last-event-id']
        ? { lastEventId: route.request().headers()['last-event-id'] }
        : {}),
    });
    const created = event(fixture, 'message.created', 1, {
      messageId: fixture.assistantMessageId,
      role: 'ASSISTANT',
      status: 'PENDING',
    });
    if (streamCalls === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: [
          frame(created),
          frame(
            event(fixture, 'model.delta', 3, {
              modelCallId: 'model_gap',
              blockIndex: 0,
              delta: '不应提前应用',
            })
          ),
        ].join(''),
      });
      return;
    }
    completed = true;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: [
        frame(created),
        frame(event(fixture, 'model.started', 2, { modelCallId: 'model_gap' })),
        frame(
          event(fixture, 'model.delta', 3, {
            modelCallId: 'model_gap',
            blockIndex: 0,
            delta: answer,
          })
        ),
        frame(
          event(fixture, 'agent.completed', 4, {
            finalMessageId: fixture.assistantMessageId,
          })
        ),
      ].join(''),
    });
  });

  await page.goto('/agent');
  await page.getByRole('textbox', { name: '研究问题' }).fill('验证协议恢复');
  await page.getByRole('button', { name: '发送问题' }).click();

  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual({
    body: { runId: fixture.runId, afterSequence: 1 },
    lastEventId: `evt_${fixture.runId}_1`,
  });
  await expect(page.getByText(`${answer}${answer}`, { exact: true })).toHaveCount(0);
  await expect(page.getByText('不应提前应用', { exact: true })).toHaveCount(0);
});

test('AR-004：malformed SSE fail-closed，回查 FAILED 快照且不渲染脏数据', async ({ page }) => {
  const fixture: RunFixture = {
    conversationId: 'cm_research_malformed',
    runId: 'run_research_malformed',
    userMessageId: 'msg_research_malformed_user',
    assistantMessageId: 'msg_research_malformed_assistant',
  };
  let protocolFailed = false;
  let streamCalls = 0;

  await page.route('**/api/agent/conversations/create', (route) =>
    fulfillJson(route, {
      conversationId: fixture.conversationId,
      status: 'ACTIVE',
      createdAt: '2026-07-20T01:00:00.000Z',
    })
  );
  await page.route('**/api/agent/conversations/detail', (route) =>
    fulfillJson(route, conversation(fixture, protocolFailed ? 2 : 0))
  );
  await page.route('**/api/agent/conversations/messages/list', (route) =>
    fulfillJson(route, {
      items: protocolFailed
        ? [
            userMessage(fixture, '验证畸形协议'),
            assistantMessage(fixture, 'FAILED', null, 3),
          ]
        : [],
      nextBeforeMessageId: null,
    })
  );
  await page.route('**/api/agent/messages/send', (route) =>
    fulfillJson(route, {
      conversationId: fixture.conversationId,
      userMessageId: fixture.userMessageId,
      assistantMessageId: fixture.assistantMessageId,
      runId: fixture.runId,
      runStatus: 'QUEUED',
      streamEndpoint: '/api/agent/runs/events',
    })
  );
  await page.route('**/api/agent/runs/status', (route) =>
    fulfillJson(route, runStatus(fixture, 'FAILED', 1, 3))
  );
  await page.route('**/api/agent/runs/events', async (route) => {
    streamCalls += 1;
    protocolFailed = true;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: `id: evt_malformed\nevent: model.delta\ndata: {"schemaVersion":"9.9","delta":"<script>window.__pwned=true</script>"}\n\n`,
    });
  });

  await page.goto('/agent');
  await page.getByRole('textbox', { name: '研究问题' }).fill('验证畸形协议');
  await page.getByRole('button', { name: '发送问题' }).click();

  await expect(page.getByLabel('Agent 回答').getByText('失败', { exact: true })).toBeVisible();
  expect(streamCalls).toBe(1);
  await expect(page.getByText('<script>window.__pwned=true</script>', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => '__pwned' in window)).toBe(false);
});
