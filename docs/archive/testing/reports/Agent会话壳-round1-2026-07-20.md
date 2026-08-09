# Agent 会话壳测试报告 — Round 1（2026-07-20）

## 测试范围

Batch 016 的 feature flag、受保护路由、会话列表/深链、规范化 reducer、乐观消息、Run 发送/流/恢复/停止/重新生成、草稿、Composer、虚拟列表、Socket 失效入口和响应式工作台。

## 自动化结果

| 门禁 | 结果 |
| --- | --- |
| Agent reducer/hooks/components | 24/24 通过 |
| Agent + route + Socket + MSW + Auth 定向回归 | 86/86 通过 |
| Agent Playwright（确定性 Auth/API/SSE） | 2/2 通过 |
| Agent OpenAPI 漂移检查 | 通过 |
| ESLint 全量检查 | 退出码 0，无输出 |
| TypeScript + Vite production build | 通过，`✓ built in 6.96s` |
| 全量 Vitest | 489/491 通过；2 项为既有测试债 |

## 关键场景

- 乐观用户消息按服务端 ID 原位替换，无重复。
- 旧请求 generation、旧连接和重复/缺口 sequence 被拒绝。
- 终态不会被迟到取消响应回退；取消请求后禁用重复停止。
- 页面卸载只中止 reader，不调用取消 API。
- 深链未加载完成时不以错误模型策略抢先发送。
- IME、Enter/Shift+Enter、空白、10,000 字、草稿恢复与用户隔离通过。
- 200 条消息交给 `react-virtuoso`；离底时 `followOutput=false`。
- 服务端 HTML 片段按 React 纯文本转义，不生成 DOM。
- feature flag 关闭时 route/nav 都不暴露 Agent。

## 浏览器验收

- 桌面：会话侧栏、消息正文、模型偏好与 Composer 无重叠或横向溢出。
- `390×844`：桌面侧栏隐藏，会话入口打开 Drawer；主区宽度 390px、`scrollWidth=390`。
- 移动 Drawer 正常锁定背景滚动，搜索框可聚焦，关闭后回到工作台。
- 浏览器 console 无 error/warn。

## 本轮修复

1. 终态 `finalMessageId` 与占位 ID 不同时，原位迁移助手消息，避免 Run 完成但消息停在 `PENDING`。
2. 统一 Agent 深链 `useParams` 的 Router 包来源，修复测试与页面参数丢失。
3. 修正旧 SyncNotification 测试缺失 Socket 状态 mock，清除 28 个历史失败。
4. 修正 Agent MSW 消息分页字段 `nextCursor` 为 `nextBeforeMessageId`，并补 2 条消息 fixture。
5. 独立 Agent E2E 端口，避免复用未开启 feature flag 的现有 dev server。

## 既有测试债

- `src/sections/auth/__tests__/sign-in-view.test.tsx` 仍用空 aria name 查询密码可见按钮；实现已有“显示密码”名称。
- `src/sections/tushare-sync/__tests__/sync-plan-tab.test.tsx` 依赖 jsdom 计算 Emotion 高度，返回空字符串。

两项均与 Batch 016 无关，本批未修改对应业务实现。
