import path from 'path';

import { test as base } from '@playwright/test';

const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'user.json');

export const test = base.extend<{ authedPage: import('@playwright/test').Page }>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
