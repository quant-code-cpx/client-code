# 项目结构分析

## 技术栈

| 技术              | 版本     | 用途                      |
| ----------------- | -------- | ------------------------- |
| React             | 19.1.0   | 核心 UI 框架              |
| TypeScript        | 5.8.2    | 静态类型                  |
| MUI (Material UI) | 7.0.1    | UI 组件库                 |
| Emotion           | ^11.14.0 | CSS-in-JS 样式引擎        |
| React Router      | 7.4.1    | 客户端路由                |
| Vite              | 6.2.5    | 构建工具                  |
| ApexCharts        | 4.5.0    | 数据可视化图表库          |
| Iconify React     | 5.2.1    | 图标库（支持多套图标集）  |
| SimpleBar React   | 3.3.0    | 自定义滚动条              |
| dayjs             | 1.11.13  | 轻量日期处理              |
| es-toolkit        | 1.34.1   | 工具函数库（lodash 替代） |
| minimal-shared    | 1.0.7    | 项目内部共享工具库        |

**字体**：DM Sans（正文） + Barlow（标题）  
**运行环境**：Node >= 20，包管理器：yarn 1.22.22

---

## 项目架构模式

本项目采用 **分层 + 分域（feature slices）** 架构：

```
入口 → 主题/路由 → 布局 → 页面容器 → 视图 → 业务组件 → 共享组件
```

具体分层：

1. **`main.tsx`** — React 挂载点
2. **`app.tsx`** — 全局 Provider（主题 + 路由）
3. **`routes/sections.tsx`** — 路由定义（懒加载）
4. **`pages/`** — 薄壳页面（仅引入对应 view 并渲染）
5. **`sections/*/view/`** — 各功能模块的实际视图层（含状态和布局逻辑）
6. **`sections/*/`** — 功能块专属组件
7. **`components/`** — 跨功能共享 UI 组件

---

## 根目录文件

| 文件                  | 功能                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `package.json`        | 依赖声明、脚本命令（dev/build/lint/fix）                                  |
| `vite.config.ts`      | Vite 构建配置（端口 3039、路径别名 `src/`、SWC 编译、ESLint 实时检查）    |
| `tsconfig.json`       | TypeScript 主配置（严格模式、ES2020、bundler 模块解析）                   |
| `tsconfig.node.json`  | Node 环境 TS 配置（用于 vite.config.ts 等构建脚本）                       |
| `eslint.config.mjs`   | ESLint v9 平面配置（perfectionist 导入排序、react-hooks、unused-imports） |
| `prettier.config.mjs` | Prettier 格式化配置                                                       |
| `index.html`          | SPA HTML 入口，Vite 的挂载点                                              |
| `vercel.json`         | Vercel 部署配置（SPA 路由重写：所有路径回退到 `/`）                       |
| `CHANGELOG.md`        | 版本更新日志                                                              |
| `README.md`           | 项目说明文档                                                              |

---

## public/ — 静态资源

```
public/
└── assets/
    ├── background/          存放页面背景图
    ├── icons/
    │   ├── flags/           国旗图标（语言切换用）
    │   ├── glass/           玻璃质感 UI 图标
    │   ├── navbar/          导航栏 SVG 图标（侧边栏菜单项用）
    │   ├── notification/    通知相关图标
    │   └── workspaces/      工作区切换图标
    ├── illustrations/       插画素材（错误页、空状态等）
    └── images/
        ├── avatar/          用户头像图片
        ├── cover/           文章封面图片
        └── product/         商品图片
```

> **说明**：`icons/navbar/` 中的 SVG 用 `SvgColor` 组件加载，可动态改变颜色匹配主题。

---

## src/ — 源代码

### src/main.tsx — 应用入口

React 19 的根挂载点。创建 `ReactDOM.createRoot()` 并渲染 `<App />`，外层包裹 React `StrictMode`。

### src/app.tsx — 根组件

- 注入 `ThemeProvider`（全局主题）
- 挂载 `RouterProvider`（路由）
- 加载全局样式 `global.css`
- 渲染固定位置的 GitHub 快捷按钮（FAB）
- 处理页面切换时滚动回顶部

### src/config-global.ts — 全局配置

集中管理全局变量，包括：

- `CONFIG.appName`：应用名称
- `CONFIG.appVersion`：版本号
- `CONFIG.assetsDir`：静态资源基础路径（指向 `public/assets`）

### src/global.css — 全局样式

全局 CSS 重置和基线样式，由 `app.tsx` 引入。

### src/vite-env.d.ts — Vite 类型声明

为 Vite 特有的 `import.meta` 等 API 提供 TypeScript 类型。

---

### src/\_mock/ — 模拟数据

> **用途**：开发阶段替代后端接口，提供假数据。

| 文件       | 功能                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `_mock.ts` | 数据生成器函数（`_id`、`_fullName`、`_price`、`_times`、`_boolean` 等 22 个）                                      |
| `_data.ts` | 预生成的集合数据：`_myAccount`（当前账户）、`_users`（24 条用户）、`_posts`（23 篇文章）、`_products`（24 个产品） |
| `index.ts` | 统一导出以上所有数据                                                                                               |

---

### src/routes/ — 路由系统

| 文件/目录                       | 功能                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sections.tsx`                  | **路由定义核心**。所有页面使用 `lazy()` 懒加载 + `Suspense` 包裹（显示线性进度条）。定义两棵路由树：`DashboardLayout`（认证后页面）和 `AuthLayout`（登录/错误页） |
| `hooks/use-router.ts`           | 封装 React Router 的导航 hook（`push`、`back`、`forward`、`replace`）                                                                                             |
| `hooks/use-pathname.ts`         | 获取当前路径字符串的 hook                                                                                                                                         |
| `hooks/index.ts`                | hook 统一导出                                                                                                                                                     |
| `components/error-boundary.tsx` | React 类组件实现的全局错误边界，捕获渲染异常并显示降级 UI                                                                                                         |
| `components/router-link.tsx`    | 将 React Router 的 `Link` 封装为可组合到 MUI 组件（如 Button）的 `component` prop                                                                                 |
| `components/index.ts`           | 组件统一导出                                                                                                                                                      |

**当前路由结构**：

```
/ (DashboardLayout)
├── /           → dashboard.tsx  (总览仪表板)
├── /user       → user.tsx       (用户管理)
├── /products   → products.tsx   (产品列表)
└── /blog       → blog.tsx       (博客)

/ (AuthLayout)
├── /sign-in    → sign-in.tsx    (登录页)
├── /404        → page-not-found.tsx
└── /*          → page-not-found.tsx (通配符)
```

---

### src/pages/ — 页面容器（薄壳层）

每个文件只做一件事：导入并渲染对应的 `sections/*/view/` 视图组件。不包含任何业务逻辑。

| 文件                 | 渲染的视图                             |
| -------------------- | -------------------------------------- |
| `dashboard.tsx`      | `sections/overview/view/` 中的总览视图 |
| `user.tsx`           | `sections/user/view/` 中的用户管理视图 |
| `products.tsx`       | `sections/product/view/` 中的产品视图  |
| `blog.tsx`           | `sections/blog/view/` 中的博客视图     |
| `sign-in.tsx`        | `sections/auth/sign-in-view.tsx`       |
| `page-not-found.tsx` | `sections/error/not-found-view.tsx`    |

---

### src/sections/ — 功能模块（核心业务层）

每个子目录对应一个功能域，内含：

- `view/` — 该功能的主视图组件（页面级组合）
- `*.tsx` — 该功能域的子组件
- `utils.ts` — 该功能域的工具函数（如仅在 user 模块用到的表格排序逻辑）

| 目录        | 功能           | 主要文件                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/`     | 登录认证       | `sign-in-view.tsx`（登录表单、邮箱/密码输入、校验）                                                                                                                                                                                                                                                                                                                                             |
| `overview/` | 总览仪表板首页 | `analytics-widget-summary.tsx`（统计卡片）、`analytics-website-visits.tsx`（访问量折线图）、`analytics-conversion-rates.tsx`（转化率柱状图）、`analytics-current-visits.tsx`（饼图）、`analytics-current-subject.tsx`（雷达图）、`analytics-news.tsx`（最新动态列表）、`analytics-order-timeline.tsx`（时间轴）、`analytics-tasks.tsx`（任务清单）、`analytics-traffic-by-site.tsx`（流量来源） |
| `user/`     | 用户管理       | `user-table-row.tsx`（表格行）、`user-table-head.tsx`（可排序表头）、`user-table-toolbar.tsx`（搜索/过滤工具栏）、`table-empty-rows.tsx`（空行占位）、`table-no-data.tsx`（无数据状态）、`utils.ts`（排序/过滤逻辑）                                                                                                                                                                            |
| `product/`  | 产品列表       | `product-item.tsx`（产品卡片）、`product-sort.tsx`（排序选择）、`product-filters.tsx`（过滤面板）、`product-cart-widget.tsx`（购物车徽章）                                                                                                                                                                                                                                                      |
| `blog/`     | 博客           | `post-item.tsx`（文章卡片）、`post-search.tsx`（搜索框）、`post-sort.tsx`（排序选择）                                                                                                                                                                                                                                                                                                           |
| `error/`    | 错误页面       | `not-found-view.tsx`（404 页面 UI）                                                                                                                                                                                                                                                                                                                                                             |

---

### src/layouts/ — 布局系统

整个布局系统分四层：

#### nav-config-\*.tsx（导航数据配置）

| 文件                       | 功能                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `nav-config-dashboard.tsx` | 主侧边栏导航菜单配置（6 个菜单项，每项含 icon、title、path） |
| `nav-config-account.tsx`   | 顶部账户下拉菜单配置（头像菜单项列表）                       |
| `nav-config-workspace.tsx` | 工作区切换数据（多工作区展示）                               |

#### core/（基础布局原语）

| 文件                 | 功能                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `header-section.tsx` | 顶部 AppBar 封装。支持 5 个插槽（topArea/leftArea/centerArea/rightArea/bottomArea）、滚动偏移检测、sticky 定位 |
| `layout-section.tsx` | 最外层容器，注入 CSS 变量，支持响应式 `sx` props                                                               |
| `main-section.tsx`   | 内容主体区域容器，自动 flex 布局，支持垂直/水平对齐控制                                                        |
| `css-vars.ts`        | 生成和注入 CSS 变量的工具函数                                                                                  |
| `classes.ts`         | 定义布局相关的 CSS 类名常量                                                                                    |

#### components/（布局功能组件）

| 文件                        | 功能                                                     |
| --------------------------- | -------------------------------------------------------- |
| `account-popover.tsx`       | 右上角账户头像下拉菜单（显示账户信息、菜单项、退出按钮） |
| `language-popover.tsx`      | 语言切换弹出框（展示各语言国旗 + 名称）                  |
| `menu-button.tsx`           | 移动端汉堡菜单按钮（触发抽屉式导航）                     |
| `notifications-popover.tsx` | 通知铃铛下拉面板（通知列表 + 未读数徽章）                |
| `searchbar.tsx`             | 顶部搜索框（展开/收起动效）                              |
| `workspaces-popover.tsx`    | 工作区切换弹出框                                         |
| `nav-upgrade.tsx`           | 侧边栏底部升级提示卡片                                   |

#### dashboard/（仪表板布局）

| 文件          | 功能                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `layout.tsx`  | 仪表板完整布局组合（HeaderSection + NavDesktop/NavMobile + Main）。接收 `layoutQuery` prop 控制响应式断点 |
| `nav.tsx`     | 侧边栏导航实现（`NavDesktop`：桌面固定侧栏；`NavMobile`：移动端抽屉）                                     |
| `content.tsx` | 仪表板内容区包装                                                                                          |
| `css-vars.ts` | 仪表板专属 CSS 变量（如导航宽度、header 高度）                                                            |

#### auth/（认证布局）

| 文件          | 功能                                               |
| ------------- | -------------------------------------------------- |
| `layout.tsx`  | 认证页面布局（简洁居中，桌面端右侧有插画装饰面板） |
| `content.tsx` | 认证内容卡片包装                                   |

---

### src/theme/ — 主题系统

基于 MUI v7 + CSS 变量实现的完整设计系统。

| 文件/目录                 | 功能                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `theme-provider.tsx`      | 包装 MUI `ThemeProvider`，注入 `CssBaseline`，支持外部 `themeOverrides` 合并                                                              |
| `create-theme.ts`         | 主题工厂函数：组合 core/ 下所有配置 → 创建最终 MUI Theme 对象                                                                             |
| `theme-config.ts`         | 设计 token 根文件：**6 种语义调色板**（primary/secondary/info/success/warning/error）、字体族、classesPrefix（`'minimal'`）、CSS 变量参数 |
| `extend-theme-types.d.ts` | TypeScript 类型扩展（将自定义 token 合并到 MUI 类型系统）                                                                                 |
| `types.ts`                | 主题相关类型导出                                                                                                                          |
| `index.ts`                | 主题模块统一导出                                                                                                                          |

**core/ 目录**（主题各维度配置）：

| 文件                | 功能                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `palette.ts`        | 调色板创建（`createPaletteChannel`）——将 HEX 颜色转为 CSS 通道变量（用于 `varAlpha` 透明接口） |
| `typography.ts`     | 排版体系定义（h1-h6、body1-2、subtitle、caption、overline、button），使用 `pxToRem` 响应式字号 |
| `shadows.ts`        | Material 标准阴影体系（0-24 级）                                                               |
| `custom-shadows.ts` | 扩展自定义阴影（带色调的 primary/info/secondary/... 阴影）                                     |
| `components.tsx`    | 所有 MUI 组件的默认样式覆盖（defaultProps + styleOverrides）                                   |

**调色板**（每色 5 个深度级：`lighter / light / main / dark / darker`）：

| 名称      | 色调   | 主色    |
| --------- | ------ | ------- |
| primary   | 蓝色   | #1877F2 |
| secondary | 紫色   | #8E33FF |
| info      | 青色   | #00B8D9 |
| success   | 绿色   | #22C55E |
| warning   | 琥珀色 | #FFAB00 |
| error     | 红色   | #FF5630 |

---

### src/components/ — 共享 UI 组件库

每个组件目录遵循统一结构：`组件.tsx + types.ts + classes.ts + styles.tsx（可选）+ index.ts`

| 目录           | 功能                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `chart/`       | ApexCharts 封装。`chart.tsx` 为图表容器，`use-chart.ts` 提供 hook（预设：禁用工具栏/缩放、主题配色、动画），`components/` 内含具体图表类型组件 |
| `color-utils/` | 颜色工具组件。`color-picker.tsx`（颜色选择器）、`color-preview.tsx`（颜色小圆点预览）                                                          |
| `iconify/`     | Iconify 图标集成。`iconify.tsx` 为通用 Icon 组件，`register-icons.ts` 注册自定义/第三方图标集，`icon-sets.ts` 定义可用图标集                   |
| `label/`       | 徽签/标签组件（类似 Chip 但更语义化）。支持 `filled`/`outlined` 变体，集成 6 种语义颜色                                                        |
| `logo/`        | 品牌 Logo 组件（SVG inline），可响应主题颜色                                                                                                   |
| `scrollbar/`   | SimpleBar 滚动条包装，提供跨浏览器一致的自定义滚动条样式                                                                                       |
| `svg-color/`   | SVG 动态着色组件——通过 CSS `mask` 技术把 SVG 图标染成指定颜色（用于导航栏图标）                                                                |

---

### src/utils/ — 工具函数

| 文件               | 功能                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format-time.ts`   | 时间格式化工具（基于 dayjs）：`fDate`、`fDateTime`、`fTime`、`fToNow`（相对时间，如"3 分钟前"）                                                       |
| `format-number.ts` | 数字格式化工具：`fNumber`（千位分隔）、`fCurrency`（货币）、`fPercent`（百分比）、`fShortenNumber`（缩写，如"1.2M"）、`fData`（文件大小，如"1.2 MB"） |

---

## 数据流

```
src/_mock/ (模拟数据)
    ↓ import
sections/*/view/*.tsx (视图层，持有状态 useState/useCallback)
    ↓ props
sections/*/*.tsx (展示组件，接收 props 渲染)
    ↓ 调用
components/* (基础 UI 组件，无业务逻辑)
```

---

## 开发命令

```bash
yarn dev        # 启动开发服务器（端口 3039）
yarn build      # 生产构建（tsc 类型检查 + vite build）
yarn start      # 预览生产构建
yarn lint       # ESLint 检查
yarn lint:fix   # ESLint 自动修复
yarn fix:all    # Prettier + ESLint 一键格式化修复
```

---

## 部署

- 平台：**Vercel**
- 策略：SPA 路由回写（`vercel.json`：所有路径重写至 `/`，由前端路由接管）
- 构建命令：`yarn build`，输出目录：`dist/`
