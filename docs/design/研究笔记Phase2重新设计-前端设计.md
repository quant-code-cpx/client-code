# 研究笔记 Phase 2 重新设计 — 前端设计文档

> **适用范围**：`src/sections/research-note/` 模块全面重构  
> **前置条件**：Phase 1 自选股模块 Bug 已修复，测试 308/308 全绿  
> **设计原则**：Bug-First 驱动开发 — 先写测试、再修代码  
> **日期**：2026-04-13

---

## 一、现状诊断

### 1.1 已实现清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/api/research-note.ts` | ✅ 完整 | 7 个 API 函数，类型定义完备 |
| `view/research-note-list-view.tsx` | ⚠️ 存在 Bug | 双 `useEffect` 竞态、筛选触发不一致 |
| `view/research-note-detail-view.tsx` | ⚠️ 存在 Bug | 使用 `react-router-dom` 而非 `react-router`，无保存守卫 |
| `research-note-card.tsx` | ✅ 基本正常 | 需补充 key 稳定性、ARIA 属性 |
| `research-note-editor.tsx` | ✅ 基本正常 | 移动端 Tab 切换正常 |
| `research-note-preview.tsx` | ✅ 基本正常 | ReactMarkdown 渲染完整 |
| `research-note-list-toolbar.tsx` | ⚠️ 存在 Bug | 混合触发模式，`onSearch` 职责不清 |
| `research-note-tag-input.tsx` | ✅ 基本正常 | 逻辑正确，缺防重复校验测试 |
| `research-note-stock-picker.tsx` | ❌ 缺失 | 设计文档要求但未实现，当前降级为纯 TextField |
| `types.ts` | ❌ 缺失 | 组件本地类型散落各文件 |
| `__tests__/` | ❌ 全部缺失 | 零测试覆盖 |

### 1.2 已确认 Bug 列表

#### Bug A — 双 `useEffect` 竞态导致重复请求

**文件**：`view/research-note-list-view.tsx`

```tsx
// ❌ 现状：filters 变化时同时触发两个 effect
useEffect(() => {
  fetchNotes(1);
  setPage(1);        // setPage(1) 触发 page effect
}, [filters]);

useEffect(() => {
  fetchNotes();      // 此 effect 也在 filters 变化后 page=1 时触发
}, [page]);
```

**复现**：修改任意筛选条件 → 网络面板出现两次 `/api/research-note/list` 请求。

#### Bug B — Router API 版本错误

**文件**：`view/research-note-detail-view.tsx`

```tsx
// ❌ 项目使用 React Router v7，应从 'react-router' 导入
import { useParams } from 'react-router-dom';  // 错误
```

#### Bug C — 筛选触发模式不一致

**文件**：`research-note-list-toolbar.tsx`

- 修改**标签**：自动触发搜索（onChange → onSearch）
- 修改**排序**：自动触发搜索
- 修改**关键词**：需手动按 Enter 触发
- 修改**股票代码**：需手动按 Enter 触发

4 个筛选项行为不一致，用户体验割裂。**预期**：均应自动防抖触发（500ms 延迟）。

#### Bug D — 关联股票字段无格式校验

**文件**：`view/research-note-detail-view.tsx`

```tsx
// ❌ 任意字符串均可保存为 tsCode，不做格式校验
<TextField label="关联股票（可选）" value={tsCode} onChange={...} />
```

保存时没有对 `tsCode` 字段进行 A 股格式校验（`^\d{6}\.(SH|SZ)$`），与 Phase 1 watchlist 已修复的 C-1-a Bug 相同问题。

#### Bug E — 删除后无 Loading 状态防重复提交

**文件**：`view/research-note-detail-view.tsx`

```tsx
// ❌ 删除函数无 loading 标志，快速双击可发送两次删除请求
const handleDelete = async () => {
  setDeleteDialogOpen(false);
  // 没有 setDeleting(true)
  await deleteNote(Number(noteId));
  router.push('/research/notes');
};
```

#### Bug F — 标签输入允许超长标签

**文件**：`research-note-tag-input.tsx`

```tsx
// ❌ 无长度限制，可输入任意长度标签
const trimmed = inputValue.trim();
if (trimmed && !tags.includes(trimmed)) {
  onChange([...tags, trimmed]);
}
```

无最大长度校验（设计上限 20 字符）。

#### Bug G — 新建笔记未获取现有标签用于自动补全

**文件**：`view/research-note-detail-view.tsx`

新建笔记时，`ResearchNoteTagInput` 是纯手动输入，不展示用户已有标签。但设计文档要求新建时也支持从已有标签选择（自动补全）。

---

## 二、重新设计目标

### 2.1 核心目标

1. **修复 A~G 共 7 个已确认 Bug**
2. **补全 `research-note-stock-picker.tsx`**（Autocomplete 股票代码选择器）
3. **建立 Bug-First 测试套件**（参照 Phase 1 watchlist 测试模式）
4. **统一筛选触发逻辑**（防抖 500ms，废除 `onSearch` 回调模式）
5. **补充 `types.ts`**（组件本地类型集中管理）

### 2.2 不在范围内

- 不新增后端 API（7 个端点已够用）
- 不引入新的依赖（`react-markdown` + `remark-gfm` 已安装）
- 不改变路由结构
- 不改变整体 UI 布局（卡片列表 + 详情编辑页设计保持不变）

---

## 三、组件架构（重新设计）

### 3.1 目录结构

```
src/sections/research-note/
├── __tests__/                               ← 🆕 新建测试目录
│   ├── research-note-list-view.test.tsx     ← 模块 A：列表视图状态管理
│   ├── research-note-detail-view.test.tsx   ← 模块 B：详情/编辑视图状态管理
│   ├── research-note-card.test.tsx          ← 模块 C：卡片组件渲染
│   ├── research-note-list-toolbar.test.tsx  ← 模块 D：筛选栏防抖行为
│   └── research-note-tag-input.test.tsx     ← 模块 E：标签输入校验
├── view/
│   ├── index.ts
│   ├── research-note-list-view.tsx          ← 修复 Bug A（双 effect）、Bug C（筛选触发）
│   └── research-note-detail-view.tsx        ← 修复 Bug B（router import）、Bug D（格式校验）
│                                               Bug E（删除防重复）、Bug G（标签自动补全）
├── research-note-card.tsx                   ← 补充 ARIA、补充置顶视觉
├── research-note-editor.tsx                 ← 保持不变
├── research-note-preview.tsx               ← 保持不变
├── research-note-list-toolbar.tsx           ← 修复 Bug C，移除 onSearch prop，改用 onChange 防抖
├── research-note-tag-input.tsx              ← 修复 Bug F（长度上限 20），新增 suggestions 自动补全
├── research-note-stock-picker.tsx           ← 🆕 新建，Autocomplete 股票搜索
└── types.ts                                 ← 🆕 新建，本地类型集中管理
```

---

## 四、各组件重新规格说明

### 4.1 `types.ts` — 组件本地类型

```typescript
// 列表筛选状态（移除 onSearch，统一由视图内部防抖触发）
export type NoteListFilters = {
  tags: string[];
  tsCode: string;
  keyword: string;
  sortBy: 'updatedAt' | 'createdAt';
};

// 详情视图的内容模式
export type ContentMode = 'edit' | 'preview';
```

---

### 4.2 `research-note-list-toolbar.tsx` — 筛选栏（重新规格）

**关键变更**：

- **移除 `onSearch` prop**，改为每次筛选值变化时通过 `onChange` 回调通知父组件
- 父组件（`research-note-list-view.tsx`）在接收到新 filters 后，使用 `useEffect` 统一触发防抖（500ms）
- 组件职责收窄：仅负责 UI 状态，不持有任何请求逻辑

```typescript
type Props = {
  availableTags: string[];
  filters: NoteListFilters;
  onChange: (filters: NoteListFilters) => void;  // 原 onFilterChange，统一命名
  // 移除：onSearch
};
```

**筛选触发规则（统一）**：

| 筛选项 | 触发时机 |
|--------|---------|
| 关键词 | `onChange` → 父视图防抖 500ms |
| 股票代码 | `onChange` → 父视图防抖 500ms |
| 标签筛选 | `onChange` → 父视图立即触发（多选操作已是有意识的点击） |
| 排序 | `onChange` → 父视图立即触发 |

---

### 4.3 `research-note-list-view.tsx` — 列表视图（重新规格）

**关键变更**：

1. **合并两个 `useEffect`** 为单一数据加载 effect：

```typescript
// ✅ 正确模式：使用单一 effect，通过 useRef 标记是否需要重置 page
const filtersRef = useRef(filters);
const [page, setPage] = useState(1);
const [pendingPage, setPendingPage] = useState(1); // 实际请求的 page

useEffect(() => {
  const isFilterChange = filtersRef.current !== filters;
  const targetPage = isFilterChange ? 1 : page;
  filtersRef.current = filters;
  if (isFilterChange) setPage(1);
  fetchNotes(targetPage);
}, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps
```

实际上更简单的方式是使用 `useCallback + useEffect` 配合 ref：

```typescript
const fetchWithFilter = useCallback((resetPage?: boolean) => {
  const targetPage = resetPage ? 1 : page;
  if (resetPage) setPage(1);
  // ... fetch
}, [filters, page]);

// filters 变化 → resetPage = true
// page 变化 → resetPage = false
```

**推荐方案（最简洁）**：引入 `searchKey` 机制：

```typescript
const [searchKey, setSearchKey] = useState(0); // filters 变化时 +1

// filters 变化时：同时 reset page=1 和 increment searchKey（触发单次 fetch）
const handleFiltersChange = useDebouncedCallback((newFilters: NoteListFilters) => {
  setFilters(newFilters);
  setPage(1);
  setSearchKey(k => k + 1);
}, 500);

// 单一 effect，以 page + searchKey 为依赖
useEffect(() => {
  fetchNotes();
}, [page, searchKey]); // eslint-disable-line
```

2. **Tag 筛选立即触发**（不防抖），keyword/tsCode 防抖 500ms

3. 所有 `useEffect` 移除 `onSearch` 相关调用

---

### 4.4 `research-note-detail-view.tsx` — 详情视图（重新规格）

**关键变更**：

1. **Router import 修复（Bug B）**：
   ```typescript
   // ❌ 删除
   import { useParams } from 'react-router-dom';
   // ✅ 改为
   import { useParams } from 'react-router';
   ```

2. **tsCode 格式校验（Bug D）**：
   ```typescript
   // 保存时校验 tsCode
   const trimmedCode = tsCode.trim().toUpperCase();
   if (trimmedCode && !/^\d{6}\.(SH|SZ)$/.test(trimmedCode)) {
     setError('股票代码格式不正确，请使用 XXXXXX.SH 或 XXXXXX.SZ 格式');
     return;
   }
   ```

3. **删除防重复提交（Bug E）**：
   ```typescript
   const [deleting, setDeleting] = useState(false);

   const handleDelete = async () => {
     setDeleteDialogOpen(false);
     setDeleting(true);
     try {
       await deleteNote(Number(noteId));
       router.push('/research/notes');
     } catch (err) {
       setError(err instanceof Error ? err.message : '删除失败');
       setDeleting(false);
     }
   };
   ```

4. **标签自动补全（Bug G）** — 详情视图加载时同时获取用户已有标签，传给 `ResearchNoteTagInput`：
   ```typescript
   const [availableTags, setAvailableTags] = useState<string[]>([]);

   useEffect(() => {
     getUserTags().then(d => setAvailableTags(d.tags)).catch(() => {});
   }, []);
   ```

5. **股票代码改用 `ResearchNoteStockPicker`**（替换原 TextField）

6. **新建模式下的未保存守卫**：当用户已输入内容但尚未保存，点击返回时提示确认。

---

### 4.5 `research-note-stock-picker.tsx` — 股票代码选择器（🆕 新建）

**功能**：

- Autocomplete 组件，输入股票代码或名称进行搜索
- 使用 `stockApi.searchStocks()` 接口（已存在于 `src/api/stock.ts`）
- 选中后显示：`600519.SH · 贵州茅台`
- 清空时 `onChange(null)` → 父组件存储 `tsCode = null`
- 支持直接输入完整代码（格式匹配后高亮确认）

**Props**：
```typescript
type ResearchNoteStockPickerProps = {
  value: string | null;        // tsCode 或 null
  onChange: (tsCode: string | null) => void;
  label?: string;
  disabled?: boolean;
};
```

**实现要点**：

- 防抖 300ms 触发搜索，避免频繁请求
- `freeSolo={true}` 允许用户直接输入代码（不一定来自搜索结果）
- `loading` 状态显示 `CircularProgress`
- 搜索结果为空时显示"未找到匹配股票"提示

---

### 4.6 `research-note-tag-input.tsx` — 标签输入（修改规格）

**关键变更（修复 Bug F 和 Bug G）**：

```typescript
type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];    // 🆕 自动补全候选列表（来自用户历史标签）
  maxLength?: number;        // 🆕 单个标签最大长度，默认 20
  maxCount?: number;         // 🆕 标签总数上限，默认 10
  placeholder?: string;
};
```

**校验规则（新增）**：

| 校验 | 规则 | 错误提示 |
|------|------|---------|
| 标签长度 | ≤ 20 字符 | 视觉截断（不报错，直接截断） |
| 标签总数 | ≤ 10 个 | 超出后输入框禁用 |
| 重复标签 | 不可重复添加 | 静默忽略（不报错） |

**自动补全实现**：当 `suggestions` prop 有值时，改用 `Autocomplete` 组件替换纯 `TextField`，允许从候选列表选择或自由输入新标签。

---

### 4.7 `research-note-card.tsx` — 笔记卡片（小修）

**修改点**：

1. 补充 `aria-label` 属性（可访问性）
2. 置顶卡片添加视觉区分（`Card` 边框色或 `outlined` 样式）
3. 股票代码点击直接跳转到股票详情页（`/stock/detail?code=tsCode`），而不是跳转到笔记详情

---

## 五、Bug-First 测试规格

采用与 Phase 1 watchlist 相同的 Bug-First 方法：**先写预期失败的测试，再修复代码让测试通过**。

### 5.1 模块 A — 列表视图（`research-note-list-view.test.tsx`）

| ID | 测试描述 | Bug 标记 |
|----|---------|---------|
| A-1-a | 初始加载：正确调用 `listNotes` 和 `getUserTags` | — |
| A-1-b | 笔记列表渲染：显示所有笔记卡片 | — |
| A-1-c | 加载中：显示 Skeleton 占位 | — |
| A-1-d | 空状态：显示"暂无研究笔记"提示 | — |
| A-2-a | 修改标签筛选 → 重置 page=1 → 只调用 listNotes **一次** | **[BUG A]** |
| A-2-b | 修改关键词 → 500ms 防抖后调用 listNotes | **[BUG C]** |
| A-2-c | 修改股票代码 → 500ms 防抖后调用 listNotes | **[BUG C]** |
| A-2-d | 修改排序 → 立即（非防抖）调用 listNotes | — |
| A-3-a | 切换分页 → 正确调用 listNotes(page=2)，不重置 page | — |
| A-3-b | 修改筛选后 → page 重置回 1 | — |
| A-4-a | listNotes 报错 → 显示错误 Alert，可关闭 | — |

### 5.2 模块 B — 详情/编辑视图（`research-note-detail-view.test.tsx`）

| ID | 测试描述 | Bug 标记 |
|----|---------|---------|
| B-1-a | 加载既有笔记：标题/内容/标签/tsCode 正确填充 | — |
| B-1-b | `noteId = 'new'` 时不调用 `getNoteById` | — |
| B-1-c | 无效 noteId（非数字）→ 显示错误提示 | — |
| B-2-a | 保存：标题为空 → 显示"请输入笔记标题"，不调用 API | — |
| B-2-b | 保存：tsCode = "600519"（无后缀）→ 显示格式错误，不调用 API | **[BUG D]** |
| B-2-c | 保存：tsCode = "600519.SH" → 格式正确，调用 API，传大写代码 | **[BUG D]** |
| B-2-d | 保存：tsCode 为空 → 合法，API 收到 tsCode=undefined | — |
| B-3-a | 删除：点击确认 → 调用 deleteNote → 跳转 /research/notes | — |
| B-3-b | 删除：确认期间按钮 disabled，防止重复提交 | **[BUG E]** |
| B-3-c | 删除：API 报错 → 显示错误提示，不跳转 | **[BUG E]** |
| B-4-a | 置顶：点击 → isPinned 反转，API 收到新 isPinned 值 | — |
| B-5-a | 新建模式：`getUserTags` 被调用以填充标签自动补全 | **[BUG G]** |
| B-5-b | 编辑模式：`getUserTags` 同样被调用 | **[BUG G]** |
| B-6-a | 编辑/预览模式切换：内容正确显示在对应区域 | — |

### 5.3 模块 C — 笔记卡片（`research-note-card.test.tsx`）

| ID | 测试描述 | Bug 标记 |
|----|---------|---------|
| C-1-a | 渲染：标题、内容摘要、标签、更新时间正确显示 | — |
| C-1-b | 置顶笔记：显示置顶图标 | — |
| C-1-c | 无关联股票：不渲染股票 Chip | — |
| C-1-d | 有关联股票：渲染股票代码 Chip | — |
| C-2-a | 标签超过 3 个：只显示前 3 个，显示 "+N" | — |
| C-2-b | 内容超过 120 字：显示截断后的摘要 | — |
| C-2-c | Markdown 格式字符（`#`、`*`等）在摘要中被去除 | — |
| C-3-a | 点击卡片：跳转到 `/research/notes/:id` | — |

### 5.4 模块 D — 筛选栏（`research-note-list-toolbar.test.tsx`）

| ID | 测试描述 | Bug 标记 |
|----|---------|---------|
| D-1-a | 渲染：4 个筛选组件均可见 | — |
| D-1-b | 输入关键词 → 调用 onChange（不立即触发搜索） | **[BUG C]** |
| D-1-c | 输入股票代码 → 调用 onChange（不立即触发搜索） | **[BUG C]** |
| D-1-d | 选择标签 → 立即调用 onChange | — |
| D-1-e | 切换排序 → 立即调用 onChange | — |
| D-2-a | 不存在 `onSearch` prop（已从接口移除） | **[BUG C]** |

### 5.5 模块 E — 标签输入（`research-note-tag-input.test.tsx`）

| ID | 测试描述 | Bug 标记 |
|----|---------|---------|
| E-1-a | 输入标签 + Enter → 标签添加成功 | — |
| E-1-b | 重复标签 → 静默忽略，不重复添加 | — |
| E-1-c | 标签超过 20 字符 → 被截断为 20 字符 | **[BUG F]** |
| E-1-d | 添加第 11 个标签 → 输入框禁用 | **[BUG F]** |
| E-2-a | 删除标签：点击 Chip 删除图标 → 从列表移除 | — |
| E-2-b | 空输入 Enter → 不添加空标签 | — |
| E-3-a | 有 suggestions 时：显示 Autocomplete 下拉 | **[BUG G]** |
| E-3-b | 从 suggestions 选择：标签正常添加 | **[BUG G]** |

---

## 六、数据类型对齐（API vs 组件）

现有 `src/api/research-note.ts` 的 `ResearchNote` 类型已完备，无需修改。

但以下字段需在使用时注意空值处理：

| 字段 | 类型 | 场景 |
|------|------|------|
| `tsCode` | `string \| null` | 无关联股票时为 `null` |
| `tags` | `string[]` | 始终为数组，不会为 `null` |
| `isPinned` | `boolean` | 始终有值 |
| `createdAt` | `string` | ISO 8601，渲染用 `fDate(v, 'YYYY-MM-DD')` 或 `fToNow(v)` |
| `updatedAt` | `string` | 同上 |

---

## 七、实施顺序

按以下顺序实施，每步均可独立验证：

```
Step 1  新建 types.ts（移集中类型定义）
Step 2  修改 research-note-list-toolbar.tsx（移除 onSearch，修复 Bug C）
Step 3  修改 research-note-tag-input.tsx（修复 Bug F、Bug G 的 suggestions prop）
Step 4  新建 research-note-stock-picker.tsx（补全缺失组件）
Step 5  修改 research-note-list-view.tsx（修复 Bug A）
Step 6  修改 research-note-detail-view.tsx（修复 Bug B D E G）
Step 7  新建 __tests__/ 目录，按模块 A~E 添加 Bug-First 测试
Step 8  运行 npm run build 确认无编译错误
Step 9  运行 npm test 确认 308+ 测试全绿
```

---

## 八、测试文件约定

延续 Phase 1 watchlist 的测试风格：

1. **文件头部注释**说明模块字母、测试原则
2. **标注 `[BUG]`** 的 case 在修复前预期失败
3. **Mock 所有 API**（`vi.mock('src/api/research-note', ...)`）
4. **Mock layout**（`DashboardLayout`、`RouterLink`）
5. **使用 `data-testid`** 定位组件内部元素
6. **使用 `userEvent`** 模拟真实用户交互（非 `fireEvent`）

### 测试文件模板

```tsx
/**
 * 模块 X — ComponentName 状态管理
 *
 * 测试原则：断言来自业务规格，不从实现复制。
 * 标注 [BUG] 的 case 在当前实现下预期失败，是 Bug-First 测试的目的。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from 'src/test/test-utils';

vi.mock('src/api/research-note', () => ({ ... }));

describe('X-1: 功能模块名称', () => {
  it('X-1-a [BUG]: 预期失败描述', async () => {
    // ...
  });
});
```

---

## 九、验收标准

| 标准 | 目标 |
|------|------|
| Bug 修复数 | A~G 全部 7 个 |
| 测试用例总数 | ≥ 30 个（模块 A~E） |
| 预期失败测试（修复前） | 所有 `[BUG]` 标记用例失败 |
| 修复后全部通过 | 是 |
| `npm run build` 无错误 | 是 |
| 总测试数（含原有 308） | ≥ 338 |

---

## 十、文档同步

实施完成后需更新：

- `docs/已有功能汇总.md`：研究笔记章节的"修复"标记
- `docs/测试框架与计划-前端设计.md`：在 Phase 2 段落新增研究笔记测试状态表
- `docs/README.md`：本文档状态改为 `✅ 已实现`
