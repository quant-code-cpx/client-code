import type { Page, Request, Response } from '@playwright/test';

import { execFileSync } from 'node:child_process';

import { test, expect } from '@playwright/test';

import { readAgentRealState } from './fixtures/agent-real';

const PROMPT = '分析贵州茅台当前估值，展示数据来源与截止时点';
const FINAL_ANSWER = '贵州茅台（600519.SH）概览已按固定数据快照完成核验，最新收盘价为 1,500 元。';

type SendResult = {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  runId: string;
};

type RunEvidence = {
  runId: string;
  userId: number;
  conversationId: string;
  triggerMessageId: string;
  responseMessageId: string;
  runStatus: string;
  assistantStatus: string;
  contentBlockTypes: string[];
  stepCount: number;
  toolCalls: Array<{ toolName: string; status: string; attemptCount: number }>;
  modelCalls: Array<{ purpose: string; status: string; attemptCount: number }>;
  citationCount: number;
  citationToolCallCount: number;
  sequences: number[];
  sequenceContinuous: boolean;
  terminalEvents: string[];
  lastEventType: string | null;
};

test.describe.configure({ mode: 'serial' });

test('AG-MVP-E2E-001：浏览器登录到真实 Worker/Tool/SSE/审计完整闭环', async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  const agentRequests: string[] = [];
  const sseContentTypes: string[] = [];
  page.on('request', (request) => recordAgentRequest(request, agentRequests));
  page.on('response', (response) => recordSseResponse(response, sseContentTypes));

  await page.goto('/agent');
  const result = await sendResearch(page, PROMPT);

  await expect(page).toHaveURL(new RegExp(`/agent/${result.conversationId}$`));
  await expect(page.getByRole('status')).toContainText(/等待开始|正在/);
  await expect(page.getByLabel('你的消息').getByText(PROMPT, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Agent 回答').getByText(FINAL_ANSWER, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Agent 回答').getByText('已完成')).toBeVisible();
  await expect(page.getByRole('region', { name: '引用来源' })).toBeVisible();

  await page.getByRole('button', { name: '查看 Tool 执行记录' }).click();
  const toolRegion = page.getByRole('region', { name: 'Tool 执行记录' });
  const toolSummary = toolRegion.getByRole('button', { name: /get_stock_overview 成功/ });
  await expect(toolRegion).toBeVisible();
  await expect(toolSummary).toBeVisible();
  await toolSummary.click();
  await expect(toolRegion.getByText(/数据时点/)).toBeVisible();

  expect(sseContentTypes.some((value) => value.includes('text/event-stream'))).toBe(true);
  expect(agentRequests).toEqual(
    expect.arrayContaining([
      '/api/agent/conversations/create',
      '/api/agent/messages/send',
      '/api/agent/runs/events',
      '/api/agent/conversations/messages/list',
      '/api/agent/runs/status',
      '/api/agent/runs/tool-calls/list',
    ])
  );

  const [evidence] = verifyRuns(result.runId);
  expect(evidence).toMatchObject({
    runId: result.runId,
    conversationId: result.conversationId,
    triggerMessageId: result.userMessageId,
    responseMessageId: result.assistantMessageId,
    runStatus: 'COMPLETED',
    assistantStatus: 'COMPLETED',
    stepCount: 8,
    sequenceContinuous: true,
    terminalEvents: ['agent.completed'],
    lastEventType: 'agent.completed',
    citationCount: 1,
    citationToolCallCount: 1,
  });
  expect(evidence.contentBlockTypes).toContain('MARKDOWN');
  expect(evidence.toolCalls).toEqual([
    { toolName: 'get_stock_overview', status: 'SUCCEEDED', attemptCount: 1 },
  ]);
  expect(evidence.modelCalls).toEqual([
    { purpose: 'PLAN', status: 'SUCCEEDED', attemptCount: 1 },
    { purpose: 'SYNTHESIZE', status: 'SUCCEEDED', attemptCount: 1 },
  ]);
  await persistAuthState(page);
  expect(consoleProblems).toEqual([]);
});

test('AG-MVP-E2E-002：运行中刷新后按权威 sequence 恢复且不重复', async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  const streamBodies: Array<{ runId: string; afterSequence: number }> = [];
  page.on('request', (request) => {
    if (!request.url().endsWith('/api/agent/runs/events')) return;
    const body = request.postDataJSON() as { runId: string; afterSequence: number };
    streamBodies.push(body);
  });

  await page.goto('/agent');
  const result = await sendResearch(page, `${PROMPT}，并验证刷新恢复`);
  await expect(page.getByRole('status')).toContainText('正在组织研究结论');

  await page.reload();

  await expect(page.getByLabel('Agent 回答').getByText(FINAL_ANSWER, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Agent 回答').getByText('已完成')).toBeVisible();
  await expect(page.getByLabel('你的消息')).toHaveCount(1);
  await expect(page.getByLabel('Agent 回答')).toHaveCount(1);
  await expect.poll(() => streamBodies.length).toBeGreaterThanOrEqual(2);
  expect(streamBodies.every((body) => body.runId === result.runId)).toBe(true);
  expect(streamBodies.at(-1)?.afterSequence).toBeGreaterThan(0);
  await expect(page.getByText(`${FINAL_ANSWER}${FINAL_ANSWER}`, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '查看 Tool 执行记录' }).click();
  await expect(
    page.getByRole('region', { name: 'Tool 执行记录' }).getByRole('button', { name: /get_stock_overview 成功/ })
  ).toHaveCount(1);
  await expect(page.getByRole('region', { name: '引用来源' })).toHaveCount(1);

  const [evidence] = verifyRuns(result.runId);
  expect(evidence).toMatchObject({
    runStatus: 'COMPLETED',
    assistantStatus: 'COMPLETED',
    sequenceContinuous: true,
    terminalEvents: ['agent.completed'],
    lastEventType: 'agent.completed',
  });
  expect(evidence.toolCalls).toHaveLength(1);
  expect(evidence.modelCalls).toHaveLength(2);
  await persistAuthState(page);
  expect(consoleProblems).toEqual([]);
});

test('AG-MVP-E2E-003：真实取消后重新生成，新旧 Run 与回答版本独立', async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto('/agent');
  const first = await sendResearch(page, `${PROMPT}，允许中途停止`);
  await expect(page.getByRole('status')).toContainText('正在组织研究结论');

  await page.getByRole('button', { name: '停止研究' }).click();
  await expect(page.getByRole('status')).toContainText(/正在停止|已停止/);
  await expect(page.getByLabel('Agent 回答').getByText('已停止')).toBeVisible();

  const regenerateResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/agent/runs/regenerate') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '重新生成回答' }).click();
  const second = await responseData<SendResult>(await regenerateResponse);

  await expect(page.getByLabel('Agent 回答').getByText(FINAL_ANSWER, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Agent 回答')).toHaveCount(2);
  await expect(page.getByLabel('Agent 回答').getByText('已停止')).toHaveCount(1);
  await expect(page.getByLabel('Agent 回答').getByText('已完成')).toHaveCount(1);

  const [cancelled, completed] = verifyRuns(first.runId, second.runId);
  expect(cancelled).toMatchObject({
    runId: first.runId,
    runStatus: 'CANCELLED',
    assistantStatus: 'CANCELLED',
    sequenceContinuous: true,
    terminalEvents: ['agent.cancelled'],
    lastEventType: 'agent.cancelled',
  });
  expect(cancelled.toolCalls).toEqual([
    { toolName: 'get_stock_overview', status: 'SUCCEEDED', attemptCount: 1 },
  ]);
  expect(cancelled.modelCalls).toHaveLength(2);
  expect(cancelled.modelCalls[0]).toEqual({
    purpose: 'PLAN',
    status: 'SUCCEEDED',
    attemptCount: 1,
  });
  expect(cancelled.modelCalls[1]).toMatchObject({ purpose: 'SYNTHESIZE', attemptCount: 1 });
  expect(['CANCELLED', 'SUCCEEDED']).toContain(cancelled.modelCalls[1].status);
  expect(completed).toMatchObject({
    runId: second.runId,
    conversationId: first.conversationId,
    runStatus: 'COMPLETED',
    assistantStatus: 'COMPLETED',
    sequenceContinuous: true,
    terminalEvents: ['agent.completed'],
    lastEventType: 'agent.completed',
  });
  expect(completed.responseMessageId).not.toBe(first.assistantMessageId);
  expect(completed.toolCalls).toHaveLength(1);
  expect(consoleProblems).toEqual([]);
});

async function sendResearch(page: Page, prompt: string): Promise<SendResult> {
  await page.getByRole('textbox', { name: '研究问题' }).fill(prompt);
  const sendResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/agent/messages/send') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '发送问题' }).click();
  return responseData<SendResult>(await sendResponse);
}

async function responseData<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { code: number; data: T; message?: string };
  expect(body.code).toBe(0);
  return body.data;
}

function verifyRuns(...runIds: string[]): RunEvidence[] {
  const state = readAgentRealState();
  const output = execFileSync(
    'pnpm',
    [
      '--dir',
      '../server-code',
      'exec',
      'ts-node',
      '-r',
      'tsconfig-paths/register',
      'scripts/verify-agent-playwright-run.ts',
      ...runIds,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: state.databaseUrl },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  return JSON.parse(output) as RunEvidence[];
}

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    if (message.text().includes('WebSocket is closed before the connection is established')) return;
    problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

function recordAgentRequest(request: Request, paths: string[]): void {
  const url = new URL(request.url());
  if (request.method() === 'POST' && url.pathname.startsWith('/api/agent/')) paths.push(url.pathname);
}

function recordSseResponse(response: Response, contentTypes: string[]): void {
  if (!response.url().endsWith('/api/agent/runs/events')) return;
  contentTypes.push(response.headers()['content-type'] ?? '');
}

async function persistAuthState(page: Page): Promise<void> {
  await page.context().storageState({ path: 'e2e/.auth/agent-real.json' });
}
