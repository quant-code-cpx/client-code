import { devices, defineConfig } from '@playwright/test';

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
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
      testIgnore: ['**/agent-*.e2e.ts', '**/global-*.e2e.ts'],
    },
    {
      name: 'agent-chromium',
      testMatch: '**/agent-*.e2e.ts',
      testIgnore: '**/agent-real-backend.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3040',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: [
    {
      command: 'yarn dev',
      env: { VITE_REALTIME_ENABLED: 'false' },
      url: 'http://localhost:3039',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'yarn dev --port 3040',
      env: {
        VITE_AGENT_ENABLED: 'true',
        VITE_AGENT_RICH_BLOCKS_ENABLED: 'true',
        VITE_REALTIME_ENABLED: 'false',
      },
      url: 'http://localhost:3040',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
