import { test, expect } from '@playwright/test';

import { TEST_ACCOUNT } from './fixtures/test-data';

// 流程 1：登录 → 首页
// 注意：此流程不使用 authedPage fixture，从未登录状态开始

test.describe('登录 → 首页', () => {
  test.describe('页面渲染', () => {
    test('访问 /sign-in 渲染登录表单', async ({ page }) => {
      await page.goto('/sign-in');
      await expect(page.getByLabel('账号')).toBeVisible();
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible();
    await expect(page.getByLabel('验证码', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible();
    });

    test('验证码图片自动加载', async ({ page }) => {
      await page.goto('/sign-in');
      // 等待验证码区域出现（SVG 或 img 元素）
      const captchaArea = page.locator('img[alt*="验证码"], .captcha-img, svg').first();
      await expect(captchaArea).toBeVisible({ timeout: 10_000 });
    });

    test('点击验证码图片可刷新', async ({ page }) => {
      await page.goto('/sign-in');
      // 监听 captcha 接口调用次数
      let captchaCalls = 0;
      page.on('request', (req) => {
        if (req.url().includes('/api/auth/captcha')) captchaCalls += 1;
      });

      // 等待首次 captcha 加载完成
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      const beforeCount = captchaCalls;

      // 点击验证码图片区域触发刷新
      const captchaImg = page.locator('img[alt*="验证码"], .captcha-img, svg').first();
      await captchaImg.click();

      // 等待再次调用 captcha 接口
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      expect(captchaCalls).toBeGreaterThan(beforeCount);
    });
  });

  test.describe('表单验证', () => {
    test('不填账号直接提交 → 显示 "请输入账号" 错误', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      await page.getByRole('button', { name: /登\s*录/ }).click();
      await expect(page.getByRole('alert')).toContainText('请输入账号');
    });

    test('不填密码直接提交 → 显示 "请输入密码" 错误', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      await page.getByLabel('账号').fill(TEST_ACCOUNT.account);
      await page.getByRole('button', { name: /登\s*录/ }).click();
      await expect(page.getByRole('alert')).toContainText('请输入密码');
    });

    test('不填验证码直接提交 → 显示 "请输入验证码" 错误', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      await page.getByLabel('账号').fill(TEST_ACCOUNT.account);
    await page.getByLabel('密码', { exact: true }).fill(TEST_ACCOUNT.password);
      await page.getByRole('button', { name: /登\s*录/ }).click();
      await expect(page.getByRole('alert')).toContainText('请输入验证码');
    });
  });

  test.describe('登录成功', () => {
    test('正确填写所有字段 → 跳转到首页 Dashboard', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      await page.getByLabel('账号').fill(TEST_ACCOUNT.account);
    await page.getByLabel('密码', { exact: true }).fill(TEST_ACCOUNT.password);
    await page.getByLabel('验证码', { exact: true }).fill(TEST_ACCOUNT.captchaCode);
      await page.getByRole('button', { name: /登\s*录/ }).click();
      await page.waitForURL('/', { timeout: 15_000 });
      await expect(page).toHaveURL('/');
    });

    test('登录后侧边栏显示导航菜单', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      await page.getByLabel('账号').fill(TEST_ACCOUNT.account);
    await page.getByLabel('密码', { exact: true }).fill(TEST_ACCOUNT.password);
    await page.getByLabel('验证码', { exact: true }).fill(TEST_ACCOUNT.captchaCode);
      await page.getByRole('button', { name: /登\s*录/ }).click();
      await page.waitForURL('/', { timeout: 15_000 });
      // 侧边导航应包含关键菜单项
      const nav = page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();
      await expect(page.getByRole('navigation')).toContainText(/首页|行情|股票/);
    });
  });

  test.describe('登录失败', () => {
    test('账号或密码错误 → 显示错误 Alert 并刷新验证码', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });

      let captchaCalls = 0;
      page.on('request', (req) => {
        if (req.url().includes('/api/auth/captcha')) captchaCalls += 1;
      });

      await page.getByLabel('账号').fill('wrong-user');
    await page.getByLabel('密码', { exact: true }).fill('wrong-password');
    await page.getByLabel('验证码', { exact: true }).fill(TEST_ACCOUNT.captchaCode);
      await page.getByRole('button', { name: /登\s*录/ }).click();

      // 断言：显示错误信息
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });

      // 断言：验证码被自动刷新
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      expect(captchaCalls).toBeGreaterThan(0);
    });

    test('验证码错误 → 显示错误 Alert', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForResponse((res) => res.url().includes('/api/auth/captcha'), {
        timeout: 10_000,
      });
      await page.getByLabel('账号').fill(TEST_ACCOUNT.account);
    await page.getByLabel('密码', { exact: true }).fill(TEST_ACCOUNT.password);
    await page.getByLabel('验证码', { exact: true }).fill('wrong-code');
      await page.getByRole('button', { name: /登\s*录/ }).click();
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('未登录路由保护', () => {
    test('未登录访问受保护路由 → 重定向到 /sign-in', async ({ page }) => {
      // 直接访问受保护路由（确保无已保存的 storageState）
      await page.goto('/stock');
      await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 });
    });
  });
});
