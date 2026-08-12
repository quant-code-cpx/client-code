import { resolve } from 'node:path';
import { test as setup } from '@playwright/test';

import { loginAgentReal } from './fixtures/agent-real';

const AUTH_STATE_PATH = resolve(process.cwd(), 'e2e/.auth/agent-real.json');

setup('真实后端登录并保存 Refresh Cookie', async ({ page }) => {
  await loginAgentReal(page);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
