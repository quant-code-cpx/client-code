import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:3039',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.e2e\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global-teardown\.e2e\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: '**/agent-chat.e2e.ts',
    },
    {
      name: 'agent-chromium',
      testMatch: '**/agent-chat.e2e.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3040' },
    },
  ],

  webServer: [
    {
      command: 'yarn dev',
      url: 'http://localhost:3039',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'yarn dev --port 3040',
      env: { VITE_AGENT_ENABLED: 'true' },
      url: 'http://localhost:3040',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
