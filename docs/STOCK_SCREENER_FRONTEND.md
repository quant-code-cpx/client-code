# 选股器（Stock Screener）— 前端实现规划

> **目标读者**：AI 代码生成助手。请严格按照本文定义的组件结构、布局规则、API 调用方式实现。

---

## 一、技术栈与约定

| 技术           | 版本/说明                                                   |
| -------------- | ----------------------------------------------------------- |
| 框架           | React 18（Vite）                                            |
| UI 库          | MUI v5（`@mui/material`），使用 `sx` prop 做样式            |
| 图表           | ApexCharts（`react-apexcharts` / `apexcharts`）             |
| API 客户端     | 项目内 `src/api/client.ts` 的 `apiClient.post()`            |
| 布局容器       | `DashboardContent`（来自 `src/layouts/dashboard`）          |
| 路由           | 需新注册 `/stock/screener` → `StockScreenerPage`            |

### 关键约定

1. **API 调用**：统一使用 `apiClient.post<T>(url, body)` 或 `apiClient.get<T>(url)` 发请求。
2. **错误处理**：组件内使用 `try/catch`，失败时在 UI 上显示提示（Snackbar 或 Alert），不阻塞页面。
3. **加载状态**：主表格使用 MUI `LinearProgress` 或 `Skeleton` 占位。
4. **空数据保护**：使用数据前必须检查 null / undefined / 空数组。
5. **金额单位**：
   - 总市值/流通市值：后端返回万元，前端转"亿" (÷10000) 并保留 2 位小数。
   - 资金流净流入：万元原始展示，值大时可转"亿"。
   - 成交额：千元，转"万"(÷10) 或"亿"(÷100000)。
6. **颜色规则**：正值红色（`error.main`）、负值绿色（`success.main`）、零或 null 灰色（`text.secondary`）。

---

## 二、路由与导航注册

### 路由

在 `src/routes/sections.tsx` 中新增：

```typescript
export const StockScreenerPage = lazy(() => import('src/pages/stock-screener'))

// 在 children 数组中添加：
{ path: 'stock/screener', element: <StockScreenerPage /> },
```

### 导航

在 `src/layouts/nav-config-dashboard.tsx` 的 `股票` 项下添加子菜单：

```typescript
{
  title: '股票',
  path: '/stock',
  icon: icon('ic-cart'),
  children: [
    {
      title: '股票列表',
      path: '/stock',
      icon: icon('ic-cart'),
    },
    {
      title: '选股器',
      path: '/stock/screener',
      icon: <Iconify icon="solar:filter-bold" width={24} />,
    },
  ],
},
```

### 页面文件

新建 `src/pages/stock-screener.tsx`：

```typescript
import { Helmet } from 'react-helmet-async'
import { StockScreenerView } from 'src/sections/stock-screener/view'

export default function StockScreenerPage() {
  return (
    <>
      <Helmet><title>选股器</title></Helmet>
      <StockScreenerView />
    </>
  )
}
```

---

## 三、页面整体布局

路径：`src/sections/stock-screener/view/stock-screener-view.tsx`

```
┌──────────────────────────────────────────────────────┐
│  页面标题：选股器                                      │
├──────────────────────────────────────────────────────┤
│  预设策略快捷按钮栏（Chip 组）                         │
│  [低估值蓝筹] [高成长] [优质白马] [高股息] [小盘成长]   │
│  [主力流入] [自定义]                                   │
├──────────────────────────────────────────────────────┤
│  筛选条件面板（可折叠 Accordion）                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 基本面: [交易所▼] [板块▼] [行业▼] [地域▼]      │  │
│  │ 估值:   PE [__~__] PB [__~__] 股息率≥[__]      │  │
│  │         市值 [__~__亿]                          │  │
│  │ 成长:   营收增速 [__~__]% 净利增速 [__~__]%     │  │
│  │ 盈利:   ROE [__~__]% 毛利率≥[__]% 净利率≥[__]% │  │
│  │ 财务:   资产负债率≤[__]% 流动比率≥[__]           │  │
│  │ 现金流: 经营现金流/净利≥[__]                     │  │
│  │ 资金:   近5日主力净流入≥[__万] 近20日≥[__万]     │  │
│  │ 行情:   涨跌幅 [__~__]% 换手率 [__~__]%         │  │
│  │                                                 │  │
│  │         [重置条件]              [开始选股 🔍]    │  │
│  └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│  结果统计栏: 共命中 XXX 只股票  |  排序: [▼总市值]     │
├──────────────────────────────────────────────────────┤
│  结果表格（分页）                                      │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐  │
│  │名称  │最新价│涨跌幅│市值  │PE   │PB   │ROE  │...│  │
│  │代码  │     │     │(亿) │TTM  │     │(%)  │   │  │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤  │
│  │ ...  │     │     │     │     │     │     │     │  │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘  │
│                        1 2 3 ... 10                   │
└──────────────────────────────────────────────────────┘
```

---

## 四、组件拆分

```
src/sections/stock-screener/
├── view/
│   ├── index.ts                               # export { StockScreenerView }
│   └── stock-screener-view.tsx                # 页面主组件（布局 + 状态管理）
├── screener-preset-bar.tsx                    # 预设策略快捷按钮
├── screener-filter-panel.tsx                  # 筛选条件面板（Accordion）
├── screener-filter-range-input.tsx            # 范围输入复用组件（min~max）
├── screener-result-toolbar.tsx                # 结果统计栏 + 排序选择
├── screener-result-table.tsx                  # 结果表格
├── screener-result-table-head.tsx             # 表头（支持排序点击）
├── screener-result-table-row.tsx              # 单行数据渲染
├── types.ts                                   # 筛选条件/响应类型
└── constants.ts                               # 列配置、预设映射、枚举
```

---

## 五、各组件详细规范

### 5.1 `StockScreenerView` — 页面主组件

**职责**：管理全局状态，协调子组件，发起 API 请求。

**状态管理**：

```typescript
// 筛选条件（对应后端 DTO 所有字段）
const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS)

// 分页
const [page, setPage] = useState(0)  // MUI TablePagination 从 0 开始
const [rowsPerPage, setRowsPerPage] = useState(20)

// 排序
const [sortBy, setSortBy] = useState<string>('totalMv')
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

// 数据
const [result, setResult] = useState<ScreenerResult | null>(null)
const [loading, setLoading] = useState(false)

// 预设
const [presets, setPresets] = useState<ScreenerPreset[]>([])
const [activePreset, setActivePreset] = useState<string | null>(null)

// 辅助数据
const [industries, setIndustries] = useState<{ name: string; count: number }[]>([])
const [areas, setAreas] = useState<{ name: string; count: number }[]>([])
```

**初始化**：页面加载时并行请求预设列表、行业列表、地域列表，然后自动执行一次默认查询（无筛选条件，按市值降序）。

**查询逻辑**：

```typescript
const doSearch = useCallback(async () => {
  setLoading(true)
  try {
    const data = await fetchScreener({
      ...buildQueryFromFilters(filters),
      page: page + 1,           // 后端从 1 开始
      pageSize: rowsPerPage,
      sortBy,
      sortOrder,
    })
    setResult(data)
  } catch (e) {
    // 显示错误提示
  } finally {
    setLoading(false)
  }
}, [filters, page, rowsPerPage, sortBy, sortOrder])
```

**触发时机**：
- 点击"开始选股"按钮 → 调用 `doSearch()`，并重置 `page = 0`
- 翻页 / 切换每页条数 → 自动触发 `doSearch()`
- 点击表头排序 → 更新 `sortBy` / `sortOrder`，自动触发 `doSearch()`
- 点击预设 → 填充 `filters` + 自动触发 `doSearch()`

---

### 5.2 `ScreenerPresetBar` — 预设策略快捷按钮

**Props**：

```typescript
interface ScreenerPresetBarProps {
  presets: ScreenerPreset[]
  activePreset: string | null
  onSelect: (preset: ScreenerPreset) => void
  onReset: () => void
}
```

**UI 结构**：

- 横向排列 MUI `Chip` 组件，每个 Chip 代表一个预设：
  - 选中态：`color="primary"` `variant="filled"`
  - 未选中态：`variant="outlined"`
- 最后一个 Chip：`自定义`（当用户手动修改了条件后自动高亮）
- 每个 Chip 显示 `preset.name`，hover 时 tooltip 显示 `preset.description`

---

### 5.3 `ScreenerFilterPanel` — 筛选条件面板

**Props**：

```typescript
interface ScreenerFilterPanelProps {
  filters: ScreenerFilters
  industries: { name: string; count: number }[]
  areas: { name: string; count: number }[]
  onChange: (newFilters: ScreenerFilters) => void
  onSearch: () => void
  onReset: () => void
}
```

**UI 结构**：

使用 MUI `Accordion`（默认展开），内部分为多行：

**第 1 行：基本面**

- 交易所：`Select`（全部/上交所/深交所/北交所）
- 板块：`Select`（全部/主板/创业板/科创板/北交所）
- 行业：`Autocomplete`（从 `/stock/industries` 加载选项，显示 `名称(数量)`）
- 地域：`Autocomplete`（从 `/stock/areas` 加载选项）

**第 2 行：估值**

- PE TTM：`ScreenerFilterRangeInput`（min ~ max）
- PB：`ScreenerFilterRangeInput`（min ~ max）
- 股息率 TTM：单字段 `TextField`（≥ N%）
- 总市值：`ScreenerFilterRangeInput`（min ~ max，**输入单位为亿，提交时 ×10000 转万**）

**第 3 行：成长**

- 营收同比增速：`ScreenerFilterRangeInput`（min ~ max，%）
- 净利润同比增速：`ScreenerFilterRangeInput`（min ~ max，%）

**第 4 行：盈利**

- ROE：`ScreenerFilterRangeInput`（min ~ max，%）
- 毛利率：单字段（≥ N%）
- 净利率：单字段（≥ N%）

**第 5 行：财务健康 + 现金流**

- 资产负债率：单字段（≤ N%）
- 流动比率：单字段（≥ N）
- 速动比率：单字段（≥ N）
- 经营现金流/净利润：单字段（≥ N）

**第 6 行：资金流向**

- 近 5 日主力净流入：单字段（≥ N 万元）
- 近 20 日主力净流入：单字段（≥ N 万元）

**第 7 行：行情**

- 涨跌幅：`ScreenerFilterRangeInput`（min ~ max，%）
- 换手率：`ScreenerFilterRangeInput`（min ~ max，%）

**底部按钮**：

- `重置条件`（`Button variant="outlined"`）→ 清空所有条件回到默认
- `开始选股`（`Button variant="contained" color="primary"`）→ 触发查询

**布局**：每行使用 `Grid container spacing={2}`，每个筛选项 `Grid item xs={6} sm={4} md={3}`。

---

### 5.4 `ScreenerFilterRangeInput` — 范围输入复用组件

**Props**：

```typescript
interface ScreenerFilterRangeInputProps {
  label: string
  minValue: number | undefined
  maxValue: number | undefined
  onMinChange: (v: number | undefined) => void
  onMaxChange: (v: number | undefined) => void
  unit?: string           // 如 '%', '亿', '万'
  step?: number           // 步进值
  placeholder?: [string, string]  // 如 ['不限', '不限']
}
```

**UI 结构**：

```
[Label]
[最小值 TextField] ~ [最大值 TextField]  [单位]
```

- 使用 MUI `TextField` + `InputAdornment` 展示单位
- `type="number"` + `inputProps={{ step }}`
- 空值显示 placeholder（"不限"）

---

### 5.5 `ScreenerResultToolbar` — 结果统计栏

**Props**：

```typescript
interface ScreenerResultToolbarProps {
  total: number
  loading: boolean
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void
}
```

**UI 结构**：

- 左侧：`Typography`："共命中 **{total}** 只股票"
- 右侧：排序 `Select`（总市值/PE/PB/ROE/涨跌幅/营收增速/净利增速/主力净流入…） + 升序/降序 Toggle

---

### 5.6 `ScreenerResultTable` — 结果表格

**Props**：

```typescript
interface ScreenerResultTableProps {
  items: StockScreenerItem[]
  total: number
  page: number
  rowsPerPage: number
  loading: boolean
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onPageChange: (page: number) => void
  onRowsPerPageChange: (size: number) => void
  onSort: (field: string) => void
  /** 显示哪些可选列（根据用户筛选条件动态调整） */
  visibleColumns: string[]
}
```

**表头列定义**：

| 列 ID           | 标签         | 默认显示 | 可排序 | 宽度  | 对齐  |
| --------------- | ------------ | -------- | ------ | ----- | ----- |
| name            | 股票名称/代码 | ✓        | ✗      | 180px | left  |
| close           | 最新价       | ✓        | ✗      | 90px  | right |
| pctChg          | 涨跌幅       | ✓        | ✓      | 90px  | right |
| totalMv         | 总市值       | ✓        | ✓      | 100px | right |
| peTtm           | PE TTM       | ✓        | ✓      | 80px  | right |
| pb              | PB           | ✓        | ✓      | 80px  | right |
| dvTtm           | 股息率       | ✓        | ✓      | 80px  | right |
| turnoverRate    | 换手率       | ✓        | ✓      | 80px  | right |
| roe             | ROE          | 条件触发 | ✓      | 80px  | right |
| revenueYoy      | 营收增速     | 条件触发 | ✓      | 90px  | right |
| netprofitYoy    | 净利增速     | 条件触发 | ✓      | 90px  | right |
| grossMargin     | 毛利率       | 条件触发 | ✓      | 80px  | right |
| netMargin       | 净利率       | 条件触发 | ✓      | 80px  | right |
| debtToAssets    | 资产负债率   | 条件触发 | ✓      | 90px  | right |
| currentRatio    | 流动比率     | 条件触发 | ✗      | 80px  | right |
| quickRatio      | 速动比率     | 条件触发 | ✗      | 80px  | right |
| ocfToNetprofit  | OCF/净利     | 条件触发 | ✗      | 90px  | right |
| mainNetInflow5d | 5日主力净流入 | 条件触发 | ✓      | 120px | right |
| mainNetInflow20d| 20日主力净流入| 条件触发 | ✗      | 120px | right |
| industry        | 行业         | ✓        | ✗      | 90px  | left  |
| market          | 板块         | ✓        | ✗      | 80px  | left  |
| latestFinDate   | 财报期       | 条件触发 | ✗      | 100px | center|

**"条件触发"显示逻辑**：当用户在筛选面板中使用了某维度的条件，或按该维度排序时，自动显示对应列。例如：用户设置了 `minRoe >= 10`，则 `roe` 列自动可见。此逻辑在 `StockScreenerView` 中计算 `visibleColumns` 后传入。

**行点击**：点击某行跳转到 `/stock/detail?code={tsCode}`。

---

### 5.7 `ScreenerResultTableRow` — 单行渲染

**每列格式化规则**：

| 字段             | 格式化                                         |
| ---------------- | ---------------------------------------------- |
| name + tsCode    | 名称加粗，代码灰色小字在下方                   |
| close            | 保留 2 位小数                                  |
| pctChg           | ±N.NN%，红涨绿跌                              |
| totalMv / circMv | ÷10000 转亿，保留 2 位 + "亿"后缀             |
| peTtm / pb       | 保留 2 位小数，负值显示"亏损"（红色标记）       |
| dvTtm            | 保留 2 位 + "%"                                |
| turnoverRate     | 保留 2 位 + "%"                                |
| roe              | 保留 2 位 + "%"，红涨绿跌规则                  |
| revenueYoy       | ±N.NN%                                         |
| netprofitYoy     | ±N.NN%                                         |
| grossMargin      | N.NN%                                          |
| netMargin        | ±N.NN%                                         |
| debtToAssets     | N.NN%                                          |
| currentRatio     | 保留 2 位                                      |
| quickRatio       | 保留 2 位                                      |
| ocfToNetprofit   | 保留 2 位                                      |
| mainNetInflow5d  | 万元，红正绿负，绝对值>10000时转"亿"显示       |
| mainNetInflow20d | 同上                                           |
| latestFinDate    | YYYY-MM-DD                                     |
| NULL 值          | 显示 "—"                                       |

---

## 六、API 层文件

在 `src/api/` 下新建 `screener.ts`（或追加到 `stock.ts`）：

```typescript
import { apiClient } from './client'

// ─── 类型定义 ────────────────────────────────────────

export type ScreenerFilters = {
  // 基本面
  exchange?: string
  market?: string
  industry?: string
  area?: string
  isHs?: string
  // 估值
  minPeTtm?: number
  maxPeTtm?: number
  minPb?: number
  maxPb?: number
  minDvTtm?: number
  minTotalMv?: number
  maxTotalMv?: number
  minCircMv?: number
  maxCircMv?: number
  // 行情
  minPctChg?: number
  maxPctChg?: number
  minTurnoverRate?: number
  maxTurnoverRate?: number
  minAmount?: number
  maxAmount?: number
  // 成长
  minRevenueYoy?: number
  maxRevenueYoy?: number
  minNetprofitYoy?: number
  maxNetprofitYoy?: number
  // 盈利
  minRoe?: number
  maxRoe?: number
  minGrossMargin?: number
  maxGrossMargin?: number
  minNetMargin?: number
  maxNetMargin?: number
  // 财务
  maxDebtToAssets?: number
  minCurrentRatio?: number
  minQuickRatio?: number
  // 现金流
  minOcfToNetprofit?: number
  // 资金
  minMainNetInflow5d?: number
  minMainNetInflow20d?: number
}

export type ScreenerQuery = ScreenerFilters & {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type StockScreenerItem = {
  tsCode: string
  name: string | null
  industry: string | null
  market: string | null
  listDate: string | null
  close: number | null
  pctChg: number | null
  amount: number | null
  turnoverRate: number | null
  peTtm: number | null
  pb: number | null
  dvTtm: number | null
  totalMv: number | null
  circMv: number | null
  revenueYoy: number | null
  netprofitYoy: number | null
  roe: number | null
  grossMargin: number | null
  netMargin: number | null
  debtToAssets: number | null
  currentRatio: number | null
  quickRatio: number | null
  ocfToNetprofit: number | null
  mainNetInflow5d: number | null
  mainNetInflow20d: number | null
  latestFinDate: string | null
}

export type ScreenerResult = {
  page: number
  pageSize: number
  total: number
  items: StockScreenerItem[]
}

export type ScreenerPreset = {
  id: string
  name: string
  description: string
  filters: Partial<ScreenerFilters>
}

export type IndustryItem = { name: string; count: number }
export type AreaItem = { name: string; count: number }

// ─── API 调用函数 ────────────────────────────────────

export function fetchScreener(query: ScreenerQuery) {
  return apiClient.post<ScreenerResult>('/api/stock/screener', query)
}

export function fetchScreenerPresets() {
  return apiClient.post<{ presets: ScreenerPreset[] }>('/api/stock/screener/presets', {})
}

export function fetchIndustries() {
  return apiClient.get<{ industries: IndustryItem[] }>('/api/stock/industries')
}

export function fetchAreas() {
  return apiClient.get<{ areas: AreaItem[] }>('/api/stock/areas')
}
```

---

## 七、状态交互流程

```
页面加载
  ├── 并行请求: fetchScreenerPresets() + fetchIndustries() + fetchAreas()
  ├── 设置 presets / industries / areas 状态
  └── 自动执行 fetchScreener(默认条件) → 显示全A股按市值排序

用户点击预设 Chip（如"低估值蓝筹"）
  ├── setFilters(preset.filters)
  ├── setActivePreset(preset.id)
  ├── setPage(0)
  └── 自动触发 fetchScreener()

用户手动修改筛选条件
  ├── setFilters({...filters, [field]: value})
  └── setActivePreset('custom')  // 切换到"自定义"状态

用户点击"开始选股"
  ├── setPage(0)
  └── fetchScreener(当前 filters + page + sort)

用户翻页或更改每页条数
  └── fetchScreener(当前 filters + 新 page + sort)

用户点击表头排序
  ├── setSortBy(field)
  ├── toggleSortOrder()
  ├── setPage(0)
  └── fetchScreener()

用户点击"重置条件"
  ├── setFilters(DEFAULT_FILTERS)
  ├── setActivePreset(null)
  ├── setPage(0)
  └── fetchScreener(默认条件)

用户点击结果行
  └── navigate(`/stock/detail?code=${tsCode}`)
```

---

## 八、实施顺序

```
Step 1: 在 src/api/ 中创建 screener.ts（类型 + API 调用函数）
Step 2: 创建 src/pages/stock-screener.tsx 页面文件
Step 3: 注册路由（sections.tsx）和导航（nav-config-dashboard.tsx）
Step 4: 创建 types.ts + constants.ts（列配置、默认筛选条件、枚举映射）
Step 5: 创建 ScreenerFilterRangeInput 复用组件
Step 6: 创建 ScreenerPresetBar 组件
Step 7: 创建 ScreenerFilterPanel 组件
Step 8: 创建 ScreenerResultTable + TableHead + TableRow 组件
Step 9: 创建 ScreenerResultToolbar 组件
Step 10: 在 stock-screener-view.tsx 中组装全部组件
Step 11: 联调后端 API，验证各预设策略返回数据
```

---

## 九、注意事项

1. **市值输入单位转换**：用户在面板中输入的市值单位为"亿"（直觉友好），提交 API 时乘以 10000 转换为"万元"（后端字段单位）。
2. **动态列显示**：默认只显示基础列（名称、最新价、涨跌幅、市值、PE、PB、股息率、换手率、行业、板块）。当用户使用了成长/盈利/财务/资金类条件后，自动追加对应列，避免表格过宽。
3. **tooltip 安全**：ApexCharts 图表（如果后续在选股器中加入迷你图）必须遵守 `tooltip.shared = true` 时 `tooltip.intersect = false`。
4. **响应式**：筛选面板在移动端（xs/sm）自动堆叠为单列，表格用 `TableContainer` 横向滚动。
5. **预设与手动互斥**：点击预设后填充条件并立即查询；用户手动改动任何条件后，高亮状态自动切换为"自定义"。
6. **表格水平滚动**：当启用的列较多时，使用 MUI `TableContainer` + `sx={{ overflowX: 'auto' }}` 确保不溢出。首列（股票名称）使用 `position: sticky, left: 0` 冻结。
