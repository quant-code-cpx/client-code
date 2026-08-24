import type { Page } from '@playwright/test';

import { test, expect } from '@playwright/test';

import type { MessageBlock } from '../src/types/agent/generated';

const CONVERSATION_ID = 'cm_rich_e2e_1';
const RUN_ID = 'run_rich_e2e_1';

function ok(data: unknown) {
  return JSON.stringify({ code: 0, data, message: '' });
}

const provenance = {
  sourceType: 'DATABASE' as const,
  citationIds: ['citation_rich_1'],
  asOf: { tradeDate: '2026-07-17', retrievedAt: '2026-07-20T00:00:00.000Z' },
  timezone: 'Asia/Shanghai',
  currency: 'CNY',
  unit: '元',
};

const richBlocks: Array<MessageBlock | Record<string, unknown>> = [
  {
    blockId: 'markdown_rich',
    schemaVersion: 1,
    type: 'MARKDOWN',
    text: '## 可审计研究结论\n\n贵州茅台盈利质量保持稳定，关键数据见下方结构化块。',
  },
  {
    blockId: 'table_rich',
    schemaVersion: 1,
    type: 'TABLE',
    title: '核心指标',
    columns: [
      { key: 'metric', label: '指标', valueType: 'STRING' },
      { key: 'value', label: '数值', valueType: 'NUMBER', align: 'RIGHT' },
    ],
    rows: [
      { metric: 'PE TTM', value: 22.6 },
      { metric: 'ROE', value: 32.5 },
    ],
    rowKey: 'metric',
    truncated: false,
    provenance,
  },
  {
    blockId: 'chart_rich',
    schemaVersion: 1,
    type: 'CHART',
    title: '估值趋势',
    chart: 'LINE',
    xAxisType: 'DATETIME',
    series: [
      {
        key: 'pe',
        name: 'PE TTM',
        points: [
          { x: '2026-07-16', y: 22.1 },
          { x: '2026-07-17', y: 22.6 },
        ],
      },
    ],
    provenance,
  },
  {
    blockId: 'kline_rich',
    schemaVersion: 1,
    type: 'KLINE',
    title: '价格走势',
    tsCode: '600519.SH',
    frequency: 'DAILY',
    adjustment: 'FORWARD',
    priceUnit: '元',
    volumeUnit: '手',
    amountUnit: '千元',
    bars: [
      { tradeDate: '2026-07-16', open: 1480, high: 1505, low: 1475, close: 1498, volume: 800, amount: 1200000 },
      { tradeDate: '2026-07-17', open: 1498, high: 1520, low: 1490, close: 1512, volume: 920, amount: 1390000 },
    ],
    provenance: { ...provenance, adjustment: 'FORWARD' },
  },
  {
    blockId: 'financial_rich',
    schemaVersion: 1,
    type: 'FINANCIAL_METRICS',
    tsCode: '600519.SH',
    periods: [
      {
        reportPeriod: '2025-12-31',
        announcementDate: '2026-03-30',
        availableAt: '2026-03-30T08:00:00.000Z',
        metrics: [{ key: 'roe', label: 'ROE', value: 32.5, scale: 'PERCENT' }],
      },
    ],
    provenance,
  },
  { blockId: 'future_block', schemaVersion: 9, type: 'FUTURE_WIDGET', payload: '<script />' },
  {
    blockId: 'risk_rich',
    schemaVersion: 1,
    type: 'RISK_NOTICE',
    level: 'WARNING',
    code: 'NOT_INVESTMENT_ADVICE',
    text: '估值结果仅供研究，不构成投资建议。',
    provenance,
  },
];

async function mockAuth(page: Page) {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok({ accessToken: 'e2e-token' }) })
  );
  await page.route('**/api/user/profile/detail', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        id: 902,
        account: 'agent-rich-e2e',
        nickname: 'Agent Rich E2E',
        email: 'agent-rich@example.com',
        wechat: null,
        role: 'USER',
        status: 'ACTIVE',
        backtestQuota: 10,
        watchlistLimit: 5,
      }),
    })
  );
}

async function mockAgent(page: Page) {
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
    route.fulfill({ status: 200, contentType: 'application/json', body: ok({ items: [], nextCursor: null }) })
  );
  await page.route('**/api/agent/conversations/detail', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        conversationId: CONVERSATION_ID,
        title: '贵州茅台可审计研究',
        status: 'ACTIVE',
        modelPolicy: 'MANUAL',
        preferredModel: 'fixture-model',
        messageCount: 2,
        lastMessageAt: '2026-07-20T01:00:05.000Z',
        createdAt: '2026-07-20T01:00:00.000Z',
        updatedAt: '2026-07-20T01:00:05.000Z',
        statusVersion: 1,
      }),
    })
  );
  await page.route('**/api/agent/conversations/messages/list', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        items: [
          {
            messageId: 'msg_rich_user',
            role: 'USER',
            status: 'COMPLETED',
            contentText: '分析贵州茅台估值与盈利质量',
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
            messageId: 'msg_rich_assistant',
            role: 'ASSISTANT',
            status: 'COMPLETED',
            contentText: '可审计研究结论',
            contentBlocks: richBlocks,
            version: 1,
            parentMessageId: 'msg_rich_user',
            modelName: 'fixture-model',
            run: { runId: RUN_ID, status: 'COMPLETED', statusVersion: 3, endedAt: '2026-07-20T01:00:05.000Z' },
            citations: [
              {
                citationId: 'citation_rich_1',
                blockId: 'markdown_rich',
                claimKey: 'valuation',
                conclusionLevel: 'FACT',
                sourceType: 'OFFICIAL',
                title: '交易所财务公告',
                canonicalUrl: 'https://example.com/report',
                publisher: '交易所',
                retrievedAt: '2026-07-20T00:00:00.000Z',
                locator: { section: '财务指标' },
              },
            ],
            createdAt: '2026-07-20T01:00:02.000Z',
            completedAt: '2026-07-20T01:00:05.000Z',
          },
        ],
        nextBeforeMessageId: null,
      }),
    })
  );
  await page.route('**/api/agent/runs/tool-calls/list', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        payloadIncluded: false,
        items: [
          {
            toolCallId: 'tool_rich_1',
            toolName: 'get_stock_overview',
            toolVersion: '1.0.0',
            status: 'SUCCEEDED',
            attemptCount: 1,
            inputSummary: { tsCode: '600519.SH' },
            outputSummary: { rowCount: 1 },
            errorCode: null,
            errorMessage: null,
            durationMs: 128,
            dataAsOf: '2026-07-17T00:00:00.000Z',
            dataThrough: '2026-07-17T00:00:00.000Z',
            startedAt: '2026-07-20T01:00:02.000Z',
            finishedAt: '2026-07-20T01:00:03.000Z',
          },
        ],
      }),
    })
  );
}

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await mockAgent(page);
});

test('富回答同时展示 Tool、引用、表格、图表、K 线、风险与局部降级', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      if (message.text().includes('WebSocket is closed before the connection is established')) {
        return;
      }
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/agent/${CONVERSATION_ID}`);

  await expect(page.getByRole('heading', { name: '可审计研究结论' })).toBeVisible();
  await expect(page.getByRole('table', { name: '核心指标' })).toBeVisible();
  await expect(page.getByRole('img', { name: /估值趋势/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /600519.SH K 线图/ })).toBeVisible();
  await page.getByRole('button', { name: '查看 Tool 执行记录' }).click();
  await expect(page.getByRole('region', { name: 'Tool 执行记录' })).toBeVisible();
  await expect(page.getByText('引用来源')).toBeVisible();
  await expect(page.getByText(/版本未知或结构不合法/)).toBeVisible();
  await expect(page.getByText('估值结果仅供研究，不构成投资建议。')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.getByText('<script />')).toHaveCount(0);
  expect(consoleProblems).toEqual([]);
});
