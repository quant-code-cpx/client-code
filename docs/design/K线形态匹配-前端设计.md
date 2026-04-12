# K 线形态匹配（Pattern）— 前端实现规划

> **目标读者**：AI 代码生成助手。请严格按照本文定义的页面结构、交互流程、API 调用方式和组件拆分实现。核心功能为：从预定义形态模板库或自定义价格序列出发，在历史 K 线中搜索相似形态。

---

## 一、技术栈与现有架构结论

| 能力             | 当前情况                               | 结论      |
| ---------------- | -------------------------------------- | --------- |
| 页面分层         | `src/pages` + `src/sections`           | ✅ 可复用 |
| API 客户端       | `src/api/client.ts`                    | ✅ 可复用 |
| 仪表盘布局       | `DashboardContent`                     | ✅ 可复用 |
| 股票详情分析 Tab | `StockDetailAnalysisTab` + `analysis/` | ✅ 嵌入   |
| 图表库           | `apexcharts` + `useChart`              | ✅ 可复用 |

### 关键结论

1. **主入口**：在股票详情页分析 Tab 中新增"形态识别"子 Tab，与 `tsCode` 上下文天然融合。
2. **次入口**：独立页面 `/pattern`，支持跨股票全局形态搜索和"以序列搜序列"功能。
3. **不需要 WebSocket**，所有搜索均为一次性同步请求，等待时使用 loading 状态。
4. **形态模板展示**使用 mini ApexCharts 折线图（高度 60px），不要用图片。

---

## 二、路由与导航规划

### 2.1 新增路由

在 `src/routes/sections.tsx` 中新增：

```typescript
export const PatternPage = lazy(() => import('src/pages/pattern'))

// dashboard children 中新增：
{ path: 'pattern', element: <PatternPage /> },
```

### 2.2 导航栏规划

在 `src/layouts/nav-config-dashboard.tsx` 的**股票分析**菜单组中追加：

```typescript
{
  title: '形态匹配',
  path: '/pattern',
  icon: <Iconify icon="solar:graph-new-up-bold" width={24} />,
},
```

推荐挂在"股票"或独立的"技术分析"菜单组下，不要单独顶级菜单。

---

## 三、数据类型与 API 封装

新建 `src/api/pattern.ts`：

```typescript
import { apiClient } from './client';

// ---- 形态模板 ----
export type PatternTemplate = {
  id: string; // 模板标识符 e.g. "head_shoulders_top"
  name: string; // 显示名称 e.g. "头肩顶"
  type: 'reversal_top' | 'reversal_bottom' | 'continuation' | 'bilateral';
  description: string;
  series: number[]; // 标准化价格序列（0-1），用于迷你图展示
};

// GET /pattern/templates
export function getPatternTemplates(): Promise<PatternTemplate[]> {
  return apiClient.get<PatternTemplate[]>('/api/pattern/templates');
}

// ---- 按股票区间搜索 ----
export type PatternSearchParams = {
  tsCode: string; // 股票代码
  startDate: string; // YYYYMMDD
  endDate: string; // YYYYMMDD
  patternId?: string; // 限定某一形态模板，不传则全量匹配
  topN?: number; // 返回最相似的 N 条，默认 10
};

export type PatternMatch = {
  tsCode: string;
  stockName: string;
  patternId: string;
  patternName: string;
  matchStartDate: string; // 匹配区间起始 YYYYMMDD
  matchEndDate: string; // 匹配区间结束
  similarity: number; // 相似度 0-1
  series: number[]; // 匹配到的标准化价格序列
};

export type PatternSearchResult = {
  matches: PatternMatch[];
  total: number;
};

// POST /pattern/search
export function searchPatterns(params: PatternSearchParams): Promise<PatternSearchResult> {
  return apiClient.post<PatternSearchResult>('/api/pattern/search', params);
}

// ---- 按自定义序列搜索 ----
export type SearchBySeriesParams = {
  series: number[]; // 用户输入的标准化价格序列（至少 5 个点）
  topN?: number;
  startDate?: string;
  endDate?: string;
};

// POST /pattern/search-by-series
export function searchBySeries(params: SearchBySeriesParams): Promise<PatternSearchResult> {
  return apiClient.post<PatternSearchResult>('/api/pattern/search-by-series', params);
}
```

---

## 四、页面规划总览

### 4.1 子入口：股票详情 → 分析 Tab → 形态识别（主要）

**文件**：`src/sections/stock-detail/analysis/analysis-pattern-tab.tsx`

**触发方式**：在 `StockDetailAnalysisTab` 的 `SUB_TABS` 末尾追加：

```typescript
{ value: 'pattern', label: '形态识别' }
```

并渲染：

```tsx
{
  subTab === 'pattern' && <AnalysisPatternTab tsCode={tsCode} />;
}
```

此子入口以当前股票的 `tsCode` 为固定上下文，仅允许指定形态/日期区间进行搜索。

---

### 4.2 独立页面：`/pattern`（次要）

**文件**：`src/pages/pattern.tsx` + `src/sections/pattern/view/pattern-view.tsx`

独立页面支持：

- 跨股票全局形态搜索（`tsCode` 可选）
- 以自定义序列搜索（画折线 / 粘贴数列）

---

## 五、子入口：AnalysisPatternTab 详细设计

### 5.1 布局

```text
┌─────── 形态模板筛选 ────────────────────────────────────────┐
│  [全部] [顶部反转] [底部反转] [持续形态] [双向形态]          │
│  （ToggleButtonGroup，单选）                                  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 头肩顶    │  │  双顶    │  │ 上升旗形 │  │ 楔形上涨 │   │
│  │ [迷你图]  │  │ [迷你图] │  │ [迷你图] │  │ [迷你图] │   │
│  │ 顶部反转  │  │ 顶部反转 │  │ 持续形态 │  │ 双向形态 │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  （点击即选中，选中态用 primary border + 背景 highlight）     │
├─────── 搜索参数 ─────────────────────────────────────────────┤
│  开始日期  [DateTextField]   结束日期  [DateTextField]        │
│  返回条数  [Select: 5/10/20/50]            [搜索匹配形态]     │
├─────── 匹配结果 ─────────────────────────────────────────────┤
│  共找到 N 个匹配（加载中则 CircularProgress）                  │
│                                                              │
│  ┌─ PatternMatchCard ──────────────────────────────────────┐ │
│  │ 形态：头肩顶          相似度：██████████ 92.3%          │ │
│  │ 区间：20240301 → 20240415   [迷你折线图 300×60px]       │ │
│  └────────────────────────────────────────────────────────┘ │
│  … 更多卡片 …                                                │
└────────────────────────────────────────────────────────────┘
```

### 5.2 组件状态

```typescript
// analysis-pattern-tab.tsx 内部状态
const [templates, setTemplates] = useState<PatternTemplate[]>([]);
const [typeFilter, setTypeFilter] = useState<string>('all');
const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [topN, setTopN] = useState(10);
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<PatternSearchResult | null>(null);
```

### 5.3 形态类型筛选标签

```typescript
const TYPE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'reversal_top', label: '顶部反转' },
  { value: 'reversal_bottom', label: '底部反转' },
  { value: 'continuation', label: '持续形态' },
  { value: 'bilateral', label: '双向形态' },
];
```

### 5.4 形态卡片（PatternTemplateCard）

- 宽度 `xs=6 sm=4 md=3 lg=2`（每行 4-6 个自适应）
- 卡片内：迷你折线图（ApexCharts area，高 60px，关闭 tooltip 和坐标轴）
- 形态名称 `Typography variant="subtitle2"`
- 类型标签用 `<Label>` 组件
- 选中态：`border: 2px solid primary.main`，背景 `alpha(primary.main, 0.08)`

### 5.5 搜索结果卡片（PatternMatchCard）

单个 `PatternMatch` 对应一张 Card：

- 左侧：形态名称、匹配区间（startDate～endDate）
- 中部：`LinearProgress` 显示相似度（`value={similarity * 100}`）+ 数字
- 右侧：迷你折线图（ApexCharts，`height=60`，仅折线，无坐标轴）

---

## 六、独立页面：PatternView 详细设计

### 6.1 布局

```text
┌─────── 页面标题：形态匹配 ─────── [切换模式: 按形态搜 / 按序列搜] ─┐
│                                                                   │
│ ══ 模式 A：按形态搜索 ══                                           │
│ ┌─ 参数卡片 ─────────────────────────────────────────────────────┐│
│ │ 股票代码（可选） [Autocomplete]                                 ││
│ │ 形态模板         [Select：从模板列表】                          ││
│ │ 开始/结束日期                                                   ││
│ │ 返回条数 [Select: 10/20/50]                     [搜索]          ││
│ └────────────────────────────────────────────────────────────────┘│
│ ┌─ 结果列表 ─────────────────────────────────────────────────────┐│
│ │ PatternMatchCard × N                                           ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                   │
│ ══ 模式 B：按自定义序列搜索 ══                                     │
│ ┌─ 序列输入卡片 ──────────────────────────────────────────────────┐│
│ │ 粘贴逗号分隔价格序列（自动标准化）                              ││
│ │ [TextField multiline, placeholder="e.g. 10,11,10.5,12,11.8"]  ││
│ │ 序列长度 N / 点位预览折线图                   [搜索相似形态]   ││
│ └────────────────────────────────────────────────────────────────┘│
│ ┌─ 结果列表 ─────────────────────────────────────────────────────┐│
│ │ PatternMatchCard × N                                           ││
│ └────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

### 6.2 模式切换

使用 MUI `ToggleButtonGroup`（`value: 'template' | 'series'`），放在页面 Header 右侧。

### 6.3 自定义序列输入说明

- `<TextField multiline rows={3}>` 接受逗号/换行分隔的数字
- 解析后自动 min-max 标准化到 [0, 1]
- 显示序列点数（最少 5 个点，否则不允许搜索）
- 下方实时渲染预览折线图（`height=120`）

---

## 七、组件文件树

```text
src/api/
└── pattern.ts                          # ← 新建：3 个 API 函数 + 类型定义

src/pages/
└── pattern.tsx                         # ← 新建：薄壳，渲染 PatternView

src/sections/pattern/
├── view/
│   ├── index.ts                        # ← 新建：export PatternView
│   └── pattern-view.tsx                # ← 新建：独立页面主体
├── pattern-template-card.tsx           # ← 新建：形态模板卡片（含迷你图）
├── pattern-match-card.tsx              # ← 新建：匹配结果卡片（含相似度和迷你图）
└── pattern-series-input.tsx            # ← 新建：自定义序列输入 + 预览图

src/sections/stock-detail/analysis/
└── analysis-pattern-tab.tsx            # ← 新建：嵌入股票详情分析 Tab

src/sections/stock-detail/
└── stock-detail-analysis-tab.tsx       # ← 修改：追加 pattern 子 Tab
```

---

## 八、迷你折线图实现规范

所有形态序列可视化使用统一的 `PatternMiniChart` 组件（在各文件内 inline 或拆分）：

```tsx
import Chart, { useChart } from 'src/components/chart';

function PatternMiniChart({ series }: { series: number[] }) {
  const chartOptions = useChart({
    chart: { type: 'line', sparkline: { enabled: true } },
    stroke: { width: 2, curve: 'smooth' },
    tooltip: { enabled: false },
    colors: [theme.palette.primary.main],
  });

  return <Chart type="line" height={60} series={[{ data: series }]} options={chartOptions} />;
}
```

- `sparkline.enabled: true` 隐藏坐标轴和网格
- ⚠️ 不要同时设置 `tooltip.shared: true` 和 `tooltip.intersect: true`

---

## 九、实现批次建议

### Batch 1（核心，嵌入股票详情）

| 文件                                                          | 说明                             |
| ------------------------------------------------------------- | -------------------------------- |
| `src/api/pattern.ts`                                          | API 层：3 函数 + TypeScript 类型 |
| `src/sections/stock-detail/analysis/analysis-pattern-tab.tsx` | 形态识别子 Tab（主入口）         |
| `src/sections/stock-detail/stock-detail-analysis-tab.tsx`     | 追加 `pattern` 子 Tab            |

### Batch 2（独立页面）

| 文件                                             | 说明                    |
| ------------------------------------------------ | ----------------------- |
| `src/sections/pattern/pattern-template-card.tsx` | 形态模板卡片组件        |
| `src/sections/pattern/pattern-match-card.tsx`    | 匹配结果卡片组件        |
| `src/sections/pattern/pattern-series-input.tsx`  | 自定义序列输入 + 预览图 |
| `src/sections/pattern/view/pattern-view.tsx`     | 独立页面主视图          |
| `src/sections/pattern/view/index.ts`             | export                  |
| `src/pages/pattern.tsx`                          | 页面薄壳                |
| `src/routes/sections.tsx`                        | 新增 `pattern` 路由     |
| `src/layouts/nav-config-dashboard.tsx`           | 新增"形态匹配"导航项    |

---

## 十、交互细节备注

1. 形态模板首次进入时自动加载（`useEffect` 调用 `getPatternTemplates()`），缓存到组件状态。
2. 搜索按钮在以下情况禁用：
   - 未选择形态模板（子入口模式）
   - 未填写开始日期或结束日期
   - 加载中
3. 相似度用 `LinearProgress`（`color="primary"`）配合文字比百分比更直观。
4. 匹配结果为空时展示 `<Alert severity="info">未找到匹配形态，请调整日期区间或选择不同形态模板。</Alert>`。
5. 自定义序列模式下，序列点数少于 5 时显示 `<Alert severity="warning">请至少输入 5 个价格点位。</Alert>`。
6. 用户切换形态类型筛选时，若当前已选形态不属于新类型，自动清空已选形态和结果。
