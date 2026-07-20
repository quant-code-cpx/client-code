# Agent 流客户端与公共契约测试方案

> 批次：Batch 015  
> 日期：2026-07-20  
> 状态：✅ 已完成

## 1. 测试目标

验证前端 Agent 基础通信层可直接供后续聊天壳使用：OpenAPI 类型有真实 Agent 路径、普通 JSON API 保持兼容、POST-SSE 能在鉴权过期、任意字节分片、断线、重复、乱序、心跳超时和用户取消场景下安全恢复。

## 2. 业务理解

1. **解决的问题**：聊天运行可能持续数分钟；刷新、短暂断网和 Token 过期不能丢进度或重复执行业务动作。
2. **核心能力**：单一公共契约生成链、JSON/SSE 共用鉴权刷新锁、按最后连续事件恢复流。
3. **数据流**：OpenAPI → 生成 endpoint 类型；`authenticatedFetch` → JSON facade 或 POST-SSE；SSE 字节流 → frame parser → runtime contract parser → 连续事件回调。
4. **主要边界**：UTF-8 跨 chunk、CRLF、多行 data、heartbeat、无终态 EOF、401、429/5xx、sequence gap、重复事件、错误媒体类型、超大 frame、Abort。
5. **联动规则**：仅连续事件更新游标；gap 后从最后连续 `eventId/sequence` 重连；终态立即关闭；用户 Abort 不重连；旧连接代次事件不进入新连接。

## 3. 规范源

- 服务端 Batch 015 任务文档。
- Agent REST、SSE、错误码公共协议。
- 服务端最新 Swagger 中 `/agent/**` 路径及其递归引用 schema。
- `src/types/agent/generated.ts` 的 runtime parser 与固定事件 fixture。

禁止手写第二套 DTO，禁止以空 `paths` 或 `unknown` 类型作为契约生成成功。

## 4. 测试层次

- 契约生成：Agent-only artifact、稳定输出、漂移检查不改工作区。
- 单元测试：纯 SSE parser、错误适配器、JSON facade。
- 协议测试：POST-SSE、游标、去重、连续性、心跳、重连、401 单飞、Abort。
- 回归测试：现有 API client 测试、全量 Vitest、ESLint、TypeScript、Vite production build。
- 真实联调：Bearer 鉴权连接 Batch 014 SSE，核对 raw media type、事件顺序、终态和连接释放。

## 5. 测试用例矩阵

| 编号 | 分类 | 场景 | 期望结果 | 优先级 |
| --- | --- | --- | --- | --- |
| AGC-001 | 契约生成 | 最新 Swagger 含 Agent 路径 | artifact 只保留 `/agent/**`；生成 `paths` 非空 | P0 |
| AGC-002 | 契约生成 | 连续生成两次 | 输出字节一致，第二次无漂移 | P0 |
| AGC-003 | 契约生成 | 修改输入后执行 check | 明确失败，且不修改生成文件或 artifact | P0 |
| AGC-004 | 类型约束 | JSON facade 请求/响应 | 11 个已发布端点由 OpenAPI 推导具体类型 | P0 |
| AGC-005 | JSON 兼容 | 旧业务 `apiClient` | wrapper、错误消息、signal 行为无回归 | P0 |
| AGC-006 | 鉴权 | 两个 JSON 请求同时 401 | 只发送一次 refresh，各自仅重放一次 | P0 |
| AGC-007 | 鉴权 | JSON 与 SSE 同时 401 | 共用一次 refresh；新 Token 仅进 Authorization header | P0 |
| AGC-008 | Parser | 每个字节边界切分中文事件 | 所有切分得到同一 frame | P0 |
| AGC-009 | Parser | CRLF 跨 chunk、注释、多行/空 data | 按 SSE 规范解析；heartbeat 不产业务 frame | P0 |
| AGC-010 | Parser | EOF 无空行 | 有 data 的最终 frame 正常产出 | P1 |
| AGC-011 | Parser | 超大 frame、无效 retry、NUL id | fail-closed 或忽略无效字段，无无限缓冲 | P0 |
| AGC-012 | 流连接 | POST body/header/media type | Body 含 `runId/afterSequence`；游标用 `Last-Event-ID` | P0 |
| AGC-013 | 流连接 | frame id 与 payload eventId 不同 | 协议错误，禁止推进游标 | P0 |
| AGC-014 | 顺序 | 重复或倒退 sequence | 忽略，不重复触发业务回调 | P0 |
| AGC-015 | 顺序 | sequence 出现 gap | 断开，从最后连续 eventId/sequence 恢复 | P0 |
| AGC-016 | 恢复 | EOF 未见终态 | 视为可恢复网络中断，有限退避重连 | P0 |
| AGC-017 | 心跳 | 慢流持续 heartbeat | 不触发 stale；heartbeat 不占 sequence | P0 |
| AGC-018 | 心跳 | 超窗无字节活动 | 取消旧 reader，进入恢复预算 | P0 |
| AGC-019 | 取消 | 路由卸载/用户 Abort | 立即释放 reader/timer，不自动重连 | P0 |
| AGC-020 | 终态 | completed/failed/cancelled | 回调一次、关闭流、返回对应结果 | P0 |
| AGC-021 | 错误 | 200 非 SSE、无 body、畸形 JSON/schema | 安全协议错误，不暴露正文或 Token | P0 |
| AGC-022 | 恢复预算 | 连续网络失败超过上限 | 抛 `RETRY_EXHAUSTED`，无残留 timer/request | P1 |
| AGC-023 | 代次 | 旧连接迟到数据 | generation 不匹配时丢弃，不污染新游标 | P0 |
| AGC-024 | 真实联调 | 历史 replay + live tail | sequence 连续，终态结束，active connection 回零 | P0 |

## 6. 通过标准

- `agent-api.ts` 包含真实 Agent endpoint 与 DTO 类型，不得为 `Record<string, never>`。
- 定向测试、全量测试、Agent 契约检查、ESLint、TypeScript 与生产构建全部通过。
- 真实 SSE 联调事件连续，`id === eventId`，断点恢复不重复业务动作。
- 工作区无生成漂移；不把 Token、完整问题/回答或 Tool payload 写入日志与错误。

## 7. 缺陷记录规则

- 前端代码缺陷：本批修复并补回归测试。
- 后端契约/数据缺陷：记录到 `docs/testing/已知问题待办.md`，不得在前端兼容错误字段。
- 每项缺陷记录严重度、根因、正确业务行为、修复文件与回归结果。
