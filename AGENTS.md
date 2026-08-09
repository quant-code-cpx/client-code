# AGENTS.md

## 仓库定位

本仓库是量化研究桌面前端：React 19、TypeScript、MUI 7、Vite 6、React Router、ApexCharts、
KLineCharts、Vitest、Testing Library、MSW 和 Playwright。

本文件只保存全仓始终生效的规则。详细实现、设计和 QA 流程放在 `.agents/skills/`，按任务加载。

## Skill 路由

| 场景                                     | 使用 skill                                 |
| ---------------------------------------- | ------------------------------------------ |
| 常规 React/TypeScript 实现、审查、重构   | `quant-client`                             |
| 新页面、重设计、信息架构或前端技术方案   | `design-blueprint`                         |
| MUI、主题、视觉、图表、桌面交互、视觉 QA | `quant-ui-design`                          |
| 页面测试、联调、冒烟、回归、缺陷诊断     | `frontend-qa`                              |
| MUI API 与 `sx` 模式                     | 可用的 `mui` skill                         |
| React 性能与包体优化                     | 可用的 `vercel-react-best-practices` skill |

显式命名的 skill 必须完整读取；隐式触发时只加载覆盖任务的最小集合。

## 架构边界

- `src/pages/` 只放路由薄壳；业务 JSX、状态和数据编排放在 `src/sections/<feature>/`。
- 页面主视图放在 `src/sections/<feature>/view/`；页面私有组件、Hook、类型和纯函数留在功能目录。
- 只有跨功能复用的 UI 才进入 `src/components/`；共享 Hook、工具、上下文分别进入现有对应目录。
- API 契约和调用集中在 `src/api/`；禁止组件直接拼接请求、读取数据库或调用第三方行情源。
- 路由继续使用 `src/routes/sections.tsx` 的懒加载模式；导航配置修改同步处理权限和旧路由兼容。
- 测试放在最近功能目录的 `__tests__/`；共享测试设施放在 `src/test/`，E2E 放在 `e2e/`。

## API 与数据契约

- 业务 API 统一使用 `apiClient.post()`；查询与资源 ID 放在 Body，禁止新建 GET/query-string/path-ID 调用。
- `src/api/client.ts` 的非 POST 方法只作为底层兼容能力，不代表业务模块可以使用。
- `trade_date` 始终为 `YYYYMMDD` 八位字符串；展示日期先格式化，禁止直接渲染 ISO/Date/整数日期。
- 后端 `null` 保持 `null`，类型显式标注并在渲染、排序和计算时处理；禁止默认转为 `0`。
- 修改 Agent/News 契约时运行对应生成与漂移检查；生成文件通过脚本更新，不手工编辑。
- 不猜测未冻结端点或字段；先查相邻后端 `../server-code` 的 Controller、DTO、Swagger 与真实返回。

## React、MUI 与图表

- MUI 使用子路径导入，如 `@mui/material/Box`；禁止 `@mui/material` barrel import。
- 颜色、间距、圆角、阴影和字体来自 `src/theme/`、MUI theme 或既有共享组件；禁止散落硬编码设计常量。
- A 股语义为涨红跌绿；颜色必须同时配合正负号、箭头或文字，不能只靠颜色表达。
- ApexCharts 用于常规分析图，KLineCharts 用于 K 线、指标和 overlay；优先复用现有封装。
- 远程数据必须具有 loading、empty、error/retry、stale/partial（适用时）状态。
- 产品仅面向 PC 桌面浏览器，默认视觉验收视口 `1440×900`。除非用户明确扩大范围，不新增移动、平板、
  触控或窄屏专用设计；桌面端仍需键盘、ARIA、焦点可见、对比度和 reduced-motion。

## 测试与文档

- 测试从业务规则独立推导，不把当前实现、现有 mock 或现有测试当作正确答案。
- 修改行为、API、Hook、组件状态或纯函数时同步更新测试，覆盖正常、边界、错误和关键交互。
- QA/诊断请求默认只报告根因；只有用户明确要求修复或任务本身包含实现时才改代码并回归。
- `docs/` 除 `README.md` 外使用中文文件名与中文内容；新增、删除或改变状态时同步更新 `docs/README.md`。
- 更新已实现范围时同步维护 `docs/前端功能缺口盘点.md` 与 `docs/已有功能汇总.md` 中受影响条目。

## 验证门禁

按影响面执行，先目标范围再扩展：

| 改动                 | 最低验证                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| TypeScript/React     | 相关 Vitest、`yarn lint`、`yarn typecheck`、`yarn build`                 |
| API 契约             | 相关 API 测试、对应 `api:*:check`、`yarn typecheck`、`yarn build`        |
| UI/交互              | 相关组件测试、构建、桌面浏览器操作、console/network、`1440×900` 视觉检查 |
| 路由/E2E             | 路由测试、`yarn typecheck:e2e`、目标 Playwright 用例                     |
| 纯 AGENTS/skill 文档 | skill 校验、路径/链接检查、Git diff 审阅                                 |

不要对全仓执行会写文件的 lint/format 修复来掩盖局部问题；无法运行的检查必须说明技术原因。
