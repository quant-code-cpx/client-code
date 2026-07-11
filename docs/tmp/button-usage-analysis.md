# 项目 Button 组件全量使用分析与统一规范

> 生成日期：2026-07-09 | Phase 0 校准日期：2026-07-09 | Phase 1 完成日期：2026-07-09 | Phase 2 完成日期：2026-07-10 | Phase 2 视觉校正日期：2026-07-11 | Phase 3 静态防回退完成日期：2026-07-11 | 分析范围：`src/` 下所有 `.tsx` 文件
>
> Phase 0 说明：核心统计已用 TypeScript AST 重新校准，覆盖 `@mui/material/*` 子路径导入与少量 barrel 导入。下文“文件数”指至少出现 1 个对应 JSX 元素的文件数，“JSX 元素数”指源码中实际 JSX 标签数量。
>
> Phase 1 说明：已完成 Dialog 取消/关闭按钮 `color="inherit"` 统一、3 处 `LoadingButton` 迁移为 MUI v7 `Button loading`、4 处破坏性 `IconButton` 颜色迁移到 `color="error"`。
>
> Phase 2 说明：已落地 Button / IconButton / ToggleButton Theme 尺寸基线与 ToggleButton primary 选中态；清理局部尺寸覆盖；手工 loading Spinner 清零；全部 IconButton 已有 Tooltip；WebSocket 状态灯已改为非交互状态元素。本轮按用户决定不新增或调整 `aria-label`。
>
> Phase 2 视觉校正：普通 `outlined` 恢复 MUI 默认 primary 蓝框，`inherit` 只保留给 text 形态的取消/关闭等低权重操作；与 Select、TextField、DatePicker 混排的 Button / ButtonGroup 统一使用 medium 40px。
>
> Phase 3 静态防回退：新增 `yarn check:buttons`，检查 LoadingButton、手工 Spinner、IconButton Tooltip、普通 outlined 黑框、Dialog 取消/关闭颜色及局部高度覆盖；Theme 与 ConfirmDialog 增加回归测试。
>
> 规范说明：第 12 章是后续新增和改造按钮的强制基线。现有代码与该章不一致时，视为待迁移项，不应继续复制旧写法。

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
12. [全局按钮设计语言与交互规范](#12-全局按钮设计语言与交互规范)
13. [分阶段改造方案](#13-分阶段改造方案)

---

## 1. 总览与统计数据

### 1.1 各组件类型使用文件数

| 组件类型 | 使用文件数 | JSX 元素数 |
|----------|-----------:|-----------:|
| `Button` (`@mui/material/Button`) | **197** | **418** |
| `IconButton` (`@mui/material/IconButton`) | **90** | **147** |
| `ToggleButton` (`@mui/material/ToggleButton`) | **41** | **120** |
| `ToggleButtonGroup` | **41** | **62** |
| `LoadingButton` (`@mui/lab/LoadingButton`) | **0** | **0** |
| `ButtonGroup` | **3** | **3** |
| `ButtonBase` | **4** | **5** |
| `Fab` | **0** | **0** |

### 1.2 各目录 Button 文件分布

| 目录 | Button 文件数 | Button 元素数 | IconButton 文件数 | IconButton 元素数 |
|------|:----------:|:------------:|:----------------:|:----------------:|
| `sections/factor/` | 32 | 64 | 14 | 25 |
| `sections/backtest/` | 28 | 63 | 11 | 12 |
| `sections/portfolio/` | 17 | 36 | 5 | 7 |
| `sections/alert/` | 14 | 30 | 9 | 15 |
| `sections/strategy/` | 14 | 34 | 3 | 5 |
| `sections/tushare-sync/` | 12 | 28 | 4 | 5 |
| `sections/event-study/` | 9 | 16 | 6 | 9 |
| `sections/stock/` | 8 | 14 | 1 | 3 |
| `sections/overview/` | 7 | 12 | 2 | 2 |
| `sections/report/` | 7 | 13 | 4 | 16 |
| `sections/signal/` | 7 | 21 | 4 | 5 |
| `sections/watchlist/` | 6 | 12 | 2 | 5 |
| `sections/user-manage/` | 6 | 18 | 5 | 9 |
| `sections/screener-subscription/` | 6 | 15 | 1 | 2 |
| `layouts/` | 4 | 4 | 6 | 7 |
| `sections/stock-detail/` | 3 | 6 | 3 | 3 |
| `sections/industry-analysis/` | 3 | 7 | 3 | 3 |
| `sections/profile/` | 3 | 6 | 1 | 3 |
| `components/` | 2 | 3 | 0 | 0 |
| `sections/market-money-flow/` | 2 | 3 | 1 | 1 |
| `sections/research-note/` | 2 | 3 | 3 | 8 |
| `sections/auth/` | 1 | 1 | 1 | 1 |
| `sections/error/` | 1 | 1 | 0 | 0 |
| `sections/market-overview/` | 1 | 1 | 1 | 1 |
| `sections/pattern/` | 1 | 5 | 0 | 0 |
| `sections/stock-screener/` | 1 | 2 | 0 | 0 |

---

## 2. 主题配置分析

### 2.1 当前主题覆盖

**文件：** `src/theme/core/components.tsx`

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
    sizeSmall: {
      minHeight: 32,
    },
    sizeMedium: {
      minHeight: 40,
    },
    sizeLarge: {
      minHeight: 48,
    },
  },
};

const MuiIconButton: Components<Theme>['MuiIconButton'] = {
  styleOverrides: {
    sizeSmall: { width: 32, height: 32 },
    sizeMedium: { width: 40, height: 40 },
  },
};

const MuiToggleButton: Components<Theme>['MuiToggleButton'] = {
  styleOverrides: {
    sizeSmall: {
      minHeight: 32,
      fontSize: '0.75rem',
      padding: '0 12px',
    },
  },
};

const MuiToggleButtonGroup: Components<Theme>['MuiToggleButtonGroup'] = {
  defaultProps: { color: 'primary' },
};
```

Button 使用 `minHeight`，允许多行选项或无障碍字号放大时自然增高；ToggleButton 同时清除默认垂直 padding，因此普通单行 `small` 控件稳定为 32px，多行报告类型选择器仍可按内容增高。

### 2.2 有意不覆盖的组件

以下组件没有新增 Theme 覆盖：

- `MuiLoadingButton`：项目已清零，不再引入。
- `MuiFab`：项目不使用 Fab。
- `MuiButtonGroup`：仅 3 处，沿用 Button 尺寸基线，无独立视觉规则。

### 2.3 自定义 variant

**MUI Button 没有自定义 variant**（如 `soft`）。`soft` 变体仅存在于自定义 `Label` 组件中（`src/components/label/`），它是一个 `<span>` 标签组件，不是 Button。

---

## 3. Button（@mui/material/Button）分析

### 3.1 variant 使用分布

| variant | 数量 | 占比 |
|---------|:----:|:----:|
| `outlined` | 130 | 31% |
| `contained` | 130 | 31% |
| **未指定（默认 text）** | **115** | **28%** |
| `text` | 39 | 9% |
| 表达式 | 4 | 1% |

> Phase 0 修正：未指定 `variant` 的比例约 28%，不是 55%。默认 `text` 在 Alert action、取消/关闭、低权重操作里通常合理；后续治理应按场景判断，不应机械补全 `variant`。

### 3.2 color 使用分布

| color | 数量 | 占比 |
|-------|:----:|:----:|
| **未指定（默认 primary）** | **293** | **70%** |
| `inherit` | 79 | 19% |
| `warning` | 19 | 5% |
| `error` | 14 | 3% |
| `primary` | 6 | 1% |
| `info` | 2 | <1% |
| `success` | 2 | <1% |
| 表达式 | 3 | <1% |

> Phase 2 视觉校正后，普通 `outlined` 不显式写 color，使用 MUI 默认 primary 蓝框。`inherit` 仅用于 text 形态的取消、关闭、Alert action 等低权重操作。

### 3.3 size 使用分布

| size | 数量 | 占比 |
|------|:----:|:----:|
| **未指定（默认 medium）** | **211** | **50%** |
| `small` | 195 | 47% |
| `large` | 6 | 1% |
| `medium` | 5 | 1% |
| 表达式 | 1 | <1% |

### 3.4 其他关键属性

| 属性 | 使用次数 | 说明 |
|------|:------:|------|
| `startIcon` | 165 | 已大量使用；loading 不再占用 startIcon |
| `disabled` | 154 | 广泛使用 |
| `sx`（显式） | 31 | 均为布局、宽度或业务例外，无局部高度覆盖 |
| `loading` | 42 | 异步 Button 已统一使用 MUI v7 原生 loading |
| `fullWidth` | 22 | 登录、抽屉、对话框局部操作 |
| `endIcon` | 8 | 少量跳转/展开类操作 |
| `disableRipple` | 1 | 仅少量特殊入口 |

### 3.5 variant+color 组合 TOP 榜

| 组合 | 次数 |
|------|:----:|
| `variant="contained"` + 默认 `primary` | 113 |
| `variant="outlined"` + 默认 `primary` | 109 |
| 未指定 `variant` + `color="inherit"` | 67 |
| 未指定 `variant` + 默认 `primary` | 40 |
| `variant="text"` + 默认 `primary` | 28 |
| `variant="outlined"` + `color="warning"` | 11 |
| `variant="text"` + `color="inherit"` | 10 |
| 未指定 `variant` + `color="error"` | 5 |
| `variant="contained"` + `color="primary"` | 5 |
| `variant="contained"` + `color="warning"` | 5 |
| `variant="outlined"` + `color="error"` | 5 |

---

## 4. IconButton 分析

### 4.1 color 使用分布

| color | 数量 | 占比 |
|-------|:----:|:----:|
| **未指定（默认 default）** | **124** | **84%** |
| `error` | 17 | 11% |
| 表达式 | 4 | 3% |
| `primary` | 2 | 1% |

> Phase 0 修正：`IconButton color` 未指定不是天然问题。表格查看、编辑、展开、关闭等中性操作使用默认色合理；应重点治理删除/移除类操作、状态语义按钮和无障碍标签。

### 4.2 size 使用分布

| size | 数量 | 占比 |
|------|:----:|:----:|
| `small` | 119 | 81% |
| **未指定（默认 medium）** | **27** | 18% |
| `medium` | 1 | <1% |

### 4.3 其他关键属性

| 属性 | 使用次数 | 说明 |
|------|:------:|------|
| `aria-label` | 147 | 当前覆盖 147/147；本轮未新增或调整 |
| Tooltip 包裹 | 147 | 当前覆盖 147/147；disabled IconButton 使用外层 `span` |
| `sx` | 15 | Header、局部颜色、编辑器工具栏等场景 |
| `disabled` | 17 | 常见于异步/权限/不可用操作 |

### 4.4 常见使用模式

| 场景 | 示例文件 | 典型 props |
|------|---------|-----------|
| 表格行操作 | `factor-library-card.tsx` | `size="small"` + 无 color（或 `color="error"` 删除） |
| 抽屉关闭按钮 | `*-drawer.tsx` | `size="small"` + `onClick={onClose}` |
| 刷新/重试 | `*-toolbar.tsx` | `size="small"` + Tooltip 包裹 |
| 展开/折叠 | `signal-detail-panel.tsx` | `size="small"` 无 color |
| Header 图标 | `dark-mode-button.tsx` | 40x40 + border + borderRadius |

### 4.5 sx 中的颜色用法

| 文件 | 用法 | 问题 |
|------|------|------|
| `ws-status-indicator.tsx` | 非交互 `Box component="span"` + 动态 color | 状态灯不再伪装成 IconButton，保留动态 theme token |
| `industry-analysis-view.tsx` | `sx={{ color: 'text.secondary' }}` | `text.secondary` 不是 `IconButton color` 枚举，保留 `sx` 合理 |
| `backtest-config-form.tsx` | `sx={{ color: 'text.secondary', p: 0.25 }}` | 中性色 + 尺寸微调，保留 `sx` 合理 |
| `watchlist-stock-table-row.tsx` | 原 `sx={{ color: 'error.main' }}` | Phase 1 已改为 `color="error"` |

---

## 5. LoadingButton 分析

### 5.1 使用情况

Phase 1 后 **0 处使用**。原 3 处均在 `tushare-sync/` 模块，已迁移为 MUI v7 `Button loading`：

| 文件 | variant | color | size | startIcon |
|------|---------|-------|------|-----------|
| `auto-repair-panel.tsx` | `outlined` | `warning` | `small` | `solar:restart-bold` |
| `cross-table-check-panel.tsx` | `outlined` | `info` | `small` | `solar:restart-bold` |
| `data-quality-tab.tsx` | `outlined` | — | `small` | `solar:shield-check-bold` |

### 5.2 对比：Button 的 loading 属性

MUI v7 的 `Button` 原生支持 `loading` 属性（无需 LoadingButton）。Phase 2 后本项目已有 **42 处**使用 `<Button loading={...}>` 模式，`@mui/lab/LoadingButton` 和 `startIcon={<CircularProgress />}` 旧写法均已清零。

---

## 6. ToggleButton 分析

### 6.1 总体统计

- **120 个 ToggleButton 元素**，全部包裹在 `ToggleButtonGroup` 中
- `ToggleButton` 本身均未指定 `size`；尺寸由 **62 个** `ToggleButtonGroup` 统一提供 `size="small"`
- 几乎都使用 `exclusive` 模式
- **0 个** ToggleButton 使用 `sx` prop；**7 个** ToggleButtonGroup 保留布局类 `sx`
- 62 个 ToggleButtonGroup 均通过 Theme 默认获得 `color="primary"` 选中态

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

### 6.3 Phase 2 收敛结果

- small 基线统一为 `minHeight: 32`、`fontSize: 0.75rem`、水平内边距 12px、垂直内边距 0。
- 普通单行 ToggleButton 稳定为 32px；含说明文字的多行选项允许按内容自然增高，不发生裁切。
- 选中态统一为 primary，业务页面不再自行设置 warning/error/success 选中色。
- 7 个 Group `sx` 仅承担 grid、换行、间距、收缩等容器布局，不再覆盖子按钮尺寸、边框、字重或圆角。

---

## 7. ButtonBase 分析

### 7.1 使用情况（4 个直接 JSX 文件 / 5 个直接 JSX 元素）

另有 `color-picker.tsx` 通过 `styled(ButtonBase)` 派生色块组件，不计入 1.1 的直接 JSX 元素统计。

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

| 文件 | 用途 | size 规则 |
|------|------|-----------|
| `factor-detail-cross-section-table.tsx` | 截面数据排序方式切换 | 独立紧凑操作，small 32px |
| `fama-macbeth-panel.tsx` | FM 回归预设参数选择 | 与 FormControl 混排，medium 40px |
| `signal-latest-view.tsx` | 今日/昨日/最近 交易日快捷切换 | 与 Select、DatePicker 混排，medium 40px |

---

## 9. 按场景分类汇总

### 9.1 对话框（Dialog）中的按钮

这是最常见的按钮使用场景。项目中对话框遵循统一的**左右布局**模式：

```
[取消按钮（左）]  [确认/提交按钮（右）]
```

#### 9.1.1 取消/关闭按钮 — Phase 1 已统一

| 文件 | 实际写法 | variant | color |
|------|---------|:------:|:-----:|
| `confirm-dialog.tsx` | `<Button color="inherit" onClick={onClose} disabled={submitting}>` | 无（text） | inherit |
| `alert-price-rule-dialog.tsx` | `<Button color="inherit" onClick={onClose} disabled={submitting}>取消</Button>` | 无（text） | inherit |
| `subscribe-dialog.tsx` | `<Button color="inherit" onClick={onClose}>取消</Button>` | 无（text） | inherit |
| `anomaly-add-watchlist-dialog.tsx` | `<Button color="inherit" onClick={onClose}>取消</Button>` | 无（text） | inherit |
| `factor-custom-dialog.tsx` | `<Button color="inherit" onClick={onClose}>取消</Button>` | 无（text） | inherit |
| `screener-save-dialog.tsx` | `<Button onClick={onClose} color="inherit" disabled={loading}>取消</Button>` | 无（text） | inherit |
| `screener-dialog.tsx` | `<Button onClick={onClose} color="inherit">关闭</Button>` | 无（text） | inherit |
| `risk-rule-upsert-dialog.tsx` | `<Button color="inherit" onClick={onClose} disabled={busy}>取消</Button>` | 无（text） | inherit |
| `signal-rules-tab.tsx` | `<Button color="inherit" onClick={() => setDeleteTarget(null)}>取消</Button>` | 无（text） | inherit |
| `sync-plan-tab.tsx` | `<Button color="inherit" onClick={() => setPendingSync(null)}>取消</Button>` | 无（text） | inherit |

> Phase 0 修正：原报告把 `strategy-backtest-defaults-card.tsx`、`strategy-config-card.tsx`、`strategy-info-card.tsx` 的 `outlined` 取消按钮归入 Dialog，这三处实际是卡片内联编辑，不应按 Dialog 规则直接判错。

> Phase 1 已完成：真正的 `DialogActions` 中，取消/关闭已统一为 `color="inherit"`；卡片内联编辑继续保留自身规则。

#### 9.1.2 确认/提交按钮 — 相对统一

几乎所有确认按钮都是：
```tsx
<Button variant="contained" onClick={handleSubmit} disabled={submitting} loading={submitting}>
  {isEdit ? '保存' : '创建'}
</Button>
```

小差异：
- 异步状态统一用 `loading={submitting}`；文案可以按业务切换，但不再手工渲染 Spinner
- 少数用 `color="warning"` 或 `color="error"` 表示破坏性操作

### 9.2 表格操作按钮

#### 9.2.1 表格行内操作（IconButton）

统一使用 `size="small"` 的 IconButton，常见模式：

```tsx
// 编辑
<Tooltip title="编辑">
  <IconButton size="small" onClick={() => onEdit(item)} aria-label="编辑条目">
    <Iconify icon="solar:pen-bold" width={16} />
  </IconButton>
</Tooltip>

// 删除 — 统一用 color="error"
<Tooltip title="删除">
  <IconButton size="small" color="error" onClick={() => onDelete(item)} aria-label="删除条目">
    <Iconify icon="solar:trash-bin-trash-bold" width={16} />
  </IconButton>
</Tooltip>

// 查看详情
<Tooltip title="查看详情">
  <IconButton size="small" onClick={() => onOpenDetail(item)} aria-label="查看条目详情">
    <Iconify icon="solar:eye-bold" width={16} />
  </IconButton>
</Tooltip>
```

Phase 2 后 147 个 IconButton 均由 Tooltip 包裹；删除/移除类使用 `color="error"`，不再用局部 `sx` 模拟语义色。

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

Header IconButton 的点击区域统一落在 40x40 medium 基线。以下品牌化入口保留局部外观：

| 组件 | 样式 |
|------|------|
| `dark-mode-button.tsx` | `width/height: 40, borderRadius: 1.5, border: 1px solid divider` |
| `theme-popover.tsx` | `width/height: 40, borderRadius: 1.5, border: 1px solid divider` |
| `account-popover.tsx` | `width/height: 40, conic-gradient background` |

- `searchbar.tsx`、`menu-button.tsx`、`notifications-popover.tsx` 使用默认 medium，由 Theme 统一为 40x40。
- `ws-status-indicator.tsx` 是 32x32 非交互状态元素，不再计入 Header IconButton。

### 9.6 图表/面板中的 ToggleButton

ToggleButtonGroup 在图表控制中广泛使用，如周期切换、指标切换。字体、内边距、选中态由 Theme 统一；业务页面只保留容器布局 `sx`。

---

## 10. 风格一致性问题汇总

### Phase 2 已解决

| # | 项目 | 验收结果 |
|---|------|----------|
| 1 | Button / IconButton / ToggleButton 尺寸基线 | Theme 已落地 32/40/48 档位；局部按钮高度覆盖只剩 `account-popover` 已登记例外 |
| 2 | ToggleButton 视觉一致性 | 120/120 无局部 `sx`；62 个 Group 统一 primary 选中态；7 个 Group 仅保留布局 `sx` |
| 3 | loading 写法 | `LoadingButton` 0；Button `startIcon` 手工 Spinner 0；原生 `loading` 42 |
| 4 | IconButton 动作提示 | Tooltip 147/147；禁用按钮使用外层 `span`；本轮未新增或调整 aria-label |
| 5 | 非交互状态伪装成按钮 | WebSocket 状态灯已由 IconButton 改为非交互状态元素 |
| 6 | 空/错状态操作层级 | 唯一恢复动作使用 contained primary，筛选清空等替代动作使用 outlined primary |

### 剩余治理项

| # | 问题 | 边界与处理方式 |
|---|------|----------------|
| 1 | 非 Button 组件的破坏性色 | 菜单项、ListItemIcon 不属于本轮 Button 改造，后续按各组件语义单独治理 |
| 2 | Header 品牌化外观 | 头像、明暗模式、主题入口允许边框或背景差异，但点击区统一 40x40，不能复制到普通工具按钮 |
| 3 | ButtonGroup 与 ButtonBase | 当前数量少且用途明确，先保留；出现新用法时按 12.10 的边界审查 |
| 4 | 防回退自动检查 | 进入 Phase 3，固化 LoadingButton、手工 Spinner、Tooltip、局部高度等 AST 规则 |

### 观察项，不直接作为改造依据

| # | 观察项 | 说明 |
|---|--------|------|
| 1 | Button variant 28% 未指定 | 默认 text 在取消、关闭、Alert action 等场景合理，不机械补全 |
| 2 | Button color 70% 未指定 | 默认 primary 同时服务主操作、导航和普通 outlined；按操作后果判断，不追求显式 prop 覆盖率 |
| 3 | Button size 50% 未指定 | 默认 medium 已由 Theme 固化为 40px，显式 size 只在密度需要时使用 |
| 4 | refresh/retry 的 variant 不完全相同 | Alert、空状态、Toolbar 的层级不同，应遵循场景矩阵而不是按文案统一 |
| 5 | 不新增统一按钮包装组件 | 现阶段 Theme + 场景规则已足够，避免 `SubmitButton` 等薄包装扩大 API |

---

## 11. 各模块按钮密度与典型文件

### 11.1 按钮密度排行（Button + IconButton JSX 元素数）

| 排名 | 模块 | 元素数 | 高密度文件 |
|:----:|------|:--------:|-----------|
| 1 | **factor** | 89 | `screening-action-bar.tsx`、`factor-admin-bulk-action-bar.tsx` |
| 2 | **backtest** | 75 | `backtest-config-form.tsx`、`backtest-detail-header.tsx` |
| 3 | **alert** | 45 | `anomaly-table-workbench.tsx`、`limit/filter-bar.tsx` |
| 4 | **portfolio** | 43 | `portfolio-rebalance-dialog.tsx`、`portfolio-detail-header.tsx` |
| 5 | **strategy** | 39 | `strategy-signal-card.tsx`、`strategy-detail-header.tsx` |
| 6 | **tushare-sync** | 33 | `sync-plan-tab.tsx`、`sync-status-overview.tsx` |
| 7 | **report** | 29 | `report-detail-view.tsx`、`report-share-dialog.tsx` |
| 8 | **user-manage** | 27 | `user-manage-form-dialog.tsx`、`bulk-action-bar.tsx` |
| 9 | **signal** | 26 | `signal-history-toolbar.tsx`、`signal-latest-view.tsx` |
| 10 | **event-study** | 25 | `signal-rule-wizard-dialog.tsx`、`signal-rules-tab.tsx` |
| 11 | **screener-subscription** | 17 | `subscription-*dialog.tsx`、`subscription-list-card.tsx` |

---

## 12. 全局按钮设计语言与交互规范

### 12.1 规范目标与决策顺序

按钮样式必须表达操作的**层级、后果和密度**，不能仅按开发者偏好选择。决策顺序固定为：

1. 判断操作后果：普通、风险、破坏性、正向状态转换。
2. 判断操作层级：主操作、次操作、低权重操作。
3. 判断界面密度：常规页面、表单/Dialog、工具栏/表格/图表。
4. 最后选择组件、`variant`、`color`、`size` 和图标。

规范用词：

- **必须**：新增代码和改造代码都要遵守。
- **应当**：默认遵守；偏离时需有明确业务或布局原因。
- **可以**：允许选项，不作为统一要求。

每个独立操作区域最多只能有 **1 个 `contained` 主按钮**。页面可以有多个业务区域，但每个 Header、CardActions、Toolbar、DialogActions 内不能出现多个同权重主按钮。

### 12.2 操作层级与 variant

| 操作层级 | `variant` | 默认 `color` | 使用规则 |
|----------|-----------|-----------------|----------|
| 主操作 | `contained` | `primary` | 推进当前任务，如创建、保存、运行；每个操作区域最多 1 个 |
| 次操作 | `outlined` | `primary`（默认） | 不推进主流程但仍需清晰可见的工具或替代操作，如导出、刷新、配置、重置 |
| 低权重操作 | `text` 或省略 variant | `inherit` | 取消、关闭、返回、清除选择等不应抢占注意力的操作 |
| 导航/链接操作 | `text` | `primary` | 进入详情、查看全部等明确导航；不得伪装成提交操作 |
| 破坏性入口 | `text` / `outlined` / `IconButton` | `error` | 删除、清空、撤销等动作的入口，避免提前使用高权重填充样式 |
| 破坏性最终确认 | `contained` | `error` | 仅用于确认层，标签必须写明实际动作，如“删除”“清空” |
| 风险但可恢复 | `outlined` | `warning` | 禁用、覆盖、重建等有风险但可恢复的入口 |
| 风险最终确认 | `contained` | `warning` | 仅用于确认层，不与 `error` 混用 |
| 正向状态转换 | `outlined` | `success` | 仅限启用、批准、恢复等明确状态转换，不代表“点击后会成功” |

普通次操作使用 MUI 默认 `outlined + primary`，不显式重复写 `color="primary"`。`outlined + inherit` 禁止作为通用中性按钮；若操作确实需要低权重，应改用 `text + inherit`，而不是黑色描边。

### 12.3 尺寸系统

以下高度已在 Theme 中落地。Button 使用 `minHeight` 保留字号放大和多行内容的适应能力；单行常规控件按对应档位呈现。

| size | 目标高度 | Button 场景 | IconButton / ToggleButton 场景 |
|------|---------:|-------------|---------------------------------|
| `small` | 32px | 表格、批量栏、图表控制、Alert action、Card 内紧凑操作 | 表格行操作、紧凑工具栏、ToggleButtonGroup |
| `medium` | 40px | 页面 Header、普通表单、DialogActions、Drawer 操作区 | Header 工具入口、普通独立图标操作 |
| `large` | 48px | 登录、创建向导、独立分析/运行 CTA、全页关键恢复操作 | 原则上不用；确有大触控入口时单独评审 |

尺寸规则：

- 同一操作组内所有按钮必须同高、同 size。
- Button / ButtonGroup 与 small Select、TextField、DatePicker 同行混排时必须使用 `medium`，统一为 40px；`small` 32px 仅用于不与输入控件混排的紧凑操作区。
- 禁止用局部 `sx` 任意修改按钮高度；差异必须进入 Theme 或登记为例外。
- `small` 只用于高密度区域，不能因为文字短就使用 small。
- `large` 只用于页面级唯一 CTA，不得用于表格、CardActions 或 DialogActions。
- 移动端独立 IconButton 应当保持至少 40px 点击区域；32px 仅用于桌面高密度表格/工具栏。

### 12.4 颜色语义

| color | 语义 | 允许场景 | 禁止用法 |
|-------|------|----------|----------|
| `primary` | 推进任务、导航关联、标准描边操作 | 创建、保存、运行、查看详情、刷新、重置、配置 | 同一区域多个 contained primary 主按钮 |
| `inherit` | 中性、低干扰 | text 形态的取消、关闭、返回、Alert action | outlined 普通工具、破坏性或风险操作 |
| `error` | 不可恢复或明显破坏 | 删除、清空、撤销发布、移除资源 | 普通校验失败、业务状态展示 |
| `warning` | 有风险但可恢复 | 禁用、覆盖、重建、耗时全量执行 | 删除等不可恢复动作 |
| `success` | 正向状态转换 | 启用、批准、恢复 | 保存、提交、运行等普通主操作 |
| `info` | 无统一按钮语义 | 暂不新增；现有场景逐项审查 | 用于“看起来不一样”的普通操作 |
| `secondary` | 无统一按钮语义 | 暂不新增；品牌级特殊入口需单独评审 | 进阶、更多、设置等普通工具操作 |

颜色表达的是**点击后果**，不是组件所在模块。状态展示应使用 `Label`、`Chip`、`Alert`，不能通过按钮颜色承担状态展示。MUI 已提供对应 `color` prop 时，禁止用 `sx={{ color: 'error.main' }}` 等方式重复实现。

### 12.5 场景决策矩阵

| 场景 | 组件 | size | variant | color | 关键约束 |
|------|------|------|---------|-------|----------|
| 页面 Header 唯一主操作 | Button | medium | contained | primary | 放在操作组最右侧；每组最多 1 个 |
| 页面 Header 普通工具 | Button | medium | outlined | primary（默认） | 导出、刷新、配置等，不显式写 color |
| 普通表单提交 | Button | medium | contained | primary | 使用 `type="submit"`；异步时用 `loading` |
| 登录/创建流程最终提交 | Button | large | contained | primary | 表单型页面可以 `fullWidth` |
| Dialog 保存/提交 | Button | medium | contained | primary | 最右侧；标签使用“保存/创建/应用”等真实动作 |
| Dialog 取消/关闭 | Button | medium | text | inherit | 位于确认按钮左侧；Phase 1 已统一颜色 |
| 卡片内联编辑取消 | Button | small | text | inherit | 与保存按钮同高，不套用 Dialog 规则 |
| 删除/清空入口 | Button / IconButton | small 或 medium | text / outlined / — | error | 进入确认层前保持较低视觉权重 |
| 删除/清空最终确认 | Button | medium | contained | error | 必须明确后果，不使用模糊“确定” |
| 禁用/覆盖/重建入口 | Button | small 或 medium | outlined | warning | 可恢复风险；必要时进入确认层 |
| 启用/批准/恢复 | Button | small | outlined | success | 仅用于明确正向状态转换 |
| 批量操作栏/数据工具栏 | Button | small | outlined | primary（默认） | 核心推进动作可用 contained primary，仍限 1 个 |
| 输入控件混排工具栏 | Button / ButtonGroup | medium | outlined | primary（默认） | 与 small Select、TextField、DatePicker 统一为 40px |
| 表格行查看/编辑 | IconButton | small | — | default | 16-18px 图标；必须有 Tooltip 和 `aria-label` |
| 表格行删除 | IconButton | small | — | error | 必须进入确认流程 |
| Alert action | Button | small | text | inherit | 如重试、查看详情；继承 Alert 对比色 |
| Card 内空状态/错误恢复 | Button | small | contained | primary | 其他替代操作用 outlined primary |
| 全页空状态/错误恢复 | Button | medium 或 large | contained | primary | 页面级唯一 CTA；其他操作降级 |
| Header 图标入口 | IconButton | medium | — | default | 40x40；账号头像可保留品牌化外观，状态指示器不得使用按钮语义 |
| 视图/周期/范围切换 | ToggleButton | small | selected | primary | 使用 exclusive；必选场景拒绝 `null` |
| 行内导航/查看全部 | Button | small | text | primary | 使用 RouterLink，不承担提交职责 |

### 12.6 布局与操作顺序

- DialogActions 必须右对齐，顺序固定为“取消/关闭 → 确认/提交”，确认按钮最右。
- 页面 Header 和 Toolbar 中，低权重操作在前，主操作在最右；破坏性操作与主操作之间应使用间距或菜单隔离。
- 同一操作组建议最多显示 3 个文字按钮；更多低频操作收入“更多”菜单。
- 窄屏允许按钮换行或操作组纵向排列，但必须保留视觉层级和操作顺序。
- `fullWidth` 仅用于登录/创建表单、窄 Drawer 或移动端纵向操作组，不能作为普通桌面按钮默认值。

### 12.7 文案与图标

- 按钮文案必须使用“动词”或“动词 + 对象”，例如“保存”“创建组合”“运行回测”。
- 最终确认禁止只写“确定”；必须写明“删除”“禁用”“覆盖”“清空”等实际动作。
- 同一动作在全项目使用同一词：创建、保存、取消、关闭、删除、移除、重试、刷新，不混用近义词。
- `startIcon` 用于创建、编辑、刷新、导出、删除等动作；`endIcon` 仅用于方向、展开或外部跳转。
- Button 图标建议：small 16px、medium 18px、large 20px。表格 IconButton 图标 16-18px，Header IconButton 图标 20-24px。
- 同一按钮不得同时使用 startIcon 和 endIcon；常见文本操作不得为追求简洁强行改成 IconButton。
- 关闭图标统一使用 `solar:close-circle-bold`；删除图标统一使用 `solar:trash-bin-trash-bold`。

### 12.8 Loading、disabled 与反馈

- 异步 Button 必须使用 MUI v7 `loading`，不得新增 `LoadingButton` 或手动把 `CircularProgress` 塞进 `startIcon`。
- loading 期间按钮必须保持原宽度、保留原动作标签并阻止重复提交。
- `disabled` 用于前置条件不满足、无权限或依赖任务进行中；不能替代 loading。
- 禁用原因不明显时必须提供 Tooltip 或邻近说明；disabled IconButton 的 Tooltip 需通过外层 `span` 承载。
- 操作成功/失败使用 Snackbar、Alert 或页面状态反馈，不通过临时改变按钮颜色表示结果。
- loading、disabled、error 状态切换不能导致操作组明显位移。

### 12.9 可访问性与键盘交互

- 所有 IconButton 必须有可读的 `aria-label`；表格行按钮应包含对象语义，如“删除策略”。
- 所有 IconButton 必须由 Tooltip 解释动作；disabled IconButton 使用外层 `span` 承载 Tooltip。
- 禁止只依赖红、黄、绿区分按钮后果；必须同时依靠文案、图标或确认文案。
- 保留 MUI 默认 focus-visible、键盘触发和 disabled 行为，不使用 `disableRipple` 隐藏可见反馈。
- ToggleButtonGroup 必须能通过键盘切换，选中态不能只靠颜色表达。

### 12.10 ToggleButton、ButtonGroup 与 ButtonBase 边界

- `ToggleButtonGroup` 只用于视图、周期、范围、排序方向等“当前状态选择”，不用于触发一次性命令。
- 必须维持一个选项时使用 `exclusive`，并在 `onChange` 中拒绝 `null`。
- ToggleButtonGroup 统一 `size="small"`，目标高度 32px、字体不小于 12px；选中态使用 primary，不使用 error/warning/success。
- `ButtonGroup` 只用于并列的一次性命令；若按钮代表当前选中状态，应迁移到 ToggleButtonGroup。
- `ButtonBase` 仅用于色块、可点击卡片等 Button/IconButton 无法表达的自定义控件，并补齐角色、键盘和可访问名称。
- 项目保持不使用 Fab。金融工作台是高密度桌面界面，引入 Fab 会增加新的交互语言；除非后续出现明确的移动端核心任务，不纳入本轮改造。

### 12.11 允许例外

以下场景可以保留局部样式，但不能扩散成通用写法：

| 例外 | 原因 | 边界 |
|------|------|------|
| `account-popover` 头像按钮 | 内容是头像，不是普通工具图标 | 保持 40x40，仍需可访问名称 |
| `ws-status-indicator` | 颜色表达实时连接状态 | 使用非交互状态元素；动态 theme token 可保留，不复用到普通操作 |
| 图表动态颜色按钮/标签 | 颜色与数据系列绑定 | 必须使用 theme token，且不能承担危险语义 |
| `color-picker` 的 ButtonBase | 控件本身是颜色样本 | 必须有选中态、键盘操作和可访问名称 |

新增例外必须说明业务原因，并经过至少一次桌面/移动端、亮色/暗色截图检查。`info`、`secondary` 的现有 Button 用法默认是迁移候选，不自动视为例外。

### 12.12 技术落点与验收标准

Theme 已落地：

- `MuiButton`：small 32px、medium 40px、large 48px，统一最小高度。
- `MuiIconButton`：small 32px、medium 40px；Header 入口复用 medium 基线。
- `MuiToggleButton`：small 最小 32px、字体 12px、水平内边距 12px；Group 默认 primary 选中态。
- 颜色全部使用 MUI `color` prop、`theme.palette.*` 或 `theme.vars.palette.*`，禁止硬编码色值。

Phase 2 静态验收结果：

- `@mui/lab/LoadingButton` 保持 0 处。
- `Button startIcon` 手工 CircularProgress 保持 0 处。
- IconButton Tooltip 覆盖率 147/147；当前 aria-label 覆盖率 147/147，本轮未改动 aria-label。
- Dialog 取消/关闭按钮保持 `color="inherit"`。
- 破坏性最终确认使用 `contained + error`。
- Button/IconButton/ToggleButton 局部高度覆盖仅保留 `account-popover` 头像按钮例外。

本次按用户要求仅做静态验收，未检查浏览器。后续视觉基线至少覆盖：Dialog、页面 Header、批量操作栏、表格行、空/错状态、登录/创建表单、Header IconButton、ToggleButtonGroup；每类检查桌面/移动端与亮色/暗色模式。

---

## 13. 分阶段改造方案

### 13.1 已完成：Phase 0 统计校准

- 使用 TypeScript AST 重新统计 Button 家族，固定“文件数”和“JSX 元素数”口径。
- 区分默认 prop 与显式 prop，避免把合理默认值误判为问题。
- 按 Dialog、表格、工具栏、Header、Toggle 等实际场景分类。

### 13.2 已完成：Phase 1 低风险语义收敛

- 真正的 Dialog 取消/关闭统一为 `color="inherit"`。
- 明确破坏性的 IconButton 从 `sx` 色值迁移为 `color="error"`。
- `@mui/lab/LoadingButton` 清零，统一使用 MUI v7 `Button loading`。

### 13.3 已完成：Phase 2A 主题基础

1. `MuiButton` 已落地 small/medium/large 的 32/40/48 最小高度。
2. `MuiIconButton` 已落地 small/medium 的 32/40 点击区。
3. `MuiToggleButton` 已落地 small 字体、内边距和 32px 最小高度；Group 默认使用 primary 选中态。
4. 多行 ToggleButton 使用 `minHeight` 自然增高，避免固定高度裁切。

### 13.4 已完成：Phase 2B 高频控件收敛

1. ToggleButton 局部 `sx` 从 19 处清零；Group 仅保留 7 处容器布局 `sx`。
2. Header IconButton 统一到 40x40 点击区；头像保留品牌化外观，WebSocket 状态灯改为非交互元素。
3. IconButton Tooltip 覆盖达到 147/147；本轮按用户决定不新增或调整 aria-label。
4. 非 Tooltip 的原生 `title` 已移除，避免双重悬浮提示。

### 13.5 已完成：Phase 2C 场景迁移

1. 普通次操作统一为 MUI 默认 `outlined + primary`；取消/关闭使用 `text + inherit`，每个操作区域只保留一个 contained 主操作。
2. 空状态/错误状态恢复动作与替代动作已恢复清晰层级。
3. 17 处 Button 手工 loading Spinner 已迁移到 MUI v7 `loading`，最终 AST 结果为 0 处遗留。
4. Button、IconButton、ToggleButton 的局部高度覆盖只剩已登记的头像按钮例外。
5. 未新增 `SubmitButton`、`CancelButton`、`ActionButton` 等薄包装，统一规则仍由 Theme 和场景矩阵承载。
6. 2026-07-11 视觉校正：103 处普通 outlined 移除 `color="inherit"`，6 处取消/关闭改为 `text + inherit`；输入控件混排 ButtonGroup 统一为 medium 40px。

### 13.6 已完成：Phase 3A 静态防回退

1. 新增 `yarn check:buttons`，检查 LoadingButton、手工 Spinner、IconButton Tooltip、普通 outlined 黑框、Dialog 取消/关闭颜色及局部高度覆盖。
2. Theme 尺寸基线和共享 ConfirmDialog 已有聚焦回归测试。
3. 新增按钮时继续按第 12.5 节场景矩阵选择组件、层级、颜色和尺寸。

### 13.7 待执行：Phase 3B 视觉基线

1. 建立 Dialog、页面 Header、批量操作栏、表格行、空/错状态、登录/创建表单、Header IconButton、ToggleButtonGroup 的亮/暗色与桌面/移动端截图基线。
2. 截图基线需要已登录页面状态；当前按用户此前要求保持静态验收。

---

## 附录：图标使用速查

所有按钮中的图标统一使用 `@iconify/react` 的 `Iconify` 组件，前缀分布：

| 前缀 | 使用频率 | 典型图标 |
|------|:------:|---------|
| `solar:` | 95% | `pen-bold`, `trash-bin-trash-bold`, `refresh-bold`, `close-circle-bold`, `add-circle-bold`, `play-bold`, `eye-bold`, `copy-bold`, `bell-bold`, `restart-bold`, `filter-bold`, `share-bold`, `star-bold`, `info-circle-bold`, `arrow-left-bold`, `arrow-right-bold`, `alt-arrow-up-bold`, `alt-arrow-down-bold` |
| `eva:` | 4% | `search-fill`, `done-all-fill`, `trash-2-outline`, `arrow-back-fill`, `more-vertical-fill`, `checkmark-fill` |
| `mingcute:` | 0%（仅注册） | `close-line` |
| `carbon:` | <1% | `chevron-sort` |
| `custom:` | <1% | `menu-duotone`（本地注册） |

> 关闭按钮统一使用 `solar:close-circle-bold`；运行时代码已无 `mingcute:close-line` 使用，仅图标注册表保留定义。

---

*Phase 2 完成。当前核心统计基于 TypeScript AST：Button 197 个文件 / 418 个元素，IconButton 90 个文件 / 147 个元素，ToggleButton 41 个文件 / 120 个元素。下一步进入 Phase 3 防回退检查。*
