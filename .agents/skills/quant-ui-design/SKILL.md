---
name: quant-ui-design
description: 设计、实现、审查或修订当前量化前端的 MUI 页面、组件、主题、样式、表格、ApexCharts、KLineCharts、Drawer/Dialog、桌面交互与视觉 QA。涉及布局、视觉、颜色、图表、可访问性或 UI 重构时使用。
---

# Quant UI Design

构建克制、数据优先、适合 A 股研究决策的桌面界面。

## 必读来源

按影响范围读取：

- `src/theme/theme-config.ts`、`src/theme/core/palette.ts`：canonical 色板。
- `src/theme/core/components.tsx`：MUI 全局组件行为。
- `src/components/chart/use-chart.ts`：ApexCharts 基线。
- `src/components/stock-kline/`：KLineCharts 封装。
- `references/design-language.md`：视觉与金融语义。
- `references/page-patterns.md`：页面与组件组合。

## 工作流

1. 明确用户核心问题、主要动作和页面 archetype，再决定信息层级。
2. 复用现有 theme、共享组件、formatter、图表和布局，不复制全局设计值。
3. 使用 MUI 子路径导入；单实例样式用 `sx`，重复模式用封装/`styled()`，全局行为进入 theme components。
4. 保持涨红跌绿，并用符号/文字辅助；类别比较色使用非方向性色板。
5. ApexCharts 承载常规分析图；KLineCharts 承载 K 线、指标和 overlay。
6. 设计 loading、empty、error/retry、权限、disabled、selected、hover、focus 和 reduced-motion。
7. 仅实现 PC 桌面鼠标与键盘体验；默认在 `1440×900` 验证，不新增移动/平板/触控专用行为。
8. 运行相关测试、lint、typecheck、build，并用真实浏览器检查层级、overflow、console/network 和主题。

## 实现约束

- 禁止散落 hex、rgba、随机阴影、圆角和间距；局部数据可视化色必须说明其语义。
- `fontSize` 不低于 12px；金融数字保持单位、精度、符号和对齐一致。
- 远程内容优先 skeleton；错误态提供可执行 retry；空态说明无数据与无权限的区别。
- 组件变体优先组合和显式命名，避免持续增加布尔 props。
- 重型图表、路由和非首屏模块保持懒加载；避免无必要 re-render 与图表重复初始化。
- 不用 ImageGen 或通用 AI dashboard 图片替代可编辑、可实现的产品原型。

## 完成检查

- 首屏快速回答核心问题，主次层级清楚。
- A 股红涨绿跌、日期、单位、精度与 `null` 正确。
- 暗/亮主题在影响范围内可用，无页面级横向 overflow。
- 键盘、焦点、ARIA、对比度和 reduced-motion 合格。
- 未引入重复 token、临时 CSS、错误图表引擎或无测试状态。
