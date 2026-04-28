# Phase 4：E2E 测试 — 详细设计文档

> **关联主文档**：[测试框架与计划-前端设计.md](测试框架与计划-前端设计.md) § Phase 4  
> **范围**：5 条核心用户流程（登录→首页、股票搜索→详情、回测提交→查看结果、选股筛选→结果导出、组合管理→风险监控）  
> **工具**：Playwright + `@playwright/test`  
> **预计新增测试**：~45–55 个测试用例，5 个测试文件  
> **预计覆盖率提升**：45% → 50%

---

## 一、环境搭建

### 1.1 依赖安装

```bash
# 安装 Playwright 及其测试运行器
yarn add -D @playwright/test

# 安装浏览器二进制（Chromium / Firefox / WebKit）
npx playwright install --with-deps chromium
```

> Playwright 仅安装 Chromium 即可满足 CI 需求，后续可按需扩展 Firefox / WebKit。

### 1.2 Playwright 配置

```ts
// playwright.config.ts（项目根目录新建）
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
    },
  ],

  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3039',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

### 1.3 目录结构

```
e2e/
├── global-setup.e2e.ts          ← 全局设置（登录并缓存 storageState）
├── global-teardown.e2e.ts       ← 全局清理
├── fixtures/
│   ├── auth.fixture.ts          ← 已认证 Page fixture
│   ├── api-helper.ts            ← API 请求封装（用于 setup/teardown 创建测试数据）
│   └── test-data.ts             ← 测试数据常量
├── helpers/
│   ├── selectors.ts             ← 可复用的页面选择器
│   └── wait-helpers.ts          ← 等待加载状态结束的辅助函数
├── login.e2e.ts                 ← 流程 1：登录→首页
├── stock-search-detail.e2e.ts   ← 流程 2：股票搜索→详情
├── backtest-flow.e2e.ts         ← 流程 3：回测提交→查看结果
├── screener-flow.e2e.ts         ← 流程 4：选股筛选→结果导出
└── portfolio-risk.e2e.ts        ← 流程 5：组合管理→风险监控
```

### 1.4 脚本命令

```jsonc
// package.json scripts 新增
{
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "e2e:headed": "playwright test --headed",
  "e2e:debug": "playwright test --debug",
  "e2e:report": "playwright show-report",
}
```

### 1.5 与 Vitest 隔离

Playwright 独立于 Vitest 运行，不共享 `vitest.config.ts`。两者互不干涉：

- `npm test` → Vitest（单元/组件/集成测试）
- `npm run e2e` → Playwright（E2E 测试）

在 `vitest.config.ts` 的 `exclude` 中添加 `'e2e/**'` 以避免 Vitest 意外扫描 E2E 文件。

---

## 二、测试基础设施

### 2.1 全局登录与 storageState 缓存

E2E 测试中大部分流程需要已登录状态。为避免每个测试重复执行登录流程，采用 Playwright 的 `storageState` 机制：在全局 setup 中通过 API 登录一次，将 cookie/localStorage 保存到文件，后续测试复用。

```ts
// e2e/global-setup.e2e.ts
import { test as setup } from '@playwright/test';

const STORAGE_STATE_PATH = 'e2e/.auth/user.json';

setup('全局登录并缓存认证状态', async ({ request }) => {
  // 1. 获取验证码
  const captchaRes = await request.post('/api/auth/captcha');
  const captcha = await captchaRes.json();
  // 注意：真实验证码无法自动识别。
  // 方案 A：后端提供测试环境固定验证码（推荐）
  // 方案 B：后端提供 /api/auth/test-login 绕过验证码
  // 方案 C：使用已知测试账号，后端配置固定验证码 "1234"

  // 2. 登录
  const loginRes = await request.post('/api/auth/login', {
    data: {
      account: process.env.E2E_ACCOUNT ?? 'e2e-test',
      password: process.env.E2E_PASSWORD ?? 'e2e-test-pass',
      captchaId: captcha.data.captchaId,
      captchaCode: process.env.E2E_CAPTCHA_CODE ?? '1234',
    },
  });
  const { data } = await loginRes.json();

  // 3. 将 token 写入 localStorage（模拟前端认证状态）
  // Playwright 的 storageState 需要通过浏览器上下文来设置
  // 这里使用 request context 完成 API 登录，再通过 browser 上下文设置 localStorage
});

setup.describe.configure({ mode: 'serial' });
```

```ts
// e2e/global-teardown.e2e.ts
import { test as teardown } from '@playwright/test';

teardown('清理测试状态', async () => {
  // 如需清理测试数据（如删除测试创建的组合、回测任务等），在此处执行
});
```

### 2.2 已认证 Page Fixture

```ts
// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{ authedPage: import('@playwright/test').Page }>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### 2.3 验证码处理策略

验证码是 E2E 登录测试的核心障碍。可选方案（按推荐度排序）：

| 方案                      | 说明                                                                | 优点               | 缺点           |
| ------------------------- | ------------------------------------------------------------------- | ------------------ | -------------- |
| **A. 测试环境固定验证码** | 后端在 `NODE_ENV=test` 时，`getCaptcha` 返回固定验证码（如 `1234`） | 零改动前端，最安全 | 需后端配合     |
| **B. 测试专用登录端点**   | 后端提供 `/api/auth/test-login`，仅在测试环境可用，跳过验证码       | 彻底绕过验证码     | 暴露额外端点   |
| **C. 环境变量注入**       | 通过 `E2E_CAPTCHA_CODE` 环境变量传入固定验证码                      | 灵活               | 需后端配合识别 |

> **推荐方案 A**：后端在测试环境下返回固定验证码 `1234`，前端 E2E 直接使用。

### 2.4 API 请求辅助函数

```ts
// e2e/fixtures/api-helper.ts
import type { APIRequestContext } from '@playwright/test';

/**
 * 封装 POST /api/* 请求，自动解包 { code, data } 格式
 */
export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await request.post(path, { data: body ?? {} });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`API ${path} failed: ${json.message}`);
  return json.data as T;
}
```

### 2.5 通用选择器与等待辅助

```ts
// e2e/helpers/selectors.ts

/** 侧边导航菜单项定位 */
export const navItem = (title: string) => `nav >> text="${title}"`;

/** MUI 表格行：按内容定位 */
export const tableRow = (text: string) => `tr:has-text("${text}")`;

/** Stock 搜索输入框 */
export const stockSearchInput = 'input[placeholder*="搜索"]';

/** 等待页面骨架屏/Loading 消失 */
export const loadingIndicator = '[role="progressbar"]';
```

```ts
// e2e/helpers/wait-helpers.ts
import type { Page } from '@playwright/test';

/** 等待页面加载完成（无 Loading 指示器） */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // 等待 MUI LoadingProgress 消失
  const loading = page.locator('[role="progressbar"]');
  if (await loading.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loading.waitFor({ state: 'hidden', timeout: 15_000 });
  }
}

/** 等待 Skeleton 组件消失 */
export async function waitForSkeletonGone(page: Page) {
  const skeleton = page.locator('.MuiSkeleton-root');
  if (
    await skeleton
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await skeleton.first().waitFor({ state: 'hidden', timeout: 15_000 });
  }
}

/** 等待表格数据加载完成 */
export async function waitForTableData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 15_000 });
}
```

### 2.6 测试数据常量

```ts
// e2e/fixtures/test-data.ts

/** 登录凭据 — 从环境变量读取，fallback 到默认测试账号 */
export const TEST_ACCOUNT = {
  account: process.env.E2E_ACCOUNT ?? 'e2e-test',
  password: process.env.E2E_PASSWORD ?? 'e2e-test-pass',
  captchaCode: process.env.E2E_CAPTCHA_CODE ?? '1234',
};

/** 已知存在的股票（用于搜索测试） */
export const KNOWN_STOCK = {
  tsCode: '000001.SZ',
  name: '平安银行',
  keyword: '平安',
};

/** 回测模板 ID */
export const BACKTEST_TEMPLATE = {
  id: 'MA_CROSS_SINGLE',
  name: '均线交叉',
};

/** 选股器预设条件 */
export const SCREENER_DEFAULTS = {
  exchange: 'SSE',
  minPeTtm: 0,
  maxPeTtm: 50,
};
```

---

## 三、逐流程测试规格

### 3.1 流程 1：登录 → 首页

| 属性         | 值                                                                           |
| ------------ | ---------------------------------------------------------------------------- |
| **覆盖页面** | `/sign-in` → `/`（Dashboard）                                                |
| **测试文件** | `e2e/login.e2e.ts`                                                           |
| **涉及 API** | `POST /api/auth/captcha` → `POST /api/auth/login` → `POST /api/auth/refresh` |
| **前置条件** | 无（此流程不使用 storageState，从未登录状态开始）                            |
| **优先级**   | P0（所有其他流程的前提）                                                     |

#### 页面交互分析

1. 访问 `/sign-in`，页面渲染登录表单（账号输入框、密码输入框、验证码输入框 + 验证码图片）
2. 验证码图片自动加载（`authApi.getCaptcha` → 返回 SVG）
3. 填写账号、密码、验证码
4. 点击「登录」按钮
5. 成功 → 调用 `signIn(accessToken)` + `loadProfile()` → `router.push('/')` 跳转到首页
6. 失败 → 显示 `<Alert>` 错误信息，自动刷新验证码

#### 测试用例

```
describe('登录 → 首页', () => {

  describe('页面渲染', () => {
    it('访问 /sign-in 渲染登录表单', async ({ page }) => {
      // 打开 /sign-in
      // 断言：标题 "Sign in to your account" 或 "登录" 文案存在
      // 断言：账号输入框（label="账号"）可见
      // 断言：密码输入框（label="密码"）可见
      // 断言：验证码输入框（label="验证码"）可见
      // 断言：登录按钮可见
    })

    it('验证码图片自动加载', async ({ page }) => {
      // 打开 /sign-in
      // 等待验证码区域出现 <img> 或 <svg> 元素
      // 断言：验证码图片可见且非 Skeleton
    })

    it('点击验证码图片可刷新', async ({ page }) => {
      // 打开 /sign-in
      // 等待验证码加载
      // 点击验证码图片区域
      // 断言：验证码图片重新加载（可通过 response 事件监听 /api/auth/captcha 被再次调用）
    })
  })

  describe('表单验证', () => {
    it('不填账号直接提交 → 显示 "请输入账号" 错误', async ({ page }) => {
      // 打开 /sign-in → 等待验证码加载
      // 直接点击登录按钮
      // 断言：Alert 包含 "请输入账号"
    })

    it('不填密码直接提交 → 显示 "请输入密码" 错误', async ({ page }) => {
      // 填写账号，不填密码
      // 点击登录按钮
      // 断言：Alert 包含 "请输入密码"
    })

    it('不填验证码直接提交 → 显示 "请输入验证码" 错误', async ({ page }) => {
      // 填写账号 + 密码，不填验证码
      // 点击登录按钮
      // 断言：Alert 包含 "请输入验证码"
    })
  })

  describe('登录成功', () => {
    it('正确填写所有字段 → 跳转到首页 Dashboard', async ({ page }) => {
      // 打开 /sign-in → 等待验证码加载
      // 填写账号、密码、验证码
      // 点击登录按钮
      // 等待导航完成
      // 断言：URL 变为 /（首页）
      // 断言：页面包含 Dashboard 相关内容（如侧边导航、"首页" 菜单项）
    })

    it('登录后侧边栏显示导航菜单', async ({ page }) => {
      // 登录成功后
      // 断言：侧边导航包含 "首页"、"行情"、"股票" 等菜单项
    })
  })

  describe('登录失败', () => {
    it('账号或密码错误 → 显示错误 Alert 并刷新验证码', async ({ page }) => {
      // 打开 /sign-in → 等待验证码加载
      // 填写错误的账号/密码 + 正确验证码
      // 监听 /api/auth/captcha 请求
      // 点击登录按钮
      // 断言：Alert 显示错误信息（如 "用户名或密码错误"）
      // 断言：验证码被自动刷新（captcha API 再次被调用）
    })

    it('验证码错误 → 显示错误 Alert', async ({ page }) => {
      // 打开 /sign-in
      // 填写正确账号/密码 + 错误验证码
      // 点击登录
      // 断言：Alert 显示验证码相关错误
    })
  })

  describe('未登录路由保护', () => {
    it('未登录访问受保护路由 → 重定向到 /sign-in', async ({ page }) => {
      // 直接访问 /stock（受保护路由）
      // 断言：URL 被重定向到 /sign-in
    })
  })

})
```

**预计用例数**：9

---

### 3.2 流程 2：股票搜索 → 详情

| 属性         | 值                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **覆盖页面** | `/stock`（选股器/股票列表） → `/stock/detail?tsCode=xxx`（股票详情）                                                                              |
| **测试文件** | `e2e/stock-search-detail.e2e.ts`                                                                                                                  |
| **涉及 API** | `POST /api/stock/screener`（选股列表）、`POST /api/stock/search`（搜索补全）、`POST /api/stock/detail`（详情）、`POST /api/stock/daily`（K 线）等 |
| **前置条件** | 已登录（使用 `authedPage` fixture）                                                                                                               |
| **优先级**   | P1                                                                                                                                                |

#### 页面交互分析

1. 访问 `/stock`，默认展示股票列表表格（分页 + 筛选条件）
2. 表格中显示股票代码、名称、行业、涨跌幅、市值等字段
3. 点击筛选条件（交易所、行业等）可过滤
4. 顶部搜索框输入关键字 → 出现下拉补全列表（`StockSearchAutocomplete`）
5. 选择补全结果 → 跳转到 `/stock/detail?tsCode=xxx`
6. 详情页包含：头部（股票名称/代码/价格）、多个 Tab（行情/财务/分析等）

#### 测试用例

```
describe('股票搜索 → 详情', () => {

  describe('股票列表页 /stock', () => {
    it('访问 /stock 展示股票列表表格', async ({ authedPage }) => {
      // 导航到 /stock
      // 等待表格数据加载
      // 断言：表格可见且有数据行
      // 断言：表头包含 "代码"、"名称"、"行业"、"涨跌幅" 等列
    })

    it('股票列表支持分页', async ({ authedPage }) => {
      // 导航到 /stock
      // 等待表格加载
      // 断言：分页组件可见（"共 X 条" 或分页按钮）
      // 点击下一页
      // 断言：表格数据发生变化
    })

    it('点击行业筛选可过滤股票列表', async ({ authedPage }) => {
      // 导航到 /stock
      // 选择某个行业筛选条件（如 "银行"）
      // 等待表格刷新
      // 断言：表格中的行业列均为 "银行"
    })

    it('点击股票行跳转到详情页', async ({ authedPage }) => {
      // 导航到 /stock
      // 等待表格加载
      // 点击表格中第一行
      // 断言：URL 变为 /stock/detail?tsCode=xxx
    })
  })

  describe('搜索补全', () => {
    it('在搜索框输入关键字 → 弹出补全下拉列表', async ({ authedPage }) => {
      // 导航到 /stock
      // 在搜索框中输入 "平安"
      // 等待下拉列表出现（500ms 防抖后）
      // 断言：下拉列表中包含 "平安银行"
    })

    it('选择补全选项 → 跳转到股票详情页', async ({ authedPage }) => {
      // 导航到 /stock
      // 输入 "平安" → 等待下拉出现
      // 点击 "平安银行 000001.SZ" 选项
      // 断言：URL 变为 /stock/detail?tsCode=000001.SZ
    })

    it('搜索无结果时显示空状态', async ({ authedPage }) => {
      // 输入一个不存在的关键字（如 "ZZZZNONEXIST"）
      // 等待防抖触发
      // 断言：下拉列表显示 "无结果" 或列表为空
    })
  })

  describe('股票详情页 /stock/detail', () => {
    it('详情页头部显示股票名称和代码', async ({ authedPage }) => {
      // 导航到 /stock/detail?tsCode=000001.SZ
      // 等待页面加载
      // 断言：页面包含 "平安银行" 和 "000001.SZ"
    })

    it('详情页显示最新报价信息', async ({ authedPage }) => {
      // 导航到详情页
      // 断言：页面包含收盘价、涨跌幅等数值
    })

    it('详情页包含多个 Tab 且可切换', async ({ authedPage }) => {
      // 导航到详情页
      // 断言：Tab 栏可见，包含 "行情"、"财务" 等 Tab
      // 点击 "财务" Tab
      // 断言：财务 Tab 内容渲染（如营收、利润表格）
    })
  })

})
```

**预计用例数**：9

---

### 3.3 流程 3：回测提交 → 查看结果

| 属性         | 值                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **覆盖页面** | `/backtest`（工作台） → `/backtest/runs`（任务列表） → `/backtest/runs/:runId`（详情）                                                                                                                                   |
| **测试文件** | `e2e/backtest-flow.e2e.ts`                                                                                                                                                                                               |
| **涉及 API** | `POST /api/backtests/strategy-templates`、`POST /api/backtests/runs/validate`、`POST /api/backtests/runs`（创建）、`POST /api/backtests/runs/list`、`POST /api/backtests/runs/detail`、`POST /api/backtests/runs/equity` |
| **前置条件** | 已登录                                                                                                                                                                                                                   |
| **优先级**   | P1                                                                                                                                                                                                                       |

#### 页面交互分析

1. 访问 `/backtest`（回测工作台），页面展示策略模板选择 + 参数配置表单
2. 选择策略模板（如 "均线交叉 MA_CROSS_SINGLE"）
3. 填写参数：起止日期、初始资金、股票池等
4. 点击「数据校验」按钮 → 调用 `validateRun` → 显示校验结果
5. 校验通过后点击「提交回测」→ 调用 `createRun` → 返回 runId → 自动跳转到详情页
6. 详情页：状态轮询（QUEUED → RUNNING → COMPLETED），完成后展示净值曲线、绩效指标、交易记录

#### 测试用例

```
describe('回测提交 → 查看结果', () => {

  describe('回测工作台 /backtest', () => {
    it('访问 /backtest 展示策略模板列表', async ({ authedPage }) => {
      // 导航到 /backtest
      // 等待模板列表加载
      // 断言：页面包含 "均线交叉"、"因子选股" 等模板名称
    })

    it('选择策略模板后展示参数配置表单', async ({ authedPage }) => {
      // 导航到 /backtest
      // 选择 "均线交叉" 模板
      // 断言：参数表单渲染（包含日期选择器、初始资金输入框等）
    })

    it('数据校验 — 参数不完整时显示错误提示', async ({ authedPage }) => {
      // 选择模板但不填写必填参数
      // 点击 "校验" / "验证" 按钮
      // 断言：显示参数校验错误
    })

    it('数据校验 — 参数完整时显示校验通过', async ({ authedPage }) => {
      // 选择模板、填写完整参数（起止日期、初始资金等）
      // 点击校验按钮
      // 等待 validateRun API 响应
      // 断言：显示 "校验通过" 或数据就绪信息（交易日数等）
    })
  })

  describe('提交回测', () => {
    it('校验通过后提交回测 → 创建任务并跳转到详情页', async ({ authedPage }) => {
      // 选择模板、填写参数
      // 校验通过
      // 点击 "提交回测" 按钮
      // 等待 createRun API 响应
      // 断言：URL 变为 /backtest/runs/:runId
    })
  })

  describe('回测任务列表 /backtest/runs', () => {
    it('任务列表展示已创建的回测任务', async ({ authedPage }) => {
      // 导航到 /backtest/runs
      // 等待表格加载
      // 断言：表格包含刚创建的回测任务（或至少有数据行）
      // 断言：表格列包含 "策略名称"、"状态"、"总收益" 等字段
    })

    it('点击任务行跳转到详情页', async ({ authedPage }) => {
      // 点击表格中某一行
      // 断言：URL 变为 /backtest/runs/:runId
    })
  })

  describe('回测详情 /backtest/runs/:runId', () => {
    it('详情页展示回测状态（QUEUED / RUNNING / COMPLETED）', async ({ authedPage }) => {
      // 导航到已知的回测详情页
      // 断言：页面包含状态标签（如 "已完成"、"运行中"）
    })

    it('已完成的回测展示绩效摘要（总收益、夏普比率、最大回撤）', async ({ authedPage }) => {
      // 导航到已完成的回测详情页
      // 断言：页面包含 "总收益"、"夏普比率"、"最大回撤" 等指标
    })

    it('已完成的回测展示净值曲线图', async ({ authedPage }) => {
      // 断言：页面包含 ApexChart 渲染的图表容器
    })

    it('交易记录 Tab 展示买卖明细', async ({ authedPage }) => {
      // 切换到交易记录 Tab
      // 断言：表格包含 "日期"、"代码"、"方向"（买/卖）、"价格"、"数量" 等列
    })
  })

})
```

**预计用例数**：10

---

### 3.4 流程 4：选股筛选 → 结果导出

| 属性         | 值                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **覆盖页面** | `/stock`（选股器集成在股票列表页）                                                                                       |
| **测试文件** | `e2e/screener-flow.e2e.ts`                                                                                               |
| **涉及 API** | `POST /api/stock/screener`（筛选）、`POST /api/stock/screener/presets`（预设）、`POST /api/stock/industries`（行业列表） |
| **前置条件** | 已登录                                                                                                                   |
| **优先级**   | P2                                                                                                                       |

#### 页面交互分析

1. 访问 `/stock`，选股器以筛选面板形式集成在页面中
2. 筛选维度：基本面（交易所、行业、地域）、估值（PE、PB）、行情（涨跌幅、换手率）、财务（ROE、毛利率）
3. 设置筛选条件 → 点击"搜索"/"筛选" → 表格刷新显示匹配结果
4. 结果表格支持排序（点击列头）
5. 预设条件快速选择
6. 结果可导出（如有导出功能）

#### 测试用例

```
describe('选股筛选 → 结果', () => {

  describe('筛选面板', () => {
    it('股票页面包含筛选条件区域', async ({ authedPage }) => {
      // 导航到 /stock
      // 断言：筛选区域可见（交易所选择、行业选择、PE 范围等控件）
    })

    it('设置 PE 范围筛选 → 结果表格刷新', async ({ authedPage }) => {
      // 导航到 /stock
      // 设置 minPeTtm = 0, maxPeTtm = 20
      // 触发筛选（点击搜索/自动触发）
      // 等待表格刷新
      // 断言：表格数据发生变化
    })

    it('设置交易所筛选 → 结果仅包含对应交易所股票', async ({ authedPage }) => {
      // 选择 "SSE"（上交所）
      // 触发筛选
      // 断言：结果表格中的股票代码以 .SH 结尾（上交所股票）
    })

    it('多条件组合筛选 → 结果满足所有条件', async ({ authedPage }) => {
      // 设置行业 = "银行" + PE < 10
      // 触发筛选
      // 断言：结果中行业均为 "银行"，且 PE 值 < 10
    })
  })

  describe('预设条件', () => {
    it('加载预设条件列表', async ({ authedPage }) => {
      // 导航到 /stock
      // 断言：预设条件选择器可见且有选项
    })

    it('选择预设条件 → 筛选面板自动填充 + 表格刷新', async ({ authedPage }) => {
      // 选择某个预设
      // 断言：筛选面板中的值被自动设置
      // 断言：表格数据已刷新
    })
  })

  describe('结果排序', () => {
    it('点击列头可对结果排序', async ({ authedPage }) => {
      // 点击 "涨跌幅" 列头
      // 断言：表格按涨跌幅排序（第一行的涨跌幅 >= 第二行，或反之）
    })
  })

  describe('结果分页', () => {
    it('筛选结果超过一页时可翻页', async ({ authedPage }) => {
      // 使用宽松筛选条件（获取较多结果）
      // 断言：分页信息显示总条数
      // 点击第二页
      // 断言：表格数据变化
    })
  })

})
```

**预计用例数**：8

---

### 3.5 流程 5：组合管理 → 风险监控

| 属性         | 值                                                                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **覆盖页面** | `/portfolio`（组合列表） → `/portfolio/:id`（组合详情，含持仓管理 + 风险分析 Tab）                                                                                                                                                                                          |
| **测试文件** | `e2e/portfolio-risk.e2e.ts`                                                                                                                                                                                                                                                 |
| **涉及 API** | `POST /api/portfolio/create`、`POST /api/portfolio/list`、`POST /api/portfolio/detail`、`POST /api/portfolio/holding/add`、`POST /api/portfolio/risk/industry`、`POST /api/portfolio/risk/position`、`POST /api/portfolio/risk/check`、`POST /api/portfolio/rule/upsert` 等 |
| **前置条件** | 已登录                                                                                                                                                                                                                                                                      |
| **优先级**   | P2                                                                                                                                                                                                                                                                          |

#### 页面交互分析

1. 访问 `/portfolio` 展示组合列表（卡片或表格形式）
2. 点击「新建组合」→ 弹窗/表单填写名称 + 初始资金 → 调用 `createPortfolio`
3. 点击组合卡片 → 跳转到 `/portfolio/:id`（组合详情）
4. 详情页含多个 Tab/区域：
   - **持仓管理**：添加/修改/删除持仓（`addHolding` / `updateHolding` / `removeHolding`）
   - **盈亏追踪**：当日盈亏 + 历史净值曲线
   - **风险分析**：行业分布、持仓集中度、市值分布、Beta 分析
   - **风控规则**：设置风控阈值（单只持仓上限、行业权重上限、最大回撤止损）+ 触发检查
5. 点击「风控检查」→ 调用 `checkRisk` → 显示违规/通过结果

#### 测试用例

```
describe('组合管理 → 风险监控', () => {

  describe('组合列表 /portfolio', () => {
    it('访问 /portfolio 展示组合列表', async ({ authedPage }) => {
      // 导航到 /portfolio
      // 等待数据加载
      // 断言：页面包含组合卡片或表格（或 "暂无组合" 空状态）
    })

    it('新建组合 → 填写信息 → 成功创建', async ({ authedPage }) => {
      // 点击 "新建组合" 按钮
      // 填写名称（如 "E2E测试组合"）和初始资金（100000）
      // 提交
      // 断言：新组合出现在列表中
    })

    it('点击组合 → 跳转到详情页', async ({ authedPage }) => {
      // 点击刚创建的组合
      // 断言：URL 变为 /portfolio/:id
    })
  })

  describe('组合详情 — 持仓管理', () => {
    it('详情页展示持仓列表（初始为空）', async ({ authedPage }) => {
      // 导航到新组合详情页
      // 断言：持仓区域显示空状态或 "暂无持仓"
    })

    it('添加持仓 → 持仓列表更新', async ({ authedPage }) => {
      // 点击 "添加持仓" 按钮
      // 搜索/输入 "000001.SZ"（平安银行）
      // 填写数量 1000、均价 10.00
      // 提交
      // 断言：持仓列表中出现 "平安银行"
      // 断言：数量和均价显示正确
    })

    it('修改持仓 → 更新数量和均价', async ({ authedPage }) => {
      // 点击持仓行的编辑按钮
      // 修改数量为 2000
      // 保存
      // 断言：持仓列表中数量更新为 2000
    })

    it('删除持仓 → 持仓列表移除', async ({ authedPage }) => {
      // 点击持仓行的删除按钮
      // 确认删除
      // 断言：持仓列表中不再包含该股票
    })
  })

  describe('组合详情 — 风险分析', () => {
    it('风险分析 Tab 展示行业分布图', async ({ authedPage }) => {
      // 切换到风险分析 Tab
      // 断言：行业分布饼图/表格可见
    })

    it('风险分析展示持仓集中度指标', async ({ authedPage }) => {
      // 断言：页面包含 HHI、Top1/Top3/Top5 权重等指标
    })
  })

  describe('组合详情 — 风控规则', () => {
    it('设置风控规则（单只持仓上限 30%）', async ({ authedPage }) => {
      // 切换到风控规则 Tab/区域
      // 新增规则：类型 = MAX_SINGLE_POSITION，阈值 = 30
      // 保存
      // 断言：规则列表中出现新规则
    })

    it('执行风控检查 → 显示检查结果', async ({ authedPage }) => {
      // 点击 "风控检查" 按钮
      // 等待 checkRisk API 响应
      // 断言：显示检查结果（"全部通过" 或违规详情）
    })
  })

  describe('测试数据清理', () => {
    it('删除测试组合', async ({ authedPage }) => {
      // 返回组合列表 /portfolio
      // 删除 "E2E测试组合"
      // 断言：组合不再出现在列表中
    })
  })

})
```

**预计用例数**：10

---

## 四、后端配合事项

E2E 测试依赖真实后端 API。为确保 E2E 测试稳定可靠，需要后端配合以下事项：

| 事项                   | 说明                                                                   | 优先级         |
| ---------------------- | ---------------------------------------------------------------------- | -------------- |
| **测试环境固定验证码** | `NODE_ENV=test` 时 `getCaptcha` 返回固定验证码 `1234`                  | P0（登录前提） |
| **测试账号**           | 创建专用 E2E 测试账号 `e2e-test`，角色为 `ADMIN`（可覆盖大多数功能）   | P0             |
| **测试数据隔离**       | E2E 创建的组合/回测任务通过命名前缀（如 `[E2E]`）标识，teardown 时清理 | P1             |
| **回测快速完成**       | 测试环境下回测任务尽快完成（或提供直接标记为 COMPLETED 的 mock 端点）  | P2             |

---

## 五、CI 集成

### 5.1 GitHub Actions 工作流

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      # 后端服务（需要真实 API）
      backend:
        image: ghcr.io/quant-code-cpx/server-code:latest
        ports:
          - 3000:3000
        env:
          NODE_ENV: test
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: yarn e2e
        env:
          E2E_ACCOUNT: e2e-test
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
          E2E_CAPTCHA_CODE: '1234'
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### 5.2 本地开发

本地运行 E2E 测试时需要：

1. 启动后端 API 服务（`cd ../server-code && npm run start:dev`）
2. 运行 `yarn e2e`（Playwright 会自动通过 `webServer` 配置启动前端 dev server）

或使用调试模式：

```bash
yarn e2e:debug   # 有 UI 的调试模式
yarn e2e:ui      # Playwright UI 模式
```

---

## 六、Mock 策略

E2E 测试 **原则上使用真实 API**，不做 mock。这是 E2E 测试与单元/集成测试的核心区别。

但以下场景可考虑使用 Playwright 的 `route` 拦截能力：

| 场景             | Mock 策略                                                         | 原因                                   |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------- |
| 回测任务完成等待 | 拦截 `/api/backtests/runs/detail`，直接返回 `status: 'COMPLETED'` | 避免等待真实回测计算（可能耗时数分钟） |
| WebSocket 通知   | 不 mock，通过触发真实同步操作验证                                 | 如实际不可行，跳过 WS 相关断言         |
| 外部依赖不可用   | 按需拦截返回 mock 数据                                            | 保证 CI 稳定性                         |

```ts
// 示例：拦截回测详情 API，模拟已完成状态
await page.route('**/api/backtests/runs/detail', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 0,
      data: {
        runId: 'test-run-001',
        status: 'COMPLETED',
        summary: { totalReturn: 0.15, sharpeRatio: 1.2, maxDrawdown: -0.08 },
        // ... 其他字段
      },
    }),
  })
);
```

---

## 七、实现顺序

| 步骤 | 任务                                                                  | 依赖                    | 预计用例 |
| ---- | --------------------------------------------------------------------- | ----------------------- | -------- |
| 0    | 安装 Playwright、创建 `playwright.config.ts`、目录结构、基础 fixtures | 无                      | —        |
| 1    | `e2e/login.e2e.ts` — 登录→首页流程                                    | Step 0 + 后端固定验证码 | 9        |
| 2    | `e2e/global-setup.e2e.ts` — 全局登录 + storageState 缓存              | Step 1 验证登录可行     | —        |
| 3    | `e2e/stock-search-detail.e2e.ts` — 股票搜索→详情                      | Step 2                  | 9        |
| 4    | `e2e/backtest-flow.e2e.ts` — 回测提交→结果                            | Step 2                  | 10       |
| 5    | `e2e/screener-flow.e2e.ts` — 选股筛选→结果                            | Step 2                  | 8        |
| 6    | `e2e/portfolio-risk.e2e.ts` — 组合管理→风控                           | Step 2                  | 10       |
| 7    | CI 集成（GitHub Actions workflow）                                    | Steps 1-6               | —        |

---

## 八、预计产出与风险

### 产出统计

| 测试文件                         | 预计用例数 |
| -------------------------------- | ---------- |
| `e2e/login.e2e.ts`               | 9          |
| `e2e/stock-search-detail.e2e.ts` | 9          |
| `e2e/backtest-flow.e2e.ts`       | 10         |
| `e2e/screener-flow.e2e.ts`       | 8          |
| `e2e/portfolio-risk.e2e.ts`      | 10         |
| **总计**                         | **~46**    |

### 风险与应对

| 风险                    | 说明                                      | 应对                                                                  |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| **验证码自动化**        | 验证码 SVG 无法由 Playwright 自动识别     | 要求后端提供测试环境固定验证码（P0 优先级）                           |
| **回测执行耗时**        | 真实回测可能耗时数分钟，超出测试 timeout  | 使用 Playwright route 拦截模拟已完成状态；或后端提供快速回测模式      |
| **测试数据污染**        | E2E 创建的组合、回测任务残留在数据库      | teardown 阶段通过 API 删除所有 `[E2E]` 前缀的测试数据                 |
| **后端 API 不可用**     | CI 环境中后端服务未启动或数据库不可达     | CI 使用 Docker Compose 编排完整环境；本地需手动启动后端               |
| **数据库状态依赖**      | 某些测试依赖已有数据（如已有股票数据）    | 回测/详情页测试使用已知存在的股票代码（如 000001.SZ）                 |
| **页面选择器不稳定**    | MUI 组件的 class name 可能随版本变化      | 优先使用 `role`、`label`、`placeholder`、`text` 等语义选择器          |
| **ApexCharts 图表交互** | 图表渲染依赖 canvas/SVG，难以断言具体内容 | 仅断言图表容器存在，不深入断言图表内部数据点                          |
| **并行测试数据冲突**    | 并行测试可能操作同一测试数据              | 每个测试文件使用独立的数据前缀（如 `[E2E-login]`、`[E2E-portfolio]`） |

### 选择器策略优先级

为保证选择器的稳定性和可维护性，按以下优先级选择定位策略：

1. **`getByRole`** — 最佳：`page.getByRole('button', { name: '登录' })`
2. **`getByLabel`** — 适合表单字段：`page.getByLabel('账号')`
3. **`getByPlaceholder`** — 适合搜索框：`page.getByPlaceholder('搜索')`
4. **`getByText`** — 适合文本断言：`page.getByText('平安银行')`
5. **`data-testid`** — 兜底：需要在源码中添加 `data-testid` 属性
6. **CSS Selector** — 最后手段：`page.locator('.MuiChip-root')`

> **原则**：不依赖 MUI 内部生成的 class name（如 `css-xxx`），不依赖 DOM 层级结构。

---

## 九、与现有测试体系的关系

```
        ┌──────────────────┐
        │   E2E (Playwright)│  ← Phase 4（本文档）
        │   ~46 用例        │     验证端到端用户流程
       ┌┴──────────────────┴┐
       │  集成测试 (Vitest)  │  ← Phase 3
       │  ~61 用例           │     路由守卫、Context 协作
      ┌┴────────────────────┴┐
      │  组件测试 (Vitest)    │  ← Phase 2
      │  ~65-75 用例          │     UI 组件渲染与交互
     ┌┴──────────────────────┴┐
     │   单元测试 (Vitest)     │  ← Phase 1（已完成 ✅）
     │   143 用例              │     工具函数、API、Auth
     └────────────────────────┘
```

- **Phase 1-3（Vitest）**：快速、隔离、mock 驱动，覆盖代码路径
- **Phase 4（Playwright）**：慢速、真实 API、端到端，覆盖用户流程

两者互补，不重叠。E2E 不重复验证已被单元/集成测试覆盖的细节逻辑，只关注**完整用户流程的端到端联通性**。

---

_最后更新：2026-04-14_
