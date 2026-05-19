---
name: frontend-qa
description: >
  前端页面 QA 测试工作流 Skill。USE WHEN 用户说"测试 XX / 对 XX 做测试 / 看看 XX 有没有问题 /
  发现 XX 的 bug / 回归测试 XX / 联调 XX / 验证 XX 页面"等任何以发现问题、验证功能为目的的请求时。
  包含两段式最低要求：Phase 1 需求理解与用例设计、Phase 2 执行测试与缺陷修复回归。
  可扩展 Phase 0（会话初始化）和 Phase 3（收尾报告）。
  NOT FOR 阶段一（纯设计文档）或阶段二（纯代码实现），但可叠加在阶段二末尾执行回归。
argument-hint: '<页面或模块名> [round2|regression|smoke] — 例如：行业分析 / 回测工作台 regression'
---

# Frontend QA — 前端页面测试工作流

> quant-client 项目的 QA 测试专用 skill。  
> **最低要求两个阶段**：Phase 1 先理解再出用例，Phase 2 再执行再修复再回归。  
> 跳过 Phase 1 直接测试等于盲测，禁止。

---

## 何时使用

触发词（任何一种均应自动加载本 skill）：

- "测试 XX / 对 XX 做测试 / 帮我测 XX"
- "看看 XX 有没有问题 / 发现 XX 的 bug / 找 XX 的问题"
- "回归 / 联调 / 验证 XX 页面 / 冒烟测试"
- "再做一轮测试 / round 2 / 深度测试"

**不使用**：设计文档产出 → 走 design-blueprint skill；纯代码实现 → 走 quant-client skill。

---

## 角色设定（三位一体）

| 角色           | 职责                                                         |
| -------------- | ------------------------------------------------------------ |
| 资深测试工程师 | 制定测试策略，设计覆盖性用例矩阵，分析根因，管理缺陷生命周期 |
| 资深产品经理   | 明确业务期望行为，区分"需求缺失"与"代码 bug"，验收           |
| 前端开发者     | 定位代码层根因，实施修复，保证 ESLint + build 通过           |

---

## 强制流程（按顺序执行，不可跳步）

### Phase 0 — 会话初始化（可选，首次接触新模块时必做）

```
1. read_file `.agents/skills/quant-client/SKILL.md`（加载项目规范）
2. 如有对应设计文档，read_file `docs/design/<模块名>-前端设计.md`
3. read_file `docs/testing/已知问题待办.md`（了解已知 backlog，避免重复发现）
```

### Phase 1 — 需求理解 & 测试用例设计（**必须在 Phase 2 之前完成**）

#### Step 1.1 — 代码静态分析（使用工具，不靠推测）

依次执行以下分析，**每条都必须用工具实际读取，不可凭文件名猜测内容**：

```
a) read_file 主 view 文件：src/sections/<模块>/view/*-view.tsx
   → 梳理页面包含哪些子组件，记录组件树结构

b) grep_search / semantic_search 找到所有 API 调用
   → 对每个接口记录：端点路径、入参、出参字段、前端使用场景

c) read_file src/api/*.ts 中相关 API 函数
   → 确认字段映射、类型转换、异常处理

d) 读取关键子组件文件（图表、表格、抽屉等）
   → 找到潜在的逻辑问题：未传的 prop、硬编码、条件渲染遗漏
```

#### Step 1.2 — 业务需求还原

以"资深用户视角"回答以下问题（写入测试计划）：

1. **这个页面/模块解决什么痛点？** 用户在什么场景下打开它？
2. **核心功能是什么？** 哪 3 件事用户最依赖？
3. **数据流是什么？** 从哪个接口拿数据 → 经过什么处理 → 渲染在哪里？
4. **边界场景有哪些？** 空数据、长文本、极大/极小值、网络超时、快速切换？
5. **周期/筛选/下钻联动逻辑是什么？** 改变 A 时哪些组件需要重新请求/更新？

#### Step 1.3 — 编写测试用例矩阵

输出格式（必须在开始浏览器测试前写完）：

```markdown
## 测试用例矩阵 — <模块名>

| 编号   | 分类     | 场景描述     | 前置条件       | 操作步骤     | 期望结果                         | 优先级 |
| ------ | -------- | ------------ | -------------- | ------------ | -------------------------------- | ------ |
| XX-001 | 首屏加载 | 页面正常渲染 | 已登录，有数据 | 直接访问 URL | 所有主模块可见，无 console error | P0     |
| XX-002 | 数据展示 | 核心指标正确 | 同上           | 查看概览卡片 | 数值与业务逻辑吻合               | P0     |
| ...    |          |              |                |              |                                  |        |
```

**必须覆盖的用例分类**（不限于此，根据模块特点增减）：

| 分类           | 说明                                             |
| -------------- | ------------------------------------------------ |
| 首屏加载       | 页面各主模块是否正常渲染，loading 态是否正常     |
| 数据展示正确性 | 核心指标数值是否符合业务逻辑（排序、单位、精度） |
| 图表可用性     | 坐标轴标签、图例、tooltip、数据标签是否正确      |
| 交互联动       | 筛选条件/周期/日期变更后，数据是否正确刷新       |
| 点击下钻       | 点击卡片/图表/表格行是否正确触发抽屉/跳转        |
| 抽屉/弹窗      | 各 Tab 内容、子图表是否正常加载                  |
| 空态 / 错误态  | 无数据时是否有友好提示，不应只有表头             |
| 边界 / 长文本  | 极长名称是否 overflow 处理正确                   |
| 周期切换       | 不同周期下所有组件数据是否对应更新               |

---

### Phase 2 — 测试执行 & 缺陷修复 & 回归（**核心阶段**）

#### 工具双轨策略（必读）

本 skill 使用两套工具协同工作，**职责严格分离**：

| 工具层                  | 代表工具                                 | 职责                                 |
| ----------------------- | ---------------------------------------- | ------------------------------------ |
| **Playwright**          | `run_playwright_code`、`screenshot_page` | **主动控制**：导航、点击、输入、滚动 |
| **Chrome DevTools MCP** | `mcp_chrome-devtoo_*` 系列               | **被动观测**：console、network、性能 |

两者互补，**不可相互替代**：Playwright 无法读取 console 日志和网络请求；Chrome DevTools MCP 的交互能力不如 Playwright 精准。

#### Step 2.1 — 浏览器测试环境确认

```
1. 确认 dev server 运行（yarn dev，默认 port 3039）
2. 用 mcp_chrome-devtoo_list_pages 确认目标页面已打开，记录 pageId
3. 用 screenshot_page 截图确认当前页面状态
4. 确认 mock 状态：是否走 MSW mock 还是真实后端
5. 【重要】导航到目标页面后，立即用 mcp_chrome-devtoo_list_console_messages 清零基线
   → 后续每次操作后都对比新增 console 条目
```

#### Step 2.2 — 按用例矩阵逐一执行

**工具使用规范**：

**▶ Playwright — 主动控制**

| 操作                     | 推荐工具                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| 截图查看页面状态         | `screenshot_page`                                                                              |
| 点击按钮 / 选项卡        | `run_playwright_code` with `page.$$('button')` + `innerText` 匹配                              |
| 点击 ApexCharts 图表元素 | `run_playwright_code` with `.apexcharts-treemap-rect` / `.apexcharts-bar-area` 等 CSS selector |
| 滚动页面                 | `run_playwright_code`: `page.evaluate(() => { document.documentElement.scrollTop = N; })`      |
| 查找可滚动容器           | `page.evaluate()` 检查 `scrollHeight > clientHeight + 100`                                     |
| 在输入框中输入           | `run_playwright_code` with `input.type('...')`                                                 |
| 获取元素文本内容         | `mcp_chrome-devtoo_take_snapshot` 或 `element.innerText()`                                     |
| 导航到页面               | `mcp_chrome-devtoo_navigate_page`（更稳定）或 `run_playwright_code`                            |

**▶ Chrome DevTools MCP — 被动观测**

| 观测目标                  | 推荐工具                                                  | 使用时机                            |
| ------------------------- | --------------------------------------------------------- | ----------------------------------- |
| 检查 JS 错误 / console    | `mcp_chrome-devtoo_list_console_messages`                 | 每次操作后立即检查                  |
| 验证 API 调用是否发出     | `mcp_chrome-devtoo_list_network_requests`                 | 操作触发请求后                      |
| 查看接口入参（请求 body） | `mcp_chrome-devtoo_get_network_request`（传入 requestId） | 验证 trade_date / period 等参数格式 |
| 查看接口返回数据          | `mcp_chrome-devtoo_get_network_request` 的 response body  | 确认后端返回是否符合预期            |
| DOM 结构快照              | `mcp_chrome-devtoo_take_snapshot`                         | 检查元素是否渲染、属性是否正确      |
| 性能 / 可访问性审计       | `mcp_chrome-devtoo_lighthouse_audit`                      | 可选，深度测试时使用                |

**双轨协作示例**（验证"切换周期后图表更新"用例）：

```
① run_playwright_code → 点击"月线"按钮
② mcp_chrome-devtoo_list_network_requests → 确认 /api/xxx 请求已发出
③ mcp_chrome-devtoo_get_network_request → 检查请求 body 中 period === 'monthly'
④ mcp_chrome-devtoo_list_console_messages → 确认无 JS 错误
⑤ screenshot_page → 截图确认图表数据已更新
```

**每个用例执行完毕后**：

1. 记录 `PASS` / `FAIL` / `SKIP`
2. `FAIL` 时立即记录：截图描述、实际表现 vs 期望表现

#### Step 2.3 — 缺陷根因分析（发现 FAIL 时）

```
1. mcp_chrome-devtoo_list_console_messages
   → 检查是否有 JS 错误、React 警告、Uncaught exception

2. mcp_chrome-devtoo_list_network_requests
   → 检查相关 API 是否被调用，HTTP 状态码是否 2xx

3. mcp_chrome-devtoo_get_network_request（有问题的接口）
   → 检查请求 body（入参是否正确）和 response body（后端返回是否有数据）

4. read_file 相关组件代码 → 找代码层根因（字段映射、条件渲染、类型错误）

5. 如后端返回数据为空，运行 docker exec 命令查询数据库确认数据是否存在

6. 区分根因类型：
   - code-bug：前端代码逻辑错误 → 本会话修复
   - data-missing：后端数据库无数据 → 记入已知问题待办
   - backend-bug：接口返回格式/字段错误 → 记入已知问题待办
   - design-gap：需求未定义的情况 → 记入已知问题待办
```

只有 `code-bug` 类型的问题需要在当前会话修复。其他类型记入 `docs/testing/已知问题待办.md`。

#### Step 2.4 — 修复实施

修复前必须：

1. `read_file` 完整读取待修改文件（不靠记忆）
2. 理解修改点上下文（至少读改动行前后各 10 行）
3. 使用 `replace_string_in_file`（不要用 terminal 命令改文件）

修复后**必须按顺序验证**（不可省略）：

```bash
# 1. 修复 lint 错误
node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"

# 2. 确认无剩余 lint 错误（退出码 0，无任何输出）
node_modules/.bin/eslint "src/**/*.{ts,tsx}"

# 3. 构建验证（必须看到 "✓ built in ..."）
yarn build
```

#### Step 2.5 — 回归测试

修复完成后，对以下范围重新执行：

1. **本次修复的用例**（确认 bug 已消除）
2. **与修改文件相关的用例**（确认未引入新问题）
3. **页面整体冒烟**（首屏截图，确认主模块可见）

---

### Phase 3 — 收尾报告（可选，建议每轮测试后执行）

#### Step 3.1 — 更新已知问题待办

将本轮发现的未修复问题追加到 `docs/testing/已知问题待办.md`：

```markdown
### XXXX-NNN · <问题标题>

| 字段           | 内容                                                               |
| -------------- | ------------------------------------------------------------------ |
| **模块**       |                                                                    |
| **严重等级**   | P0/P1/P2/P3                                                        |
| **根因分类**   | code-bug / data-missing / data-coverage / design-gap / backend-bug |
| **发现版本**   | YYYY-MM-DD（Round N 测试）                                         |
| **复现步骤**   |                                                                    |
| **实际表现**   |                                                                    |
| **期望表现**   |                                                                    |
| **根因分析**   |                                                                    |
| **状态**       | 🔴 Open / 🟡 Open / 🟢 Low Priority                                |
| **下一步行动** |                                                                    |
```

#### Step 3.2 — 生成测试报告（可选）

如本轮修复了重要问题，创建 `docs/testing/reports/<模块名>-round<N>-<日期>.md`，记录：

```markdown
# <模块名> 测试报告 — Round N（YYYY-MM-DD）

## 测试范围

## 业务理解（简述）

## 接口清单

## 测试用例矩阵（结果列填写 PASS/FAIL/SKIP）

## 发现并修复的问题

## 回归结果

## 未修复问题（指向已知问题待办）
```

---

## 测试用例编号规范

| 模块前缀 | 含义                             |
| -------- | -------------------------------- |
| `IA-`    | 行业分析（Industry Analysis）    |
| `MO-`    | 市场概览（Market Overview）      |
| `MF-`    | 资金动态（Money Flow）           |
| `HM-`    | 全景热力图（Heatmap）            |
| `BT-`    | 回测工作台（Backtest）           |
| `SC-`    | 选股器（Stock Screener）         |
| `SD-`    | 股票详情（Stock Detail）         |
| `FA-`    | 因子库（Factor）                 |
| `PM-`    | 组合管理（Portfolio Management） |
| `ST-`    | 策略（Strategy）                 |
| `RN-`    | 研究笔记（Research Notes）       |
| `DA-`    | 数据同步（Data Admin）           |

---

## ApexCharts 测试常见陷阱

| 问题                                     | 原因                                        | 检测方法                                                                 |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| 水平柱状图 Y 轴显示数字而非分类名        | `xaxis.categories` 未传入 `useChart()`      | snapshot 中 Y 轴显示 `1.00, 3.71...` 而非行业名                          |
| 图表区域点击无响应                       | 点击了背景/SVG容器而非具体图形元素          | 改用 `.apexcharts-treemap-rect` / `.apexcharts-bar-area` 等 CSS selector |
| 工具提示有但 `dataPointSelection` 不触发 | 单击触发了 hover，需精确点击元素中心        | `element.boundingBox()` 再 `mouse.click(cx, cy)`                         |
| 散点/泡泡图条件渲染错误                  | 不同 viewMode 下数据源不同，组件接收到 null | 检查 viewMode 条件下 prop 的实际传值                                     |

---

## 数据问题快速诊断

当测试遇到"无数据"或"空态"时，按以下顺序排查（使用工具，不靠人工观察浏览器）：

```
1. mcp_chrome-devtoo_list_console_messages
   → 有无 network error / Uncaught / Warning

2. mcp_chrome-devtoo_list_network_requests
   → 目标接口是否被调用？HTTP 状态码？

3. mcp_chrome-devtoo_get_network_request（目标接口的 requestId）
   → 请求 body：trade_date 是否 YYYYMMDD？period 是否合法？
   → 响应 body：后端返回的 data 数组是否为空？

4. read_file src/api/*.ts
   → 有无数据 transform 错误（字段映射、单位换算、空值处理）

5. 后端数据库（仅在响应 body 确认为空时执行）：
   docker exec -it quant_postgres psql -U postgres -d quant_db \
     -c "SELECT COUNT(*) FROM <table> WHERE <condition>"

6. 区分：前端渲染逻辑问题 vs 接口返回数据问题 vs 数据库数据不存在
```

---

## 与其他 Skill 的协作关系

```
frontend-qa
  ├── 发现 UI/代码 bug   → 直接修复（遵循 quant-client skill 规范）
  ├── 需要设计修改       → 触发 design-blueprint skill（先产出设计文档）
  ├── 需要写单元测试     → 参考 quant-client/resources/testing.md
  └── 修复后必须        → ESLint fix → ESLint check → yarn build
```

---

## 快速参考：最小执行清单

```
□ Phase 0: 加载 quant-client skill + 读设计文档 + 读已知问题待办
□ Phase 1.1: 读 view 文件 + API 文件 + 关键子组件
□ Phase 1.2: 写出业务理解（5 个问题）
□ Phase 1.3: 写出测试用例矩阵（至少覆盖 P0 用例）
□ Phase 2.1: 确认浏览器环境（mcp_chrome-devtoo_list_pages + screenshot_page）
□ Phase 2.1: 清零 console 基线（mcp_chrome-devtoo_list_console_messages）
□ Phase 2.2: 逐条执行用例
          - Playwright 控制操作（点击、输入、滚动）
          - Chrome DevTools MCP 观测 console + network（每次操作后）
          - screenshot_page 截图记录
□ Phase 2.3: FAIL 用例根因分析（优先用 DevTools MCP 查 console + network，再读源码）
□ Phase 2.4: code-bug 修复 + ESLint + build 验证
□ Phase 2.5: 回归测试
□ Phase 3.1: 更新已知问题待办（未修复问题）
□ Phase 3.2: （可选）生成测试报告
```
