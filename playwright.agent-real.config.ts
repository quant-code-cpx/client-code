import { devices, defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/agent-real-global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: 'http://localhost:3041',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  projects: [
    {
      name: 'agent-real-setup',
      testMatch: '**/agent-real-auth.setup.ts',
    },
    {
      name: 'agent-real-chromium',
      testMatch: '**/agent-real-backend.e2e.ts',
      dependencies: ['agent-real-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/agent-real.json',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: [
    {
      command: 'npm --prefix ../server-code run test:agent:playwright-backend',
      env: {
        ...process.env,
        AGENT_REAL_E2E_STATE_FILE: '../client-code/e2e/.agent-real-state.json',
      },
      url: 'http://localhost:3018/ready',
      reuseExistingServer: false,
      timeout: 240_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --port 3041',
      env: {
        VITE_API_URL: 'http://localhost:3018',
        VITE_API_BASE_URL: 'http://localhost:3018',
        VITE_WS_URL: 'ws://localhost:3018',
        VITE_AGENT_ENABLED: 'true',
        VITE_AGENT_RICH_BLOCKS_ENABLED: 'true',
        VITE_AGENT_STREAM_STALE_MS: '10000',
      },
      url: 'http://localhost:3041',
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
