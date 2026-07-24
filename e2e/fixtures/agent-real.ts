import type { Page, Response } from '@playwright/test';

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect } from '@playwright/test';

const STATE_PATH = resolve(process.cwd(), 'e2e/.agent-real-state.json');

export type AgentRealE2eState = {
  apiProcessId: number;
  apiUrl: string;
  databaseUrl: string;
  postgresContainer: string;
  redisContainer: string;
  redisPassword: string;
  account: string;
  password: string;
};

export function readAgentRealState(): AgentRealE2eState {
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as AgentRealE2eState;
}

export async function loginAgentReal(page: Page): Promise<void> {
  const state = readAgentRealState();
  const captchaIds: string[] = [];
  const captureCaptcha = (response: Response): void => {
    if (!response.url().endsWith('/api/auth/captcha') || response.request().method() !== 'POST') return;
    void response.json().then((body: { data?: { captchaId?: string } }) => {
      if (body.data?.captchaId) captchaIds.push(body.data.captchaId);
    });
  };
  page.on('response', captureCaptcha);
  await page.goto('/sign-in');
  await expect(page.locator('[title="点击刷新验证码"] svg')).toBeVisible();
  await expect.poll(() => captchaIds.length).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  page.off('response', captureCaptcha);
  for (const captchaId of new Set(captchaIds)) setCaptchaCode(state, captchaId, '1234');

  await page.getByLabel('账号').fill(state.account);
  await page.getByRole('textbox', { name: '密码' }).fill(state.password);
  await page.getByLabel('验证码').fill('1234');
  const loginResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /登\s*录/ }).click();
  const body = (await (await loginResponse).json()) as { code: number; data?: { accessToken?: string } };
  expect(body.code).toBe(0);
  expect(body.data?.accessToken).toBeTruthy();
  await page.waitForURL((url) => url.pathname === '/');
}

function setCaptchaCode(state: AgentRealE2eState, captchaId: string, code: string): void {
  execFileSync(
    'docker',
    [
      'exec',
      '--env',
      `REDISCLI_AUTH=${state.redisPassword}`,
      state.redisContainer,
      'redis-cli',
      'SET',
      `auth:captcha:${captchaId}`,
      code,
      'EX',
      '60',
    ],
    { stdio: 'pipe' }
  );
}
