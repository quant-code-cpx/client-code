# Agent 流客户端与公共契约测试报告 — Round 1（2026-07-20）

## 1. 结论

Batch 015 核心范围通过。Agent-only OpenAPI、具体 endpoint 类型、JSON/SSE 共用鉴权、纯字节 parser、POST-SSE 恢复客户端、MSW fixture、CI 漂移门禁、ESLint、TypeScript、production build 和真实后端联调均已完成。

## 2. 测试结果

| 项目 | 结果 |
| --- | --- |
| Agent API 漂移检查 | ✅ artifact 与最新后端 Swagger 两种输入均通过 |
| Agent-only OpenAPI | ✅ 11 条 `/agent/**` 路径，1551 行，无全仓无关路径 |
| 生成 TypeScript | ✅ 797 行，`paths` 与 DTO 为具体类型 |
| Batch 015 定向测试 | ✅ 5 文件，64/64 |
| 公共 Agent 契约测试 | ✅ 7/7 |
| 前端 ESLint | ✅ 退出码 0，无输出 |
| 前端 TypeScript / production build | ✅ `tsc && vite build`，2628 modules transformed |
| 后端 Agent 回归 | ✅ 171/171；4 个 DB integration suite 按开关跳过 |
| 后端定向 Controller/stream/interceptor | ✅ 43/43 |
| 后端 legacy ESLint / build | ✅ 通过；仅 ESLint v9 配置弃用提示 |
| 真实新 Run SSE | ✅ sequence 1–18 连续，终态 `agent.completed`，0 次重连 |
| 真实 Last-Event-ID 恢复 | ✅ checkpoint 17，仅补 sequence 18 |
| SSE 连接释放 | ✅ `agent_sse_active_connections = 0` |
| 前端全量 Vitest | ⚠️ 433/463；30 个失败均在干净 HEAD 复现，非本批引入 |

## 3. 已修缺陷

| ID | 严重度 | 问题 | 修复 |
| --- | --- | --- | --- |
| AGC-20260720-001 | P0 | 旧全仓 Swagger 无任何 Agent 路径，生成文件退化为 `Record<string, never>` | 生成器拒绝空 Agent 输入，提交稳定 Agent-only artifact |
| AGC-20260720-002 | P0 | DTO 默认值字段导出为空对象类型 | 后端补显式 `number/boolean` 类型元数据 |
| AGC-20260720-003 | P0 | 通用 `ResponseModel.data` 与具体 DTO 交叉成不可能类型 | 基础 Swagger 隐藏泛型 data，由响应装饰器声明具体 schema |
| AGC-20260720-004 | P0 | 晚到 401 在其他请求已刷新后仍再次 refresh | 比较请求 Token 与当前 Token，复用已轮换凭据 |
| AGC-20260720-005 | P1 | 并发 refresh 失败重复 logout 与 `onUnauthorized` | 会话失效幂等化 |
| AGC-20260720-006 | P0 | Agent JSON 成功响应为 `null` 或缺 data 时未 fail-closed | 强制 canonical object envelope、数字 code 与 data 字段 |
| AGC-20260720-007 | P0 | SSE 缺 id/event 或 id 与 payload eventId 不同仍推进游标 | 严格校验 `id === eventId`、`event === type` |
| AGC-20260720-008 | P1 | runtime parser 允许的未知顶层字段进入业务回调 | adapter 重建白名单事件对象 |
| AGC-20260720-009 | P0 | 仅提供 Last-Event-ID 时首个恢复事件被误判为 gap | 首个权威恢复事件建立 sequence 基线，并种入初始 eventId 去重集 |
| AGC-20260720-010 | P0 | 终态或解析错误后 reader 未 cancel，可能残留连接 | generator 在非 EOF 退出时取消底层 reader |
| AGC-20260720-011 | P1 | frame 上限按 UTF-16 字符数计算，中文可绕过字节限制 | 改为 UTF-8 byte length，覆盖 CRLF 与跨 chunk |

## 4. 关键用例覆盖

- 每个字节边界切分、中文、CRLF、注释、多行/空 data、EOF、超大 frame。
- POST body、Bearer header、媒体类型、401 单飞、晚到 401、并发失效。
- 重复/倒退 sequence、gap、EOF 未终态、server retry hint、有限退避。
- heartbeat 保活、stale timeout、用户 Abort、backoff Abort、终态 reader 释放。
- `completed/failed/cancelled` 三种终态、未知 schema、错误 id/event、未知字段剥离。
- MSW canonical status、持久 eventId、Last-Event-ID 优先。

## 5. 全量测试基线问题

以下失败在独立 detached HEAD `0cbe1e7` 上原样复现，已登记到已知问题待办：

- `sync-notification-context.test.tsx`：Socket mock 缺 `getSocketStatus`，28 个用例失败。
- `sign-in-view.test.tsx`：仍按空 accessible name 查找密码按钮，1 个用例失败。
- `sync-plan-tab.test.tsx`：依赖 jsdom `getComputedStyle(...).height` 解析 Emotion CSS，1 个用例失败。

## 6. 运行注意事项

- 本地生成最新契约前先运行后端 `swagger:generate`；`api:agent:check` 默认只校验已提交 Agent-only artifact。
- Node 必须 ≥20；本轮使用 Node 24 工作区运行时。系统默认 Yarn 绑定 Node 18 时会被 engines 拒绝。
- 本批没有 UI、MUI 或视觉改动，因此不执行 Web Interface Guidelines 视觉审查。
