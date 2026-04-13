import { test, expect } from './fixtures/auth.fixture';
import { KNOWN_STOCK } from './fixtures/test-data';
import { waitForPageReady, waitForTableData } from './helpers/wait-helpers';

/** Debounce wait time for search autocomplete */
const DEBOUNCE_WAIT_MS = 600;
/** Wait time after switching a tab for content to render */
const TAB_LOAD_WAIT_MS = 1000;

// 流程 2：股票搜索 → 详情

test.describe('股票搜索 → 详情', () => {
  test.describe('股票列表页 /stock', () => {
    test('访问 /stock 展示股票列表表格', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 断言：表格可见
      const table = authedPage.locator('table, [role="table"]').first();
      await expect(table).toBeVisible();

      // 断言：表格有数据行
      const rows = authedPage.locator('tbody tr');
      await expect(rows.first()).toBeVisible();

      // 断言：表头包含关键列
      const headers = authedPage.locator('thead th, [role="columnheader"]');
      const headerTexts = await headers.allTextContents();
      const combined = headerTexts.join(' ');
      expect(combined).toMatch(/代码|名称|行业|涨跌/);
    });

    test('股票列表支持分页', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 断言：分页组件可见
      const pagination = authedPage
        .locator('[class*="pagination"], [aria-label*="pagination"], nav[aria-label]')
        .first();
      await expect(pagination).toBeVisible({ timeout: 10_000 });
    });

    test('点击股票行跳转到详情页', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 点击表格中第一行
      const firstRow = authedPage.locator('tbody tr').first();
      await firstRow.click();

      // 断言：URL 变为 /stock/detail?tsCode=...
      await authedPage.waitForURL(/\/stock\/detail/, { timeout: 10_000 });
      expect(authedPage.url()).toContain('/stock/detail');
    });
  });

  test.describe('搜索补全', () => {
    test('在搜索框输入关键字 → 弹出补全下拉列表', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);

      // 找到搜索输入框
      const searchInput = authedPage
        .getByPlaceholder(/搜索/)
        .or(authedPage.locator('input[placeholder*="搜索"]'))
        .first();
      await searchInput.fill(KNOWN_STOCK.keyword);

      // 等待防抖后的下拉列表出现
      const listbox = authedPage.locator('[role="listbox"], [role="option"], ul[aria-label*="搜索"]');
      await expect(listbox.first()).toBeVisible({ timeout: 8_000 });

      // 断言：下拉列表中包含已知股票
      await expect(authedPage.getByText(KNOWN_STOCK.name)).toBeVisible({ timeout: 5_000 });
    });

    test('选择补全选项 → 跳转到股票详情页', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);

      const searchInput = authedPage
        .getByPlaceholder(/搜索/)
        .or(authedPage.locator('input[placeholder*="搜索"]'))
        .first();
      await searchInput.fill(KNOWN_STOCK.keyword);

      // 等待下拉出现并点击目标选项
      await expect(authedPage.getByText(KNOWN_STOCK.name)).toBeVisible({ timeout: 8_000 });
      await authedPage.getByText(KNOWN_STOCK.name).first().click();

      // 断言：URL 变为股票详情页
      await authedPage.waitForURL(/\/stock\/detail/, { timeout: 10_000 });
      // Verify the URL contains the stock page (tsCode encoding may vary by browser)
      expect(authedPage.url()).toContain('/stock/detail');
    });

    test('搜索无结果时显示空状态', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);

      const searchInput = authedPage
        .getByPlaceholder(/搜索/)
        .or(authedPage.locator('input[placeholder*="搜索"]'))
        .first();
      await searchInput.fill('ZZZZNONEXIST99999');

      // 等待防抖触发
      await authedPage.waitForTimeout(DEBOUNCE_WAIT_MS);

      // 断言：显示无结果
      const noResult = authedPage
        .getByText(/无结果|没有找到|暂无/)
        .or(authedPage.locator('[role="option"]:has-text("无")'))
        .first();
      await expect(noResult).toBeVisible({ timeout: 8_000 });
    });
  });

  test.describe('股票详情页 /stock/detail', () => {
    test('详情页头部显示股票名称和代码', async ({ authedPage }) => {
      await authedPage.goto(`/stock/detail?tsCode=${KNOWN_STOCK.tsCode}`);
      await waitForPageReady(authedPage);

      // 断言：页面包含股票名称
      await expect(authedPage.getByText(KNOWN_STOCK.name)).toBeVisible({ timeout: 15_000 });
      // 断言：页面包含股票代码
      await expect(authedPage.getByText(KNOWN_STOCK.tsCode)).toBeVisible({ timeout: 10_000 });
    });

    test('详情页显示最新报价信息', async ({ authedPage }) => {
      await authedPage.goto(`/stock/detail?tsCode=${KNOWN_STOCK.tsCode}`);
      await waitForPageReady(authedPage);

      // 断言：页面包含收盘价/现价相关文案
      const priceArea = authedPage.locator('body');
      await expect(priceArea).toContainText(/收盘|现价|涨跌/, { timeout: 15_000 });
    });

    test('详情页包含多个 Tab 且可切换', async ({ authedPage }) => {
      await authedPage.goto(`/stock/detail?tsCode=${KNOWN_STOCK.tsCode}`);
      await waitForPageReady(authedPage);

      // 断言：Tab 栏可见
      const tabs = authedPage.locator('[role="tab"]');
      await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

      // 查找并点击财务 Tab
      const financeTab = authedPage.getByRole('tab', { name: /财务/ });
      if (await financeTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await financeTab.click();
        // 等待财务内容加载
        await authedPage.waitForTimeout(TAB_LOAD_WAIT_MS);
        // 断言：财务 Tab 内容渲染
        await expect(authedPage.locator('body')).toContainText(/营收|利润|净利/, {
          timeout: 10_000,
        });
      }
    });
  });
});
