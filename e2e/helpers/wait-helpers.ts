import type { Page } from '@playwright/test';

/** Short timeout for checking if an element is initially visible */
const LOADING_CHECK_TIMEOUT = 2000;

/** Timeout for waiting for loading/skeleton indicators to disappear */
const ELEMENT_HIDE_TIMEOUT = 15_000;

/** Timeout for waiting for table rows to appear */
const TABLE_LOAD_TIMEOUT = 15_000;

/** 等待页面加载完成（无 Loading 指示器） */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // 等待 MUI LinearProgress 消失
  const loading = page.locator('[role="progressbar"]');
  if (await loading.isVisible({ timeout: LOADING_CHECK_TIMEOUT }).catch(() => false)) {
    await loading.waitFor({ state: 'hidden', timeout: ELEMENT_HIDE_TIMEOUT });
  }
}

/** 等待 Skeleton 组件消失 */
export async function waitForSkeletonGone(page: Page) {
  const skeleton = page.locator('.MuiSkeleton-root');
  if (
    await skeleton
      .first()
      .isVisible({ timeout: LOADING_CHECK_TIMEOUT })
      .catch(() => false)
  ) {
    await skeleton.first().waitFor({ state: 'hidden', timeout: ELEMENT_HIDE_TIMEOUT });
  }
}

/** 等待表格数据加载完成 */
export async function waitForTableData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: TABLE_LOAD_TIMEOUT });
}
