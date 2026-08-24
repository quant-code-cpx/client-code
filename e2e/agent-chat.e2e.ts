import type { Page } from '@playwright/test';

import { test, expect } from '@playwright/test';

import { AGENT_EVENT_FIXTURES } from '../src/types/agent/generated';

import type { AgentSseEvent } from '../src/types/agent/generated';

const CONVERSATION_ID = 'cm_e2e_1';
const RUN_ID = 'run_e2e_1';
const USER_MESSAGE_ID = 'msg_user_e2e_1';
const ASSISTANT_MESSAGE_ID = 'msg_assistant_e2e_1';
const ANSWER = '贵州茅台当前研究结论已生成。';
const BRANCH_CONVERSATION_ID = 'cm_branch_e2e_1';
const BRANCH_QUESTION_ID = 'msg_branch_question_1';
const BRANCH_ANSWER_V1_ID = 'msg_branch_answer_v1';
const BRANCH_ANSWER_V2_ID = 'msg_branch_answer_v2';
const BRANCH_FOLLOW_UP_ID = 'msg_branch_question_2';
const BRANCH_FOLLOW_UP_ANSWER_ID = 'msg_branch_answer_3';
const BRANCH_FAILED_ANSWER_ID = 'msg_branch_answer_v52_failed';

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

  await page.route('**/api/agent/models/list', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        items: [
          {
            model: 'fixture-model',
            displayName: 'Fixture Model',
            provider: 'fixture',
            capabilities: ['STREAMING', 'STRUCTURED_OUTPUT'],
            reasoningEfforts: [],
            defaultReasoningEffort: null,
            contextWindow: 128000,
            maxOutputTokens: 8192,
            contextAccountingMode: 'SHARED_WINDOW',
            completionTokenAccounting: 'REASONING_AND_VISIBLE',
            supportedVerbosityLevels: [],
            costTier: 'LOW',
            status: 'AVAILABLE',
            reason: null,
          },
        ],
      }),
    })
  );
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
        modelPolicy: 'MANUAL',
        preferredModel: 'fixture-model',
        researchDepth: 'STANDARD',
        answerDetail: 'STANDARD',
        activeLeafMessageId: runCompleted ? ASSISTANT_MESSAGE_ID : null,
        branchVersion: runCompleted ? 1 : 0,
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
            contextParentMessageId: null,
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
            contextParentMessageId: USER_MESSAGE_ID,
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
      body: ok({
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId: runCompleted ? ASSISTANT_MESSAGE_ID : null,
        branchVersion: runCompleted ? 1 : 0,
        displayLeafMessageId: runCompleted ? ASSISTANT_MESSAGE_ID : null,
        lineageComplete: true,
        isActiveBranch: true,
        displayBranchCompatible: true,
        canAdoptDisplay: false,
        items,
        siblingGroups: runCompleted
          ? [
              {
                parentMessageId: USER_MESSAGE_ID,
                selectedMessageId: ASSISTANT_MESSAGE_ID,
                selectedVersion: 1,
                activeMessageId: ASSISTANT_MESSAGE_ID,
                totalVersions: 1,
                versions: [
                  {
                    messageId: ASSISTANT_MESSAGE_ID,
                    version: 1,
                    status: 'COMPLETED',
                    isActive: true,
                    isDisplayed: true,
                    canAdopt: false,
                    createdAt: '2026-07-20T01:00:02.000Z',
                  },
                ],
              },
            ]
          : [],
        nextBeforeMessageId: null,
      }),
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
        branchVersion: 1,
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

async function mockBranchHistory(page: Page) {
  let activeLeafMessageId = BRANCH_FOLLOW_UP_ANSWER_ID;
  let branchVersion = 5;
  let adoptionRequest: {
    conversationId: string;
    messageId: string;
    expectedBranchVersion: number;
  } | null = null;
  const createdAt = '2026-08-20T01:00:00.000Z';
  const question = {
    messageId: BRANCH_QUESTION_ID,
    role: 'USER',
    status: 'COMPLETED',
    contentText: '比较同一问题的回答版本',
    contentBlocks: [],
    version: 1,
    parentMessageId: null,
    contextParentMessageId: null,
    modelName: null,
    run: null,
    citations: [],
    createdAt,
    completedAt: createdAt,
  };
  const answerV1 = {
    messageId: BRANCH_ANSWER_V1_ID,
    role: 'ASSISTANT',
    status: 'COMPLETED',
    contentText: '第一版历史回答 A1',
    contentBlocks: [],
    version: 1,
    parentMessageId: BRANCH_QUESTION_ID,
    contextParentMessageId: BRANCH_QUESTION_ID,
    modelName: 'fixture-model',
    run: null,
    citations: [],
    createdAt: '2026-08-20T01:00:01.000Z',
    completedAt: '2026-08-20T01:00:02.000Z',
  };
  const answerV2 = {
    ...answerV1,
    messageId: BRANCH_ANSWER_V2_ID,
    contentText: '第二版当前回答 A2',
    version: 2,
    createdAt: '2026-08-20T01:00:03.000Z',
    completedAt: '2026-08-20T01:00:04.000Z',
  };
  const followUp = {
    ...question,
    messageId: BRANCH_FOLLOW_UP_ID,
    contentText: '只沿 A2 继续追问 Q2',
    parentMessageId: BRANCH_ANSWER_V2_ID,
    contextParentMessageId: BRANCH_ANSWER_V2_ID,
    createdAt: '2026-08-20T01:00:05.000Z',
    completedAt: '2026-08-20T01:00:05.000Z',
  };
  const followUpAnswer = {
    ...answerV1,
    messageId: BRANCH_FOLLOW_UP_ANSWER_ID,
    contentText: '沿 A2 得到的追问回答 A3',
    parentMessageId: BRANCH_FOLLOW_UP_ID,
    contextParentMessageId: BRANCH_FOLLOW_UP_ID,
    createdAt: '2026-08-20T01:00:06.000Z',
    completedAt: '2026-08-20T01:00:07.000Z',
  };
  const failedAnswer = {
    ...answerV1,
    messageId: BRANCH_FAILED_ANSWER_ID,
    status: 'FAILED',
    contentText: null,
    version: 52,
    run: {
      runId: 'run_branch_failed',
      status: 'FAILED',
      statusVersion: 4,
      endedAt: '2026-08-20T01:00:08.000Z',
      errorCode: 6007,
      errorMessage: '分支失败尝试',
    },
    createdAt: '2026-08-20T01:00:08.000Z',
    completedAt: '2026-08-20T01:00:08.000Z',
  };

  await page.route('**/api/agent/models/list', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        items: [
          {
            model: 'fixture-model',
            displayName: 'Fixture Model',
            provider: 'fixture',
            capabilities: ['STREAMING', 'STRUCTURED_OUTPUT'],
            reasoningEfforts: [],
            defaultReasoningEffort: null,
            contextWindow: 128000,
            maxOutputTokens: 8192,
            contextAccountingMode: 'SHARED_WINDOW',
            completionTokenAccounting: 'REASONING_AND_VISIBLE',
            supportedVerbosityLevels: [],
            costTier: 'LOW',
            status: 'AVAILABLE',
            reason: null,
          },
        ],
      }),
    })
  );
  await page.route('**/api/agent/conversations/list', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ items: [], nextCursor: null }),
    })
  );
  await page.route('**/api/agent/conversations/detail', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        conversationId: BRANCH_CONVERSATION_ID,
        title: '分支投影验证',
        status: 'ACTIVE',
        modelPolicy: 'MANUAL',
        preferredModel: 'fixture-model',
        researchDepth: 'STANDARD',
        answerDetail: 'STANDARD',
        activeLeafMessageId,
        branchVersion,
        messageCount: 55,
        lastMessageAt: '2026-08-20T01:00:08.000Z',
        createdAt,
        updatedAt: '2026-08-20T01:00:08.000Z',
        statusVersion: 1,
      }),
    })
  );
  await page.route('**/api/agent/conversations/messages/list', async (route) => {
    const request = route.request().postDataJSON() as {
      projection?: string;
      beforeMessageId?: string | null;
      displayMessageId?: string | null;
    };
    if (request.beforeMessageId === 'branch-cursor-v5' && branchVersion !== 5) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 6051, data: null, message: '分支已变化，游标失效' }),
      });
      return;
    }

    const displayLeafMessageId = request.displayMessageId ?? activeLeafMessageId;
    const displayingV1 = displayLeafMessageId === BRANCH_ANSWER_V1_ID;
    const displayingFailed = displayLeafMessageId === BRANCH_FAILED_ANSWER_ID;
    const selectedMessageId = displayingV1
      ? BRANCH_ANSWER_V1_ID
      : displayingFailed
        ? BRANCH_FAILED_ANSWER_ID
        : BRANCH_ANSWER_V2_ID;
    const activeSiblingMessageId =
      activeLeafMessageId === BRANCH_ANSWER_V1_ID ? BRANCH_ANSWER_V1_ID : BRANCH_ANSWER_V2_ID;
    const isActiveBranch = displayLeafMessageId === activeLeafMessageId;
    const versions = Array.from({ length: 52 }, (_, index) => {
      const version = index + 1;
      const messageId =
        version === 1
          ? BRANCH_ANSWER_V1_ID
          : version === 2
            ? BRANCH_ANSWER_V2_ID
            : version === 52
              ? BRANCH_FAILED_ANSWER_ID
              : `msg_branch_answer_v${version}`;
      const status = version === 52 ? 'FAILED' : 'COMPLETED';
      return {
        messageId,
        version,
        status,
        isActive: messageId === activeSiblingMessageId,
        isDisplayed: messageId === selectedMessageId,
        canAdopt: status === 'COMPLETED' && messageId !== activeSiblingMessageId,
        createdAt: `2026-08-20T01:${String(version).padStart(2, '0')}:00.000Z`,
      };
    });
    const items = displayingV1
      ? [question, answerV1]
      : displayingFailed
        ? [question, failedAnswer]
        : [question, answerV2, followUp, followUpAnswer];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        projection: 'ACTIVE_BRANCH',
        activeLeafMessageId,
        branchVersion,
        displayLeafMessageId,
        lineageComplete: true,
        isActiveBranch,
        displayBranchCompatible: isActiveBranch,
        canAdoptDisplay: displayingV1 && !isActiveBranch,
        items,
        siblingGroups: [
          {
            parentMessageId: BRANCH_QUESTION_ID,
            selectedMessageId,
            selectedVersion: displayingV1 ? 1 : displayingFailed ? 52 : 2,
            activeMessageId: activeSiblingMessageId,
            totalVersions: 52,
            versions,
          },
        ],
        nextBeforeMessageId: null,
      }),
    });
  });
  await page.route('**/api/agent/conversations/branches/adopt', async (route) => {
    adoptionRequest = route.request().postDataJSON() as typeof adoptionRequest;
    if (
      !adoptionRequest ||
      adoptionRequest.conversationId !== BRANCH_CONVERSATION_ID ||
      adoptionRequest.messageId !== BRANCH_ANSWER_V1_ID ||
      adoptionRequest.expectedBranchVersion !== branchVersion
    ) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 6051, data: null, message: '分支已变化' }),
      });
      return;
    }
    activeLeafMessageId = adoptionRequest.messageId;
    branchVersion += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        conversationId: BRANCH_CONVERSATION_ID,
        activeLeafMessageId,
        branchVersion,
      }),
    });
  });

  return {
    getAdoptionRequest: () => adoptionRequest,
  };
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

test('ACTIVE_BRANCH 可查看失败/历史版本，且不锁定继续提问', async ({ page }) => {
  const branch = await mockBranchHistory(page);
  await page.goto(`/agent/${BRANCH_CONVERSATION_ID}`);

  await expect(page.getByText('第二版当前回答 A2')).toBeVisible();
  await expect(page.getByText('只沿 A2 继续追问 Q2')).toBeVisible();
  await expect(page.getByText('沿 A2 得到的追问回答 A3')).toBeVisible();
  await expect(page.getByText('第一版历史回答 A1')).toHaveCount(0);

  const answerVersion = page.getByRole('combobox', { name: '回答版本' });
  await answerVersion.click();
  await expect(page.getByRole('option')).toHaveCount(52);
  await page.getByRole('option', { name: 'V52 · 失败' }).click();
  await expect(page.getByText('分支失败尝试')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '研究问题' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '重新生成回答' })).toHaveCount(0);
  await expect(page.getByText(/正在查看尚未成为|正在查看历史旁支/)).toHaveCount(0);

  await page.getByRole('combobox', { name: '回答版本' }).click();
  await page.getByRole('option', { name: 'V1 · 历史' }).click();
  await expect(page.getByText('第一版历史回答 A1')).toBeVisible();
  await expect(page.getByText('第二版当前回答 A2')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '研究问题' })).toBeEnabled();
  await expect(page.getByText(/正在查看尚未成为|正在查看历史旁支/)).toHaveCount(0);
  expect(branch.getAdoptionRequest()).toBeNull();
});
