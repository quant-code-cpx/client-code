# 前端验证矩阵

先运行目标范围，再运行全仓门禁。避免无关 `lint:fix` 或 format 写入。

## 常规代码

- 相关测试：`yarn test <test-file-or-pattern>`
- Lint：`yarn lint`
- 类型：`yarn typecheck`
- 构建：`yarn build`

## 契约

- Agent：`yarn api:agent:check`、`yarn test:agent-contracts`
- News：`yarn api:news:check`、相关 News API 测试
- API client：`yarn test src/api/__tests__/client.test.ts`

## UI 与路由

- 相关 Testing Library/Vitest。
- 在真实桌面浏览器执行核心交互，检查 console、network、请求 Body、响应和视觉状态。
- 默认 `1440×900` 截图；检查页面级 overflow、焦点、loading、empty、error/retry 和暗/亮主题（受影响时）。

## E2E

- 类型：`yarn typecheck:e2e`
- 目标用例：`yarn e2e <spec>` 或仓库已有 smoke 脚本。
- 需要真实后端时，记录后端版本、账号/fixture、服务状态和是否使用 mock。

## Agent 配置与文档

- skill：`skill-creator/scripts/quick_validate.py <skill-dir>`
- 检查 `agents/openai.yaml`、相对链接、路径和 frontmatter。
- 运行 `git diff --check` 并审阅完整 diff。
