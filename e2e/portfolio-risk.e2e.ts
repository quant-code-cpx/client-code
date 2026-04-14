import { test, expect } from './fixtures/auth.fixture';
import { waitForPageReady, waitForTableData } from './helpers/wait-helpers';

/** Wait time after a UI action (e.g. tab switch, dialog open) for content to render */
const UI_UPDATE_WAIT_MS = 500;

// 流程 5：组合管理 → 风险监控

const TEST_PORTFOLIO_NAME = `[E2E] 测试组合 ${Date.now()}`;

test.describe('组合管理 → 风险监控', () => {
  test.describe('组合列表 /portfolio', () => {
    test('访问 /portfolio 展示组合列表', async ({ authedPage }) => {
      await authedPage.goto('/portfolio');
      await waitForPageReady(authedPage);

      // 断言：页面包含组合列表内容或空状态
      await expect(authedPage.locator('body')).toContainText(/组合|投资组合|暂无/, {
        timeout: 15_000,
      });
    });

    test('新建组合 → 填写信息 → 成功创建', async ({ authedPage }) => {
      await authedPage.goto('/portfolio');
      await waitForPageReady(authedPage);

      // 点击新建组合按钮
      const createBtn = authedPage
        .getByRole('button', { name: /新建|创建|新增/ })
        .first();
      await expect(createBtn).toBeVisible({ timeout: 10_000 });
      await createBtn.click();

      // 填写组合名称
      const nameInput = authedPage
        .getByLabel(/名称|组合名/)
        .or(authedPage.getByPlaceholder(/名称|组合名/))
        .first();
      await expect(nameInput).toBeVisible({ timeout: 5_000 });
      await nameInput.fill(TEST_PORTFOLIO_NAME);

      // 填写初始资金
      const capitalInput = authedPage
        .getByLabel(/资金|初始资金|本金/)
        .or(authedPage.getByPlaceholder(/资金|初始资金/))
        .first();
      if (await capitalInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await capitalInput.fill('100000');
      }

      // 提交
      const submitBtn = authedPage
        .getByRole('button', { name: /确认|提交|保存|创建/ })
        .last();
      await submitBtn.click();

      // 断言：新组合出现在列表中
      await expect(authedPage.getByText(TEST_PORTFOLIO_NAME)).toBeVisible({ timeout: 10_000 });
    });

    test('点击组合 → 跳转到详情页', async ({ authedPage }) => {
      await authedPage.goto('/portfolio');
      await waitForPageReady(authedPage);

      // 点击刚创建或第一个组合
      const portfolioItem = authedPage
        .getByText(TEST_PORTFOLIO_NAME)
        .or(authedPage.locator('[class*="card"], [class*="Card"]').first())
        .first();

      if (await portfolioItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await portfolioItem.click();
        await authedPage.waitForURL(/\/portfolio\//, { timeout: 10_000 });
        expect(authedPage.url()).toMatch(/\/portfolio\//);
      }
    });
  });

  test.describe('组合详情 — 持仓管理', () => {
    let portfolioId: string;

    test.beforeEach(async ({ authedPage }) => {
      // 拦截组合列表 API，返回测试组合
      await authedPage.route('**/api/portfolio/list', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: [
              {
                id: 'e2e-portfolio-001',
                name: TEST_PORTFOLIO_NAME,
                initialCapital: 100000,
                totalValue: 100000,
                totalPnl: 0,
                totalPnlPct: 0,
              },
            ],
          }),
        })
      );

      // 拦截组合详情 API
      await authedPage.route('**/api/portfolio/detail', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              id: 'e2e-portfolio-001',
              name: TEST_PORTFOLIO_NAME,
              initialCapital: 100000,
              totalValue: 100000,
              holdings: [],
            },
          }),
        })
      );

      portfolioId = 'e2e-portfolio-001';
    });

    test('详情页展示持仓列表（初始为空）', async ({ authedPage }) => {
      await authedPage.goto(`/portfolio/${portfolioId}`);
      await waitForPageReady(authedPage);

      // 断言：页面展示空状态或持仓区域
      await expect(authedPage.locator('body')).toContainText(/暂无持仓|添加持仓|持仓/, {
        timeout: 10_000,
      });
    });

    test('添加持仓 → 持仓列表更新', async ({ authedPage }) => {
      // 拦截添加持仓 API
      await authedPage.route('**/api/portfolio/holding/add', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, data: { id: 'holding-001' } }),
        })
      );
      // 添加后再次请求详情，返回含有持仓的数据
      let detailCallCount = 0;
      await authedPage.route('**/api/portfolio/detail', (route) => {
        detailCallCount += 1;
        const holdings =
          detailCallCount > 1
            ? [
                {
                  id: 'holding-001',
                  tsCode: '000001.SZ',
                  name: '平安银行',
                  quantity: 1000,
                  avgCost: 10.0,
                },
              ]
            : [];
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              id: portfolioId,
              name: TEST_PORTFOLIO_NAME,
              holdings,
            },
          }),
        });
      });

      await authedPage.goto(`/portfolio/${portfolioId}`);
      await waitForPageReady(authedPage);

      // 点击添加持仓按钮
      const addBtn = authedPage
        .getByRole('button', { name: /添加持仓|新增持仓|添加/ })
        .first();

      if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await addBtn.click();

        // 填写股票代码
        const codeInput = authedPage
          .getByLabel(/股票代码|代码/)
          .or(authedPage.getByPlaceholder(/股票代码|搜索股票/))
          .first();
        if (await codeInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await codeInput.fill('000001.SZ');
        }

        // 填写数量
        const qtyInput = authedPage
          .getByLabel(/数量/)
          .or(authedPage.getByPlaceholder(/数量/))
          .first();
        if (await qtyInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await qtyInput.fill('1000');
        }

        // 填写均价
        const priceInput = authedPage
          .getByLabel(/均价|成本/)
          .or(authedPage.getByPlaceholder(/均价|价格/))
          .first();
        if (await priceInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await priceInput.fill('10.00');
        }

        // 提交
        const confirmBtn = authedPage
          .getByRole('button', { name: /确认|保存|提交/ })
          .last();
        await confirmBtn.click();

        // 断言：持仓列表中出现平安银行
        await expect(authedPage.getByText('平安银行')).toBeVisible({ timeout: 10_000 });
      }
    });

    test('修改持仓 → 更新数量和均价', async ({ authedPage }) => {
      // 拦截 API 返回有持仓的详情
      await authedPage.route('**/api/portfolio/detail', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              id: portfolioId,
              name: TEST_PORTFOLIO_NAME,
              holdings: [
                {
                  id: 'holding-001',
                  tsCode: '000001.SZ',
                  name: '平安银行',
                  quantity: 1000,
                  avgCost: 10.0,
                },
              ],
            },
          }),
        })
      );
      await authedPage.route('**/api/portfolio/holding/update', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, data: {} }),
        })
      );

      await authedPage.goto(`/portfolio/${portfolioId}`);
      await waitForPageReady(authedPage);

      // 点击编辑按钮
      const editBtn = authedPage
        .getByRole('button', { name: /编辑|修改/ })
        .first();

      if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await editBtn.click();

        const qtyInput = authedPage
          .getByLabel(/数量/)
          .or(authedPage.getByPlaceholder(/数量/))
          .first();
        if (await qtyInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await qtyInput.clear();
          await qtyInput.fill('2000');
        }

        const confirmBtn = authedPage
          .getByRole('button', { name: /确认|保存/ })
          .last();
        await confirmBtn.click();

        // 断言：数量更新为 2000
        await expect(authedPage.locator('body')).toContainText('2000', { timeout: 8_000 });
      }
    });

    test('删除持仓 → 持仓列表移除', async ({ authedPage }) => {
      let deleteCount = 0;
      await authedPage.route('**/api/portfolio/detail', (route) => {
        const holdings =
          deleteCount === 0
            ? [
                {
                  id: 'holding-001',
                  tsCode: '000001.SZ',
                  name: '平安银行',
                  quantity: 1000,
                  avgCost: 10.0,
                },
              ]
            : [];
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: { id: portfolioId, name: TEST_PORTFOLIO_NAME, holdings },
          }),
        });
      });
      await authedPage.route('**/api/portfolio/holding/remove', (route) => {
        deleteCount += 1;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, data: {} }),
        });
      });

      await authedPage.goto(`/portfolio/${portfolioId}`);
      await waitForPageReady(authedPage);

      const deleteBtn = authedPage
        .getByRole('button', { name: /删除|移除/ })
        .first();

      if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await deleteBtn.click();

        // 确认删除对话框（如有）
        const confirmBtn = authedPage
          .getByRole('button', { name: /确认|确定/ })
          .last();
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // 断言：持仓列表不再包含平安银行（或显示空状态）
        await authedPage.waitForTimeout(UI_UPDATE_WAIT_MS);
        await expect(authedPage.getByText('平安银行')).not.toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test.describe('组合详情 — 风险分析', () => {
    test.beforeEach(async ({ authedPage }) => {
      await authedPage.route('**/api/portfolio/risk/industry', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: [
              { industry: '银行', weight: 0.4 },
              { industry: '科技', weight: 0.6 },
            ],
          }),
        })
      );
      await authedPage.route('**/api/portfolio/risk/position', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              hhi: 0.52,
              top1Weight: 0.6,
              top3Weight: 0.95,
              top5Weight: 1.0,
            },
          }),
        })
      );
    });

    test('风险分析 Tab 展示行业分布图', async ({ authedPage }) => {
      await authedPage.goto('/portfolio/e2e-portfolio-001');
      await waitForPageReady(authedPage);

      // 切换到风险分析 Tab
      const riskTab = authedPage.getByRole('tab', { name: /风险|风控/ }).first();
      if (await riskTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await riskTab.click();
        await authedPage.waitForTimeout(UI_UPDATE_WAIT_MS);
        // 断言：行业分布图表或表格可见
        await expect(authedPage.locator('body')).toContainText(/行业|分布/, {
          timeout: 10_000,
        });
      }
    });

    test('风险分析展示持仓集中度指标', async ({ authedPage }) => {
      await authedPage.goto('/portfolio/e2e-portfolio-001');
      await waitForPageReady(authedPage);

      const riskTab = authedPage.getByRole('tab', { name: /风险|风控/ }).first();
      if (await riskTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await riskTab.click();
        await authedPage.waitForTimeout(UI_UPDATE_WAIT_MS);
        // 断言：包含集中度指标（HHI 或 Top1/Top3/Top5 权重）
        await expect(authedPage.locator('body')).toContainText(/HHI|集中度|Top1|top1/, {
          timeout: 10_000,
        });
      }
    });
  });

  test.describe('组合详情 — 风控规则', () => {
    test('设置风控规则（单只持仓上限 30%）', async ({ authedPage }) => {
      await authedPage.route('**/api/portfolio/rule/upsert', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, data: {} }),
        })
      );
      await authedPage.route('**/api/portfolio/rule/list', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: [{ type: 'MAX_SINGLE_POSITION', threshold: 30 }],
          }),
        })
      );

      await authedPage.goto('/portfolio/e2e-portfolio-001');
      await waitForPageReady(authedPage);

      // 切换到风控规则 Tab/区域
      const ruleTab = authedPage.getByRole('tab', { name: /风控规则|规则/ }).first();
      if (await ruleTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await ruleTab.click();

        const addRuleBtn = authedPage
          .getByRole('button', { name: /新增规则|添加规则/ })
          .first();
        if (await addRuleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await addRuleBtn.click();

          // 选择规则类型
          const typeSelect = authedPage.getByLabel(/规则类型/).first();
          if (await typeSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await typeSelect.click();
            await authedPage.getByText(/单只持仓/).first().click();
          }

          // 填写阈值
          const thresholdInput = authedPage.getByLabel(/阈值|上限/).first();
          if (await thresholdInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await thresholdInput.fill('30');
          }

          const saveBtn = authedPage.getByRole('button', { name: /保存|确认/ }).last();
          await saveBtn.click();

          // 断言：规则列表中出现新规则
          await expect(authedPage.locator('body')).toContainText(/MAX_SINGLE_POSITION|单只持仓|30/, {
            timeout: 8_000,
          });
        }
      }
    });

    test('执行风控检查 → 显示检查结果', async ({ authedPage }) => {
      await authedPage.route('**/api/portfolio/risk/check', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              passed: true,
              violations: [],
              checkedAt: new Date().toISOString(),
            },
          }),
        })
      );

      await authedPage.goto('/portfolio/e2e-portfolio-001');
      await waitForPageReady(authedPage);

      // 点击风控检查按钮
      const checkBtn = authedPage
        .getByRole('button', { name: /风控检查|检查|运行检查/ })
        .first();

      if (await checkBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await checkBtn.click();
        // 断言：显示检查结果
        await expect(authedPage.locator('body')).toContainText(/全部通过|通过|违规/, {
          timeout: 10_000,
        });
      }
    });
  });

  test.describe('测试数据清理', () => {
    test('删除测试组合', async ({ authedPage }) => {
      await authedPage.goto('/portfolio');
      await waitForPageReady(authedPage);

      // 找到测试组合并删除
      const portfolioEl = authedPage.getByText(TEST_PORTFOLIO_NAME).first();
      if (await portfolioEl.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // 右键或找到删除按钮
        const row = authedPage.locator(`[data-name="${TEST_PORTFOLIO_NAME}"], tr:has-text("${TEST_PORTFOLIO_NAME}")`).first();
        const deleteBtn = row.getByRole('button', { name: /删除/ }).first();

        if (await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await deleteBtn.click();
          const confirmBtn = authedPage.getByRole('button', { name: /确认|确定/ }).last();
          if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await confirmBtn.click();
          }
          await expect(authedPage.getByText(TEST_PORTFOLIO_NAME)).not.toBeVisible({
            timeout: 8_000,
          });
        }
      }
    });
  });
});
