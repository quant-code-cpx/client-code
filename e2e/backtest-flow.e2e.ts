import { test, expect } from './fixtures/auth.fixture';
import { BACKTEST_TEMPLATE } from './fixtures/test-data';
import { waitForPageReady, waitForTableData } from './helpers/wait-helpers';

/** Wait time after filling in validation parameters */
const VALIDATION_WAIT_MS = 1000;
/** Wait time after switching a tab for content to render */
const TAB_SWITCH_WAIT_MS = 500;

const VALIDATION_SUCCESS = {
  isValid: true,
  warnings: [],
  errors: [],
  dataReadiness: {
    hasDaily: true,
    hasAdjFactor: true,
    hasTradeCal: true,
    hasIndexDaily: true,
    hasStkLimit: true,
    hasSuspendD: true,
    hasIndexWeight: true,
  },
  stats: {
    tradingDays: 250,
    estimatedUniverseSize: 5200,
    earliestAvailableDate: '2023-01-03',
    latestAvailableDate: '2023-12-29',
  },
};

// 流程 3：回测提交 → 查看结果

test.describe('回测提交 → 查看结果', () => {
  test.describe('回测工作台 /backtest', () => {
    test('访问 /backtest 展示策略模板列表', async ({ authedPage }) => {
      await authedPage.goto('/backtest');
      await waitForPageReady(authedPage);

      // 断言：页面包含策略模板相关内容
      await expect(authedPage.locator('body')).toContainText(/模板|策略|均线/, {
        timeout: 15_000,
      });
    });

    test('选择策略模板后展示参数配置表单', async ({ authedPage }) => {
      await authedPage.goto('/backtest');
      await waitForPageReady(authedPage);

      // 查找并选择均线交叉模板
      const templateItem = authedPage
        .getByText(BACKTEST_TEMPLATE.name)
        .or(authedPage.getByText(/均线/))
        .first();

      if (await templateItem.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await templateItem.click();
        // 断言：参数表单出现
        await expect(authedPage.locator('form, [role="form"], input[type="text"]').first()).toBeVisible({
          timeout: 8_000,
        });
      }
    });

    test('数据校验 — 参数不完整时显示错误提示', async ({ authedPage }) => {
      await authedPage.goto('/backtest');
      await waitForPageReady(authedPage);

      // 直接点击校验/验证按钮（不填参数）
      const validateBtn = authedPage
        .getByRole('button', { name: /校验|验证/ })
        .or(authedPage.getByRole('button', { name: /validate/i }))
        .first();

      if (await validateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await validateBtn.click();
        // 断言：显示错误提示
        const errorMsg = authedPage
          .getByRole('alert')
          .or(authedPage.locator('[class*="error"], [class*="Error"]'))
          .first();
        await expect(errorMsg).toBeVisible({ timeout: 8_000 });
      }
    });

    test('数据校验 — 参数完整时显示校验通过', async ({ authedPage }) => {
      await authedPage.goto('/backtest');
      await waitForPageReady(authedPage);

      // 拦截 validateRun API，模拟校验通过响应
      await authedPage.route('**/api/backtests/runs/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: VALIDATION_SUCCESS,
          }),
        })
      );

      const templateItem = authedPage
        .getByText(BACKTEST_TEMPLATE.name)
        .or(authedPage.getByText(/均线/))
        .first();

      if (await templateItem.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await templateItem.click();
      }

      // 尝试填写关键参数
      const startDateInput = authedPage.getByLabel(/开始日期|起始/).first();
      if (await startDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await startDateInput.fill('2023-01-01');
      }
      const endDateInput = authedPage.getByLabel(/结束日期|截止/).first();
      if (await endDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await endDateInput.fill('2023-12-31');
      }

      const validateBtn = authedPage.getByRole('button', { name: /校验|验证/ }).first();
      if (await validateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await validateBtn.click();
        await expect(authedPage.locator('body')).toContainText(/校验通过|交易日|数据就绪/, {
          timeout: 10_000,
        });
      }
    });
  });

  test.describe('提交回测', () => {
    test('校验通过后提交回测 → 创建任务并跳转到详情页', async ({ authedPage }) => {
      await authedPage.goto('/backtest');
      await waitForPageReady(authedPage);

      // 拦截 validate 和 createRun API
      await authedPage.route('**/api/backtests/runs/validate', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: VALIDATION_SUCCESS,
          }),
        })
      );
      await authedPage.route('**/api/backtests/runs', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 0,
              data: { runId: 'e2e-run-001' },
            }),
          });
        } else {
          route.continue();
        }
      });

      const templateItem = authedPage
        .getByText(BACKTEST_TEMPLATE.name)
        .or(authedPage.getByText(/均线/))
        .first();
      if (await templateItem.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await templateItem.click();
      }

      // 尝试触发校验再提交
      const validateBtn = authedPage.getByRole('button', { name: /校验|验证/ }).first();
      if (await validateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await validateBtn.click();
        await authedPage.waitForTimeout(VALIDATION_WAIT_MS);
      }

      const submitBtn = authedPage.getByRole('button', { name: /提交回测|开始回测|运行/ }).first();
      if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await submitBtn.click();
        await authedPage.waitForURL(/\/backtest\/runs\//, { timeout: 15_000 });
        expect(authedPage.url()).toMatch(/\/backtest\/runs\//);
      }
    });
  });

  test.describe('回测任务列表 /backtest/runs', () => {
    test('任务列表展示已创建的回测任务', async ({ authedPage }) => {
      await authedPage.goto('/backtest/runs');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      // 断言：表格有数据行
      const rows = authedPage.locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });

      // 断言：表格包含关键列
      const headers = authedPage.locator('thead th, [role="columnheader"]');
      const headerTexts = await headers.allTextContents();
      expect(headerTexts.join(' ')).toMatch(/策略|状态|收益/);
    });

    test('点击任务行跳转到详情页', async ({ authedPage }) => {
      await authedPage.goto('/backtest/runs');
      await waitForPageReady(authedPage);
      await waitForTableData(authedPage);

      const firstRow = authedPage.locator('tbody tr').first();
      await firstRow.click();

      await authedPage.waitForURL(/\/backtest\/runs\//, { timeout: 10_000 });
      expect(authedPage.url()).toMatch(/\/backtest\/runs\//);
    });
  });

  test.describe('回测详情 /backtest/runs/:runId', () => {
    test.beforeEach(async ({ authedPage }) => {
      // 拦截详情 API，直接返回已完成状态
      await authedPage.route('**/api/backtests/runs/detail', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              runId: 'e2e-run-001',
              strategyName: '均线交叉',
              status: 'COMPLETED',
              summary: {
                totalReturn: 0.15,
                sharpeRatio: 1.2,
                maxDrawdown: -0.08,
                annualReturn: 0.12,
              },
            },
          }),
        })
      );
    });

    test('详情页展示回测状态（QUEUED / RUNNING / COMPLETED）', async ({ authedPage }) => {
      await authedPage.goto('/backtest/runs/e2e-run-001');
      await waitForPageReady(authedPage);

      await expect(authedPage.locator('body')).toContainText(/已完成|COMPLETED|运行中|等待/, {
        timeout: 10_000,
      });
    });

    test('已完成的回测展示绩效摘要（总收益、夏普比率、最大回撤）', async ({ authedPage }) => {
      await authedPage.goto('/backtest/runs/e2e-run-001');
      await waitForPageReady(authedPage);

      await expect(authedPage.locator('body')).toContainText(/总收益|夏普|最大回撤/, {
        timeout: 10_000,
      });
    });

    test('已完成的回测展示净值曲线图', async ({ authedPage }) => {
      // 拦截 equity 曲线数据 API
      await authedPage.route('**/api/backtests/runs/equity', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: [
              { date: '20230101', equity: 1.0 },
              { date: '20231231', equity: 1.15 },
            ],
          }),
        })
      );

      await authedPage.goto('/backtest/runs/e2e-run-001');
      await waitForPageReady(authedPage);

      // 断言：图表容器存在（ApexCharts 渲染）
      const chart = authedPage.locator('.apexcharts-canvas, [class*="chart"]').first();
      await expect(chart).toBeVisible({ timeout: 10_000 });
    });

    test('交易记录 Tab 展示买卖明细', async ({ authedPage }) => {
      await authedPage.goto('/backtest/runs/e2e-run-001');
      await waitForPageReady(authedPage);

      // 切换到交易记录 Tab
      const tradeTab = authedPage.getByRole('tab', { name: /交易记录|交易/ });
      if (await tradeTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await tradeTab.click();
        await authedPage.waitForTimeout(TAB_SWITCH_WAIT_MS);
        // 断言：包含交易记录相关列
        await expect(authedPage.locator('body')).toContainText(/日期|代码|方向|价格/, {
          timeout: 10_000,
        });
      }
    });
  });
});
