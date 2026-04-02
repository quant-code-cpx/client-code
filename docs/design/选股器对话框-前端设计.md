# 选股器对话框集成 & 策略保存 — 前端实现规划

> **目标读者**：AI 代码生成助手。请严格按照本文定义的组件结构、状态管理方式、API 调用规范实现。

---

## 一、功能总览

将现有独立页面 `/stock/screener`（`StockScreenerView`）的功能**整合到股票列表页**，通过 `Dialog` 弹窗触发。同时新增**用户自定义策略的保存/加载/删除**功能。

### 核心变更

| 变更项                 | 当前状态                      | 目标状态                                    |
| ---------------------- | ----------------------------- | ------------------------------------------- |
| 选股器入口             | 独立页面 `/stock/screener`    | 股票列表工具栏"选股器"按钮 → 全屏 Dialog    |
| 选股器导航             | 左侧栏子菜单"选股器"          | 移除，仅保留"股票列表"                      |
| 预设策略               | 仅系统内置预设（6个，内存中） | 系统预设 + 用户自定义策略（数据库持久化）   |
| 策略操作               | 仅可选择预设加载条件          | 可保存当前条件为策略、加载、覆盖更新、删除  |
| 选股结果与股票列表联动 | 无                            | Dialog 关闭后可将结果应用到股票列表（可选） |

---

## 二、技术约定

沿用项目现有约定（参见 `STOCK_SCREENER_FRONTEND.md` 第一节），补充：

- **Dialog 宽度**：`maxWidth="lg"`，`fullWidth`，在移动端使用 `fullScreen`。
- **API 新增**：在 `src/api/screener.ts` 中新增策略 CRUD 方法。
- **复用组件**：`ScreenerFilterPanel`、`ScreenerPresetBar`、`ScreenerResultTable`、`ScreenerResultToolbar` 全部复用，不做破坏性修改。

---

## 三、新增 API 方法

在 `src/api/screener.ts` 中新增：

```typescript
// ----------------------------------------------------------------------
// 类型：用户策略
// ----------------------------------------------------------------------

export type ScreenerStrategy = {
  id: number;
  name: string;
  description: string | null;
  filters: Partial<ScreenerFilters>;
  sortBy: string | null;
  sortOrder: string | null;
  type: 'user';
  createdAt: string;
  updatedAt: string;
};

// 扩展现有 ScreenerPreset 的 type 字段
export type ScreenerPresetWithType = ScreenerPreset & { type: 'builtin' };

// 合并类型（前端统一处理）
export type StrategyItem = ScreenerPresetWithType | ScreenerStrategy;

// ----------------------------------------------------------------------
// API 调用函数
// ----------------------------------------------------------------------

export function fetchStrategies(): Promise<{ strategies: ScreenerStrategy[] }> {
  return apiClient.get<{ strategies: ScreenerStrategy[] }>('/api/stock/screener/strategies');
}

export function createStrategy(data: {
  name: string;
  description?: string;
  filters: Partial<ScreenerFilters>;
  sortBy?: string;
  sortOrder?: string;
}): Promise<ScreenerStrategy> {
  return apiClient.post<ScreenerStrategy>('/api/stock/screener/strategies', data);
}

export function updateStrategy(
  id: number,
  data: {
    name?: string;
    description?: string;
    filters?: Partial<ScreenerFilters>;
    sortBy?: string;
    sortOrder?: string;
  }
): Promise<ScreenerStrategy> {
  return apiClient.put<ScreenerStrategy>(`/api/stock/screener/strategies/${id}`, data);
}

export function deleteStrategy(id: number): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/api/stock/screener/strategies/${id}`);
}
```

---

## 四、组件结构

### 4.1 新文件清单

```
src/sections/stock/
  screener-dialog.tsx          ← 选股器 Dialog 容器（核心新文件）
  screener-strategy-bar.tsx    ← 策略栏（系统预设 + 用户策略 + 保存按钮）
  screener-save-dialog.tsx     ← 保存策略对话框（名称/描述输入）
```

### 4.2 修改文件清单

```
src/sections/stock/stock-table-toolbar.tsx   ← 触发 Dialog 的按钮
src/sections/stock/view/stock-view.tsx       ← 集成 Dialog 状态
src/api/screener.ts                          ← 新增策略 CRUD 方法（如上）
src/layouts/nav-config-dashboard.tsx         ← 移除 /stock/screener 子项
src/routes/sections.tsx                      ← 移除 /stock/screener 路由（或重定向到 /stock）
src/pages/stock-screener.tsx                 ← 删除或改为重定向
```

### 4.3 复用文件（不修改）

```
src/sections/stock-screener/screener-filter-panel.tsx
src/sections/stock-screener/screener-result-table.tsx
src/sections/stock-screener/screener-result-toolbar.tsx
src/sections/stock-screener/constants.ts
src/sections/stock-screener/types.ts
```

---

## 五、组件详细设计

### 5.1 `ScreenerDialog` — 选股器弹窗

路径：`src/sections/stock/screener-dialog.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  Dialog Title: "选股器"                    [关闭按钮 ✕]  │
├─────────────────────────────────────────────────────────┤
│  ┌─ 策略栏 ──────────────────────────────────────────┐  │
│  │ [低估值蓝筹] [高成长] ... [我的策略1] [+保存策略]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 筛选条件面板 ────────────────────────────────────┐  │
│  │ <ScreenerFilterPanel />                            │  │
│  │ 7个折叠手风琴区域 + [开始选股] [重置] 按钮         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 结果区域 ────────────────────────────────────────┐  │
│  │ <ScreenerResultToolbar /> （排序+总数）             │  │
│  │ <ScreenerResultTable />  （动态列+分页）           │  │
│  └────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                           [关闭]                        │
└─────────────────────────────────────────────────────────┘
```

#### Props

```typescript
type ScreenerDialogProps = {
  open: boolean;
  onClose: () => void;
};
```

#### 状态管理

将 `StockScreenerView` 的所有状态逻辑提取到此组件中（或抽取为自定义 hook `useScreener`），包括：

- `filters` / `page` / `rowsPerPage` / `sortBy` / `sortOrder` — 查询参数
- `result` / `loading` / `error` — 查询结果
- `presets` / `strategies` / `activePreset` — 策略相关
- `industries` / `areas` — 辅助数据

**数据加载时机**：Dialog `open` 变为 `true` 时加载（而非组件挂载时），避免不必要的请求。

```typescript
useEffect(() => {
  if (open) {
    initData(); // 并行加载预设、用户策略、行业、地域列表，然后执行默认查询
  }
}, [open]);
```

#### 关键实现要点

1. **复用现有组件**：内部直接渲染 `<ScreenerFilterPanel>`、`<ScreenerResultTable>`、`<ScreenerResultToolbar>`，传入相同 props。
2. **不使用 `<DashboardContent>`**：Dialog 内部不需要布局容器，直接使用 `<DialogContent>`。
3. **滚动处理**：`<DialogContent dividers>` 自带滚动条，结果表格在 Dialog 内滚动。

---

### 5.2 `ScreenerStrategyBar` — 策略栏

路径：`src/sections/stock/screener-strategy-bar.tsx`

替代原有 `ScreenerPresetBar`，增加用户策略展示和操作。

```
[低估值蓝筹] [高成长] [优质白马] ... │ [我的策略A] [我的策略B] │ [+保存当前条件] [自定义]
  ↑ 系统预设 (Chip, 不可删除)           ↑ 用户策略 (Chip, 长按/右键可删除)    ↑ 操作按钮
```

#### Props

```typescript
type ScreenerStrategyBarProps = {
  presets: ScreenerPreset[]; // 系统预设
  strategies: ScreenerStrategy[]; // 用户策略
  activeId: string | null; // 当前选中的 preset/strategy id
  onSelect: (item: StrategyItem) => void; // 选择预设或策略
  onReset: () => void; // 重置为自定义
  onSave: () => void; // 触发保存对话框
  onDelete: (id: number) => void; // 删除用户策略
  onUpdate: (id: number) => void; // 覆盖更新用户策略
};
```

#### 交互

- 点击系统预设 Chip → 加载预设条件到筛选面板
- 点击用户策略 Chip → 加载策略条件
- 用户策略 Chip 显示删除图标（`onDelete` 属性的 Chip），或通过 Chip 上的右键菜单提供"更新"和"删除"
- "+保存当前条件"按钮 → 打开 `ScreenerSaveDialog`

---

### 5.3 `ScreenerSaveDialog` — 保存策略对话框

路径：`src/sections/stock/screener-save-dialog.tsx`

简单的表单弹窗，用于输入策略名称和可选描述。

```
┌─────────────────────────────┐
│  保存选股策略                │
├─────────────────────────────┤
│  策略名称: [____________]   │
│  描述(可选): [__________]   │
├─────────────────────────────┤
│           [取消] [保存]     │
└─────────────────────────────┘
```

#### Props

```typescript
type ScreenerSaveDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  loading?: boolean;
  /** 编辑模式时传入已有名称/描述（覆盖更新时使用） */
  defaultName?: string;
  defaultDescription?: string;
};
```

#### 校验

- 名称必填，1-50 字符
- 描述可选，最大 200 字符
- 保存后关闭对话框，父组件刷新策略列表

---

### 5.4 `StockTableToolbar` 修改

路径：`src/sections/stock/stock-table-toolbar.tsx`

**变更**：将现有的 `Menu`（显示"即将上线"）替换为直接调用父组件的 `onOpenScreener` 回调。

```diff
 type StockTableToolbarProps = {
   filters: StockFilters;
   onFilterChange: (changed: Partial<StockFilters>) => void;
+  onOpenScreener: () => void;
 };

-export function StockTableToolbar({ filters, onFilterChange }: StockTableToolbarProps) {
-  const [screenerAnchorEl, setScreenerAnchorEl] = useState<null | HTMLElement>(null);
+export function StockTableToolbar({ filters, onFilterChange, onOpenScreener }: StockTableToolbarProps) {

   // ... 其余不变 ...

   <Button
     variant="outlined"
     startIcon={<Iconify icon="ic:round-filter-list" />}
-    onClick={(e) => setScreenerAnchorEl(e.currentTarget)}
+    onClick={onOpenScreener}
   >
     选股器
   </Button>

-  <Menu ... />  ← 移除整个 Menu
```

---

### 5.5 `StockView` 修改

路径：`src/sections/stock/view/stock-view.tsx`

**变更**：添加 Dialog 状态控制。

```diff
+import { ScreenerDialog } from '../screener-dialog';

 export function StockView() {
+  const [screenerOpen, setScreenerOpen] = useState(false);
   // ... 现有状态 ...

   return (
     <DashboardContent>
       {/* ... 现有内容 ... */}
       <Card>
-        <StockTableToolbar filters={filters} onFilterChange={handleFilterChange} />
+        <StockTableToolbar
+          filters={filters}
+          onFilterChange={handleFilterChange}
+          onOpenScreener={() => setScreenerOpen(true)}
+        />
         {/* ... 其余不变 ... */}
       </Card>
+
+      <ScreenerDialog open={screenerOpen} onClose={() => setScreenerOpen(false)} />
     </DashboardContent>
   );
 }
```

---

## 六、导航 & 路由变更

### 6.1 移除选股器子菜单

`src/layouts/nav-config-dashboard.tsx` — 删除 `/stock/screener` children 项：

```diff
 {
   title: '股票',
   path: '/stock',
   icon: icon('ic-cart'),
-  children: [
-    { title: '股票列表', path: '/stock', icon: icon('ic-cart') },
-    { title: '选股器', path: '/stock/screener', icon: <Iconify ... /> },
-  ],
 },
```

股票变回无子菜单的单一导航项。

### 6.2 路由处理

`src/routes/sections.tsx` — 将 `/stock/screener` 改为重定向到 `/stock`：

```typescript
{ path: 'stock/screener', element: <Navigate to="/stock" replace /> },
```

保留重定向确保已有书签或外部链接不会 404。

### 6.3 删除文件

- `src/pages/stock-screener.tsx` — 不再需要独立页面

---

## 七、状态流转

```
[用户点击"选股器"按钮]
  ↓
[ScreenerDialog open=true]
  ↓ useEffect(open)
[并行加载: 系统预设 + 用户策略 + 行业列表 + 地域列表]
  ↓
[执行默认查询 fetchScreener({})]
  ↓
[用户交互循环]
  ├─ 选择预设/策略 → 加载条件 → 自动查询
  ├─ 修改筛选条件 → 点击"开始选股" → 查询
  ├─ 翻页/排序 → 自动查询
  ├─ 点击"+保存策略" → ScreenerSaveDialog → createStrategy API → 刷新策略列表
  ├─ 右键用户策略 → "覆盖更新" → updateStrategy API → 刷新策略列表
  └─ 右键用户策略 → "删除" → Confirm → deleteStrategy API → 刷新策略列表
  ↓
[用户关闭 Dialog]
```

---

## 八、实现顺序

1. **API 层**：在 `src/api/screener.ts` 中新增策略 CRUD 方法和类型定义
2. **保存对话框**：新建 `screener-save-dialog.tsx`（最简单，无依赖）
3. **策略栏**：新建 `screener-strategy-bar.tsx`（依赖新类型）
4. **选股器 Dialog**：新建 `screener-dialog.tsx`（核心，复用现有 screener 组件）
5. **集成到股票页**：修改 `stock-table-toolbar.tsx` 和 `stock-view.tsx`
6. **导航清理**：修改 `nav-config-dashboard.tsx` 和 `sections.tsx`
7. **测试**：完整流程测试（打开 Dialog → 筛选 → 保存策略 → 加载策略 → 删除策略）
