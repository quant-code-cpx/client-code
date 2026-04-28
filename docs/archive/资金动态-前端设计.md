# 资金动态（Capital Flow）— 前端实现规划

> **目标读者**：AI 代码生成助手。请严格按照本文定义的组件结构、布局规则、API 调用方式实现。

---

## 一、技术栈与约定

与市场概览页一致，参见 `MARKET_OVERVIEW_FRONTEND.md` 中"技术栈与约定"部分。

**额外提醒**：

1. 资金流向数据单位为**万元**（Tushare 东财数据原始单位），页面展示需在组件内自行决定是否转为"亿元"（÷10000）。建议：大盘/板块级别转亿，个股级别保留万。
2. 数据窗口限制：大盘/板块/个股资金流仅保留近 60 个交易日，HSGT 有完整历史。前端 `days` 参数最大设为 60（HSGT 除外）。

---

## 二、页面整体布局

路径：`src/sections/market-money-flow/view/market-money-flow-view.tsx`

```
┌──────────────────────────────────────────────────┐
│  页面标题：资金动态           [日期选择器]         │
├──────────────────────────────────────────────────┤
│  大盘资金流概要卡片（今日净流入 + 四级别拆分）     │
│  xs=12                                           │
├──────────────────────────────────────────────────┤
│  大盘资金流向趋势（面积/柱状图）                   │
│  xs=12 md=8                                      │
├────────────────────┬─────────────────────────────┤
│                    │  沪深港通资金（当日卡片）      │
│                    │  xs=12 md=4                  │
├────────────────────┴─────────────────────────────┤
│  沪深港通趋势（折线 + 柱状，可切换周期）           │
│  xs=12                                           │
├──────────────────────────────────────────────────┤
│  行业板块资金流排行（表格 + 柱状图，可切换类型）   │
│  xs=12                                           │
├──────────────────────────────────────────────────┤
│  板块资金流趋势（点击板块后展开折线图）            │
│  xs=12                                           │
├──────────────────────────────────────────────────┤
│  主力资金净流入 Top N（表格）                      │
│  xs=12 md=6                                      │
├────────────────────┬─────────────────────────────┤
│                    │  主力净流出 Top N（表格）      │
│                    │  xs=12 md=6                  │
└────────────────────┴─────────────────────────────┘
```

---

## 三、组件拆分

```
src/sections/market-money-flow/
├── view/
│   ├── index.ts                                 # export { MarketMoneyFlowView }
│   └── market-money-flow-view.tsx               # 页面主组件
├── capital-flow-summary-card.tsx                 # 大盘资金流概要
├── capital-flow-trend-chart.tsx                  # 大盘资金流向趋势图
├── hsgt-summary-card.tsx                         # 沪深港通当日概要
├── hsgt-trend-chart.tsx                          # 沪深港通趋势图
├── sector-flow-ranking-panel.tsx                 # 行业板块资金排行
├── sector-flow-trend-chart.tsx                   # 板块资金趋势（可展开）
├── main-flow-ranking-table.tsx                   # 主力净流入/流出 Top N
└── stock-flow-detail-dialog.tsx                  # 个股资金明细弹窗（可选）
```

---

## 四、各组件详细规范

### 4.1 `CapitalFlowSummaryCard` — 大盘资金流概要

**API**：`POST /api/market/money-flow`  
**请求体**：`{ trade_date?: string }`

**UI 结构**：

- 横向排列 5 个小卡片/指标块：
  - **总净流入**：`netAmount`，最大字号，红涨绿跌
  - **超大单净流入**：`buyElgAmount`
  - **大单净流入**：`buyLgAmount`
  - **中单净流入**：`buyMdAmount`（通常为负，即净流出）
  - **小单净流入**：`buySmAmount`（通常为负）
- 每个指标块显示：金额（亿元，÷10000 并保留 2 位小数） + 净流入率 %
- 底部副标题行：沪市涨跌幅 `pctChangeSh`% / 深市涨跌幅 `pctChangeSz`%

**颜色规则**：正值红色，负值绿色。

---

### 4.2 `CapitalFlowTrendChart` — 大盘资金流向趋势

**API**：`POST /api/market/money-flow-trend`  
**请求体**：`{ trade_date?: string, days?: number }`

**UI 结构**：

- 卡片标题："大盘资金流向趋势"
- 右上角 ToggleButtonGroup 切换天数（10 / 20 / 40 / 60）
- 混合图表：
  - **柱状图**：每日净流入（红正绿负）
  - **折线图**：累计净流入（蓝色线）
  - X 轴：日期
  - 双 Y 轴：左轴=单日净流入（亿元），右轴=累计净流入（亿元）

**ApexCharts 配置要点**：

```typescript
{
  chart: { type: 'line', stacked: false },
  series: [
    { name: '每日净流入', type: 'column', data: [...] },
    { name: '累计净流入', type: 'line', data: [...] },
  ],
  yaxis: [
    { title: { text: '每日净流入(亿)' } },
    { opposite: true, title: { text: '累计净流入(亿)' } },
  ],
  tooltip: { shared: true, intersect: false },
  plotOptions: {
    bar: {
      colors: {
        ranges: [
          { from: -999999, to: 0, color: '#00B746' },  // 绿
          { from: 0, to: 999999, color: '#FF4560' },    // 红
        ]
      }
    }
  },
}
```

---

### 4.3 `HsgtSummaryCard` — 沪深港通当日概要

**API**：`POST /api/market/hsgt-flow`  
**请求体**：`{ trade_date?: string, days?: 1 }`（只取 1 条即可）

**UI 结构**：

- 卡片标题："沪深港通资金"
- 上半：北向资金合计 `northMoney`（亿元，大字号）
  - 拆分：沪股通 `hgt` / 深股通 `sgt`
- 下半：南向资金合计 `southMoney`（亿元）
  - 拆分：港股通（沪） `ggtSs` / 港股通（深） `ggtSz`
- 正值红，负值绿

---

### 4.4 `HsgtTrendChart` — 沪深港通趋势

**API**：`POST /api/market/hsgt-trend`  
**请求体**：`{ period?: '1m' | '3m' | '6m' | '1y' }`

**UI 结构**：

- 卡片标题："沪深港通资金趋势"
- 右上角 ToggleButtonGroup 切换周期（1M / 3M / 6M / 1Y）
- Tab 切换北向/南向视角
- 混合图表：
  - **柱状图**：每日净买入（红正绿负）
  - **折线图**：累计净买入
  - X 轴：日期

---

### 4.5 `SectorFlowRankingPanel` — 行业板块资金排行

**API**：`POST /api/market/sector-flow-ranking`  
**请求体**：`{ trade_date?: string, content_type?: string, sort_by?: string, order?: string, limit?: number }`

**UI 结构**：

- 卡片标题："板块资金流向"
- 顶部 Tab 切换类型：行业 / 概念 / 地域
- 右上角 Toggle 切换排序维度：净流入 / 涨跌幅 / 超大单
- 分为两列展示：
  - **左列**：Top 10 流入排行（表格形式）
    - 列：排名、板块名、涨跌幅%、净流入（亿）、超大单、大单
  - **右列**：Top 10 流出排行（同结构，降序取反）
- 或使用双向水平柱状图（正负各 10）

**点击板块行为**：点击某板块名称时，在下方展开 `SectorFlowTrendChart` 展示该板块近 N 日趋势。

---

### 4.6 `SectorFlowTrendChart` — 板块资金趋势

**API**：`POST /api/market/sector-flow-trend`  
**请求体**：`{ ts_code: string, content_type?: string, days?: number }`

**UI 结构**：

- 展开式卡片（由 `SectorFlowRankingPanel` 控制展开/收起状态）
- 标题："XXX板块资金流趋势"（动态显示板块名称）
- 混合图表：
  - **柱状图**：每日净流入
  - **折线图**：累计净流入
  - X 轴日期

---

### 4.7 `MainFlowRankingTable` — 主力资金 Top N

**API**：`POST /api/market/main-flow-ranking`  
**请求体**：`{ trade_date?: string, order: 'desc' | 'asc', limit?: number }`

**UI 结构（左右各一表）**：

**左表：主力净流入 Top 20**（`order = 'desc'`）：
| 排名 | 代码 | 名称 | 行业 | 主力净流入 | 超大单净 | 大单净 | 涨跌幅 | 成交额 |
|------|-----|------|------|-----------|---------|-------|--------|-------|

**右表：主力净流出 Top 20**（`order = 'asc'`）：
| 同上结构 |

**样式**：

- 使用 MUI `Table` / `TableContainer`
- 金额列：万元单位，保留 2 位
- 涨跌幅列：红涨绿跌
- 点击某行 → 打开 `StockFlowDetailDialog`（可选增强）

---

### 4.8 `StockFlowDetailDialog` — 个股资金明细弹窗（可选）

**API**：`POST /api/market/stock-flow-detail`  
**请求体**：`{ ts_code: string, days?: number }`

**UI 结构**：

- MUI `Dialog` 弹窗
- 标题："XXX (600000.SH) 资金流明细"
- 图表：
  - **柱状图**：主力净流入 vs 散户净流入（双柱并排）
  - **折线图**：净流入总额趋势
- 可单独作为后续增强功能实现，首期不做也不影响页面可用性

---

## 五、API 层文件

在 `src/api/market.ts` 中追加（或与市场概览共用同一文件）：

```typescript
// ─── 资金动态 类型定义 ────────────────────────────────

export type MarketMoneyFlowDetail = {
  tradeDate: string
  netAmount: number
  netAmountRate: number
  buyElgAmount: number
  buyElgAmountRate: number
  buyLgAmount: number
  buyLgAmountRate: number
  buyMdAmount: number
  buyMdAmountRate: number
  buySmAmount: number
  buySmAmountRate: number
  closeSh: number
  pctChangeSh: number
  closeSz: number
  pctChangeSz: number
}

export type MoneyFlowTrendItem = {
  tradeDate: string
  netAmount: number
  cumulativeNet: number
  buyElgAmount: number
  buyLgAmount: number
  buyMdAmount: number
  buySmAmount: number
}

export type SectorFlowRankingItem = {
  tsCode: string
  name: string
  pctChange: number
  close: number
  netAmount: number
  netAmountRate: number
  buyElgAmount: number
  buyLgAmount: number
  buyMdAmount: number
  buySmAmount: number
}

export type SectorFlowTrendItem = {
  tradeDate: string
  pctChange: number
  netAmount: number
  cumulativeNet: number
}

export type HsgtTrendItem = {
  tradeDate: string
  northMoney: number
  southMoney: number
  hgt: number
  sgt: number
  ggtSs: number
  ggtSz: number
  cumulativeNorth: number
  cumulativeSouth: number
}

export type MainFlowRankingItem = {
  tsCode: string
  name: string
  industry: string
  mainNetInflow: number
  elgNetInflow: number
  lgNetInflow: number
  pctChg: number
  amount: number
}

export type StockFlowDetailItem = {
  tradeDate: string
  mainNetInflow: number
  retailNetInflow: number
  buyElgAmount: number
  sellElgAmount: number
  buyLgAmount: number
  sellLgAmount: number
  buyMdAmount: number
  sellMdAmount: number
  buySmAmount: number
  sellSmAmount: number
  netMfAmount: number
}

// ─── API 调用函数 ────────────────────────────────────

export function fetchMoneyFlowTrend(query?: { trade_date?: string; days?: number }) {
  return apiClient.post<{ data: MoneyFlowTrendItem[] }>('/api/market/money-flow-trend', query ?? {})
}

export function fetchSectorFlowRanking(query?: {
  trade_date?: string
  content_type?: string
  sort_by?: string
  order?: string
  limit?: number
}) {
  return apiClient.post<{ tradeDate: string; contentType: string; sectors: SectorFlowRankingItem[] }>(
    '/api/market/sector-flow-ranking',
    query ?? {},
  )
}

export function fetchSectorFlowTrend(query: { ts_code: string; content_type?: string; days?: number }) {
  return apiClient.post<{ tsCode: string; name: string; data: SectorFlowTrendItem[] }>(
    '/api/market/sector-flow-trend',
    query,
  )
}

export function fetchHsgtTrend(query?: { period?: string }) {
  return apiClient.post<{ period: string; data: HsgtTrendItem[] }>('/api/market/hsgt-trend', query ?? {})
}

export function fetchMainFlowRanking(query?: { trade_date?: string; order?: string; limit?: number }) {
  return apiClient.post<{ tradeDate: string; data: MainFlowRankingItem[] }>(
    '/api/market/main-flow-ranking',
    query ?? {},
  )
}

export function fetchStockFlowDetail(query: { ts_code: string; days?: number }) {
  return apiClient.post<{ tsCode: string; name: string; data: StockFlowDetailItem[] }>(
    '/api/market/stock-flow-detail',
    query,
  )
}
```

---

## 六、实施顺序

```
Step 1: 在 src/api/market.ts 中追加资金动态相关类型和 API 函数
Step 2: 创建 CapitalFlowSummaryCard（验证 money-flow 接口增强后的数据）
Step 3: 创建 CapitalFlowTrendChart
Step 4: 创建 HsgtSummaryCard + HsgtTrendChart
Step 5: 创建 SectorFlowRankingPanel + SectorFlowTrendChart
Step 6: 创建 MainFlowRankingTable（左右双表）
Step 7: 在 market-money-flow-view.tsx 中组装所有组件
Step 8: （可选）创建 StockFlowDetailDialog
```

---

## 七、注意事项

1. **tooltip 安全设置**：所有 ApexCharts 图表必须遵守 `tooltip.shared = true` 时 `tooltip.intersect = false` 的组合。
2. **空数据保护**：每个组件渲染图表/表格前需检查数据是否为 null/undefined/空数组。使用条件渲染 `{data?.length > 0 && <Chart ... />}` 来防止运行时错误。
3. **金额单位**：
   - 大盘级（market_capital_flows）：原始万元 → 展示亿元（÷10000）
   - 板块级（sector_capital_flows）：原始万元 → 展示亿元（÷10000）
   - 个股级（stock_capital_flows）：原始千元 → 展示万元（÷10）
   - HSGT：原始百万元 → 展示亿元（÷100）
   - 请根据 Tushare 文档确认各接口的实际单位后调整换算系数。
4. **双向柱状图颜色**：使用 `plotOptions.bar.colors.ranges` 配置正值红色、负值绿色的条件着色。
5. **表格交互**：MUI Table 行使用 `hover` 效果，点击行可触发详情弹窗或跳转。
