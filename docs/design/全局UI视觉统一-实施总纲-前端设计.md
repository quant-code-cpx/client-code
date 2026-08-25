# 全局 UI 视觉统一实施总纲（前端设计）

> 文档状态：第一阶段实施大纲，待评审后进入全局视觉基线施工
>
> 文档日期：2026-08-25
>
> 适用范围：当前量化研究桌面前端的视觉优化与设计语言统一
>
> 研究基线：[Minimal UI 管理模块逆向设计](<./Minimal UI管理模块逆向设计.md>)
>
> 本轮产物：设计与实施规划，不包含任何业务代码改动

## 0. 结论先行

本项目后续只借用 Minimal UI 的视觉语法，不复制目标站的业务结构。本轮及后续视觉批次必须同时满足以下结论：

1. **不修改业务逻辑。** API、路由、权限、状态、请求、字段、排序、分页、校验、图表数据和交互结果全部保持不变。
2. **不处理内容宽度。** 用户截图红框所示的内容起止位置、`DashboardContent` 最大宽度、页面自定义 `maxWidth`、外层 gutter 和居中规则均不在本轮范围内。
3. **不重造设计系统。** 当前项目已经具备接近目标的圆角、阴影、控件尺寸、焦点态、暗色表面和主题能力；只补经过页面证据确认的差异。
4. **不做信息架构重设计。** 页面模块、字段、Tab、筛选器、操作按钮、导航入口和业务文案不增删、不改序。
5. **不新增目标站业务。** User、Job、Tour、Chat、Calendar、Course 等逆向结果只作为视觉模式库；不存在的功能不会被引入当前项目。
6. **先全局、后页面。** 主题、MUI 全局样式、共享表现组件和应用壳层先冻结，页面 Agent 才能并行接入。
7. **控制抽象数量。** 只有至少两个当前功能目录存在真实一致消费者时，才允许提取共享视觉组件；否则保留局部组合。
8. **默认主题不变。** `minimal-green` 作为新增视觉主题和主要验收主题，当前默认 `classic-blue` 不擅自切换。

这不是一次“重新设计产品”，而是一次可分批回退、可证明业务不变的视觉收口。

## 1. 目标与成功标准

### 1.1 目标

- 将逆向研究得到的色彩、表面、层级、圆角、阴影、状态反馈和桌面工作区语言融入现有项目。
- 让主题、全局 MUI 组件、共享表现组件、Dashboard Shell 和业务页面使用同一套视觉规则。
- 消除同类页面在标题、工具栏、筛选区、卡片、表格、表单、弹层和空状态上的无必要差异。
- 保持现有量化产品的金融语义、数据密度和桌面操作效率。
- 为后续子 Agent 研究、实现和 QA 提供互不冲突的文件所有权与批次边界。

### 1.2 成功标准

未来实现完成时，应满足：

- 用户在不同模块间切换时，能感知到统一的颜色、层级、表面、控件状态和间距节奏。
- Minimal Green 与 Classic Blue 的 Light/Dark 模式都可正常工作；其他主题不存在明显全局退化。
- 页面业务字段、可见数据、模块顺序、操作流程、URL、权限和网络请求与改造前一致。
- 页面不因视觉改造产生新的横向滚动、内容截断、浮层越界、键盘焦点或对比度问题。
- 每一批都能独立验收、独立回退，不依赖一次性全站大改。

### 1.3 非目标

- 不追求与目标网站像素级复制。
- 不修改页面内容宽度或红框所示主内容区域的几何范围。
- 不调整移动端、平板端、触控端和窄屏专用布局；产品范围仍是 PC 桌面浏览器。
- 不新增 RTL、Compact、Contrast、工作区切换、语言切换或升级推广等设置。
- 不替换 ApexCharts、KLineCharts、日期选择器、富文本编辑器或其他业务基础设施。
- 不复制目标站图片、插画、头像、图标包或商业模板资源。
- 不为了统一外观而重写组件状态、数据请求、表单校验或渲染生命周期。

## 2. 不可突破的业务边界

### 2.1 禁止修改的行为

| 领域 | 必须保持不变的内容 |
| --- | --- |
| API | method、path、Body、调用次数、触发时机、错误处理与重试语义 |
| 路由 | 路径、重定向、懒加载、URL 参数、查询参数和返回路径 |
| 权限 | 可见性、禁用条件、角色判断、导航过滤和动作授权 |
| 状态 | 初始值、reducer、selector、Context、Hook、缓存和持久化 key |
| 列表 | 字段、列、排序、筛选、分页、批量选择和行操作 |
| 表单 | 字段、默认值、校验、提交载荷、保存/取消结果和离开提示 |
| 图表 | series、数据转换、正负语义、单位、精度、tooltip 数据和联动 |
| 页面结构 | 业务模块、Tab、动作、信息块和导航项的增删及顺序 |
| 文案 | 业务名称、状态文本、错误文本、帮助内容和按钮语义 |
| 远程状态 | loading、empty、error/retry、stale/partial 分支及出现条件 |

### 2.2 默认禁止路径

页面视觉 Agent 默认不得修改：

- `src/api/**`
- `openapi/**`
- `src/routes/**`
- `src/pages/**`
- `src/auth/**`
- `src/permission/**`
- `src/mocks/**`
- `**/hooks/**`
- `**/state/**`
- reducer、selector、Context、DTO、formatter、generated 文件和请求函数
- 导航配置、权限配置、URL 状态和事件处理流程

页面展示文件中若样式与业务处理混在同一个组件，只允许修改：

- `sx`、`styled`、className 与主题 token 引用；
- 不影响 DOM 语义和事件的视觉 wrapper；
- Typography、Stack、Box、Card、Divider 等纯表现组件的样式属性。

不得修改：条件分支、循环数据源、事件回调、Hook 调用顺序、状态初始化、API import/call、提交载荷或业务组件 props 的语义。

### 2.3 内容宽度排除项

以下内容明确冻结：

- [`src/layouts/dashboard/content.tsx`](../../src/layouts/dashboard/content.tsx)；
- `DashboardContent` 的 `maxWidth`、`disablePadding` 和容器规则；
- 各页面已有的 `maxWidth`、固定宽度、居中方式和外层 gutter；
- 用户截图红框所示内容区域的起止位置；
- 导航区与主内容区之间的现有整体宽度关系。

视觉截图比较时应屏蔽外侧 gutter，不以内容绝对宽度和左右留白像素值作为 PASS/FAIL 条件。仍需检查是否因本轮改动引入新的页面级横向滚动、截断或浮层越界。

## 3. 逆向研究如何映射到当前项目

### 3.1 映射原则

目标站页面只提供视觉模式，不提供当前项目的业务模型。映射时按“同类视觉问题”匹配，而不是按“页面名称”复制。

| 逆向证据 | 当前项目可借鉴位置 | 可应用内容 | 明确不应用内容 |
| --- | --- | --- | --- |
| 全局主题 | `src/theme/**` | 绿色主色、Light/Dark surface、action alpha、divider、语义阴影 | 改默认主题、复制商业资源 |
| Dashboard Shell | `src/layouts/**` | 导航活动态、Header utility、表面和分隔层级 | 内容宽度、导航业务、权限逻辑 |
| User List / Cards | `/admin/user-manage`、各类运营列表 | Tabs、筛选栏、表头、行状态、卡片元信息 | 用户字段、批量动作、权限模型 |
| Job List / Details | 策略、报告、组合、回测等卡片与详情页 | 标题动作区、信息卡、详情 Tabs、元数据层级 | Job 路由、字段、申请流程 |
| Tour List / Details | 股票、因子、订阅等列表和详情页 | 卡片表面、状态标签、详情侧栏视觉 | Tour 数据、预订、评分和图片资源 |
| Chat | `/agent` | 固定工作区表面、区域分隔、工具栏、局部滚动 | 联系人模型、详情栏、消息行为 |
| Calendar | `/alert` | 日历表面、工具栏、事件标签和弹层层级 | 新增视图、事件 CRUD、拖拽逻辑 |
| Course | 首页、市场、因子和研究仪表盘 | KPI 卡、图表卡、状态摘要、卡片节奏 | Course 数据、进度模型、学习业务 |
| Settings | `/profile`、管理设置页 | 分区标题、字段密度、操作区层级 | 新设置项、工作区或语言功能 |

### 3.2 已接受的视觉语言

- 颜色从 theme semantic token 获取，页面不新建一套局部色板。
- 保持 8px 基础圆角与间距节奏；Card/Dialog 以现有 16px 语义为基线。
- Card、Dialog、Dropdown 使用低干扰语义阴影，不在页面散落自定义 shadow。
- Light/Dark 下统一 background、paper、neutral surface、divider、正文、次级和 disabled 层级。
- 使用既有 focus-visible 和 reduced-motion 能力，不新增装饰性动画。
- 导航活动态、表头、输入框、筛选区、弹层和空状态保持克制、低噪音。
- A 股继续“涨红跌绿”，颜色同时配合正负号、箭头或文字；不得套用目标站的一般绿色正向语义覆盖金融语义。

### 3.3 暂不采用的研究结果

- 正文字体从 DM Sans 切换为 Public Sans。字体度量可能影响高密度表格和现有布局，本轮默认保留 DM Sans；若以后需要，必须作为独立批次验证。
- 目标站的 720px 居中表单、三栏固定布局和特定 Workspace 尺寸。
- 尚未取得稳定证据的精确 hover、focus、error 数值。
- 将所有小按钮统一改成目标站尺寸；当前项目的 32/40/48px 控件基线继续保留。
- `EntityCard`、`DetailLayout`、`WorkspaceSurface` 等预设万能组件。
- FullCalendar、富文本、图表引擎和图标系统替换。

## 4. 当前全局 UI 资产盘点

### 4.1 主题层

| 文件 | 当前能力 | 本次定位 |
| --- | --- | --- |
| [`theme-config.ts`](../../src/theme/theme-config.ts) | 基础字体、色板和 CSS variable 配置 | 只在确认全局缺口时调整 |
| [`palette.ts`](../../src/theme/core/palette.ts) | Light/Dark 的 text、background、action、divider | 作为语义色基线，不重造 |
| [`typography.ts`](../../src/theme/core/typography.ts) | 完整 Typography variants，标题含 Barlow | 保留字体体系，统一页面用法 |
| [`custom-shadows.ts`](../../src/theme/core/custom-shadows.ts) | Card、Dialog、Dropdown 等语义阴影 | 页面禁止另造阴影 |
| [`components.tsx`](../../src/theme/core/components.tsx) | Button、IconButton、Card、Paper、Input、TableCell 等覆盖 | 全站高风险放大器，单一负责人 |
| [`theme-presets.ts`](../../src/theme/theme-presets.ts) | 8 套主题，当前工作区含 `minimal-green` | 复核并冻结，不重复新增 |
| [`theme-provider.tsx`](../../src/theme/theme-provider.tsx) | 主题切换、持久化、浏览器 theme-color | 行为冻结 |
| [`global.css`](../../src/global.css) | 字体、Scrollbar/Chart CSS、reduced-motion | 仅纯视觉全局修正 |

当前已经具备：

- 8px 基础圆角和 16px Card 圆角；
- 主题化 Card、Dialog、Dropdown 阴影；
- Button、IconButton 和 OutlinedInput 的基础尺寸与状态；
- 表头 neutral surface、输入框边界、focus ring；
- Minimal Green 的 Light/Dark 色彩和 surface 原型；
- 全局与图表 reduced-motion。

因此全局层的任务是补差，不是替换。

### 4.2 应用壳层

| 资产 | 当前能力 | 本次规则 |
| --- | --- | --- |
| [`dashboard/css-vars.ts`](../../src/layouts/dashboard/css-vars.ts) | 300px nav、顶部/底部/水平 spacing | 数值保持，除非纯视觉 token 对齐且不影响宽度 |
| [`core/css-vars.ts`](../../src/layouts/core/css-vars.ts) | Header 64/72px | 保持几何 |
| [`dashboard/layout.tsx`](../../src/layouts/dashboard/layout.tsx) | 导航、权限、通知、账户与内容编排 | 只改可见样式，业务 utility 冻结 |
| [`dashboard/nav.tsx`](../../src/layouts/dashboard/nav.tsx) | 活动态、展开、Drawer、ARIA | 保留路由判断、展开状态和 ARIA |
| [`header-section.tsx`](../../src/layouts/core/header-section.tsx) | sticky、blur、滚动 elevation | 只收口 surface 与 utility 外观 |
| [`dashboard/content.tsx`](../../src/layouts/dashboard/content.tsx) | 内容容器和 `maxWidth` | 完全排除 |

当前导航断点、Header 高度、导航宽度和目标语言已经接近，不实施 Shell 重构。

### 4.3 共享表现组件

优先审计以下已有资产：

1. [`PageHeader`](../../src/components/page-header/page-header.tsx)
2. [`Label`](../../src/components/label/styles.tsx)
3. [`EmptyContent`](../../src/components/empty-content/empty-content.tsx)
4. [`ConfirmDialog`](../../src/components/confirm-dialog/confirm-dialog.tsx)
5. [`DatePicker`](../../src/components/date-picker/date-picker.tsx)
6. [`Scrollbar`](../../src/components/scrollbar/scrollbar.tsx)
7. [`Chart` 主题基线](../../src/components/chart/use-chart.ts)
8. [`ColoredNumber`](../../src/components/colored-number/colored-number.tsx)
9. [`Iconify`](../../src/components/iconify/iconify.tsx)

处理原则：

- 优先修改已有组件的视觉默认值，不新增同义组件。
- `PageHeader` 当前覆盖有限，页面批次按真实适配逐步接入，不做全仓机械替换。
- `Label` 只用于非交互状态；可操作的 Chip 保留交互语义。
- `DatePicker`、股票搜索、Chart 主组件、K 线和 `ColoredNumber` 含行为或金融语义，默认不进入视觉重写。
- Chart 只允许修改 tooltip、legend、loading、grid 等主题表现，不得修改 series 和生命周期。

### 4.4 全局改动准入阈值

一个视觉差异只有满足以下条件之一，才进入全局层：

- 同一问题出现在至少两个功能目录；
- MUI 默认表现导致全站 Light/Dark 不一致；
- 现有共享组件已经是两个以上功能的稳定消费者；
- 可通过 theme token 或 component override 解决，且不会改变尺寸、语义或行为。

否则只在单一页面局部处理。证据不足时保持现状。

## 5. 总体施工顺序

```text
R0 冻结业务与视觉基线
  ↓
F1 主题 token 与 preset 冻结
  ↓
F2 MUI 全局表面 ─┬─ F3 Dashboard Shell 视觉
                 └─ F4 共享表现组件
                         ↓
P0 三类样板页 + 两个补充状态
                         ↓
Wave A → Wave B → Wave C → Wave D
                         ↓
QF 全路由视觉与业务不变量回归
```

依赖规则：

- F1 必须先完成。
- F2、F3、F4 在文件所有权不重叠时可以并行，但合并后必须统一回归。
- 页面 Agent 只能在 F2/F3/F4 冻结后开始。
- 每一波最多启用三个页面子 Agent，主 Agent 负责集成、缺口仲裁和只读 QA。
- 任何页面批次提出的 global token 缺口都回到全局负责人处理，页面不得私自硬编码替代方案。

## 6. 全局批次详细规划

### R0：冻结基线

目标：在任何视觉实现前建立可比较证据。

记录内容：

- 起始 Git SHA、`git status --short` 和起始 dirty patch 摘要；
- 每批允许修改路径与明确禁止路径；
- 目标路由、固定 fixture、账号角色、浏览器、主题、色彩模式、视口；
- 现有相关 Vitest/E2E 结果；
- 核心流程 URL、可见业务文本、控件状态和 API 请求签名；
- Classic Blue 与 Minimal Green 的 Light/Dark 首屏和关键浮层截图；
- 已有失败列表，标记为 `baseline-known`。

R0 不修改任何代码。

### F1：主题基础

唯一负责人范围：

- `src/theme/theme-config.ts`
- `src/theme/core/palette.ts`
- `src/theme/core/typography.ts`
- `src/theme/core/custom-shadows.ts`
- `src/theme/theme-presets.ts`
- `src/global.css`
- 对应主题测试

任务：

- 复核并冻结当前 `minimal-green`，不重复建主题；
- 确认 primary、status、text、background、action、divider、focus、Card/Dialog/Dropdown shadow 的 Light/Dark 语义；
- 保持 `classic-blue` 默认值和主题持久化 key 不变；
- 保持 A 股涨红跌绿的金融语义；
- 不切换字体，不引入新字体依赖；
- 不新增没有实际消费者的 token。

完成门禁：8 套主题均可创建，Minimal Green 和 Classic Blue 的 Light/Dark 可切换、可刷新持久化，高密度页面无不可读表面。

### F2：MUI 全局表面

唯一负责人范围：

- `src/theme/core/components.tsx`
- 对应 component override 测试

候选审计对象：

- Button、IconButton、Input、Select；
- Tabs、Chip、Card、Paper、Table；
- Popover/Menu、Dialog、Drawer、Tooltip；
- Skeleton、disabled、selected、hover、focus-visible 状态。

执行规则：

- 只有逆向证据与两个以上项目消费者共同支持时才补全局 override；
- 不为了接近目标站而改变密集工具栏按钮高度；
- 不改组件默认业务属性、事件或可访问性语义；
- Tabs、Switch、Pagination 等证据不足时继续使用 MUI 默认；
- 一次只允许一个 Agent 编辑 `components.tsx`。

### F3：Dashboard Shell 视觉

唯一负责人范围：

- `src/layouts/core/**`
- `src/layouts/dashboard/**`，但排除 `dashboard/content.tsx`
- `src/layouts/components/**`
- 对应 layout/nav/popover 测试

任务：

- 统一导航活动态、父子层级、Header surface 和 utility action 外观；
- 统一账户、通知、主题 Popover 的圆角、阴影、选中态和暗色表现；
- 保留导航顺序、路径、权限、展开状态、通知、账户和主题切换行为；
- 保留 300px nav、64/72px Header、1200px 断点及内容宽度；
- 在 1199/1200 与 1440×900 检查 Drawer/固定导航切换和键盘焦点。

### F4：共享表现组件

唯一负责人范围：

- `src/components/page-header/**`
- `src/components/label/**`
- `src/components/empty-content/**`
- `src/components/confirm-dialog/**`
- 必要的 `scrollbar` 与 `chart` 纯样式文件
- 对应测试

优先顺序：PageHeader → Label → EmptyContent → ConfirmDialog → Scrollbar/Chart 纯视觉层。

任务：

- 统一标题层级、说明文字和动作区对齐；
- 统一非交互状态标签、空状态、确认弹层和局部滚动表面；
- 统一图表 tooltip、legend、loading 的主题表现；
- 保持组件 props 语义、回调、焦点管理和业务消费者行为；
- 不预建万能卡片或万能详情布局。

## 7. 样板页阶段

全局层冻结后，先用少量代表页验证规则，不立即铺满全站。

| 样板 | 路由 | 验证重点 | 业务边界 |
| --- | --- | --- | --- |
| P1 构建器/筛选 | `/stock/pattern` | 标题、模板卡、参数区、按钮和状态层级 | 形态、算法、参数、请求与结果不变 |
| P2 分析仪表盘 | `/` | KPI、图表卡、摘要、卡片节奏 | 数据源、模块顺序、图表 series 不变 |
| P3 数据列表 | `/stock` | Tabs、筛选、表头、行状态、分页 | 字段、列、排序、筛选和分页不变 |
| P4 固定工作区 | `/alert` | Calendar 表面、工具栏、局部滚动、弹层 | 事件、视图、编辑和拖拽行为不变 |
| P5 详情补充态 | `/stock/detail?code=<fixture>` | 详情标题、动作、Tabs、图表与信息卡 | 查询、联动、金融语义和模块顺序不变 |

P1–P3 是首轮必须通过的三个样板；P4/P5 用于补充固定工作区和详情态。`/agent/:conversationId` 不作为首轮样板，因为当前 `src/sections/agent/**` 存在其他未提交开发，待目录稳定后再处理。

样板通过后冻结：

- 页面标题与动作区规则；
- 筛选栏、工具栏和批量条规则；
- Card、Table、Tabs、表单与弹层组合规则；
- loading、empty、error、disabled 和 selected 表面规则；
- 页面局部 `sx` 与共享组件之间的分工。

样板未获确认前，不启动全页面批量替换。

## 8. 页面族与功能批次

路由事实：Agent feature flag 开启时，当前有 54 个受保护页面状态；加上登录、404 和通配 404，共 57 个非重定向页面状态。`src/pages/` 的 55 个文件均为路由薄壳，不进入视觉施工。

### 8.1 页面视觉族

| 页面族 | 代表路由 | 主要收口对象 |
| --- | --- | --- |
| 分析仪表盘 | `/`、`/market/overview`、`/factor/advanced-analysis` | KPI、摘要、图表卡和状态层级 |
| 卡片目录 / Feed | `/market/news`、`/strategy`、`/portfolio`、`/knowledge` | 卡片表面、元信息、工具栏和分页 |
| 数据表与运营列表 | `/stock`、`/factor/library`、`/backtest/runs`、`/admin/user-manage` | Tabs、筛选、表头、状态、批量条和分页 |
| 详情页 | 股票、因子、策略、回测、组合、报告详情 | 标题动作、Tabs、信息卡、图表和侧栏表面 |
| 构建器 / 表单 / 设置 | `/stock/pattern`、`/factor/screening`、`/backtest`、`/profile` | 分区、字段密度、操作区和反馈状态 |
| 固定工作区 | `/agent`、`/agent/:conversationId`、`/alert` | 区域分隔、局部滚动、工具栏和弹层 |
| 阅读与编辑 | Knowledge Topic、研究笔记详情 | 内容层级、目录、编辑表面和辅助信息 |
| 独立壳层 | `/sign-in`、`/404`、`*` | 字体、控件和插图表面 |

视觉族只用于复用规则，实际文件所有权必须按完整 `src/sections/<feature>` 划分，不能把一个功能目录按“列表/详情/表单”横切给多个 Agent。

### 8.2 实施批次

| 批次 | 独占目录 | 代表路由 | 备注 |
| --- | --- | --- | --- |
| B1 市场与首页 | `overview/`、`market-overview/`、`market-money-flow/`、`index-detail/`、`industry-analysis/` | `/`、`/market/industry?tab=1` | 仪表盘样板来源 |
| B2 股票探索 | `stock/`、`stock-screener/`、`stock-detail/`、`pattern/` | `/stock`、`/stock/pattern`、股票详情 | 列表、构建器、详情三类 |
| B3 因子 | `factor/` | `/factor/library`、因子详情 | 单目录独占，避免横切 |
| B4 策略与信号 | `strategy/`、`signal/` | `/strategy`、`/strategy/signal` | 保持交易信号语义 |
| B5 回测 | `backtest/` | `/backtest/runs`、对比创建、详情 | 高状态复杂度，单独一批 |
| B6 组合与订阅 | `portfolio/`、`watchlist/`、`screener-subscription/` | `/portfolio`、`/research/watchlist`、订阅表单 | 卡片、表格、表单混合 |
| B7 研究内容 | `news/`、`event-study/`、`research-note/`、`report/`、`knowledge-base/` | `/research/notes`、Knowledge Topic | 阅读与编辑表面 |
| B8 预警 | `alert/` | `/alert`、`/alert/anomalies` | Calendar 映射，仅视觉 |
| B9 管理与设置 | `user-manage/`、`model-providers/`、`tushare-sync/`、`profile/` | `/admin/user-manage`、`/profile` | User/Settings 映射 |
| B10 AI 工作区 | `agent/` | `/agent/:conversationId` | Chat 映射；等待现有开发稳定 |
| B11 独立页面 | `auth/`、`error/` | `/sign-in`、`/404` | 不强套 Dashboard 结构 |

补充路由说明：

- `industry-rotation.tsx` 与 `market-heatmap.tsx` 没有独立施工入口，实际 View 由 `/market/industry` 内嵌。
- 用户管理正式入口为 `/admin/user-manage`；`/user-manage` 只是兼容重定向。
- 所有兼容重定向和旧路径保持不变。

### 8.3 并行波次

| 波次 | 并行批次 | 启动条件 |
| --- | --- | --- |
| Wave A | B1、B8、B9 | 全局层与样板规则冻结；先完成各自代表页 |
| Wave B | B2、B3、B7 | Wave A 的共性缺口已回收到全局层并冻结 |
| Wave C | B4、B5、B6 | 列表、详情、表单组合规则稳定 |
| Wave D | B10、B11、全路由集成回归 | Agent 目录无并行业务开发冲突 |

每波最多三个实现子 Agent。主 Agent 不与子 Agent 争用同一目录，负责共享缺口仲裁、diff 审查、集成验证和文档收口。

## 9. 子 Agent 工作契约

### 9.1 研究与实现分离

每个全局或页面批次都拆成三个独立阶段，不能让同一个任务在缺少评审的情况下从研究直接滑入实现：

| Agent 类型 | 权限 | 任务 | 交付物 |
| --- | --- | --- | --- |
| Global Research Agent | 只读 | 对照逆向证据审计 theme、MUI、Shell 或共享组件 | 现状、确认差异、明确不改项、候选文件与风险 |
| Page Research Agent | 只读 | 按一个功能批次检查代表页和关键状态 | 页面状态矩阵、局部差异、可复用项、精确 allowlist |
| Foundation Implementation Agent | 限定写入 | 实现已批准的 F1–F4 单一范围 | 小范围 diff、组件测试、主题与 Shell 证据 |
| Page Implementation Agent | 限定写入 | 只处理一个 B 批次的展示文件 | 视觉 diff、页面截图和业务不变证明 |
| Visual QA Agent | 只读 | 独立复核实现结果 | PASS/FAIL/SKIP、请求签名、console/overflow/键盘报告 |

每批内部流程固定为：

```text
只读研究 → 主 Agent 收敛精确改动清单 → 限定实现 → 独立只读 QA → 用户/主 Agent 验收
```

研究 Agent 可以在目录互不重叠时并行。实现 Agent 只有在上游规则冻结、文件 allowlist 批准后才能启动。若只读研究确认全局主题已经自然修正该页面，则该页面直接标记“无需实现”，不为了制造批次产物而修改文件。

### 9.2 开始前输入

每个实现 Agent 必须收到：

- 唯一批次 ID；
- 目标路由与固定 fixture；
- 文件 allowlist 与禁止路径；
- 已冻结 token、组件和样板规则；
- 明确不处理项：业务逻辑、内容宽度、信息架构、移动端和新功能；
- 起始 SHA、dirty patch 摘要和 `baseline-known` 失败；
- 所需 Light/Dark、Classic/Minimal 与交互状态矩阵。

### 9.3 单一所有权

- Theme Agent 独占 `src/theme/**`。
- MUI Baseline Agent 独占 `src/theme/core/components.tsx`。
- Shell Agent 独占 `src/layouts/**`，且不修改 `dashboard/content.tsx`。
- Shared Visual Agent 独占获批的 `src/components/**` 范围。
- 页面 Agent 只拥有其批次列出的 `src/sections/<feature>/**` 展示文件与最近测试。
- Visual QA Agent 只读复核，不与实现 Agent 共用“自证”结论。

不同 Agent 不得同时编辑同一个共享文件。页面 Agent 发现缺 token 或共享变体时，只提交缺口说明，由全局负责人集中处理。

### 9.4 中止条件

出现以下任一情况，Agent 必须停止对应改动并上报：

- 视觉目标要求改变业务字段、模块顺序、状态或请求；
- 需要修改 Hook、reducer、selector、API、route、permission 或 generated 文件；
- 需要改变共享组件 props 语义或事件回调；
- 需要新建只有一个消费者的通用组件；
- 目标效果依赖修改内容宽度或响应式策略；
- 发现当前目录有无法安全合并的并行未提交工作；
- 基线行为无法复现，无法证明改造前后等价。

### 9.5 交付格式

每个 Agent 必须交付：

1. 修改文件清单及每项视觉目的；
2. 未修改 API、状态、路由、权限、字段和业务行为的明确声明；
3. Light/Dark 的改造前后截图，包含首屏和关键状态；
4. 测试命令与真实 PASS/FAIL/SKIP 结果；
5. console、network、overflow、键盘结果；
6. API 请求签名对比；
7. 未解决 token/共享组件缺口；
8. 与起始 dirty patch 的冲突说明；
9. 不提交、不推送，除非用户明确要求。

## 10. 质量门禁

### 10.1 如何证明业务逻辑未变

每批必须同时满足：

- 禁止路径零 diff；
- 展示组件中没有 API import/call、Hook 顺序、状态初始化、条件分支、事件回调、URL 参数和提交 payload 变化；
- 原有业务测试未删除、未跳过、未放宽；
- 相同 fixture 下，前后 URL、标题、数据值、行数、排序、分页、disabled 状态和 Dialog 流程一致；
- 相同操作下，API method、path、规范化 Body 和次数一致；
- 可见字段、Tab、模块顺序和权限表现一致；
- A 股涨跌颜色、正负号、单位、精度与 `null` 表现一致；
- 相关 Vitest 和既有 E2E 前后均通过；
- 无法证明的项标记 `SKIP`，不得写成 PASS。

### 10.2 分层验证矩阵

| 层级 | 主题矩阵 | 页面 / 状态 |
| --- | --- | --- |
| Theme / 共享组件 | 8 presets × Light/Dark | Shell、Card、Table、Form、Popover、Dialog |
| 每个页面批次 | Minimal Green × Light/Dark | 首屏、主要 Tab、关键 Dialog/Drawer |
| 默认主题兼容 | Classic Blue × Light/Dark | 每批一张代表页 smoke |
| 其他主题 | 8 presets × Light/Dark | Shell + 一张高密度表格页，不做全页组合爆炸 |
| 标准桌面 | Minimal Green，1440×900 | 正式截图与交互验收 |
| 宽桌面 | Minimal Green，1920×1080 | 只查截断与 overflow，不验内容宽度 |

截图规则：

- 旧截图用于变更地图，不能因预期视觉变化直接判失败；
- 新视觉经人工确认后，才升级为 golden；
- golden 更新与实现 diff 分开审批；实现 Agent 不得自行覆盖；
- 等待字体、Skeleton、请求和图表稳定后截图；
- 动态时间、随机 ID 和动画可做最小 mask，但不得 mask 核心业务数据；
- 外侧内容 gutter 从视觉比较中排除。

### 10.3 浏览器检查

每批检查：

- body、paper、neutral、正文、次级、disabled、divider；
- Card、Table header、Input、Popover、Dialog、Tooltip、图表轴和 tooltip；
- focus-visible、Tab 顺序、Enter/Space、Escape 关闭和焦点归还；
- `document.documentElement.scrollWidth <= clientWidth`；
- 表格、代码块和图表仅允许既有受控局部滚动；
- `console.warning/error`、`pageerror`、`requestfailed` 和非预期 4xx/5xx；
- `/api` 请求的 method、pathname、规范化 Body、状态码和次数；
- 主题菜单真实切换与 `quant-client-theme-preset` 刷新持久化；
- reduced-motion 下无新增装饰动画。

本阶段不为了视觉验收新增 axe 等依赖。对比度目标仍为正文 4.5:1、大字和 UI 边界/焦点 3:1。

### 10.4 工程验证

每个页面批次最低执行：

1. 受影响 Vitest；
2. `yarn lint`；
3. `yarn typecheck`；
4. `yarn build`；
5. 涉及 E2E 时执行 `yarn typecheck:e2e`；
6. 目标页浏览器 Light/Dark 检查；
7. console、network、overflow、键盘和请求签名对比。

整体验收执行：

- `yarn test:coverage`
- `yarn test:coverage:changed`
- `yarn lint`
- `yarn check:buttons`
- `yarn typecheck`
- `yarn typecheck:e2e`
- `yarn build`
- 全部现有 mock E2E
- 全路由首屏巡检和代表性交互回归

审计已确认 `yarn check:buttons` 存在一个既有基线问题：`knowledge-topic-article.tsx` 的普通 outlined Button 使用 `color="inherit"`。该问题必须登记为 `baseline-known`，不得由视觉 Agent 顺手修改，也不得归因于后续批次。

## 11. 风险与控制

| 风险 | 控制措施 |
| --- | --- |
| MUI 全局 override 放大全站影响 | `components.tsx` 单一负责人；先组件测试，再样板页，再全站 smoke |
| 页面继续产生局部硬编码 | 缺 token 上报全局负责人；页面 Agent 不私建色板、圆角或阴影 |
| 过早抽象导致万能组件 | 至少两个真实消费者；API 未稳定时保持局部组合 |
| 字体切换改变高密度布局 | 本轮保留 DM Sans；字体仅可独立立项 |
| 内容宽度被误纳入视觉差异 | 冻结 `DashboardContent` 和页面 `maxWidth`；截图屏蔽外侧 gutter |
| 金融颜色被通用正负语义覆盖 | 强制保留 A 股涨红跌绿，并同时保留文字/符号提示 |
| Agent 目录与现有业务开发冲突 | B10 放到 Wave D；基线记录 dirty patch；禁止覆盖并行改动 |
| 动态图表导致截图噪音 | 固定 fixture、等待稳定、只 mask 非业务动态区域 |
| 为消除基线失败而改业务或测试 | `baseline-known` 独立登记；禁止放宽、跳过或顺手修复 |
| 回滚误伤其他未提交工作 | 每批保存 allowlist、起始 patch 和独立 diff；不使用 reset 覆盖工作区 |

## 12. 评审关口与产物

### Gate A：总纲确认

当前阶段，仅交付：

- 本实施总纲；
- 逆向研究与项目资产映射；
- 全局和页面批次；
- 子 Agent 所有权；
- 业务不变量与视觉验收门禁。

Gate A 通过前不开始页面实现。

### Gate B：全局基础确认

交付：Theme/MUI/Shell/Shared 的 diff、组件状态页、8 主题 smoke、Classic/Minimal Light/Dark 截图和业务不变证明。

### Gate C：样板页确认

交付：P1–P3 正式样板，P4/P5 补充状态，以及冻结后的页面组合规则。用户确认后才启动 Wave A–D。

### Gate D：页面波次确认

每波独立交付修改清单、视觉证据、业务不变量、工程验证和遗留缺口。上一波的全局缺口冻结后再开下一波。

### Gate E：全站验收

交付：全路由巡检矩阵、Light/Dark 与主题兼容报告、console/network/overflow 结果、业务请求签名对比、已知基线问题和可回滚批次清单。

## 13. 当前阶段完成定义

本“大纲阶段”完成的定义是：

- 研究结果已按“可应用 / 谨慎应用 / 不应用”映射到当前项目；
- 内容宽度和所有业务逻辑已列为硬排除项；
- 全局资产、页面族、11 个页面批次和四个并行波次已明确；
- 单一文件所有权、Agent 中止条件和交付契约已明确；
- 样板页、验证矩阵、基线策略和回滚边界已明确；
- 仓库只新增/更新设计文档，不修改任何业务代码。

后续只有在用户确认本总纲后，才进入 R0 基线冻结和 F1 全局主题阶段。
