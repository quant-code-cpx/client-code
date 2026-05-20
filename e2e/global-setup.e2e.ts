import path from 'path';
import { fileURLToPath } from 'url';

import { test as setup, expect } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'user.json');

setup.describe.configure({ mode: 'serial' });

setup('全局登录并缓存认证状态', async ({ page }) => {
  await page.goto('/sign-in');

  // 等待验证码加载
  await page.waitForSelector('[title="点击刷新验证码"] svg, img[alt*="验证码"]', { timeout: 10_000 });

  await page.getByLabel('账号').fill(process.env.E2E_ACCOUNT ?? 'e2e-test');
  await page.getByLabel('密码').fill(process.env.E2E_PASSWORD ?? 'e2e-test-pass');
  await page.getByLabel('验证码').fill(process.env.E2E_CAPTCHA_CODE ?? '1234');

  await page.getByRole('button', { name: /登\s*录/ }).click();

  // 等待跳转到首页
  await page.waitForURL('/', { timeout: 15_000 });
  await expect(page).toHaveURL('/');

  // 保存认证状态
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
