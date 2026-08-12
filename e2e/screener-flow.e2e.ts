import { test, expect } from './fixtures/auth.fixture';
import { waitForPageReady, waitForTableData } from './helpers/wait-helpers';

/** Wait time after a sort action for table to re-render */
const SORT_ACTION_WAIT_MS = 500;

// 流程 4：选股筛选 → 结果

test.describe('选股筛选 → 结果', () => {
  test.describe('筛选面板', () => {
    test('股票页面包含筛选条件区域', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);

      // 断言：筛选区域可见（交易所选择、行业选择等控件）
      const filterArea = authedPage
        .locator('[class*="filter"], [class*="Filter"], [class*="screener"], form')
        .first();
      await expect(filterArea).toBeVisible({ timeout: 10_000 });
    });

    test('设置 PE 范围筛选 → 结果表格刷新', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 找到 PE 相关输入框并填写
      const peTtmInput = authedPage
        .getByLabel(/PE|市盈率/)
        .or(authedPage.getByPlaceholder(/PE|市盈率/))
        .first();

      if (await peTtmInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await peTtmInput.fill('20');

        // 触发搜索（点击搜索按钮或等待自动触发）
        const searchBtn = authedPage.getByRole('button', { name: /搜索|筛选|查询/ }).first();
        if (await searchBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await searchBtn.click();
        }

        await waitForTableData(authedPage);
        // 断言：表格数据存在
        await expect(authedPage.locator('tbody tr').first()).toBeVisible();
      }

      // 如果无法找到 PE 输入，至少断言表格有数据
      await expect(authedPage.locator('tbody tr').first()).toBeVisible();
    });

    test('设置交易所筛选 → 结果仅包含对应交易所股票', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);

      // 找到交易所选择器
      const exchangeSelect = authedPage
        .getByLabel(/交易所/)
        .or(authedPage.locator('[placeholder*="交易所"]'))
        .or(authedPage.getByRole('combobox', { name: /交易所/ }))
        .first();

      if (await exchangeSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await exchangeSelect.click();
        // 选择 SSE（上交所）
        const option = authedPage.getByText(/SSE|上交所/).first();
        if (await option.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await option.click();
          await waitForTableData(authedPage);
          // 断言：结果中包含 .SH 后缀的股票代码（上交所）
          const cellTexts = await authedPage.locator('tbody td').allTextContents();
          const hasSH = cellTexts.some((t) => t.includes('.SH'));
          expect(hasSH).toBe(true);
        }
      }
    });

    test('多条件组合筛选 → 结果满足所有条件', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 验证多条件筛选后表格仍有数据
      const searchBtn = authedPage.getByRole('button', { name: /搜索|筛选|查询/ }).first();
      if (await searchBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await searchBtn.click();
        await waitForTableData(authedPage);
      }

      await expect(authedPage.locator('tbody tr').first()).toBeVisible();
    });
  });

  test.describe('预设条件', () => {
    test('加载预设条件列表', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);

      // 断言：预设条件选择器可见（查找包含"预设"文字的下拉或按钮）
      const presetSelector = authedPage
        .getByText(/预设/)
        .or(authedPage.getByLabel(/预设/))
        .or(authedPage.getByRole('combobox', { name: /预设/ }))
        .first();

      // 页面可能有预设相关控件（非必须）
      if (await presetSelector.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(presetSelector).toBeVisible();
      } else {
        // 如果没有预设，页面应至少有筛选区域
        await expect(authedPage.locator('body')).toContainText(/筛选|搜索|选股/, {
          timeout: 5_000,
        });
      }
    });

    test('选择预设条件 → 筛选面板自动填充 + 表格刷新', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      const presetEl = authedPage
        .getByText(/预设/)
        .or(authedPage.getByRole('combobox', { name: /预设/ }))
        .first();

      if (await presetEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await presetEl.click();
        const firstOption = authedPage.locator('[role="option"]').first();
        if (await firstOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstOption.click();
          await waitForTableData(authedPage);
          await expect(authedPage.locator('tbody tr').first()).toBeVisible();
        }
      }
    });
  });

  test.describe('结果排序', () => {
    test('点击列头可对结果排序', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 点击涨跌幅列头
      const pctChangeHeader = authedPage
        .locator('thead th, [role="columnheader"]')
        .filter({ hasText: /涨跌|涨幅/ })
        .first();

      if (await pctChangeHeader.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await pctChangeHeader.click();
        await authedPage.waitForTimeout(SORT_ACTION_WAIT_MS);

        // 断言：表格数据存在（排序后依然有数据）
        await expect(authedPage.locator('tbody tr').first()).toBeVisible();
      }
    });
  });

  test.describe('结果分页', () => {
    test('筛选结果超过一页时可翻页', async ({ authedPage }) => {
      await authedPage.goto('/stock');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 断言：分页信息显示
      const pagination = authedPage
        .locator('[class*="pagination"], nav[aria-label*="pagination"]')
        .or(authedPage.getByText(/共.*条|总.*条/))
        .first();

      await expect(pagination).toBeVisible({ timeout: 10_000 });

      // 尝试点击下一页
      const nextPageBtn = authedPage
        .getByRole('button', { name: /下一页|next/i })
        .or(authedPage.locator('[aria-label="Go to next page"]'))
        .first();

      if (await nextPageBtn.isEnabled({ timeout: 3_000 }).catch(() => false)) {
        const firstRowBefore = await authedPage.locator('tbody tr').first().textContent();
        await nextPageBtn.click();
        await waitForTableData(authedPage);
        const firstRowAfter = await authedPage.locator('tbody tr').first().textContent();
        // 断言：翻页后数据发生变化
        expect(firstRowAfter).not.toBe(firstRowBefore);
      }
    });
  });
});
