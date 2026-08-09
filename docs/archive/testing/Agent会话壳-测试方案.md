# Agent 会话壳测试方案

## 测试目标

验证 Batch 016 在会话切换、网络恢复、输入法和取消竞态下不丢消息、不重复消息、不串会话。测试以公共 Agent 契约和业务期望为准，不以当前实现输出作为真相。

## 业务数据流

1. 用户进入新建态或指定深链。
2. 前端加载会话列表；深链并行加载会话详情和消息快照。
3. 提交时插入乐观用户消息；新建态先创建会话。
4. `sendMessage` 返回服务端消息 ID 与 Run ID，原位确认乐观消息并创建助手占位。
5. POST-SSE 按 sequence 更新助手文本和 Run 投影；终态后拉权威快照。
6. 页面切换只断开 reader；显式停止才发送取消命令。

## 用例矩阵

| 编号 | 分类 | 场景 | 期望 | 优先级 |
| --- | --- | --- | --- | --- |
| AG-001 | 路由 | feature flag 关闭 | route 与 nav 均不暴露 Agent | P0 |
| AG-002 | 路由 | 未登录访问 `/agent` | 由 AuthGuard 跳转登录 | P0 |
| AG-003 | 深链 | 刷新 `/agent/:id` | 指定会话与消息恢复，不先跳其他会话 | P0 |
| AG-004 | 深链 | 会话不存在或无权限 | 展示明确错误态，不泄露资源是否存在 | P0 |
| AG-005 | 发送 | 首次发送 | 创建会话、更新 URL、发送一次消息 | P0 |
| AG-006 | 发送 | 服务端确认乐观消息 | 本地消息原位换为服务端 ID，无重复 | P0 |
| AG-007 | 并发 | 双击发送 | 只创建一个请求和一个 Run | P0 |
| AG-008 | 切换 | A 加载中快速切 B | A 的迟到响应不覆盖 B | P0 |
| AG-009 | 流 | 重复/倒序事件 | sequence/generation 拒绝旧事件，正文不重复 | P0 |
| AG-010 | 流 | `model.delta` 连续到达 | 按顺序追加到对应助手消息 | P0 |
| AG-011 | 流 | 页面切换 | reader 中止，服务端 Run 不取消 | P0 |
| AG-012 | 恢复 | 刷新时 Run 仍运行 | 查状态后从权威 sequence 恢复 | P0 |
| AG-013 | 恢复 | 自动重试耗尽 | 保留部分回答并提供继续接收 | P1 |
| AG-014 | 取消 | 取消被接受 | 显示正在停止，终态事件后显示已取消 | P0 |
| AG-015 | 取消 | 取消前已完成 | 使用服务端完成态，不覆盖为取消 | P0 |
| AG-016 | 取消 | 取消请求结果未知 | 查询 Run 状态，不假定取消成功 | P0 |
| AG-017 | 重生成 | 对失败/完成回答重新生成 | 新建 assistant version/Run，旧回答保留 | P1 |
| AG-018 | 输入 | 中文 IME 回车选词 | 不误发送 | P0 |
| AG-019 | 输入 | Enter / Shift+Enter | Enter 发送；Shift+Enter 换行 | P0 |
| AG-020 | 输入 | 空白与超长文本 | 空白禁发；超过 10,000 字显示原地错误 | P0 |
| AG-021 | 草稿 | 刷新、会话切换 | 按用户与会话恢复，各作用域不串值 | P0 |
| AG-022 | 草稿 | 退出登录 | Agent 草稿全部清理 | P0 |
| AG-023 | 列表 | 长消息历史 | 使用虚拟化，列表布局稳定 | P1 |
| AG-024 | 滚动 | 用户离开底部时继续流 | 不强制滚动，显示回到最新 | P1 |
| AG-025 | 无障碍 | 键盘与读屏 | 控件有名称；阶段节流播报，不逐 token 播报 | P1 |
| AG-026 | 响应式 | 窄屏打开会话列表 | Drawer 可操作，关闭后焦点返回 | P1 |

## 自动化分层

- reducer：快照、乐观替换、generation/sequence、终态与取消竞态。
- 组件：Composer IME/快捷键/边界；AgentView 空态/错误态；MessageViewport 自动跟随。
- 路由：flag 开关、AuthGuard、`/agent/:conversationId`。
- Playwright：进入 Agent、发送、看到流文本、停止、刷新恢复；使用确定性 API/SSE fixture。

## 回归门禁

```bash
node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"
node_modules/.bin/eslint "src/**/*.{ts,tsx}"
yarn test src/sections/agent/__tests__ src/routes/__tests__/routes.test.tsx
yarn api:agent:check
yarn build
```

浏览器联调覆盖桌面与移动断点，检查 console、网络请求 body、非空画面、滚动与文本不重叠。
