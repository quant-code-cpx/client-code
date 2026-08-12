import type { Page } from '@playwright/test';

import { test, expect } from '@playwright/test';

import { AGENT_EVENT_FIXTURES } from '../src/types/agent/generated';

import type { AgentSseEvent } from '../src/types/agent/generated';

const CONVERSATION_ID = 'cm_e2e_1';
const RUN_ID = 'run_e2e_1';
const USER_MESSAGE_ID = 'msg_user_e2e_1';
const ASSISTANT_MESSAGE_ID = 'msg_assistant_e2e_1';
const ANSWER = '贵州茅台当前研究结论已生成。';

function ok(data: unknown) {
  return JSON.stringify({ code: 0, data, message: '' });
}

function event(type: AgentSseEvent['type'], sequence: number): AgentSseEvent {
  const fixture = AGENT_EVENT_FIXTURES.find((item) => item.type === type);
  if (!fixture) throw new Error(`缺少 Agent E2E fixture: ${type}`);
  const result = {
    ...fixture,
    eventId: `evt_e2e_${sequence}`,
    sequence,
    runId: RUN_ID,
    conversationId: CONVERSATION_ID,
    messageId: ASSISTANT_MESSAGE_ID,
  } as AgentSseEvent;
  if (result.type === 'message.created') {
    return {
      ...result,
      payload: { messageId: ASSISTANT_MESSAGE_ID, role: 'ASSISTANT', status: 'PENDING' },
    };
  }
  if (result.type === 'model.delta') {
    return { ...result, payload: { ...result.payload, delta: ANSWER } };
  }
  if (result.type === 'agent.completed') {
    return { ...result, payload: { ...result.payload, finalMessageId: ASSISTANT_MESSAGE_ID } };
  }
  return result;
}

function frame(item: AgentSseEvent): string {
  return `id: ${item.eventId}\nevent: ${item.type}\ndata: ${JSON.stringify(item)}\n\n`;
}

async function mockAuth(page: Page) {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ accessToken: 'e2e-token' }),
    })
  );
  await page.route('**/api/user/profile/detail', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        id: 901,
        account: 'agent-e2e',
        nickname: 'Agent E2E',
        email: 'agent@example.com',
        wechat: null,
        role: 'USER',
        status: 'ACTIVE',
        backtestQuota: 10,
        watchlistLimit: 5,
      }),
    })
  );
}

async function mockAgent(page: Page, terminal: boolean) {
  let runCompleted = false;
  let cancelRequested = false;

  await page.route('**/api/agent/conversations/list', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ items: [], nextCursor: null }),
    })
  );
  await page.route('**/api/agent/conversations/create', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        conversationId: CONVERSATION_ID,
        status: 'ACTIVE',
        createdAt: '2026-07-20T01:00:00.000Z',
      }),
    })
  );
  await page.route('**/api/agent/conversations/detail', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        conversationId: CONVERSATION_ID,
        title: '贵州茅台研究',
        status: 'ACTIVE',
        modelPolicy: 'AUTO',
        preferredModel: null,
        messageCount: runCompleted ? 2 : 0,
        lastMessageAt: '2026-07-20T01:00:05.000Z',
        createdAt: '2026-07-20T01:00:00.000Z',
        updatedAt: '2026-07-20T01:00:05.000Z',
        statusVersion: 1,
      }),
    })
  );
  await page.route('**/api/agent/conversations/messages/list', (route) => {
    const items = runCompleted
      ? [
          {
            messageId: USER_MESSAGE_ID,
            role: 'USER',
            status: 'COMPLETED',
            contentText: '分析贵州茅台',
            contentBlocks: [],
            version: 1,
            parentMessageId: null,
            modelName: null,
            run: null,
            citations: [],
            createdAt: '2026-07-20T01:00:01.000Z',
            completedAt: '2026-07-20T01:00:01.000Z',
          },
          {
            messageId: ASSISTANT_MESSAGE_ID,
            role: 'ASSISTANT',
            status: 'COMPLETED',
            contentText: ANSWER,
            contentBlocks: [],
            version: 1,
            parentMessageId: USER_MESSAGE_ID,
            modelName: 'fixture-model',
            run: {
              runId: RUN_ID,
              status: 'COMPLETED',
              statusVersion: 3,
              endedAt: '2026-07-20T01:00:05.000Z',
            },
            citations: [],
            createdAt: '2026-07-20T01:00:02.000Z',
            completedAt: '2026-07-20T01:00:05.000Z',
          },
        ]
      : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ items, nextBeforeMessageId: null }),
    });
  });
  await page.route('**/api/agent/messages/send', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        conversationId: CONVERSATION_ID,
        userMessageId: USER_MESSAGE_ID,
        assistantMessageId: ASSISTANT_MESSAGE_ID,
        runId: RUN_ID,
        runStatus: 'QUEUED',
        streamEndpoint: '/api/agent/runs/events',
      }),
    })
  );
  await page.route('**/api/agent/runs/events', (route) => {
    const events = [
      event('message.created', 1),
      event('agent.started', 2),
      event('model.started', 3),
      event('model.delta', 4),
      ...(terminal ? [event('agent.completed', 5)] : []),
    ];
    if (terminal) runCompleted = true;
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: `: heartbeat\n\n${events.map(frame).join('')}`,
    });
  });
  await page.route('**/api/agent/runs/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        runId: RUN_ID,
        conversationId: CONVERSATION_ID,
        status: runCompleted ? 'COMPLETED' : cancelRequested ? 'CANCEL_REQUESTED' : 'RUNNING',
        statusVersion: cancelRequested ? 2 : runCompleted ? 3 : 1,
        currentStep: null,
        finalMessageId: runCompleted ? ASSISTANT_MESSAGE_ID : null,
        latestEventSequence: runCompleted ? 5 : 4,
        canCancel: !runCompleted && !cancelRequested,
        errorCode: null,
        errorMessage: null,
        queuedAt: '2026-07-20T01:00:01.000Z',
        startedAt: '2026-07-20T01:00:02.000Z',
        endedAt: runCompleted ? '2026-07-20T01:00:05.000Z' : null,
      }),
    })
  );
  await page.route('**/api/agent/runs/cancel', async (route) => {
    cancelRequested = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        runId: RUN_ID,
        status: 'CANCEL_REQUESTED',
        statusVersion: 2,
        cancellationAccepted: true,
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test('新建会话、发送并看到流式回答', async ({ page }) => {
  await mockAgent(page, true);
  await page.goto('/agent');

  const input = page.getByRole('textbox', { name: '研究问题' });
  await expect(input).toBeVisible();
  await input.fill('分析贵州茅台');
  await page.getByRole('button', { name: '发送问题' }).click();

  await expect(page).toHaveURL(new RegExp(`/agent/${CONVERSATION_ID}$`));
  const answer = page.getByLabel('Agent 回答');
  await expect(answer.getByText(ANSWER)).toBeVisible();
  await expect(answer).not.toContainText('生成中');
});

test('显式停止进入取消中并禁用重复操作', async ({ page }) => {
  await mockAgent(page, false);
  await page.goto('/agent');
  await page.getByRole('textbox', { name: '研究问题' }).fill('分析贵州茅台');
  await page.getByRole('button', { name: '发送问题' }).click();

  const stop = page.getByRole('button', { name: '停止研究' });
  await expect(stop).toBeVisible();
  await stop.click();

  await expect(page.getByRole('status').filter({ hasText: '正在停止' })).toContainText('正在停止');
  await expect(stop).toBeDisabled();
});
