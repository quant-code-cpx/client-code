# 项目 Button 组件全量使用分析报告

> 生成日期：2026-07-09 | 分析范围：`src/` 下所有 `.tsx` 文件

---

## 目录

1. [总览与统计数据](#1-总览与统计数据)
2. [主题配置分析](#2-主题配置分析)
3. [Button（@mui/material/Button）分析](#3-buttonmuimaterialbutton-分析)
4. [IconButton 分析](#4-iconbutton-分析)
5. [LoadingButton 分析](#5-loadingbutton-分析)
6. [ToggleButton 分析](#6-togglebutton-分析)
7. [ButtonBase 分析](#7-buttonbase-分析)
8. [Fab / ButtonGroup 分析](#8-fab--buttongroup-分析)
9. [按场景分类汇总](#9-按场景分类汇总)
10. [风格一致性问题汇总](#10-风格一致性问题汇总)
11. [各模块按钮密度与典型文件](#11-各模块按钮密度与典型文件)
12. [改进建议](#12-改进建议)

---

## 1. 总览与统计数据

### 1.1 各组件类型使用文件数

| 组件类型 | 使用文件数 | JSX 元素数（约） |
|----------|-----------|-----------------|
| `Button` (`@mui/material/Button`) | **194** | ~175 |
| `IconButton` (`@mui/material/IconButton`) | **91** | ~95 |
| `ToggleButton` (`@mui/material/ToggleButton`) | **41** | ~120 |
| `LoadingButton` (`@mui/lab/LoadingButton`) | **3** | 3 |
| `ToggleButtonGroup` | 34 | 34 |
| `ButtonGroup` | **3** | 3 |
| `ButtonBase` | **7** | ~5 |
| `Fab` | **0** | 0 |

### 1.2 各目录 Button 文件分布

| 目录 | Button 文件数 | IconButton 文件数 |
|------|:----------:|:------------:|
| `sections/factor/` | 32 | 18 |
| `sections/backtest/` | 28 | 16 |
| `sections/portfolio/` | 17 | 7 |
| `sections/alert/` | 14 | 10 |
| `sections/strategy/` | 14 | 4 |
| `sections/tushare-sync/` | 9 | 7 |
| `sections/event-study/` | 9 | 5 |
| `sections/stock/` | 8 | 2 |
| `sections/overview/` | 7 | 2 |
| `sections/report/` | 7 | 5 |
| `sections/signal/` | 7 | 5 |
| `sections/watchlist/` | 6 | 3 |
| `sections/user-manage/` | 6 | 4 |
| `sections/stock-detail/` | 2 | 5 |
| `sections/market-money-flow/` | 2 | 1 |
| `layouts/` | 4 | 8 |
| `components/` | 2 | 0 |

---

## 2. 主题配置分析

### 2.1 当前主题覆盖

**文件：** `src/theme/core/components.tsx`（第 20-37 行）

```tsx
const MuiButton: Components<Theme>['MuiButton'] = {
  defaultProps: {
    disableElevation: true,
  },
  styleOverrides: {
    containedInherit: ({ theme }) => ({
      color: theme.vars.palette.common.white,
      backgroundColor: theme.vars.palette.grey[800],
      '&:hover': {
        color: theme.vars.palette.common.white,
        backgroundColor: theme.vars.palette.grey[800],
      },
    }),
    sizeLarge: {
      minHeight: 48,
    },
  },
};
```

### 2.2 未覆盖的组件

主题中 **完全没有** 对以下组件的定制：

- ❌ `MuiIconButton` — 无任何覆盖
- ❌ `MuiLoadingButton` — 无任何覆盖
- ❌ `MuiFab` — 无任何覆盖
- ❌ `MuiToggleButton` — 无任何覆盖
- ❌ `MuiButtonGroup` — 无任何覆盖

### 2.3 自定义 variant

**MUI Button 没有自定义 variant**（如 `soft`）。`soft` 变体仅存在于自定义 `Label` 组件中（`src/components/label/`），它是一个 `<span>` 标签组件，不是 Button。

---

## 3. Button（@mui/material/Button）分析

### 3.1 variant 使用分布

| variant | 数量 | 占比 |
|---------|:----:|:----:|
| `contained` | 39 | 22% |
| `outlined` | 30 | 17% |
| `text` | 12 | 7% |
| **未指定（默认 text）** | **96** | **55%** |

> ⚠️ **55% 的 Button 没有指定 variant**，依赖 MUI 默认值 `text`。这在大多数情况下是故意的（如 Alert 中的 action 按钮、取消按钮），但也存在应该明确 variant 但遗漏的情况。

### 3.2 color 使用分布

| color | 数量 | 占比 |
|-------|:----:|:----:|
| `inherit` | 30 | 17% |
| `warning` | 7 | 4% |
| `error` | 6 | 3% |
| **未指定（默认 primary）** | **132** | **75%** |

> ⚠️ **75% 的 Button 没有指定 color**，依赖 MUI 默认值 `primary`。大部分情况合理，但对于 `outlined` 变体的按钮（如重置按钮），缺少 `color="inherit"` 会导致视觉上与主题色按钮混淆。

### 3.3 size 使用分布

| size | 数量 | 占比 |
|------|:----:|:----:|
| `small` | 74 | 42% |
| `medium` | 2 | 1% |
| `large` | 1 | <1% |
| **未指定（默认 medium）** | **100** | **57%** |

### 3.4 其他关键属性

| 属性 | 使用次数 | 说明 |
|------|:------:|------|
| `startIcon` | 3 | 极少数使用，远低于实际应有的水平 |
| `endIcon` | 0 | 无使用 |
| `fullWidth` | 5 | 登录按钮、抽屉操作按钮 |
| `disabled` | 61 | 广泛使用 |
| `loading` | 6 | MUI v7 内建 loading 属性 |
| `sx`（显式） | 0 | 无 Button 显式使用 `sx` prop |
| `disableRipple` | 1 | 仅 `notifications-popover.tsx` |

### 3.5 variant+color 组合 TOP 榜

| 组合 | 次数 |
|------|:----:|
| `variant="contained"` (默认 primary) | ~25 |
| `variant="outlined"` + `color="warning"` | 2 |
| `variant="outlined"` + `color="inherit"` | 2 |
| `variant="text"` + `color="inherit"` | 1 |
| `variant="contained"` + `color="warning"` | 1 |
| `variant="text"` + `color="error"` + `size="medium"` | 1 |

---

## 4. IconButton 分析

### 4.1 color 使用分布

| color | 数量 | 占比 |
|-------|:----:|:----:|
| `error` | 7 | 7% |
| `primary` | 1 | 1% |
| **未指定（默认 default）** | **87** | **92%** |

### 4.2 size 使用分布

| size | 数量 | 占比 |
|------|:----:|:----:|
| `small` | 73 | 77% |
| **未指定（默认 medium）** | **22** | **23%** |

### 4.3 常见使用模式

| 场景 | 示例文件 | 典型 props |
|------|---------|-----------|
| 表格行操作 | `factor-library-card.tsx` | `size="small"` + 无 color（或 `color="error"` 删除） |
| 抽屉关闭按钮 | `*-drawer.tsx` | `size="small"` + `onClick={onClose}` |
| 刷新/重试 | `*-toolbar.tsx` | `size="small"` + Tooltip 包裹 |
| 展开/折叠 | `signal-detail-panel.tsx` | `size="small"` 无 color |
| Header 图标 | `dark-mode-button.tsx` | 40x40 + border + borderRadius |

### 4.4 sx 中的非标准颜色用法

| 文件 | 用法 | 问题 |
|------|------|------|
| `ws-status-indicator.tsx` | `sx={{ color: cfg.color }}` | cfg.color = `'success.main'` / `'warning.main'` / `'error.main'` — 用 sx 传 color 而非 color prop |
| `industry-analysis-view.tsx` | `sx={{ color: 'text.secondary' }}` | 用 sx 覆写颜色，但无 color prop |
| `backtest-config-form.tsx` | `sx={{ color: 'text.secondary', p: 0.25 }}` | 同上 |
| `watchlist-stock-table-row.tsx` | `sx={{ color: 'error.main' }}` | 建议改用 `color="error"` prop |

---

## 5. LoadingButton 分析

### 5.1 使用情况

**仅 3 处使用**，全部在 `tushare-sync/` 模块：

| 文件 | variant | color | size | startIcon |
|------|---------|-------|------|-----------|
| `auto-repair-panel.tsx` | `outlined` | `warning` | `small` | `solar:restart-bold` |
| `cross-table-check-panel.tsx` | `outlined` | `info` | `small` | `solar:restart-bold` |
| `data-quality-tab.tsx` | `outlined` | — | `small` | `solar:shield-check-bold` |

### 5.2 对比：Button 的 loading 属性

MUI v7 的 `Button` 原生支持 `loading` 属性（无需 LoadingButton）。本项目大部分提交按钮使用 `<Button loading={submitting}>` 模式（6 处），这是推荐的做法。`LoadingButton` 仅用于需要独立 loading 态且不涉及表单提交的场景。

---

## 6. ToggleButton 分析

### 6.1 总体统计

- **120 个 ToggleButton 元素**，全部包裹在 `ToggleButtonGroup` 中
- 统一使用 `size="small"`
- 几乎都使用 `exclusive` 模式
- **19 个** ToggleButton 使用了 `sx` prop（16%）

### 6.2 使用场景分类

| 场景 | 示例文件 | 数量 |
|------|---------|:----:|
| 排序方向切换（asc/desc） | `backtest-strategy-config-panel.tsx` | ~10 |
| 视图模式切换（card/table/grid） | `factor-library-view.tsx`, `calendar-filters.tsx` | ~15 |
| 时间周期切换（D/W/M） | `stock-detail-market-tab.tsx` | ~20 |
| 涨跌停类型切换（UP/DOWN/ALL） | `limit/filter-bar.tsx` | ~8 |
| 数据范围切换（recent/full/incremental） | `tushare-sync/sync-plan-tab.tsx` | ~10 |
| 作用域切换（stock/watchlist/portfolio） | `alert-price-rule-dialog.tsx` | ~6 |
| 向导步骤 | `signal-rule-wizard-dialog.tsx` | ~3 |

### 6.3 风格差异

ToggleButton 之间的 style 不统一主要体现在 `sx` 上：

- 有的用 `sx={{ px: 2 }}` 控制内边距
- 有的用 `sx={{ fontSize: 12 }}` 缩小字体
- 有的用 `sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}` 
- 有的完全不用 sx，使用 MUI 默认值

**没有统一的 ToggleButton 样式常量**，各组自行设置。

---

## 7. ButtonBase 分析

### 7.1 使用情况（约 5 处）

| 文件 | 用途 | 样式方式 |
|------|------|---------|
| `color-picker.tsx` | 颜色选择器色块 | `styled(ButtonBase)` |
| `workspaces-popover.tsx` | 工作空间选择器 | `sx` prop |
| `sync-status-overview.tsx` | 可点击卡片（2处） | `sx` prop |
| `signal-history-group-card.tsx` | 信号分组展开 | `sx` prop + theme 回调 |
| `heatmap-scatter-chart.tsx` | 散点图扇区标签 | `sx` prop + theme 回调 |

全部使用 theme token，无硬编码颜色。

---

## 8. Fab / ButtonGroup 分析

### 8.1 Fab

**全项目 0 处使用**。项目不使用浮动操作按钮。

### 8.2 ButtonGroup

**3 处使用**：

| 文件 | 用途 |
|------|------|
| `factor-detail-cross-section-table.tsx` | 截面数据排序方式切换 |
| `fama-macbeth-panel.tsx` | FM 回归预设参数选择 |
| `signal-latest-view.tsx` | 今日/昨日/最近 交易日快捷切换 |

---

## 9. 按场景分类汇总

### 9.1 对话框（Dialog）中的按钮

这是最常见的按钮使用场景。项目中对话框遵循统一的**左右布局**模式：

```
[取消按钮（左）]  [确认/提交按钮（右）]
```

#### 9.1.1 取消按钮 — 风格不统一（重点问题）

| 文件 | 实际写法 | variant | color |
|------|---------|:------:|:-----:|
| `confirm-dialog.tsx` | `<Button onClick={onClose} disabled={submitting}>` | 无（text） | 无 |
| `alert-price-rule-dialog.tsx` | `<Button onClick={onClose} disabled={submitting}>取消</Button>` | 无（text） | 无 |
| `subscribe-dialog.tsx` | `<Button color="inherit" onClick={onClose}>取消</Button>` | 无（text） | inherit |
| `anomaly-add-watchlist-dialog.tsx` | `<Button onClick={onClose}>取消</Button>` | 无（text） | 无 |
| `factor-custom-dialog.tsx` | `<Button onClick={onClose}>取消</Button>` | 无（text） | 无 |
| `screener-save-dialog.tsx` | `<Button onClick={onClose} color="inherit" disabled={loading}>取消</Button>` | 无（text） | inherit |
| `screener-dialog.tsx` | `<Button onClick={onClose} color="inherit">关闭</Button>` | 无（text） | inherit |
| `risk-rule-upsert-dialog.tsx` | `<Button onClick={onClose} disabled={busy}>取消</Button>` | 无（text） | 无 |
| `signal-rules-tab.tsx` | `<Button onClick={() => setDeleteTarget(null)}>取消</Button>` | 无（text） | 无 |
| `sync-plan-tab.tsx` | `<Button onClick={() => setPendingSync(null)}>取消</Button>` | 无（text） | 无 |
| `strategy-backtest-defaults-card.tsx` | `<Button variant="outlined" onClick={handleCancel}>取消</Button>` | outlined | 无 |
| `strategy-config-card.tsx` | `<Button variant="outlined" onClick={handleCancel}>取消</Button>` | outlined | 无 |
| `strategy-info-card.tsx` | `<Button variant="outlined" onClick={handleCancel}>取消</Button>` | outlined | 无 |

> 🔴 **问题**：取消按钮有三种不同写法：
> 1. 不指定 variant/color（默认 text+primary）
> 2. `color="inherit"`（灰色文字）
> 3. `variant="outlined"`（带边框）
>
> 在 `strategy/` 模块中使用了 `variant="outlined"`，但在其他所有模块中都是默认 text 样式。视觉外观不统一。

#### 9.1.2 确认/提交按钮 — 相对统一

几乎所有确认按钮都是：
```tsx
<Button variant="contained" onClick={handleSubmit} disabled={submitting} loading={submitting}>
  {isEdit ? '保存' : '创建'}
</Button>
```

小差异：
- 有的用 `loading={submitting}`（MUI v7 新写法）
- 有的用 `disabled={submitting}` + 手动在 children 中切换文字（旧写法）
- 少数用 `color="warning"` 或 `color="error"` 表示破坏性操作

### 9.2 表格操作按钮

#### 9.2.1 表格行内操作（IconButton）

统一使用 `size="small"` 的 IconButton，常见模式：

```tsx
// 编辑
<IconButton size="small" onClick={() => onEdit(item)}>
  <Iconify icon="solar:pen-bold" width={16} />
</IconButton>

// 删除 — 统一用 color="error"
<IconButton size="small" color="error" onClick={() => onDelete(item)}>
  <Iconify icon="solar:trash-bin-trash-bold" width={16} />
</IconButton>

// 查看详情
<IconButton size="small" onClick={() => onOpenDetail(item)}>
  <Iconify icon="solar:eye-bold" width={16} />
</IconButton>
```

✅ 这部分风格非常统一。

#### 9.2.2 批量操作栏（Toolbar Button）

统一使用 `size="small"` + `variant="outlined"` 或 `variant="text"`，带 `startIcon`：

```tsx
// 典型模式
<Button size="small" variant="outlined" startIcon={<Iconify icon="solar:cart-3-bold" width={16} />}>
  加入自选股
</Button>
<Button size="small" variant="text" onClick={onClearSelection}>
  取消选择
</Button>
```

✅ 大部分统一，但 `variant="text"` vs `variant="outlined"` 的选择因场景而异。

### 9.3 空状态/错误状态按钮

**统一模式**：`size="small"`，在 Stack 中水平排列：

```tsx
// 空状态操作按钮
<Button size="small" variant="contained" onClick={onRetry}>重试</Button>
<Button size="small" variant="outlined" onClick={onSwitchLatest}>切到最新交易日</Button>
<Button size="small" variant="outlined" onClick={onClearFilter}>清空筛选</Button>
```

**Alert 中的 action 按钮**（用于错误提示）：
```tsx
<Alert severity="error" action={
  <Button color="inherit" size="small" onClick={onRetry}>重试</Button>
}>
  {error}
</Alert>
```

✅ 高度统一，`color="inherit"` + `size="small"`。

### 9.4 导航按钮

使用 `component={RouterLink}` + `href`：

```tsx
// 页面跳转
<Button component={RouterLink} href="/backtest" size="small" variant="contained">
  查看全部
</Button>

// 返回首页
<Button component={RouterLink} href="/" size="large" variant="contained" color="inherit">
  返回首页
</Button>
```

✅ 统一。

### 9.5 Header 区域的 IconButton

三个按钮具有**完全一致的样式**（40x40 + borderRadius 1.5 + border）：

| 组件 | 样式 |
|------|------|
| `dark-mode-button.tsx` | `width/height: 40, borderRadius: 1.5, border: 1px solid divider` |
| `theme-popover.tsx` | `width/height: 40, borderRadius: 1.5, border: 1px solid divider` |
| `account-popover.tsx` | `width/height: 40, conic-gradient background` |

但其他 header 按钮不一致：
- `searchbar.tsx`：无尺寸限制，无边框
- `menu-button.tsx`：无尺寸限制
- `ws-status-indicator.tsx`：`size="small"`，无固定尺寸
- `notifications-popover.tsx`：无固定尺寸

### 9.6 图表/面板中的 ToggleButton

ToggleButtonGroup 在图表控制中广泛使用，如周期切换、指标切换。样式由各组自行通过 `sx` 设置 fontSize 和 padding。

---

## 10. 风格一致性问题汇总

### 🔴 严重不一致

| # | 问题 | 影响范围 | 详情 |
|---|------|---------|------|
| 1 | **取消按钮三种不同写法** | 全局对话框 | text（默认）、text+color="inherit"、variant="outlined" 三种并存 |
| 2 | **IconButton color 92% 未指定** | 91 个文件 | 依赖默认值，部分场景下颜色语义不明确 |
| 3 | **Button variant 55% 未指定** | 194 个文件 | 虽然在很多场景合理，但增加了审查难度 |

### 🟡 中等不一致

| # | 问题 | 影响范围 | 详情 |
|---|------|---------|------|
| 4 | **ToggleButton 无统一样式常量** | 41 个文件 | px/fontSize 各组自行设定，同一场景下视觉有差异 |
| 5 | **loading 写法不统一** | 6+ 处 | loading prop vs 手动 CircularProgress 作为 startIcon |
| 6 | **startIcon 使用率极低（3次）** | 全局 | 大量有图标的按钮使用 children 放置 Iconify 而非 startIcon |
| 7 | **Header IconButton 尺寸不一致** | 8 个组件 | 有的 40x40，有的无限制 |
| 8 | **sx 传 color vs color prop** | 多处 IconButton | `sx={{ color: 'error.main' }}` 应改为 `color="error"` |

### 🟢 轻微不一致

| # | 问题 | 影响范围 | 详情 |
|---|------|---------|------|
| 9 | **size 57% 未指定** | 全局 | 依赖默认 medium，但视觉上许多按钮更适合 small |
| 10 | **部分按钮缺少 aria-label** | IconButton | 无障碍支持不完整 |
| 11 | **refresh/retry 按钮的 variant 不一致** | 全局 | 有的 outlined，有的 text，有的无 variant |
| 12 | **缺少统一的按钮组件抽象** | 架构 | 没有封装的 `ActionButton`、`SubmitButton`、`CancelButton` 等 |

---

## 11. 各模块按钮密度与典型文件

### 11.1 按钮密度排行（Button + IconButton 元素数估算）

| 排名 | 模块 | 估算元素数 | 高密度文件 |
|:----:|------|:--------:|-----------|
| 1 | **factor** | ~60 | `screening-action-bar.tsx`（8个Button）、`factor-admin-bulk-action-bar.tsx`（5个） |
| 2 | **backtest** | ~55 | `backtest-config-form.tsx`（12个Button+Toggle）、`backtest-detail-header.tsx`（5个） |
| 3 | **tushare-sync** | ~25 | `sync-plan-tab.tsx`（8个+Toggle）、`sync-status-overview.tsx`（4个+ButtonBase） |
| 4 | **portfolio** | ~25 | `portfolio-rebalance-dialog.tsx`（7个） |
| 5 | **alert** | ~25 | `anomaly-table-workbench.tsx`（3个Button+3个IconButton） |
| 6 | **strategy** | ~20 | `strategy-signal-card.tsx`（5个） |
| 7 | **report** | ~15 | `report-detail-view.tsx`（6个IconButton） |
| 8 | **signal** | ~15 | `signal-history-toolbar.tsx`（8个+Toggle） |
| 9 | **overview** | ~12 | `dashboard-recent-backtests.tsx`（3个） |
| 10 | **pattern** | ~12 | `pattern-view.tsx`（7个+Toggle） |
| 11 | **event-study** | ~12 | `signal-rule-wizard-dialog.tsx`（4个+Toggle） |

---

## 12. 改进建议

### 12.1 高优先级：统一对话框按钮

建议在 `confirm-dialog.tsx` 或新建一个共享组件中统一对话框按钮的样式：

```tsx
// 推荐：统一定义
<Button onClick={onClose} disabled={submitting} color="inherit">
  取消
</Button>
```

所有对话框的取消按钮应当统一使用 `color="inherit"`（灰色文字），而不是混用 text（默认 primary 色）、outlined 等变体。

### 12.2 高优先级：将 sx color 改为 color prop

```diff
// Before
- <IconButton size="small" sx={{ color: 'error.main' }}>
// After  
+ <IconButton size="small" color="error">
```

### 12.3 中优先级：统一 ToggleButton 样式常量

建议在 `src/theme/` 或公共常量文件中定义共享的 ToggleButton sx：

```tsx
export const TOOLBAR_TOGGLE_SX = {
  px: 1.5,
  py: 0.25,
  fontSize: '0.75rem',
  textTransform: 'none',
};
```

### 12.4 中优先级：统一 Header IconButton 尺寸

建议所有 header 区域的 IconButton 统一为 40x40 + `borderRadius: 1.5` + `border` 的样式，可定义为共享常量。

### 12.5 低优先级：增加 Button 共享组件

可以考虑创建以下轻量封装：

- `SubmitButton` — 统一 `variant="contained"` + `loading` 模式
- `CancelButton` — 统一 `color="inherit"` 模式
- `ActionButton` — 统一 `size="small"` + `startIcon` + `variant="outlined"` 模式

### 12.6 低优先级：Fab 使用评估

项目中完全不使用 Fab。对于移动端或需要突出主要操作的场景（如"新建策略"、"快速扫描"），可以考虑在适当位置引入 Fab。

---

## 附录：图标使用速查

所有按钮中的图标统一使用 `@iconify/react` 的 `Iconify` 组件，前缀分布：

| 前缀 | 使用频率 | 典型图标 |
|------|:------:|---------|
| `solar:` | 95% | `pen-bold`, `trash-bin-trash-bold`, `refresh-bold`, `close-circle-bold`, `add-circle-bold`, `play-bold`, `eye-bold`, `copy-bold`, `bell-bold`, `restart-bold`, `filter-bold`, `share-bold`, `star-bold`, `info-circle-bold`, `arrow-left-bold`, `arrow-right-bold`, `alt-arrow-up-bold`, `alt-arrow-down-bold` |
| `eva:` | 4% | `search-fill`, `done-all-fill`, `trash-2-outline`, `arrow-back-fill`, `more-vertical-fill`, `checkmark-fill` |
| `mingcute:` | 1% | `close-line` |
| `carbon:` | <1% | `chevron-sort` |
| `custom:` | <1% | `menu-duotone`（本地注册） |

> ⚠️ 关闭按钮的图标不统一：大部分用 `solar:close-circle-bold`，少部分用 `mingcute:close-line`。建议统一。

---

*报告完毕。本报告基于对 `src/` 下 194 个使用 Button 的 TSX 文件、91 个使用 IconButton 的文件的逐一分析。*
