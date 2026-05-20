import { test, expect } from './fixtures/auth.fixture';
import { waitForPageReady, waitForSkeletonGone } from './helpers/wait-helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Stock Detail Page E2E (688525.SH 科兴制药)', () => {
  const tsCode = '688525.SH';
  const screenshotDir = path.join(__dirname, '..', '..', '.gemini', 'antigravity', 'browser_recordings');

  test('Execute full stock detail test suite', async ({ authedPage }) => {
    // 收集控制台日志和报错
    const consoleErrors: string[] = [];
    authedPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    authedPage.on('pageerror', (err) => {
      consoleErrors.push(`[Page Error] ${err.message}\n${err.stack}`);
    });

    // SD-688525-001: 访问页面 & 首屏加载
    console.log('Navigating to stock detail for 688525.SH...');
    await authedPage.goto(`/stock/detail?code=${tsCode}`);
    await waitForPageReady(authedPage);
    await waitForSkeletonGone(authedPage);
    await authedPage.waitForTimeout(2000); // 确保图表初始化完毕

    // 截图保存首屏状态
    const mainScreenshot = path.join(screenshotDir, '01_market_tab.png');
    await authedPage.screenshot({ path: mainScreenshot });
    console.log(`Saved screenshot to ${mainScreenshot}`);

    // 断言股票名称和代码
    const nameHeader = authedPage.locator('h4').filter({ hasText: '科兴制药' });
    await expect(nameHeader).toBeVisible();
    await expect(authedPage.getByText(tsCode)).toBeVisible();

    // SD-688525-002: 验证头部 KPI
    const statItemValue = authedPage.locator('body');
    await expect(statItemValue).toContainText('今开');
    await expect(statItemValue).toContainText('昨收');
    await expect(statItemValue).toContainText('最高');
    await expect(statItemValue).toContainText('最低');
    await expect(statItemValue).toContainText('总市值');
    await expect(statItemValue).toContainText('流通市值');

    // SD-688525-003: 行情 K 线渲染
    const candleChart = authedPage.locator('[key*="candle-"]').first();
    await expect(candleChart).toBeVisible();
    const volChart = authedPage.locator('[key*="vol-"]').first();
    await expect(volChart).toBeVisible();

    // SD-688525-004: 周期和复权切换
    // 切换到 "周"
    const weekBtn = authedPage.getByRole('button', { name: '周', exact: true });
    await weekBtn.click();
    await authedPage.waitForTimeout(1000);
    await authedPage.screenshot({ path: path.join(screenshotDir, '02_market_tab_weekly.png') });

    // 切换到 "月"
    const monthBtn = authedPage.getByRole('button', { name: '月', exact: true });
    await monthBtn.click();
    await authedPage.waitForTimeout(1000);
    await authedPage.screenshot({ path: path.join(screenshotDir, '03_market_tab_monthly.png') });

    // 切回 "日"
    const dayBtn = authedPage.getByRole('button', { name: '日', exact: true });
    await dayBtn.click();
    await authedPage.waitForTimeout(1000);

    // SD-688525-005: 资金流向
    await expect(authedPage.locator('h6', { hasText: '今日资金流向' })).toBeVisible();
    await expect(authedPage.locator('h6', { hasText: '资金流向' })).toBeVisible();

    // SD-688525-006: 切换至 "分析" Tab 并检查子 Tab
    console.log('Switching to Analysis Tab...');
    const analysisTab = authedPage.getByRole('tab', { name: '分析' });
    await analysisTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '04_analysis_technical.png') });

    // 验证技术指标均线/信号
    await expect(authedPage.locator('body')).toContainText('多头排列');

    // 择时信号
    const timingTab = authedPage.getByRole('tab', { name: '择时信号' });
    await timingTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '05_analysis_timing.png') });

    // 筹码分布
    const chipTab = authedPage.getByRole('tab', { name: '筹码分布' });
    await chipTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '06_analysis_chip.png') });

    // 主力资金
    const mainMoneyTab = authedPage.getByRole('tab', { name: '主力资金' });
    await mainMoneyTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '07_analysis_main_money.png') });

    // 相对强弱
    const relativeTab = authedPage.getByRole('tab', { name: '相对强弱' });
    await relativeTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '08_analysis_relative_strength.png') });

    // SD-688525-007: 切换至 "财务" Tab
    console.log('Switching to Financials Tab...');
    const financialsTab = authedPage.getByRole('tab', { name: '财务' });
    await financialsTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '09_financials_tab.png') });
    await expect(authedPage.locator('body')).toContainText('关键指标');

    // 切换至 "利润表"
    const incomeTab = authedPage.getByRole('tab', { name: '利润表' });
    await incomeTab.click();
    await authedPage.waitForTimeout(1000);
    await authedPage.screenshot({ path: path.join(screenshotDir, '10_financials_income.png') });

    // SD-688525-008: 切换至 "公司与股本" Tab
    console.log('Switching to Company Suite Tab...');
    const companyTab = authedPage.getByRole('tab', { name: '公司与股本' });
    await companyTab.click();
    await authedPage.waitForTimeout(1500);
    await authedPage.screenshot({ path: path.join(screenshotDir, '11_company_tab.png') });
    await expect(authedPage.locator('body')).toContainText('成立日期');

    // 十大股东
    const topHoldersTab = authedPage.getByRole('tab', { name: '十大股东' });
    await topHoldersTab.click();
    await authedPage.waitForTimeout(1000);
    await authedPage.screenshot({ path: path.join(screenshotDir, '12_company_top_holders.png') });

    // SD-688525-009: 测试 "我的研究" 抽屉和 "生成研报" 对话框
    // 1. 我的研究笔记
    console.log('Testing My Research Notes drawer...');
    const notesBtn = authedPage.getByRole('button', { name: '我的研究' });
    await notesBtn.click();
    await authedPage.waitForTimeout(1000);
    await authedPage.screenshot({ path: path.join(screenshotDir, '13_notes_drawer.png') });
    // 关闭抽屉
    const closeDrawerBtn = authedPage.locator('button').filter({ hasText: '' }).first(); // Close icon is usually first iconbutton or can press escape
    await authedPage.keyboard.press('Escape');
    await authedPage.waitForTimeout(500);

    // 2. 生成研报
    console.log('Testing Generate Report dialog...');
    const reportBtn = authedPage.getByRole('button', { name: '生成研报' });
    await reportBtn.click();
    await authedPage.waitForTimeout(1000);
    await authedPage.screenshot({ path: path.join(screenshotDir, '14_report_dialog.png') });
    await authedPage.keyboard.press('Escape');

    // 检查是否有控制台报错
    if (consoleErrors.length > 0) {
      console.error('Test detected console errors:', consoleErrors);
    }
    expect(consoleErrors.filter(err => err.includes('[Page Error]') || err.includes('failed to load') || err.includes('ErrorBoundary')).length).toBe(0);
  });
});
