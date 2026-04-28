# 策略回测（Backtesting）— 前端实现规划

> **目标读者**：AI 代码生成助手。请严格按照本文定义的页面结构、交互流程、API 调用方式、组件拆分和 WebSocket 订阅方式实现。不要生成一个“只会提交任务”的页面；要实现完整的回测工作台、任务历史和报告详情页。

---

## 一、技术栈与现有架构结论

当前前端项目已具备实现回测模块所需的基本能力：

| 能力           | 当前情况                                 | 结论      |
| -------------- | ---------------------------------------- | --------- |
| 页面分层       | `src/pages` + `src/sections`             | ✅ 可复用 |
| API 客户端     | `src/api/client.ts`                      | ✅ 可复用 |
| 仪表盘布局     | `DashboardContent`                       | ✅ 可复用 |
| 图表库         | `apexcharts` + `react-apexcharts`        | ✅ 可复用 |
| WebSocket 底座 | `src/lib/socket.ts` + `socket.io-client` | ✅ 可复用 |
| 长任务 UI 模式 | `sync-notification-context.tsx`          | ✅ 可借鉴 |

### 关键结论

1. **不需要新引入 WebSocket 依赖**，`socket.io-client` 已安装。
2. **不需要自建 fetch 封装**，继续统一使用 `apiClient.get/post`。
3. **应复用 `src/lib/socket.ts`**，不要重新写第二套 socket 单例。
4. **回测页应采用“三页式结构”**：
   - 回测工作台
   - 任务历史
   - 任务详情
5. 用户键盘输入不方便，前端应优先使用：
   - `Select`
   - `Autocomplete`
   - `ToggleButtonGroup`
   - `Chip`
   - `Switch`
   - `Slider`
   - `DatePicker / date TextField`

尽量避免让用户手动输入 JSON。

---

## 二、路由与导航规划

## 2.1 新增路由

在 `src/routes/sections.tsx` 中新增：

```typescript
export const BacktestWorkbenchPage = lazy(() => import('src/pages/backtest-workbench'))
export const BacktestRunListPage = lazy(() => import('src/pages/backtest-runs'))
export const BacktestRunDetailPage = lazy(() => import('src/pages/backtest-run-detail'))

// children 中新增：
{ path: 'backtest', element: <BacktestWorkbenchPage /> },
{ path: 'backtest/runs', element: <BacktestRunListPage /> },
{ path: 'backtest/runs/:runId', element: <BacktestRunDetailPage /> },
```

## 2.2 导航栏规划

在 `src/layouts/nav-config-dashboard.tsx` 中新增一个**顶级菜单**“回测”，不要挂到“股票”或“因子”下面。

推荐：

```typescript
{
  title: '回测',
  path: '/backtest',
  icon: <Iconify icon="solar:playback-speed-bold" width={24} />,
  children: [
    {
      title: '回测工作台',
      path: '/backtest',
      icon: <Iconify icon="solar:widget-bold" width={24} />,
    },
    {
      title: '任务历史',
      path: '/backtest/runs',
      icon: <Iconify icon="solar:history-bold" width={24} />,
    },
  ],
}
```

### 为什么不要只做一个单页

因为回测和“普通筛选页”不同：

- 有复杂参数配置
- 有异步任务状态
- 有历史结果复查
- 有详情报告

把它们全塞进一个页面，会导致状态和组件臃肿。

---

## 三、页面规划总览

## 3.1 页面一：回测工作台 `/backtest`

**职责**：配置策略、校验参数、提交回测任务。

### 页面布局

```text
┌─────────────────────────────────────────────────────────────┐
│ 页面标题：回测工作台                                         │
├─────────────────────────────────────────────────────────────┤
│ 策略模板卡片区                                               │
│ [均线择时] [选股器轮动] [因子排序] [自定义股票池]              │
├─────────────────────────────────────────────────────────────┤
│ 左侧：参数配置表单                 │ 右侧：校验与提交摘要      │
│ ┌───────────────────────────────┐ │ ┌──────────────────────┐ │
│ │ 基础参数                      │ │ │ 数据完备性校验       │ │
│ │ 回测区间 / 初始资金 / 基准    │ │ │ ✅ daily             │ │
│ │ 股票池 / 调仓频率 / 成交模式  │ │ │ ✅ adj_factor        │ │
│ │ 交易成本 / 滑点 / 仓位约束    │ │ │ ❌ stk_limit         │ │
│ ├───────────────────────────────┤ │ ├──────────────────────┤ │
│ │ 策略参数（按模板动态切换）     │ │ │ 参数摘要 / 风险提示  │ │
│ │ MA 短周期 / 长周期             │ │ │ 预计交易日数         │ │
│ │ or rankBy / topN / factorName │ │ │ 预计股票池规模       │ │
│ └───────────────────────────────┘ │ └──────────────────────┘ │
│                                   │ [校验配置] [开始回测]    │
└─────────────────────────────────────────────────────────────┘
```

## 3.2 页面二：任务历史 `/backtest/runs`

**职责**：查看历史运行记录、过滤状态、复制配置重跑。

### 页面布局

```text
┌─────────────────────────────────────────────────────────────┐
│ 页面标题：回测历史                            [刷新]         │
├─────────────────────────────────────────────────────────────┤
│ 过滤栏                                                       │
│ [状态▼] [策略类型▼] [关键词搜索] [近7天/30天/全部]          │
├─────────────────────────────────────────────────────────────┤
│ 任务表格                                                     │
│ 名称 | 策略类型 | 状态 | 区间 | 总收益 | 回撤 | 夏普 | 时间   │
│                                                       [查看] │
│                                                       [复制] │
└─────────────────────────────────────────────────────────────┘
```

## 3.3 页面三：任务详情 `/backtest/runs/:runId`

**职责**：展示实时进度与完整报告。

### 页面布局

```text
┌─────────────────────────────────────────────────────────────┐
│ 页面标题：回测详情 / XXX策略                                  │
│ 状态：运行中 62%                        [取消任务] [复制重跑] │
├─────────────────────────────────────────────────────────────┤
│ 摘要指标卡片                                                   │
│ 总收益 | 年化收益 | 基准收益 | 超额收益 | 最大回撤 | 夏普     │
├─────────────────────────────────────────────────────────────┤
│ 收益曲线（净值 vs 基准）                                      │
├─────────────────────────────────────────────────────────────┤
│ 回撤曲线                                                      │
├─────────────────────────────────────────────────────────────┤
│ 月收益热力表 / 年度汇总                                       │
├─────────────────────────────────────────────────────────────┤
│ Tabs                                                          │
│ [交易明细] [持仓快照] [调仓日志] [运行配置]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、组件拆分建议

```text
src/pages/
├── backtest-workbench.tsx
├── backtest-runs.tsx
└── backtest-run-detail.tsx

src/sections/backtest/
├── view/
│   ├── index.ts
│   ├── backtest-workbench-view.tsx
│   ├── backtest-run-list-view.tsx
│   └── backtest-run-detail-view.tsx
├── backtest-template-cards.tsx
├── backtest-config-form.tsx
├── backtest-strategy-config-panel.tsx
├── backtest-validate-panel.tsx
├── backtest-submit-summary.tsx
├── backtest-run-list-toolbar.tsx
├── backtest-run-list-table.tsx
├── backtest-detail-header.tsx
├── backtest-progress-banner.tsx
├── backtest-metrics-grid.tsx
├── backtest-equity-chart.tsx
├── backtest-drawdown-chart.tsx
├── backtest-monthly-return-table.tsx
├── backtest-trades-table.tsx
├── backtest-positions-table.tsx
├── backtest-rebalance-log-table.tsx
├── backtest-config-drawer.tsx
├── types.ts
├── constants.ts
└── hooks/
    └── use-backtest-job.ts

src/api/
└── backtest.ts

src/contexts/
└── backtest-notification-context.tsx   // 推荐新增，可选
```

---

## 五、各页面与组件详细规范

## 5.1 `BacktestWorkbenchView` — 回测工作台

### 职责

- 拉取策略模板 `GET /backtests/strategy-templates`
- 管理回测配置状态
- 先调用 `POST /backtests/runs/validate`
- 再调用 `POST /backtests/runs`
- 提交成功后跳转到详情页 `/backtest/runs/:runId`

### 状态管理

```typescript
const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('SCREENING_ROTATION');

const [form, setForm] = useState<BacktestRunForm>(DEFAULT_FORM);
const [validation, setValidation] = useState<ValidateBacktestRunResponse | null>(null);

const [loadingTemplates, setLoadingTemplates] = useState(true);
const [validating, setValidating] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState('');
```

### 页面流程

1. 页面初始化 → 拉模板
2. 用户点击策略模板卡片 → 切换策略类型 + 重置对应策略参数默认值
3. 用户填写基础配置与策略参数
4. 点击“校验配置” → 调 `validateRun`
5. 若通过 → 点击“开始回测” → 调 `createRun`
6. 成功后跳转到详情页，并携带 `runId` / `jobId`

### 交互要求

- 提交前**必须先校验**，不要允许用户直接“盲提”任务
- 若校验返回 `warnings`，用 `Alert severity="warning"` 显示，但允许继续提交
- 若 `errors` 非空，禁止提交
- 采用鼠标友好控件，避免用户自己拼 JSON

---

## 5.2 `BacktestTemplateCards` — 策略模板卡片区

**Props**：

```typescript
interface BacktestTemplateCardsProps {
  templates: StrategyTemplate[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}
```

### UI 规则

- 使用 MUI `Card` 或 `Paper` 网格展示
- 每个模板显示：
  - 名称
  - 描述
  - 标签（技术/选股/因子/自定义）
- 当前选中模板：
  - 加主色边框
  - 提高阴影层级
- 卡片点击即选中

---

## 5.3 `BacktestConfigForm` — 基础参数表单

### 表单分区

#### A. 基础配置

- 回测名称 `TextField`
- 起始日期 `TextField type="date"`
- 结束日期 `TextField type="date"`
- 初始资金 `TextField type="number"`
- 基准指数 `Select`
  - 沪深300 `000300.SH`
  - 中证500 `000905.SH`
  - 中证1000 `000852.SH`
  - 上证指数 `000001.SH`
  - 深证成指 `399001.SZ`

#### B. 股票池配置

- universe `Select`
  - 全市场
  - 沪深300
  - 中证500
  - 中证1000
  - 上证50
  - 自定义股票池
- 若为自定义股票池：
  - `Autocomplete multiple` 选择股票代码（可复用 `/stock/search`）

#### C. 交易执行配置

- 调仓频率 `ToggleButtonGroup`
  - 日 / 周 / 月 / 季
- 成交模式 `ToggleButtonGroup`
  - 次日开盘
  - 次日收盘
- 开启真实交易约束 `Switch`
  - 开启后，校验必须依赖 `stk_limit / suspend_d`

#### D. 交易成本

- 手续费率 `TextField`
- 印花税率 `TextField`
- 最低手续费 `TextField`
- 滑点（bps）`Slider` 或 `TextField`

#### E. 仓位约束

- 最大持仓数 `TextField`
- 单票最大权重 `Slider`（0~100%）
- 最小上市天数 `TextField`

### 表单 UX 要求

- 每个字段带 help text，不让用户自己猜
- 单票权重在 UI 显示为 `%`，提交时转 0~1 浮点值或遵循后端约定
- 日期必须保证 `startDate < endDate`
- 输入框为空时显示默认值提示，不强迫用户填所有参数

---

## 5.4 `BacktestStrategyConfigPanel` — 策略专属参数区

根据 `selectedTemplateId` 渲染不同表单。

### `MA_CROSS_SINGLE`

- 股票代码：`Autocomplete` 搜索单只股票
- 短均线周期：数字输入
- 长均线周期：数字输入
- 允许空仓：`Switch`

### `SCREENING_ROTATION`

- 可复用选股器条件面板的思路，但在回测页中应简化为：
  - 行业、地域、板块、PE/PB/市值、ROE、营收增速等常见条件
- 排序字段：`Select`
- 排序方向：`ToggleButtonGroup`
- Top N：数字输入
- 权重模式：`Select`（等权 / 排名加权）

### `FACTOR_RANKING`

- 因子名称：`Select` 或 `Autocomplete`（从 factor library 加载）
- 排序方向：高因子优先 / 低因子优先
- Top N 或 分层数：数字输入
- 可选过滤条件：最小市值、最小换手率、最大 PE

### `CUSTOM_POOL_REBALANCE`

- 股票池：`Autocomplete multiple`
- 权重模式：
  - 等权
  - 自定义权重
- 若选自定义权重：表格方式编辑 `tsCode + weight`

### 强制要求

- 不允许给用户一个原始 JSON textarea 让用户自己输 `strategyConfig`
- 策略参数必须是结构化表单

---

## 5.5 `BacktestValidatePanel` — 数据完备性校验面板

### 数据来源

调用：`POST /backtests/runs/validate`

### 展示内容

- `isValid`：总状态（绿/红）
- 数据依赖清单：
  - daily
  - adj_factor
  - trade_cal
  - index_daily
  - stk_limit
  - suspend_d
  - index_weight
- 统计信息：
  - 预计交易日数量
  - 预计股票池规模
  - 最早/最晚可用数据日期
- warnings / errors 列表

### UI 形式

- 使用 `Card + Alert + List`
- 每项用 `Label` 或 `Chip` 标识状态：
  - ✅ Ready
  - ⚠ Warning
  - ❌ Missing

### 行为要求

- 校验通过前，“开始回测”按钮禁用
- 若只是 warning，不禁用，但需明确告诉用户结果可能失真

---

## 5.6 `BacktestSubmitSummary` — 提交摘要区

### 展示内容

- 策略名称
- 回测区间
- 股票池/基准
- 预计调仓频率
- 初始资金
- 交易成本摘要
- 当前校验状态

### 底部按钮

- `校验配置`
- `开始回测`

按钮状态：

- validating 时显示 loading
- submitting 时显示 loading
- 若 validation.errors 非空，则 `开始回测` 禁用

---

## 5.7 `BacktestRunListView` — 历史列表页

### 职责

- 拉取 `GET /backtests/runs`
- 支持筛选、分页、刷新
- 支持“查看详情” / “复制重跑”

### 筛选项

- 状态：`Select`
  - 全部 / 排队 / 运行中 / 已完成 / 已失败 / 已取消
- 策略类型：`Select`
- 时间范围：`ToggleButtonGroup`
  - 近7天 / 近30天 / 全部
- 关键词：名称模糊搜索

### 表格列

| 列       | 说明                   |
| -------- | ---------------------- |
| 任务名称 | 用户命名 or 默认模板名 |
| 策略类型 | 模板类型               |
| 状态     | 颜色标签               |
| 回测区间 | start ~ end            |
| 基准     | benchmark code         |
| 总收益   | 百分比，红涨绿跌       |
| 最大回撤 | 百分比                 |
| 夏普     | 数值                   |
| 创建时间 | YYYY-MM-DD HH:mm       |
| 操作     | 查看 / 复制            |

### “复制重跑”行为

点击后：

- 从 detail API 或当前行加载完整配置
- 跳转到 `/backtest`
- 自动回填表单
- 不自动提交，由用户确认后再次发起

---

## 5.8 `BacktestRunDetailView` — 详情报告页

### 职责

- 获取 run detail / equity / trades / positions
- 若任务仍在运行，订阅 WebSocket 更新进度
- 完成后自动刷新数据

### 页面状态

```typescript
const [detail, setDetail] = useState<BacktestRunDetailResponse | null>(null);
const [equity, setEquity] = useState<BacktestEquityPoint[]>([]);
const [trades, setTrades] = useState<BacktestTradeItem[]>([]);
const [positions, setPositions] = useState<BacktestPositionItem[]>([]);
const [rebalanceLogs, setRebalanceLogs] = useState<BacktestRebalanceLogItem[]>([]);
const [tab, setTab] = useState<'trades' | 'positions' | 'logs' | 'config'>('trades');
```

### 顶部区域

- 回测名称
- 状态标签：`QUEUED / RUNNING / COMPLETED / FAILED / CANCELLED`
- 若运行中：进度条 + 当前 step 文案
- 按钮：
  - 取消任务（仅 QUEUED/RUNNING）
  - 复制重跑
  - 返回历史

### 摘要指标卡片（必须）

至少显示：

- 总收益
- 年化收益
- 基准收益
- 超额收益
- 最大回撤
- 夏普比率
- 波动率
- 胜率
- 换手率
- 交易笔数

### 图表区域（必须）

#### A. 净值曲线 `BacktestEquityChart`

- 图类型：`area` / `line`
- 序列：
  - 策略净值
  - 基准净值
- X 轴：日期
- tooltip：日期 + 双序列值

ApexCharts 设置：

```typescript
{
  chart: { type: 'area', toolbar: { show: false } },
  tooltip: { shared: true, intersect: false },
  xaxis: { type: 'datetime' },
}
```

#### B. 回撤曲线 `BacktestDrawdownChart`

- 图类型：`area`
- 序列：drawdown（负值）
- 颜色：`warning.main` / 红色系

#### C. 月收益表 `BacktestMonthlyReturnTable`

- 不需要新引入 heatmap 依赖
- 用 MUI `Table` 实现“年度 x 月份”二维表即可
- 单元格背景按收益率着色：
  - 正收益越高颜色越深红
  - 负收益越大颜色越深绿

### 下方 Tabs 区

#### Tab 1：交易明细 `BacktestTradesTable`

- 分页表格
- 列：日期 / 代码 / 名称 / 买卖方向 / 成交价 / 数量 / 成交额 / 费用 / 原因

#### Tab 2：持仓快照 `BacktestPositionsTable`

- 顶部日期选择器（默认最新）
- 表格列：代码 / 名称 / 数量 / 成本价 / 收盘价 / 市值 / 权重 / 浮盈亏 / 持有天数

#### Tab 3：调仓日志 `BacktestRebalanceLogTable`

- 列：信号日 / 执行日 / 目标数 / 实际买入 / 实际卖出 / 因涨跌停跳过 / 因停牌跳过 / 备注
- 这张表对解释“为何没买进去”非常重要

#### Tab 4：运行配置 `BacktestConfigDrawer` 或卡片

- 原样展示回测配置（只读）
- 让用户明确本次参数口径

---

## 六、WebSocket 规划

当前前端已经有：

- `src/lib/socket.ts`
- `socket.io-client`
- `SyncNotificationProvider` 的实践模式

所以回测页应**直接复用现有 socket 单例**。

## 6.1 推荐实现方式

新增：

```text
src/sections/backtest/hooks/use-backtest-job.ts
```

### Hook 行为

```typescript
useBacktestJob(jobId, {
  onProgress,
  onCompleted,
  onFailed,
});
```

内部逻辑：

1. `const socket = getSocket()`
2. `socket.connect()`
3. `socket.emit('subscribe_backtest', { jobId })`
4. 监听：
   - `backtest_progress`
   - `backtest_completed`
   - `backtest_failed`
5. unmount 或 jobId 变化时：
   - `socket.emit('unsubscribe_backtest', { jobId })`
   - 移除监听器

## 6.2 推荐增强：`BacktestNotificationContext`

如果后续希望像数据同步一样在全局通知中记录“回测完成 / 回测失败”，可以新增：

```text
src/contexts/backtest-notification-context.tsx
```

但一期不是必须。**一期最重要的是详情页的 job 订阅。**

---

## 七、API 层设计

新建：`src/api/backtest.ts`

```typescript
import { apiClient } from './client';

// ─── 模板 ────────────────────────────────────────

export type StrategyTemplate = {
  id: 'MA_CROSS_SINGLE' | 'SCREENING_ROTATION' | 'FACTOR_RANKING' | 'CUSTOM_POOL_REBALANCE';
  name: string;
  description: string;
  category: 'TECHNICAL' | 'SCREENING' | 'FACTOR' | 'CUSTOM';
  parameterSchema: Array<{
    field: string;
    label: string;
    type: 'string' | 'number' | 'select' | 'multiselect' | 'boolean' | 'json';
    required: boolean;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    helpText?: string;
  }>;
};

export type GetStrategyTemplatesResponse = {
  templates: StrategyTemplate[];
};

// ─── 校验 / 提交 ─────────────────────────────────

export type ValidateBacktestRunQuery = {
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  startDate: string;
  endDate: string;
  benchmarkTsCode?: string;
  universe?: string;
  initialCapital: number;
  rebalanceFrequency?: string;
  priceMode?: string;
  enableTradeConstraints?: boolean;
};

export type ValidateBacktestRunResponse = {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  dataReadiness: {
    hasDaily: boolean;
    hasAdjFactor: boolean;
    hasTradeCal: boolean;
    hasIndexDaily: boolean;
    hasStkLimit: boolean;
    hasSuspendD: boolean;
    hasIndexWeight: boolean;
  };
  stats: {
    tradingDays: number;
    estimatedUniverseSize: number | null;
    earliestAvailableDate: string | null;
    latestAvailableDate: string | null;
  };
};

export type CreateBacktestRunQuery = {
  name?: string;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  startDate: string;
  endDate: string;
  benchmarkTsCode?: string;
  universe?: string;
  customUniverseTsCodes?: string[];
  initialCapital: number;
  rebalanceFrequency?: string;
  priceMode?: string;
  commissionRate?: number;
  stampDutyRate?: number;
  minCommission?: number;
  slippageBps?: number;
  maxPositions?: number;
  maxWeightPerStock?: number;
  minDaysListed?: number;
  enableTradeConstraints?: boolean;
};

export type CreateBacktestRunResponse = {
  runId: string;
  jobId: string;
  status: 'QUEUED';
};

// ─── 列表 / 详情 ─────────────────────────────────

export type BacktestRunListItem = {
  runId: string;
  name: string | null;
  strategyType: string;
  status: string;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  totalReturn: number | null;
  annualizedReturn: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  progress: number;
  createdAt: string;
  completedAt: string | null;
};

export type BacktestRunListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: BacktestRunListItem[];
};

export type BacktestRunDetailResponse = {
  runId: string;
  jobId: string | null;
  name: string | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  failedReason: string | null;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  universe: string;
  initialCapital: number;
  rebalanceFrequency: string;
  priceMode: string;
  summary: {
    totalReturn: number | null;
    annualizedReturn: number | null;
    benchmarkReturn: number | null;
    excessReturn: number | null;
    maxDrawdown: number | null;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    calmarRatio: number | null;
    volatility: number | null;
    alpha: number | null;
    beta: number | null;
    informationRatio: number | null;
    winRate: number | null;
    turnoverRate: number | null;
    tradeCount: number | null;
  };
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type BacktestEquityPoint = {
  tradeDate: string;
  nav: number;
  benchmarkNav: number;
  drawdown: number;
  dailyReturn: number;
  benchmarkReturn: number;
  exposure: number;
  cashRatio: number;
};

export type BacktestTradeItem = {
  tradeDate: string;
  tsCode: string;
  name: string | null;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  amount: number;
  commission: number;
  stampDuty: number;
  slippageCost: number;
  reason: string | null;
};

export type BacktestPositionItem = {
  tsCode: string;
  name: string | null;
  quantity: number;
  costPrice: number;
  closePrice: number;
  marketValue: number;
  weight: number;
  unrealizedPnl: number;
  holdingDays: number;
};

export type BacktestPositionResponse = {
  tradeDate: string;
  items: BacktestPositionItem[];
};

// ─── API 方法 ────────────────────────────────────

export function getStrategyTemplates() {
  return apiClient.get<GetStrategyTemplatesResponse>('/api/backtests/strategy-templates');
}

export function validateRun(query: ValidateBacktestRunQuery) {
  return apiClient.post<ValidateBacktestRunResponse>('/api/backtests/runs/validate', query);
}

export function createRun(query: CreateBacktestRunQuery) {
  return apiClient.post<CreateBacktestRunResponse>('/api/backtests/runs', query);
}

export function listRuns(query: {
  page?: number;
  pageSize?: number;
  status?: string;
  strategyType?: string;
  keyword?: string;
}) {
  return apiClient.get<BacktestRunListResponse>(
    `/api/backtests/runs?${new URLSearchParams(query as Record<string, string>).toString()}`
  );
}

export function getRunDetail(runId: string) {
  return apiClient.get<BacktestRunDetailResponse>(`/api/backtests/runs/${runId}`);
}

export function getRunEquity(runId: string) {
  return apiClient.get<{ points: BacktestEquityPoint[] }>(`/api/backtests/runs/${runId}/equity`);
}

export function getRunTrades(runId: string, page = 1, pageSize = 50) {
  return apiClient.get<{
    page: number;
    pageSize: number;
    total: number;
    items: BacktestTradeItem[];
  }>(`/api/backtests/runs/${runId}/trades?page=${page}&pageSize=${pageSize}`);
}

export function getRunPositions(runId: string, tradeDate?: string) {
  const suffix = tradeDate ? `?tradeDate=${tradeDate}` : '';
  return apiClient.get<BacktestPositionResponse>(`/api/backtests/runs/${runId}/positions${suffix}`);
}

export function cancelRun(runId: string) {
  return apiClient.post<{ runId: string; status: 'CANCELLED' }>(
    `/api/backtests/runs/${runId}/cancel`,
    {}
  );
}
```

---

## 八、实现顺序建议

```text
Step 1: 新建 src/api/backtest.ts
Step 2: 创建 3 个 page 文件（workbench / runs / run-detail）
Step 3: 注册 routes 与 nav-config-dashboard
Step 4: 创建 sections/backtest/types.ts + constants.ts
Step 5: 创建 BacktestTemplateCards
Step 6: 创建 BacktestConfigForm + BacktestStrategyConfigPanel
Step 7: 创建 BacktestValidatePanel + BacktestSubmitSummary
Step 8: 创建 BacktestWorkbenchView 并打通模板/校验/提交
Step 9: 创建 BacktestRunListToolbar + BacktestRunListTable + RunListView
Step 10: 创建 use-backtest-job.ts（复用 src/lib/socket.ts）
Step 11: 创建 BacktestRunDetailView + Header + ProgressBanner
Step 12: 创建 EquityChart / DrawdownChart / MonthlyReturnTable
Step 13: 创建 TradesTable / PositionsTable / RebalanceLogTable / ConfigDrawer
Step 14: 联调真实后端，验证提交任务 → WebSocket 进度 → 详情页自动刷新
```

---

## 九、关键注意事项

1. **优先使用鼠标友好控件，不要要求用户手写 JSON。**
2. **工作台页必须先校验，再提交。**
3. **详情页必须支持“刷新后恢复状态”**：即使用户刷新页面，也能重新拉详情并继续订阅 job progress。
4. **WebSocket 必须复用 `src/lib/socket.ts`**，不要创建第二套 socket 管理。
5. **正在运行的任务详情页应以 WebSocket 为主、API 为辅**：
   - WebSocket 更新 progress
   - completed / failed 后自动重新请求 detail/equity/trades
6. **图表 tooltip 必须遵守 ApexCharts 约束**：如 `shared = true`，则 `intersect = false`。
7. **详情页不要一次性把所有大表都首屏拉完**：
   - 首屏先拉 detail + equity
   - trades / positions / logs 在对应 tab 首次打开时再加载
8. **回测报告页是给用户做分析的，不是只给出几个数字。** 必须至少展示：净值、回撤、月收益、交易明细、持仓快照。
