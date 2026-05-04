# Walk-Forward 验证 — 前端设计（v2 重设计）

> 状态：🔧 已确认，进入阶段二实现
> 创建日期：2026-04-30
> 确认日期：2026-05-02
> 主入口：`src/sections/backtest/view/walk-forward-list-view.tsx` / `walk-forward-create-view.tsx` / `walk-forward-detail-view.tsx`
> 设计视角：资深金融产品经理 + 资深量化从业者 + 资深 UI/UE 设计师
> 旧版设计（保留对照）：[`docs/archive/回测高级功能-前端设计.md`](../archive/回测高级功能-前端设计.md)

---

## 一、功能要点提炼与补充（PM 视角）

### 1.1 用户原始诉求复述

> "重新审视回测的 walk-forward 验证页面，看看是否有要优化的点，落实到文档，需要后端支持的点也落到文档。"

诉求提炼为三件事：

1. 对现有 WF 三屏（列表 / 创建 / 详情）做体验与功能审视；
2. 把所有优化点（前端可独立完成 + 需后端配合）写进设计文档；
3. 后端缺口必须**单独成清单**、字段级到端点级，便于接口对齐。

### 1.2 模块定位与价值主张

- **30 秒内回答**：「我这套策略 / 这组参数，在没见过的样本外是否真的有效？是否过拟合？」
- **3 分钟内完成**：从一条已有策略，配置一次 WF 任务并提交跑批；查看一条已完成 WF 的 OOS 是否健壮，决定是否进入实盘 / 进入「策略」。
- **与相邻模块边界**：
  - **基础回测（`/backtest/runs`）**：单组参数、单段历史；WF 是其上层"参数搜索 + 时间切片"的稳健性验证。
  - **多策略对比（`/backtest/comparison`）**：横向多策略；WF 是单策略多窗口纵向。
  - **策略管理（`/strategies`）**：保存形态；WF 是临时调研形态，**完成后允许"导出/沉淀为策略"**（当前缺）。
  - **量化报告**：可作为 WF 的可分享导出物（当前缺）。

### 1.3 功能要点提炼（结构化）

| #   | 功能点                                         | 用户决策场景                                  | 数据来源                                   |
| --- | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| 1   | 创建 WF 任务（含参数搜索空间 + 窗口切分）      | 决定一组参数在历史多段样本外是否稳健          | `POST /backtests/walk-forward/runs`        |
| 2   | 任务列表（状态、进度、OOS 关键指标）           | 找到/管理历史跑批，判断哪条值得深看           | `POST /backtests/walk-forward/runs/list`   |
| 3   | 详情：摘要卡 + OOS 净值 + 窗口表 + 实时进度    | 评估稳健性、过拟合程度、是否可交付            | `runs/detail` + `runs/equity` + Socket.IO  |
| 4   | **参数稳定性诊断**（窗口间最优参数漂移）       | 判断"最优参数"是否随机噪声 → 决定是否上线     | 复用 `windows[].optimizedParams`，前端聚合 |
| 5   | **IS vs OOS 退化分析**（每窗口对比）           | 量化过拟合：IS 越好 / OOS 越差 → 警告         | 复用 `windows[].isReturn/oosReturn` 等     |
| 6   | **WFE（Walk-Forward Efficiency）+ 健壮性评级** | 一眼判断"能不能用"                            | 前端可纯计算；建议后端预算并入 detail      |
| 7   | **窗口级钻取**：成交、持仓、调仓               | 排查异常窗口（巨亏窗口到底买了什么）          | **后端缺**：`runs/window-trades` 等        |
| 8   | **基准叠加 + IS/OOS 着色**（净值图）           | 直观看是否跑赢基准 / 哪段是 OOS               | 前端可做；基准曲线需后端提供               |
| 9   | **克隆 / 重跑 / 取消**                         | 微调一个参数再跑；杀掉跑死的任务              | **后端缺**：`runs/cancel`、`runs/clone`    |
| 10  | **导出（CSV / PDF / 量化报告）**               | 给老板/同事看                                 | **后端缺**：`runs/export`                  |
| 11  | **沉淀为策略 / 推送到对比组**                  | 调研结果转生产                                | 前端串联 `strategies` / `comparisons` 端点 |
| 12  | **滚动模式（Rolling）+ 锚定模式（Anchored）**  | 锚定起点 vs 等长滑窗的取舍                    | API 已有 `rolling/runs`；前端缺 UI         |
| 13  | **窗口预览**（提交前显示将生成 N 个窗口的表）  | 防止配错 step/IS/OOS 比例造成跑数小时后才发现 | 前端纯计算（交易日历来自后端）             |
| 14  | **筛选 / 搜索 / 排序 / 删除**（列表）          | 任务多了之后能找到                            | **后端缺**：list 加筛选参数 + delete 端点  |
| 15  | **失败窗口诊断**（哪一窗口报错、什么原因）     | 全任务标记 FAILED 时无法定位是哪个组合崩了    | **后端缺**：window 级 error 字段           |
| 16  | **Purged / Embargo 切分**（避免训练-测试泄漏） | 严肃量化最低门槛                              | **后端缺**：参数 `embargoDays/purgeDays`   |

### 1.4 资深量化从业者补充（行业最佳实践）

补充原因后置说明，避免凭空堆功能：

- **WFE（Walk-Forward Efficiency）= OOS 年化 / IS 年化**：业界识别过拟合首选指标，<0.5 高度可疑、>0.7 可接受。当前只展示 `isOosReturnVsIs`（差值），换算成比率才直观。
- **参数稳定性图（Heatmap / Parallel Coordinates）**：行=窗口，列=参数；漂移大说明"无最优参数、是过拟合"。这是 WF 的核心副产品，目前完全没有。
- **OOS 退化条形对（Bar Pair）**：每窗口 IS / OOS 双条并列，红色高亮 OOS 反向窗口数。
- **基准对比是底线**：当前净值图无基准曲线，无法回答"是不是只是跟着大盘涨"。
- **窗口级钻取**：跑出 -25% 回撤窗口，必须能点进去看具体那段时间买了什么、调仓哪一天爆了。这是从"漂亮图表"到"可用工具"的分水岭。
- **Purged / Embargoed Cross-Validation**：De Prado《Advances in Financial ML》第 7 章经典方案，避免训练样本和测试样本因为标的相关、未来信息泄漏。机构标配。
- **取消正在跑的任务**：参数搜索空间×窗口数动辄上万，配错就要烧好几小时算力，必须能 kill。
- **克隆**：调研性场景常常"刚才那个 WF 把 step 改 10 天再跑一次"，从零再填表是反人类的。
- **任务命名 / 备注 / 标签**：调研留痕。
- **"是否锚定"模式区分**：Anchored（IS 起点固定，IS 越来越长）vs Rolling（IS 长度固定向前滚动）vs Expanding（递归全量）。三者结论可以差很大。

### 1.5 已确认决策（2026-05-02）

| 问题          | 用户选择                   | 落地结论                                                                                                                                              |
| ------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1 范围       | **A**                      | **全量重做三屏**：创建页 / 列表页 / 详情页同步重构，不做局部补丁。                                                                                    |
| Q2 后端配合度 | "按照需要的给出后端提示词" | 前端先按渐进增强实现；缺字段/缺端点时不阻塞 UI，按钮置灰或提示"待后端支持"；同时在附录 B 给出后端提示词，按 P0 → P1 → P2 分批交付。                   |
| Q3 钻取深度   | 按最优解                   | 采用 **B 方案**：窗口净值序列 + 调仓事件 + 完整成交明细 + 持仓快照。理由：能定位异常窗口根因，又避免把每个窗口落成独立 BacktestRun 造成历史跑批污染。 |
| Q4 模式扩展   | **A**                      | 本次同时接入 Rolling，与 WF 共用创建页模式 Tabs；Anchored 作为同一套 UI 的模式扩展，后端未支持时灰显。                                                |
| Q5 列表筛选   | **A**                      | 列表筛选/排序/分页全部写入 URL，浏览器返回与复制链接可复现筛选状态。                                                                                  |

> **阶段二实现原则**：前端可独立完成的诊断、预览、URL 状态、交互与降级先落地；后端缺口全部通过清晰提示词交付，不用空等后端。

---

## 二、现状盘点与不足

### 2.1 现有功能清单

| 模块/Tab | 入口文件                                                                                               | 主要数据/接口                                                | 行为                                                            |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| 列表     | [walk-forward-list-view.tsx](../../src/sections/backtest/view/walk-forward-list-view.tsx)              | `runs/list`                                                  | 标题 + "新建" 按钮 + 表格 + 分页                                |
| 列表表格 | [walk-forward-list-table.tsx](../../src/sections/backtest/walk-forward-list-table.tsx)                 | `WalkForwardRunSummary[]`                                    | 7 列展示，行点击跳详情                                          |
| 创建     | [walk-forward-create-view.tsx](../../src/sections/backtest/view/walk-forward-create-view.tsx)          | `runs` POST                                                  | 4 段式表单：基础策略 / 参数搜索空间 / 窗口设置 / 通用参数       |
| 参数空间 | [walk-forward-param-space-editor.tsx](../../src/sections/backtest/walk-forward-param-space-editor.tsx) | 本地 state                                                   | 每参数可开关；range / enum 切换；显示组合数（>500 警告）        |
| 详情     | [walk-forward-detail-view.tsx](../../src/sections/backtest/view/walk-forward-detail-view.tsx)          | `runs/detail` + `runs/equity` + `useBacktestJob` (Socket.IO) | 头部 + Progress Alert + 摘要卡 + 净值图 + 窗口表                |
| 摘要卡   | [walk-forward-summary-cards.tsx](../../src/sections/backtest/walk-forward-summary-cards.tsx)           | `WalkForwardRunDetail`                                       | 4 卡：OOS年化 / OOS夏普 / OOS最大回撤 / IS-OOS 收益差           |
| 净值图   | [walk-forward-equity-chart.tsx](../../src/sections/backtest/walk-forward-equity-chart.tsx)             | `WalkForwardEquityResponse`                                  | ApexCharts 单线 area；无基准、无窗口边界、无 IS/OOS 着色        |
| 窗口表   | [walk-forward-window-table.tsx](../../src/sections/backtest/walk-forward-window-table.tsx)             | `windows[]`                                                  | 10 列；optimizedParams 直接 JSON.stringify 显示，**几乎不可读** |
| API      | [src/api/backtest.ts](../../src/api/backtest.ts) L270–410                                              | 4 个 WF 端点 + 1 个 rolling 端点（**前端未接入**）           | 全部 `apiClient.post`                                           |
| 路由     | `/backtest/walk-forward`、`/.../create`、`/.../:wfRunId`                                               | —                                                            | 已注册                                                          |

### 2.2 不足之处（按严重性排序）

| #   | 问题                                                                                                      | 影响                                                 | 触发场景               |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------- |
| 1   | **过拟合诊断零工具**：仅有"差值"卡片，无 WFE、无参数稳定性、无 IS/OOS 条形对                              | 用户无法判断是不是过拟合，WF 失去最大价值            | 任何完成态详情         |
| 2   | **优化参数仅 JSON 显示**（`{"fastPeriod":5,"slowPeriod":20}`），10 列窗口×4 参数变成不可视读墙            | 看不到漂移规律                                       | 详情页窗口表           |
| 3   | **净值图无基准、无 IS/OOS 着色、无窗口边界**                                                              | 无法回答"是否跑赢基准 / 哪段是 OOS / 这段是哪个窗口" | 详情页主图             |
| 4   | **无窗口钻取**：某窗口巨亏，无法看那段调仓 / 持仓                                                         | 无法定位策略问题                                     | 详情页点击表格行无反应 |
| 5   | **运行中无法取消**（`runs/cancel` 后端只对单跑回测，WF 没有）                                             | 配错参数空间烧一晚上                                 | RUNNING 状态下用户后悔 |
| 6   | **失败任务零定位信息**：`failedReason` 仅整体文本，没有"哪个窗口、哪组参数挂了"                           | 排错全靠后端日志                                     | FAILED 状态            |
| 7   | **创建页无窗口数预览**：填完 IS/OOS/Step 后不知道会跑几个窗口、覆盖到哪天                                 | 配置失误率高                                         | 创建页提交前           |
| 8   | **创建页无锚定/滚动模式选项**（`rolling/runs` 端点闲置；Anchored 模式完全缺失）                           | 业内三种模式只能跑一种                               | 创建任务               |
| 9   | **列表无筛选 / 排序 / 搜索 / 删除**                                                                       | 任务一多就找不到                                     | 任务数 >20             |
| 10  | **无克隆 / 重跑**                                                                                         | 微调参数得从零再填                                   | 调研迭代               |
| 11  | **无导出 / 分享 / 转量化报告 / 沉淀为策略**                                                               | 调研成果无法外带                                     | 完成后想沟通           |
| 12  | **无 Purged / Embargo**                                                                                   | 严肃量化的基础门槛缺失                               | 创建窗口设置           |
| 13  | **进度反馈粗糙**：只有 `progress%` 和"已完成 X / N 个窗口"，无 ETA、无当前阶段（参数搜索/IS拟合/OOS评估） | 长任务体感差                                         | RUNNING 状态           |
| 14  | **轮询缺失**：列表页无轮询；用户离开详情再回来要手动刷新                                                  | 多任务并发时状态不同步                               | 列表查看               |
| 15  | **窗口表 horizontal scroll 不友好**：10 列+JSON 列在 1440 宽度下需要横向拉                                | 阅读困难                                             | 详情页                 |
| 16  | **没有"健壮性评级"快捷标签**（绿/黄/红）                                                                  | 列表/详情都需用户自己换算 OOS 数字                   | 列表与详情头部         |

### 2.3 重设计应对策略（一一对应 2.2）

| 对应 | 应对策略                                                                                                                       | 取舍说明                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1    | 详情页新增 **「稳健性诊断」Tab**：WFE 卡片 + IS/OOS 条形对 + 参数稳定性热力图 + OOS 反向窗口数 + 退化散点图                    | 全部前端可由现有数据计算；WFE 也建议后端入字段一份                                                               |
| 2    | 优化参数 → 拆列：每个参数单独一列 + Sparkline 趋势线；JSON 折叠到 Tooltip                                                      | 需要"参数 schema 元信息"：可由前端按已选 enum/range 推断，必要时后端在 detail 返回 `paramSchema`                 |
| 3    | 净值图加：基准曲线（默认沪深300）、IS/OOS 区段背景着色、窗口分隔虚线、窗口 hover 高亮                                          | 基准曲线需后端在 equity 端点同时返回                                                                             |
| 4    | 窗口表行点击 → 右侧抽屉：窗口元信息 + 调仓事件 + 持仓快照 + 该窗口净值小图                                                     | 需后端 `runs/window-detail`、`runs/window-trades`、`runs/window-positions`（详见 5.4）                           |
| 5    | RUNNING 状态显示「取消任务」按钮                                                                                               | 需后端 `walk-forward/runs/cancel`                                                                                |
| 6    | FAILED 状态展示窗口级错误：windowsTable 增加 `errorReason` 列、整任务级 Banner 链到首个失败窗口                                | 需后端在 windows[] 里增 `status / errorReason` 字段                                                              |
| 7    | 创建页第 3 段实时显示：「将生成 **N** 个窗口（IS:`a` 天 → OOS:`b` 天，覆盖至 `YYYYMMDD`）」+ 用 stepper 可视化                 | 前端纯计算，需要后端日历端点（已有 `/api/trade-calendar`?，待确认）                                              |
| 8    | 创建页顶部加 **模式切换 Tabs**：滚动 Walk-Forward / 锚定 Walk-Forward / 滚动窗口（Rolling），共享后续表单大部分字段            | rolling 已有 API；anchored 仅是参数 `windowMode='ANCHORED'` ，需后端支持                                         |
| 9    | 列表页：搜索（name/wfRunId）+ 状态多选 + 策略类型多选 + 时间范围 + 排序（OOS Sharpe/创建时间）+ 行内删除                       | 需后端 list 加筛选/排序参数 + `runs/delete` 端点                                                                 |
| 10   | 列表 + 详情都加「克隆配置」按钮 → 跳到创建页带预填                                                                             | 需后端 `runs/detail` 返回完整 `baseStrategyConfig` 与 `paramSearchSpace` 原文（当前 detail 缺 paramSearchSpace） |
| 11   | 详情页新增导出菜单：CSV（窗口表 / 净值）/ PNG（图表本地导出）/ "生成量化报告"（跳报告中心）/"沉淀为策略"（取最优参数生成模板） | CSV/PNG 前端可做；量化报告需后端 `reports/from-wf` 创建端点；策略沉淀复用现有创建端点                            |
| 12   | 创建页"窗口设置"末尾加可折叠"高级"区：Purge Days、Embargo Days、Min OOS Trades                                                 | 需后端在 create 接受三个新字段 + 在切窗时遵循                                                                    |
| 13   | 进度卡升级：「当前阶段（PARAM_SEARCH / IS_FIT / OOS_EVAL）+ 当前窗口 i/N + 估算剩余」+ 窗口级 mini grid 红/黄/绿               | 需后端 Socket.IO 推送 `step` 字段细化                                                                            |
| 14   | 列表页可见时（Page visible）每 10s 拉一次 list；详情页 RUNNING 状态下额外订阅 `walkForwardJob`                                 | 前端可做；不需后端                                                                                               |
| 15   | 窗口表用 `DataGrid`-like 列冻结 + 可拖拽列宽 + 列可见性配置（持久化到 localStorage）                                           | 前端可做；如已有列配置组件复用                                                                                   |
| 16   | 在头部加"健壮性评级"Chip：基于 WFE + IS/OOS 反向窗口比例 + OOS Sharpe，给绿/黄/红                                              | 前端纯计算；同时建议后端在 detail 落 `robustnessLevel` 字段做对齐                                                |

---

## 三、功能细化拆分

### 3.1 模块结构树

```
Walk-Forward 验证（重构）
├── 列表页 /backtest/walk-forward
│   ├── 顶部摘要带（任务数 / 跑批中 / 平均 OOS 夏普 / 上次完成时间）
│   ├── 工具条（搜索 / 状态多选 / 策略类型多选 / 排序 / 创建按钮）
│   ├── 数据表（含进度条 + 健壮性 Chip + 行内 Action 菜单）
│   └── 分页 + 自动轮询
├── 创建页 /backtest/walk-forward/create
│   ├── 模式 Tabs（滚动 WF / 锚定 WF / Rolling 窗口）
│   ├── 1) 基础策略（type + config 复用 BacktestStrategyConfigPanel）
│   ├── 2) 参数搜索空间（增强：批量预设 / 启发式建议 / 组合数表盘）
│   ├── 3) 窗口设置（含窗口预览 stepper + 高级 Purge/Embargo）
│   ├── 4) 通用参数（capital / benchmark / universe / rebalance）
│   └── 提交 + 校验 + 估算耗时
└── 详情页 /backtest/walk-forward/:wfRunId
    ├── 头部（名称 / 状态 / 健壮性 Chip / Action 菜单：克隆/取消/删除/导出/沉淀）
    ├── 进度卡（RUNNING）/ 失败卡（FAILED 含首个错误窗口跳转）
    ├── Tabs：
    │   ├── ① 概览：摘要卡（升级到 6 卡含 WFE）+ 净值图（含基准、IS/OOS 着色）
    │   ├── ② 稳健性诊断：IS/OOS 条形对 / 参数稳定性热力图 / OOS 反向窗口
    │   ├── ③ 窗口列表：行点击 → 窗口抽屉（钻取交易 / 持仓 / 调仓）
    │   └── ④ 配置回看：原始提交参数（可一键克隆）
    └── 共享上下文：wfRunId / detail / equity / windowsCache
```

### 3.2 子模块逐个细化

#### 3.2.1 列表页

- **职责**：让用户在 5 秒内找到目标 WF 任务并判断是否值得点开。
- **数据**：
  - `POST /backtests/walk-forward/runs/list`，参数升级为 `{ page, pageSize, q?, statuses?, strategyTypes?, sortBy?, sortDir? }`（**后端待补**）
  - 顶部摘要可由 list 响应内 `aggregates: { total, running, avgOosSharpe, lastCompletedAt }` 一并返回（**后端待补**），未实现则前端遍历当前页降级展示。
- **交互**：
  - 行点击 → 详情；行右侧 `kebab` 菜单：克隆 / 删除 / 导出 / 复制 ID。
  - URL 持久化筛选状态（参考其它模块约定）。
  - 自动轮询：页面可见且存在 RUNNING 时每 10s 刷新；不可见停。
- **状态**：loading（5 行 Skeleton）/ empty（CTA 直达创建）/ error（重试） / 部分错误（顶部 Snackbar）。
- **边界**：分页跨页保持筛选；删除二次确认；批量选中 N>1 时支持批量删除。

#### 3.2.2 创建页

- **职责**：用最少的输入步骤产生**正确**的 WF 任务（防止跑了几小时才发现配错）。
- **数据**：
  - 提交：`POST /backtests/walk-forward/runs`（增 `windowMode`、`purgeDays`、`embargoDays`、`minOosTrades`、`mode='WF'|'ROLLING'`）。
  - 模式切换：当 `mode='ROLLING'` 时切换调用 `POST /backtests/rolling/runs`。
  - 交易日历：`POST /api/trade-calendar/range`（**待确认是否已有**），用于估算窗口数。
- **交互**：
  - 模式 Tabs 顶部固定；切换不丢已填字段（共享部分保留）。
  - "参数搜索空间"加"启发式建议"按钮：基于策略类型给一组默认搜索范围；批量"全开/全关"。
  - "窗口设置"：填完 fullStart/fullEnd/IS/OOS/step 后，下方实时显示窗口表预览（前 5 个 + "...共 N 个"）+ 估算总组合数 = 参数组合 × 窗口数；超过 1 万弹"耗时较长"提示。
  - 高级折叠区：`purgeDays`、`embargoDays`、`minOosTrades`（默认 0）。
- **状态**：字段级校验；提交按钮 disabled 条件可见化 hint。
- **边界**：fullEnd ≥ fullStart + IS + OOS；step ≤ OOS（否则窗口重叠提示）；初始资金 ≥ 1000；至少一个参数启用。

#### 3.2.3 详情页 — Tab ① 概览

- **职责**：30 秒判定健壮性。
- **摘要卡升级（6 卡，可滚动行）**：
  1. **WFE**（OOS年化 / IS年化）+ 颜色：≥0.7 绿 / 0.5–0.7 黄 / <0.5 红
  2. OOS 年化收益（保留）
  3. OOS 夏普（保留）
  4. OOS 最大回撤（保留）
  5. **OOS 反向窗口比例**（OOS 收益 ≤0 的窗口数 / 总窗口数）
  6. **IS-OOS 退化幅度**（IS年化 − OOS年化）
- **净值图升级**：
  - 主线：OOS 拼接净值
  - **新增基准线**：默认沪深300，按 fullStart=1.0 归一化
  - **新增背景着色**：每窗口 IS 段浅蓝、OOS 段浅红，可由开关关闭
  - 窗口分隔虚线 + hover tooltip 显示"窗口 #N IS=… OOS=…"
- **数据**：`runs/equity` 升级返回 `points[].benchmarkNav`、`windows[]` 边界（**后端待补**）。

#### 3.2.4 详情页 — Tab ② 稳健性诊断（**新增**）

- **IS vs OOS 条形对**：每窗口两根条（IS 年化 / OOS 年化），并列；按窗口排序。
  - 反向窗口（OOS<0）红色高亮；标题角标"反向窗口数 / 总数"。
- **参数稳定性视图**：
  - **热力图**：行 = 窗口、列 = 参数；颜色标"和上一窗口的归一化变化"；连续相同→淡，剧烈跳→深。
  - **平行坐标 / Sparkline 备选**：每参数一行的迷你折线，显示窗口序列中最优值的漂移。
- **退化散点**：x = IS 夏普、y = OOS 夏普；y=x 对角线参考线；点落在对角线上方=反向退化（少见），右下方=过拟合。
- **数据**：全部基于现有 `windows[]`，前端聚合；不需新端点。

#### 3.2.5 详情页 — Tab ③ 窗口列表

- 列结构（默认）：窗口# / 状态 / IS 区间 / OOS 区间 / IS年化 / IS 夏普 / OOS年化 / OOS 夏普 / OOS 最大回撤 / 优化参数（**拆列**）
- 优化参数拆为 N 列（每参数一列），顶部加"参数列可见性"开关；JSON 视图保留为下拉。
- 行点击 → 右侧抽屉 `WindowDrawer`：
  - 窗口元信息 + 该窗口净值小图（IS+OOS）
  - 调仓事件表（**需后端**）
  - 持仓快照（**需后端**）
  - 成交明细（**需后端**）
  - "重跑该窗口"按钮（可选；需后端）
- 失败窗口行用 `Label color="error"` + 鼠标悬停 tooltip 显示 errorReason。

#### 3.2.6 详情页 — Tab ④ 配置回看

- 表单化展示原始 `baseStrategyConfig` + `paramSearchSpace` + 窗口/通用参数 + 模式（WF / Rolling / Anchored）+ 高级（Purge/Embargo）。
- 顶部按钮：「克隆并修改」→ 跳创建页带预填。
- **数据**：`runs/detail` 需补 `paramSearchSpace`、`windowMode`、`purgeDays`、`embargoDays` 字段。

### 3.3 数据流与状态管理

- **共享上下文**：`WfDetailContext`（wfRunId、detail、equity、windowsCache、refresh()），所有 Tab 子组件订阅。
- **跨 Tab 联动**：稳健性诊断热力图点击参数列 → 窗口表筛选 + 滚动定位 + 高亮对应行。
- **轮询/订阅**：列表页 visible & has RUNNING → 10s `runs/list`；详情页 jobId 存在 → Socket.IO `walkForwardJob`，事件名沿用 `backtest_progress/completed/failed`，payload 增加 `windowIndex`、`stage`。
- **缓存**：列表 query string ↔ URL；窗口抽屉数据按 `wfRunId+windowIndex` 缓存内存即可（不持久化）。

---

## 四、UI/UE 设计（设计师视角）

### 4.1 设计概念关键词

**"Lab Notebook + Quant Diagnostic"** —— 既要像研究员的实验记录本（窗口、参数、评估并列），又要像医生的诊断报告（红/黄/绿一目了然，过拟合直接下结论）。

### 4.2 必须遵守的项目 UI 规范（quant-client）

- 颜色：仅 `theme.palette.*` / `varAlpha(theme.vars.palette.*Channel, α)`；状态色严格用 success/warning/error。
- 涨红跌绿仅作"数据色"，UI 主色仍为蓝。
- 字号最小 12px；窗口表数字使用等宽（继承全局 tabular-nums）。
- MUI 子路径导入；sx prop 优先；间距严格 8 倍数。
- 数据更新 200ms fade；窗口抽屉 240ms slide-in；其余禁动效。

### 4.3 页面布局

#### 列表页

```
┌─────────────────────────── Walk-Forward 验证 ──────────────────────────┐
│  总任务 24 │ 跑批中 2 │ 平均 OOS 夏普 0.92 │ 最近完成 04-29 16:20  [+ 新建]│
├────────────────────────────────────────────────────────────────────────┤
│  [搜索... ] [状态 ▾] [策略类型 ▾] [排序: OOS夏普 ↓ ▾]                    │
├────────────────────────────────────────────────────────────────────────┤
│ ▎名称        策略    区间          状态/进度  健壮性  OOS年化 OOS夏普 ⋮ │
│ ▎单均线α    MA      20180101-2024 ✅完成     🟢绿    +18.4%  1.21    ⋯ │
│ ▎因子轮动β  FACTOR  20200101-2025 🟡跑批 62% —      —       —       ⋯ │
└────────────────────────────────────────────────────────────────────────┘
```

#### 详情页头部 + Tabs

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◀ 单均线 α v3   [✅ 完成]  [🟢 健壮]    模式：滚动 WF                  │
│ MA · 20180101-20241231 · IS 252d · OOS 60d · step 60d · opt=Sharpe     │
│                                            [刷新][克隆][导出 ▾][删除] │
├──────[ 概览 ][ 稳健性诊断 ][ 窗口列表 ][ 配置回看 ]────────────────────┤
│  ┌──┬──┬──┬──┬──┬──┐                                                   │
│  │WFE│年化│夏普│回撤│反向│退化│  ← 6 摘要卡                            │
│  └──┴──┴──┴──┴──┴──┘                                                   │
│  净值曲线（含基准、IS/OOS 着色、窗口分隔）                              │
└────────────────────────────────────────────────────────────────────────┘
```

#### 创建页

```
┌─ 新建任务 ─[ 滚动 WF │ 锚定 WF │ Rolling 窗口 ]──────────────────────┐
│  ① 基础策略    [类型 ▾]  [配置面板]                                  │
│  ② 参数搜索空间    [启发建议] [全开/全关]   组合数: 48               │
│       □ fastPeriod  range  3 → 20 step 1                              │
│       ☑ slowPeriod  range  20 → 60 step 5                             │
│  ③ 窗口设置                                                           │
│       fullStart 20180101  fullEnd 20241231                            │
│       IS 252  OOS 60  Step 60                                          │
│       ▸ 高级（Purge / Embargo / 最少 OOS 交易数）                     │
│       ── 预览 ────────────────────────────────────────                │
│       ▏#1 IS 18-01-02→18-12-28 OOS 19-01-02→19-04-01                 │
│       ▏#2 …                                                           │
│       ▏共生成 12 个窗口；预估组合×窗口 = 576                          │
│  ④ 通用参数    资金/基准/范围/调仓频率                                │
│                                              [取消]   [创建并跑批]    │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.4 关键组件设计要点

- **健壮性 Chip**：圆角小标，3 档 🟢/🟡/🔴 + tooltip 说明判定规则（WFE + 反向窗口比 + OOS 夏普）。
- **摘要卡**：左 2px 色条标识属性；卡内 32px 数字 + 下方 12px 副标 + 一句话注解（"OOS 年化 / IS 年化，>0.7 健壮"）。
- **参数稳定性热力图**：单元格 hover 显示该窗口最优参数原值；行/列均可点击下钻。
- **窗口抽屉**：自右侧滑出 480px，分 4 折叠段（窗口元信息 / 调仓 / 持仓 / 成交）；可一键"放到窗口对比篮"（同时打开≤2 个窗口对比）。
- **进度卡**：阶段步骤条（参数搜索 → IS 拟合 → OOS 评估）+ 当前窗口 mini-grid（24 格红黄绿）+ ETA。
- **窗口表 errorReason**：行末小图标，hover 出 tooltip 完整原因；点击进抽屉的"错误堆栈"段。

### 4.5 交互细节

- 切 Tab 不重置详情页内已加载数据；URL `?tab=robustness` 持久化。
- 列表筛选/排序写入 URL，浏览器返回保留。
- 创建页"克隆"自动滚到顶部、模式 Tab 与原任务一致。
- 净值图右上角开关：[ ] 显示基准 [ ] 显示窗口分隔 [ ] 着色 IS/OOS（默认全开）。
- 取消任务：点击 → 二次确认对话框，输入 "cancel" 才执行（防止误点）。
- 删除：永久删除二次确认 + 输入任务 ID 末 6 位。
- 大组合数（>10000）提交前弹"耗时预估"对话框，显示参考时间。
- 失败任务进详情自动定位到首个失败窗口（窗口列表 Tab 滚动到行）。

### 4.6 暗色 / 亮色双主题

- 所有色值通过 `theme.vars.palette.*Channel` + varAlpha；
- 净值图 IS/OOS 着色：亮色 `varAlpha(info.mainChannel, 0.06)` / `varAlpha(error.mainChannel, 0.06)`；暗色加深一档；
- 健壮性 Chip 三档色用 success / warning / error 主色 + lighter 背景；
- 阴影使用 `theme.customShadows.card`；不写死 rgba。

---

## 五、实现步骤与要点（给阶段二的施工图）

### 5.1 实现顺序（按 quant-client 项目铁律）

> 本次确认版执行 **全量重做三屏**。后端未到位的能力采用"先封装 API 类型 + 前端判空降级 + 明确待后端提示"策略，确保当前页面可编译、可浏览、可用 mock/旧接口渐进验证。

1. **`src/api/backtest.ts`**：
   - 扩展 `CreateWalkForwardRunQuery` 增 `windowMode` / `purgeDays` / `embargoDays` / `minOosTrades`；
   - 扩展 `WalkForwardWindow` 增 `status?: 'OK'|'FAILED'`、`errorReason?: string`、`oosTrades?: number`；
   - 扩展 `WalkForwardRunDetail` 增 `paramSearchSpace`、`windowMode`、`purgeDays`、`embargoDays`、`robustnessLevel?`、`wfe?`；
   - 扩展 `WalkForwardEquityResponse` 增 `points[].benchmarkNav?`、`windows[]: { windowIndex, isStartDate, isEndDate, oosStartDate, oosEndDate }`；
   - 升级 `listWalkForwardRuns` 入参（q/statuses/strategyTypes/sortBy/sortDir）+ 响应（aggregates）；
   - 新端点函数：`cancelWalkForwardRun`、`deleteWalkForwardRun`、`cloneWalkForwardConfig`（前端 helper，调用 detail 后跳创建页）；
   - 新端点函数：`getWalkForwardWindowDetail`、`getWalkForwardWindowTrades`、`getWalkForwardWindowPositions`、`getWalkForwardWindowRebalanceLogs`；
   - 模式分支：`createRollingRun`（已有，复用）。
2. **`src/sections/backtest/`**：新增/重构组件
   - `wf-context.tsx`（Detail Context）
   - `walk-forward-list-toolbar.tsx`（搜索/筛选/排序/批量删除工具条）
   - `walk-forward-list-table.tsx`（增列、行内菜单）
   - `walk-forward-create-mode-tabs.tsx`
   - `walk-forward-window-preview.tsx`
   - `walk-forward-advanced-fields.tsx`（Purge/Embargo）
   - `walk-forward-summary-cards.tsx`（升级 6 卡含 WFE）
   - `walk-forward-equity-chart.tsx`（基准+着色+窗口边界）
   - `walk-forward-window-table.tsx`（拆参数列、错误列、行点击）
   - `walk-forward-window-drawer.tsx`（钻取抽屉）
   - `walk-forward-robustness-bar-pair.tsx`
   - `walk-forward-param-stability-heatmap.tsx`
   - `walk-forward-degradation-scatter.tsx`
   - `walk-forward-config-recap.tsx`
   - `walk-forward-progress-card.tsx`（阶段+ETA+mini grid）
3. **`src/sections/backtest/view/`**：组合视图
   - `walk-forward-list-view.tsx`：摘要带 + 工具条 + 表 + 分页 + 轮询
   - `walk-forward-create-view.tsx`：模式 Tabs + 4 段 + 预览 + 高级
   - `walk-forward-detail-view.tsx`：头部 + 进度/失败 + Tabs（4 个）
4. **`src/pages/`**：保持薄壳不动。
5. **`src/routes/sections.tsx`**：保持。
6. **`src/layouts/nav-config-dashboard.tsx`**：保持。
7. **测试**：
   - `walk-forward-window-preview.test.tsx`：窗口生成数学正确（含 Purge/Embargo）
   - `walk-forward-robustness.test.tsx`：WFE 计算 / 反向窗口比 / 评级
   - `walk-forward-list.e2e.ts`：筛选/分页/克隆跳转
   - `walk-forward-create.e2e.ts`：模式切换不丢字段、组合数计算
   - `walk-forward-detail.e2e.ts`：Tab 切换、抽屉钻取、取消任务

### 5.2 关键技术点

- **状态共享**：详情页用 React Context（轻），列表页用 URL 参数 + `useSearchParams`。无须引入 Zustand。
- **性能敏感处**：
  - 窗口表行数最大 ~50，数据量小，但参数动态拆列要 `useMemo`；
  - 净值图 + 基准 ≤ 2 万点，ApexCharts 启用 `animations: false` + `dataLabels: false`；
  - 参数稳定性热力图复用 ECharts 或自绘 svg（窗口×参数 ≤ 50×10）；
- **容错**：
  - benchmark 字段缺失 → 自动隐藏基准开关；
  - `paramSearchSpace` 缺 → 配置回看 Tab 显示"原配置不可获取"，克隆按钮置灰；
  - Socket.IO 断线 → 详情页降级为 5s 轮询 detail；
  - `windows[].status='FAILED'` 但全任务 status='COMPLETED' 时，头部 Banner 高亮"包含失败窗口 X 个"。
- **WFE 双源策略**：后端字段优先 (`detail.wfe`)；缺失时前端按 `oosAnnualizedReturn / isAnnualizedReturn`（如全任务级 IS 字段缺则按窗口均值）兜底，并在 tooltip 标注"前端估算"。

### 5.3 风险与回退

- 后端字段未到位时，前端按"渐进增强"：所有新视图判空降级（隐藏卡片/Tab、不报错）；阶段二落地后再随后端发布逐步开启。
- 模式 Tabs 中 "Rolling" 已有 API，可先开放；"Anchored" 后端不支持时灰按钮 + tooltip "暂未开放"。
- 窗口钻取所有抽屉段独立请求 + 独立加载，单段失败不影响其他段。

### 5.4 后端支持清单（**全部需后端配合，按优先级**）

> 命名遵循 `apiClient.post()` 全 POST 约定。

#### P0（阻塞主体重构）

| #   | 端点 / 字段                                                                                                                                             | 说明                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| B1  | `WalkForwardWindow` 增 `status`、`errorReason`、`oosTrades`                                                                                             | 失败窗口诊断、最少 OOS 交易数过滤 |
| B2  | `runs/detail` 响应增 `paramSearchSpace`、`windowMode`、`purgeDays`、`embargoDays`、`baseStrategyConfig` 完整原文                                        | 配置回看 + 克隆 + 模式回显        |
| B3  | `runs/equity` 响应增 `points[].benchmarkNav`、`windows: [{ windowIndex, isStart, isEnd, oosStart, oosEnd }]`                                            | 基准曲线 + IS/OOS 着色 + 窗口边界 |
| B4  | `POST /backtests/walk-forward/runs/cancel`（body `{ wfRunId }`）                                                                                        | 任务取消                          |
| B5  | `runs/list` 入参支持 `q? / statuses?[] / strategyTypes?[] / sortBy? / sortDir?`；响应增 `aggregates: { total, running, avgOosSharpe, lastCompletedAt }` | 列表筛选/排序/摘要带              |
| B6  | `POST /backtests/walk-forward/runs/delete`                                                                                                              | 删除任务                          |

#### P1（强烈建议）

| #   | 端点 / 字段                                                                                                           | 说明                             |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| B7  | `POST /backtests/walk-forward/runs/window-detail`（body `{ wfRunId, windowIndex }`）                                  | 窗口元信息 + 净值序列            |
| B8  | `POST /backtests/walk-forward/runs/window-trades`（同上）                                                             | 窗口成交明细                     |
| B9  | `POST /backtests/walk-forward/runs/window-positions`（同上 + 可选 `tradeDate?`）                                      | 窗口持仓快照                     |
| B10 | `POST /backtests/walk-forward/runs/window-rebalance-logs`（同上）                                                     | 窗口调仓事件                     |
| B11 | `create` 入参增 `windowMode: 'ROLLING'\|'ANCHORED'\|'EXPANDING'`、`purgeDays?`、`embargoDays?`、`minOosTrades?`       | 锚定/Purged 切分                 |
| B12 | Socket.IO `backtest_progress` payload 增 `stage: 'PARAM_SEARCH'\|'IS_FIT'\|'OOS_EVAL'`、`windowIndex?`、`etaSeconds?` | 进度细化                         |
| B13 | `runs/detail` 响应增 `wfe?: number`、`robustnessLevel?: 'GREEN'\|'YELLOW'\|'RED'`、`oosNegativeWindowRate?`           | 健壮性后端预算（前后端口径一致） |

#### P2（增强体验）

| #   | 端点 / 字段                                                                            | 说明                                                           |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| B14 | `POST /backtests/walk-forward/runs/clone`（body `{ wfRunId, name? }`）                 | 后端落 clone 记录（前端也可纯前端 detail→create 跳转，二选一） |
| B15 | `POST /backtests/walk-forward/runs/export`（body `{ wfRunId, format: 'csv'\|'pdf' }`） | 导出窗口表 / 报告                                              |
| B16 | `POST /reports/from-walk-forward`（body `{ wfRunId, ... }`）                           | 一键生成量化报告                                               |
| B17 | `runs/detail` 增 `paramSchema: Record<paramKey, { label, type, unit }>`                | 优化参数列国际化标签 + 单位                                    |
| B18 | `POST /api/trade-calendar/range`（body `{ start, end }`）若不存在                      | 创建页窗口预览精确天数                                         |
| B19 | "Rolling" 模式 (`/backtests/rolling/runs`) 列表/详情端点对齐 WF                        | 复用同一详情页（含 Rolling 标识）                              |

> **冲突说明**：若 B11 中 `windowMode` 与现有 create 入参字段冲突，前端默认传 `ROLLING`，向后兼容旧部署。

### 5.5 给后端的实现提示词（可直接复制）

```text
你是 quant-code/server-code 的后端实现 Agent。请为 Walk-Forward 验证 v2 重构补齐后端能力，保持项目既有 NestJS/DTO/Service/Controller 结构与鉴权规范。

硬性约束：
1. 所有接口必须是 POST；参数全部走 Body，禁止 GET、query string、URL path id。
2. 所有涉及 trade_date / start / end 的交易日字段，前后端统一使用 YYYYMMDD 字符串。
3. 响应字段允许 null 时 DTO/类型要显式标注，前端会做渐进降级。
4. 新接口需补 DTO、Controller、Service、必要单测，并保证现有旧端点兼容。

请按优先级分批实现：

P0（阻塞主体体验，优先完成）：
- WalkForwardWindow 增加 status?: 'OK'|'FAILED'、errorReason?: string、oosTrades?: number。
- POST /backtests/walk-forward/runs/detail 响应补齐 paramSearchSpace、windowMode、purgeDays、embargoDays、baseStrategyConfig 完整原文。
- POST /backtests/walk-forward/runs/equity 响应补齐 points[].benchmarkNav?，并返回 windows: [{ windowIndex, isStartDate, isEndDate, oosStartDate, oosEndDate }]。
- 新增 POST /backtests/walk-forward/runs/cancel，body { wfRunId }，用于取消 RUNNING/PENDING 任务。
- POST /backtests/walk-forward/runs/list 入参支持 q?、statuses?[]、strategyTypes?[]、sortBy?、sortDir?；响应增加 aggregates: { total, running, avgOosSharpe, lastCompletedAt }。
- 新增 POST /backtests/walk-forward/runs/delete，body { wfRunId }，仅允许删除终态任务或按现有业务规则处理。

P1（窗口钻取与专业诊断，强烈建议）：
- 新增 POST /backtests/walk-forward/runs/window-detail，body { wfRunId, windowIndex }，返回窗口元信息 + 该窗口 IS/OOS 净值序列。
- 新增 POST /backtests/walk-forward/runs/window-trades，body { wfRunId, windowIndex }，返回该窗口完整成交明细。
- 新增 POST /backtests/walk-forward/runs/window-positions，body { wfRunId, windowIndex, tradeDate? }，返回该窗口持仓快照。
- 新增 POST /backtests/walk-forward/runs/window-rebalance-logs，body { wfRunId, windowIndex }，返回调仓事件。
- create 入参增加 windowMode: 'ROLLING'|'ANCHORED'|'EXPANDING'、purgeDays?、embargoDays?、minOosTrades?。
- Socket.IO backtest_progress payload 增加 stage: 'PARAM_SEARCH'|'IS_FIT'|'OOS_EVAL'、windowIndex?、etaSeconds?。
- runs/detail 响应增加 wfe?: number、robustnessLevel?: 'GREEN'|'YELLOW'|'RED'、oosNegativeWindowRate?，口径与前端保持一致：WFE = OOS 年化 / IS 年化。

P2（增强体验）：
- 新增 POST /backtests/walk-forward/runs/clone，body { wfRunId, name? }，返回可直接用于 create 的配置快照或新 clone 记录。
- 新增 POST /backtests/walk-forward/runs/export，body { wfRunId, format: 'csv'|'pdf' }。
- 新增 POST /reports/from-walk-forward，body { wfRunId, ... }，用于生成量化报告。
- runs/detail 增加 paramSchema: Record<paramKey, { label, type, unit }>，供前端优化参数拆列展示。
- 若当前没有交易日历区间端点，请新增 POST /api/trade-calendar/range，body { start, end }，返回 YYYYMMDD 交易日数组。
- 对齐 /backtests/rolling/runs 的 list/detail/equity 能力，使前端可复用同一套 WF 详情页展示 Rolling 结果。

验收：
- 保持旧前端字段兼容；未传新增参数时行为与旧版一致。
- 至少提供 4 类样例数据：健壮完成、过拟合完成、跑批中、部分窗口失败。
- 所有新增端点在 controller 层可被前端 apiClient.post() 直接调用，body 字段名与上述保持一致。
```

---

## 六、验收方式与细节

### 6.1 功能验收清单

- [ ] 列表：搜索 / 状态多选 / 策略多选 / 排序 / 删除 / 克隆 / 批量删除全部可用
- [ ] 列表：摘要带 4 项数字正确；存在 RUNNING 时自动 10s 轮询，离开页面停止
- [ ] 创建：模式 Tabs（WF/Anchored/Rolling）切换不丢已填字段
- [ ] 创建：窗口预览数与后端实际生成一致；高级 Purge/Embargo 起效
- [ ] 创建：组合×窗口数 >10000 时弹耗时确认
- [ ] 详情：4 个 Tab 全部可达，URL `?tab=` 持久化
- [ ] 详情概览：6 摘要卡含 WFE；净值图含基准、IS/OOS 着色、窗口分隔
- [ ] 详情稳健性：IS/OOS 条形对、参数稳定性热力图、退化散点全部渲染并支持 hover
- [ ] 详情窗口表：参数列拆开；行点击 → 抽屉 4 段加载
- [ ] 详情配置回看：克隆按钮预填创建页，模式与原任务一致
- [ ] FAILED 状态：头部跳转首个失败窗口；窗口表错误列可见
- [ ] RUNNING 状态：取消按钮可用；进度卡显示 stage / windowIndex / ETA
- [ ] 第 1 章每项功能点都有页面入口；第 2 章每个不足都被第 5 章的某项策略命中

### 6.2 UI/UE 验收清单

- [ ] 通过 `web-design-guidelines` skill 审查（阶段二末执行）
- [ ] 暗色/亮色双主题截图对比，无配色对比度问题（健壮性 Chip、IS/OOS 着色尤甚）
- [ ] 字号 ≥ 12px，无硬编码颜色（grep `#[0-9a-f]{3,6}` / `rgba?\(` 应为零）
- [ ] 1440 / 1920 宽度下：列表无横向滚动、详情净值图自适应、窗口表横向滚动平滑
- [ ] 窗口抽屉宽度 ≤ 480px，不遮主图重要区域

### 6.3 性能与质量验收

- [ ] `node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"` 无错误
- [ ] `node_modules/.bin/eslint "src/**/*.{ts,tsx}"` 退出码 0
- [ ] `yarn build` 输出 `✓ built in ...`
- [ ] 详情页首屏 < 200ms 渲染完成（mock 数据 dev server）
- [ ] 净值图 1 万点 + 基准线 hover 不卡顿（< 50ms）
- [ ] 关键单元测试覆盖：WFE 计算、窗口预览生成、参数稳定性聚合

### 6.4 验收数据样例

- 准备 4 份 mock：
  1. **正常完成**：12 窗口、健壮（WFE>0.7、OOS 反向比 < 30%）
  2. **过拟合**：12 窗口、IS 漂亮 OOS 大跌（WFE<0.5、反向比 >50%）
  3. **跑批中**：3/12 窗口完成、jobId 推送 stage
  4. **部分窗口失败**：2/12 窗口 status=FAILED，整任务 status=COMPLETED；FAILED 窗口列表可定位

---

## 附录 A：与既有/相邻设计文档的关系

- 替代旧版：[`archive/回测高级功能-前端设计.md`](../archive/回测高级功能-前端设计.md) 中 WF 相关章节
- 与 [`archive/组合新端点与回测高级分析-前端设计.md`](../archive/组合新端点与回测高级分析-前端设计.md) 关于 `WalkForwardParamSpaceEditor` 的复用关系保留
- "沉淀为策略"按钮指向 [`design/策略-重构-前端设计.md`](策略-重构-前端设计.md) 中的策略创建端点
- "生成量化报告"按钮指向 [`design/量化报告-重构-前端设计.md`](量化报告-重构-前端设计.md)
