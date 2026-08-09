# 页面与组件模式

## 页面结构

- `src/pages/<page>.tsx`：只渲染对应 View。
- `src/sections/<feature>/view/<feature>-view.tsx`：页面信息顺序和跨区状态编排。
- `src/sections/<feature>/`：页面私有组件、Hook、类型、纯函数和测试。
- `src/components/`：至少跨两个功能复用，或属于基础设计系统/图表基础设施。

## 常见页面

- 概览：页面标题/日期 → 核心摘要 → 主趋势 → 排行/分解 → 明细。
- 表格：筛选/搜索 → 表格 → 分页；长列表考虑虚拟化，操作保留键盘入口。
- 详情：身份摘要 → 关键指标 → 分组 Tabs → 下钻/相关实体。
- 工作台：状态/上下文 → 主操作区 → 结果 → 历史/日志；提交状态和恢复路径明确。

## 状态所有权

- 远程数据：功能 Hook/API 层，支持取消、错误和重新获取。
- 可分享筛选：URL search params。
- 短期交互：最近业务组件或 View。
- 图表 hover/zoom/crosshair：图表引擎实例，避免全局 React state。
- 认证与权限：现有 auth/permission 层。

## 图表

- ApexCharts：趋势、柱、散点、热力、分布等分析图。
- KLineCharts：K 线、指标、overlay 与高频 crosshair。
- 图表必须标注日期范围、单位、精度、图例与 tooltip；空数据不渲染误导性零线。

## 组件边界

- 拆分依据：复用、独立状态/副作用、明确业务语义、昂贵渲染或独立测试契约。
- 单次使用、少量无状态 JSX 可留在同文件；不要制造只转发大量 props 的微组件。
- 避免 `index.ts` 隐藏重型依赖；路由和重型组件使用可静态分析的直达 import。
