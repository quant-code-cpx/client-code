# 市场概览（Market Overview）— 前端实现规划

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
| 自定义图表封装 | `src/components/chart/` 下的 `Chart` 组件和 `useChart` hook |
| 路由           | 已注册 `/market/overview` → `MarketOverviewPage`            |

### 关键约定

1. **API 调用**：统一使用 `apiClient.post<T>(url, body)` 方式发请求，不要用 fetch/axios。
2. **日期选择**：提供一个 `trade_date` 可选输入（YYYYMMDD 格式），不传则后端自动取最新交易日。
3. **错误处理**：组件内使用 `try/catch`，失败时在 UI 上显示提示，不能阻塞整页渲染。
4. **加载状态**：每个卡片组件独立管理 `loading` 状态，使用 MUI `Skeleton` 占位。
5. **图表 tooltip**：不要同时设置 `tooltip.shared = true` 和 `tooltip.intersect = true`，这会导致 ApexCharts 报错。如果使用 shared tooltip，必须设置 `tooltip.intersect = false`。
6. **空数据保护**：使用数据前必须检查是否为 null / undefined / 空数组，防止 `Cannot read properties of null` 错误。

---

## 二、页面整体布局

路径：`src/sections/market-overview/view/market-overview-view.tsx`

页面使用 MUI `Grid` 实现 Dashboard 风格的卡片布局：

```
┌─────────────────────────────────────────────┐
│  页面标题：市场概览       [日期选择器]        │
├──────────┬──────────┬──────────┬─────────────┤
│  上证指数  │  深证成指  │  创业板指  │  沪深300   │
│  收盘+涨跌  │  收盘+涨跌  │  收盘+涨跌  │  收盘+涨跌   │
│  (指数卡片) │  (指数卡片) │  (指数卡片) │  (指数卡片)  │
├──────────┴──────────┴──────────┴─────────────┤
│  核心指数走势（折线图，支持切换指数/周期）      │
│  xs=12 md=8                                  │
├──────────────────────┬───────────────────────┤
│                      │  市场情绪（涨跌家数）   │
│                      │  堆叠柱图/饼图          │
│                      │  xs=12 md=4            │
├──────────────────────┴───────────────────────┤
│  涨跌幅分布（直方图）                          │
│  xs=12 md=6                                  │
├──────────────────────┬───────────────────────┤
│                      │  市场情绪趋势（面积图）  │
│                      │  xs=12 md=6            │
├──────────────────────┴───────────────────────┤
│  行业涨跌排行（双向柱状图）                    │
│  xs=12 md=8                                  │
├──────────────────────┬───────────────────────┤
│                      │  市场成交额（柱状图）    │
│                      │  xs=12 md=4            │
├──────────────────────┴───────────────────────┤
│  市场估值（PE/PB 分位仪表盘 + 趋势折线图）    │
│  xs=12                                       │
└──────────────────────────────────────────────┘
```

---

## 三、组件拆分

所有组件放在 `src/sections/market-overview/` 下：

```
src/sections/market-overview/
├── view/
│   ├── index.ts                          # export { MarketOverviewView }
│   └── market-overview-view.tsx          # 页面主组件（Grid 布局 + 日期选择）
├── market-index-cards.tsx                # 指数卡片组
├── market-index-trend-chart.tsx          # 核心指数走势折线图
├── market-sentiment-card.tsx             # 市场情绪（涨跌家数）
├── market-change-distribution-chart.tsx  # 涨跌幅分布直方图
├── market-sentiment-trend-chart.tsx      # 市场情绪趋势面积图
├── market-sector-ranking-chart.tsx       # 行业涨跌排行柱状图
├── market-volume-chart.tsx               # 市场成交额柱状图
├── market-valuation-card.tsx             # 市场估值面板
└── market-valuation-trend-chart.tsx      # PE/PB 趋势折线图
```

---

## 四、各组件详细规范

### 4.1 `MarketIndexCards` — 指数卡片组

**API**：`POST /api/market/index-quote`  
**请求体**：`{ trade_date?: string }`

**UI 结构**：

- 4~6 张等宽卡片横排（`Grid` xs=6 md=3 或 md=2）
- 每张卡片展示：
  - 指数名称（需前端维护 ts_code → 中文名映射）
  - 收盘价 `close`（保留 2 位小数）
  - 涨跌幅 `pctChg`（红涨绿跌，+/- 前缀 + %）
  - 涨跌额 `change`
  - 成交额 `amount`（转换为"亿"单位并格式化）

**指数名称映射**：

```typescript
const INDEX_NAME_MAP: Record<string, string> = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
}
```

**颜色规则**：

- `pctChg > 0` → 红色 `error.main`
- `pctChg < 0` → 绿色 `success.main`
- `pctChg === 0` → 灰色 `text.secondary`

---

### 4.2 `MarketIndexTrendChart` — 指数走势折线图

**API**：`POST /api/market/index-trend`  
**请求体**：`{ ts_code?: string, period?: '1m' | '3m' | '6m' | '1y' | '3y' }`

**UI 结构**：

- 卡片标题："核心指数走势"
- 顶部 Tab 切换选择指数（上证/深证/创业板/沪深300/中证500/中证1000）
- 右侧 ToggleButtonGroup 切换时间周期（1M / 3M / 6M / 1Y / 3Y）
- 主体：ApexCharts `area` 类型折线图
  - X 轴：日期
  - Y 轴：收盘价
  - tooltip 显示：日期 + 收盘价 + 涨跌幅

**ApexCharts 配置要点**：

```typescript
{
  chart: { type: 'area', toolbar: { show: false } },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
  tooltip: { shared: true, intersect: false },  // 重要：不能同时 shared+intersect
  xaxis: { type: 'datetime' },
}
```

---

### 4.3 `MarketSentimentCard` — 市场情绪（涨跌家数）

**API**：`POST /api/market/sentiment`  
**请求体**：`{ trade_date?: string }`

**UI 结构**：

- 卡片标题："市场情绪"
- 上方：大字显示"上涨 XXX 家 / 下跌 XXX 家"
- 下方：水平堆叠条形图（仿东方财富样式），5 段分别对应：
  - 深红（涨≥5%） | 浅红（涨0~5%） | 灰（平盘） | 浅绿（跌0~5%） | 深绿（跌≥5%）
- 每段标注数字

**ApexCharts 配置**：使用 `bar` + `horizontal: true` + `stacked: true`，只 1 行数据。

---

### 4.4 `MarketChangeDistributionChart` — 涨跌幅分布直方图

**API**：`POST /api/market/change-distribution`  
**请求体**：`{ trade_date?: string }`

**UI 结构**：

- 卡片标题："涨跌幅分布"
- 右上角显示：涨停 XX 家 / 跌停 XX 家
- 柱状图：
  - X 轴：涨跌幅区间（"-10~-9", "-9~-8", ..., "9~10"）
  - Y 轴：家数
  - 颜色：负值区间绿色，正值区间红色，0 附近灰色

**空数据保护**：务必在渲染图表前检查 `distribution` 数组非空（`data?.distribution?.length > 0`）。

---

### 4.5 `MarketSentimentTrendChart` — 市场情绪趋势

**API**：`POST /api/market/sentiment-trend`  
**请求体**：`{ trade_date?: string, days?: number }`

**UI 结构**：

- 卡片标题："涨跌家数趋势"
- 面积图：
  - 两条线：上涨家数（红色）和 下跌家数（绿色）
  - X 轴：日期
  - 填充颜色半透明

---

### 4.6 `MarketSectorRankingChart` — 行业涨跌排行

**API**：`POST /api/market/sector-ranking`  
**请求体**：`{ trade_date?: string, sort_by?: 'pct_change' | 'net_amount', limit?: number }`

**UI 结构**：

- 卡片标题："行业涨跌排行"
- 右上角 Toggle 切换排序维度（涨跌幅 / 净流入）
- 水平条形图：
  - Y 轴：行业名称
  - X 轴：涨跌幅 % 或 净流入金额
  - 颜色：正值红色，负值绿色
  - 默认显示 Top 15 + Bottom 15（分两部分或一个双向图）

---

### 4.7 `MarketVolumeChart` — 市场成交额

**API**：`POST /api/market/volume-overview`  
**请求体**：`{ trade_date?: string, days?: number }`

**UI 结构**：

- 卡片标题："市场成交额"
- 柱状图 + 折线叠加：
  - 主柱：全 A 日成交额（亿元）
  - 折线：20 日均额（可选，前端计算 SMA）
  - X 轴：日期
  - 柱子颜色随涨跌变化（可选）

---

### 4.8 `MarketValuationCard` + `MarketValuationTrendChart` — 市场估值

**快照 API**：`POST /api/market/valuation`  
**趋势 API**：`POST /api/market/valuation-trend`

**UI 结构**：

- 左半部分（`MarketValuationCard`）：
  - 当日 PE_TTM 中位数（大字）
  - 当日 PB 中位数（大字）
  - 1 年 / 3 年 / 5 年分位数值 + 进度条
  - 分位 < 30 显示"低估"绿标签，30~70 "中性"灰标签，> 70 "高估"红标签
- 右半部分（`MarketValuationTrendChart`）：
  - 双 Y 轴折线图：PE_TTM 中位数趋势（左轴）+ PB 中位数趋势（右轴）
  - X 轴：日期
  - 右上角 Toggle 切换周期（3M / 6M / 1Y / 3Y / 5Y）

---

## 五、API 层文件

在 `src/api/` 下新建 `market.ts`：

```typescript
import { apiClient } from './client'

// ─── 类型定义 ───────────────────────────────────────────────

/** 后端接口的通用查询基类 */
export type MarketQueryBase = {
  trade_date?: string
}

export type IndexQuoteItem = {
  tsCode: string
  tradeDate: string
  close: number | null
  preClose: number | null
  change: number | null
  pctChg: number | null
  vol: number | null
  amount: number | null
}

export type IndexTrendQuery = {
  ts_code?: string
  period?: '1m' | '3m' | '6m' | '1y' | '3y'
}

export type IndexTrendItem = {
  tradeDate: string
  close: number
  pctChg: number
  vol: number
  amount: number
}

export type IndexTrendResult = {
  tsCode: string
  name: string
  period: string
  data: IndexTrendItem[]
}

export type SentimentResult = {
  tradeDate: string
  total: number
  bigRise: number
  rise: number
  flat: number
  fall: number
  bigFall: number
}

export type ChangeDistributionResult = {
  tradeDate: string
  limitUp: number
  limitDown: number
  distribution: Array<{ label: string; count: number }>
}

export type SentimentTrendItem = {
  tradeDate: string
  rise: number
  flat: number
  fall: number
  limitUp: number
  limitDown: number
}

export type SectorRankingItem = {
  tsCode: string
  name: string
  pctChange: number
  netAmount: number
  netAmountRate: number
}

export type VolumeOverviewItem = {
  tradeDate: string
  totalAmount: number
  shAmount: number
  szAmount: number
}

export type ValuationResult = {
  tradeDate: string | null
  peTtmMedian: number | null
  pbMedian: number | null
  peTtmPercentile: { oneYear: number | null; threeYear: number | null; fiveYear: number | null }
  pbPercentile: { oneYear: number | null; threeYear: number | null; fiveYear: number | null }
}

export type ValuationTrendItem = {
  tradeDate: string
  peTtmMedian: number
  pbMedian: number
}

// ─── API 调用函数 ───────────────────────────────────────────

export function fetchIndexQuote(query?: MarketQueryBase) {
  return apiClient.post<IndexQuoteItem[]>('/api/market/index-quote', query ?? {})
}

export function fetchIndexTrend(query?: IndexTrendQuery) {
  return apiClient.post<IndexTrendResult>('/api/market/index-trend', query ?? {})
}

export function fetchSentiment(query?: MarketQueryBase) {
  return apiClient.post<SentimentResult>('/api/market/sentiment', query ?? {})
}

export function fetchChangeDistribution(query?: MarketQueryBase) {
  return apiClient.post<ChangeDistributionResult>('/api/market/change-distribution', query ?? {})
}

export function fetchSentimentTrend(query?: MarketQueryBase & { days?: number }) {
  return apiClient.post<{ data: SentimentTrendItem[] }>('/api/market/sentiment-trend', query ?? {})
}

export function fetchSectorRanking(query?: MarketQueryBase & { sort_by?: string; limit?: number }) {
  return apiClient.post<{ tradeDate: string; sectors: SectorRankingItem[] }>('/api/market/sector-ranking', query ?? {})
}

export function fetchVolumeOverview(query?: MarketQueryBase & { days?: number }) {
  return apiClient.post<{ data: VolumeOverviewItem[] }>('/api/market/volume-overview', query ?? {})
}

export function fetchValuation(query?: MarketQueryBase) {
  return apiClient.post<ValuationResult>('/api/market/valuation', query ?? {})
}

export function fetchValuationTrend(query?: { period?: string }) {
  return apiClient.post<{ period: string; data: ValuationTrendItem[] }>('/api/market/valuation-trend', query ?? {})
}
```

---

## 六、实施顺序

```
Step 1: 创建 src/api/market.ts（类型 + API 调用函数）
Step 2: 创建 MarketIndexCards 组件（最简单，验证 API 连通性）
Step 3: 创建 MarketSentimentCard 组件
Step 4: 创建 MarketIndexTrendChart 组件
Step 5: 创建 MarketChangeDistributionChart + MarketSentimentTrendChart
Step 6: 创建 MarketSectorRankingChart + MarketVolumeChart
Step 7: 创建 MarketValuationCard + MarketValuationTrendChart
Step 8: 在 market-overview-view.tsx 中组装所有组件
Step 9: 添加日期选择器过滤（可选）
```

---

## 七、注意事项

1. **图表 tooltip 设置**：如使用 `tooltip.shared = true`，必须同时设 `tooltip.intersect = false`，否则 ApexCharts 运行时报错。
2. **空数据保护**：所有用到 `data?.xxx?.count` 或 `data?.xxx?.length` 的地方，都必须做 null 检查后再渲染图表组件。可在图表组件外层加 `{data && data.length > 0 && <Chart ... />}` 保护。
3. **颜色一致性**：全站涨跌颜色约定——红涨（`theme.palette.error.main`）、绿跌（`theme.palette.success.main`），遵循 A 股惯例。
4. **金额单位换算**：Tushare 的 `amount` 单位为千元，页面展示需转为"亿元"除以 100000。指数的 `amount` 单位也是千元。
5. **响应式布局**：双列区域使用 `<Grid xs={12} md={6}>` 或 `<Grid xs={12} md={8}>` + `<Grid xs={12} md={4}>`，在手机端自动堆叠为单列。
