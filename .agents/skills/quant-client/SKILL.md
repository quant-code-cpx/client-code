---
name: quant-client
description: 当前量化研究 React/MUI 前端的通用实现、审查与重构工作流。用于页面、组件、Hook、API client、路由、权限、图表、状态、测试和文档改动；视觉设计或浏览器 QA 应叠加对应专项 skill。
---

# Quant Client

保持路由薄壳、功能内聚、契约准确、主题统一和真实验证。

## 加载导航

先读根 `AGENTS.md`，再按任务读取：

- 定位目录与修改顺序：`references/repository-map.md`
- API、日期、空值和生成契约：`references/api-contracts.md`
- 测试设计：`references/testing.md`
- 验证命令：`references/validation.md`

新页面/重设计使用 `$design-blueprint`；视觉实现使用 `$quant-ui-design`；测试与联调使用 `$frontend-qa`。

## 工作流

1. 检查 Git 状态、目标设计文档、路由、页面薄壳、主 View、API、类型和测试。
2. 从用户任务和后端契约推导正确行为；不凭组件名称或现有渲染猜业务。
3. 明确状态所有权：服务端数据、URL 可分享状态、页面交互状态、图表高频状态和认证状态。
4. 在 `src/api/` 定义契约与调用，在 `src/sections/<feature>/` 实现业务，在 `src/pages/` 保持薄壳。
5. 优先复用主题、共享组件、格式化工具、权限和图表封装；避免新建重复抽象。
6. 同步维护测试，覆盖 loading、empty、error/retry、边界数据和核心交互。
7. 按 `references/validation.md` 先运行相关测试，再运行 lint、typecheck、build；UI 改动做真实桌面浏览器检查。
8. 审阅 diff，检查硬编码颜色、错误金融语义、原始日期、未保护 `null`、错误 HTTP method 和无关格式化。
9. 更新相关文档索引与功能盘点，准确报告验证证据和未验证项。

## 实现原则

- 组件拆分依据业务职责、独立状态/副作用、复用、昂贵渲染或可测试契约，不按行数机械拆分。
- 禁止在组件内部定义 React 组件；避免无必要 Effect、派生状态回写和宽泛 Context。
- API 调用、复杂派生和副作用不要混入大块 JSX；提取到功能 Hook、纯函数或 API 层。
- MUI 使用子路径导入；类型使用 `import type`；代码风格以当前 ESLint/Prettier 配置为真相源。
- `fontSize` 不低于 12px；金融数字统一单位、精度、符号、日期和 `null` 占位。
- 只实现 PC 桌面范围；不得因历史 responsive 代码扩大本次任务范围。

## 完成标准

- 页面结构、API 契约、状态与金融口径一致。
- 正常、空、错、权限和关键交互状态可验证。
- 测试、lint、typecheck、build 与必要浏览器检查有真实证据。
- 文档和实现状态同步，无生成文件漂移、调试残留或未说明风险。
