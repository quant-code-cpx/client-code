# AI 研究工作台 MUI X 重构测试报告 — Round 2（2026-08-04）

## 测试范围

- `/agent`、`/agent/:conversationId` 的 MUI X Chat UI 重构。
- 会话选择/搜索、消息展示/历史分页、Composer、引用/证据、响应式与异常态。
- 原有 Agent API、POST-SSE、工具调用、取消和恢复流程只做回归，不改变业务实现。

## 业务理解

1. 页面解决研究员在同一工作区连续提问、跟踪执行、核对工具与数据来源的需求。
2. 最依赖的 3 件事：稳定发送并接收流式结果；快速切换历史研究；核验引用与数据口径。
3. 数据流：Agent JSON 接口加载会话/消息 → `AgentProvider` 归一化 → 受控 mapper 投影到 MUI X Chat；发送后由原有 POST-SSE 更新 Agent 状态，再单向刷新 UI 投影。
4. 重点边界：空态、无权访问、10,001 字、中文 IME、长消息/长会话、离底流式、历史前插、工具或模型失败、切换会话与移动端 Drawer。
5. 联动：搜索只过滤 UI 会话投影；选择会话更新路由并加载对应详情；证据跟随最新含引用的 Assistant；模型、停止、重新生成仍调用原回调。

## 接口清单

| 场景 | 接口 | 方法/关键入参 | 前端用途 |
| --- | --- | --- | --- |
| 会话列表 | `/api/agent/conversations/list` | POST；cursor、limit=30 | MUI X 会话列表投影 |
| 会话详情 | `/api/agent/conversations/detail` | POST；conversationId | 标题、模型和权限 |
| 消息历史 | `/api/agent/conversations/messages/list` | POST；conversationId、beforeMessageId、limit=50 | MUI X 消息列表投影/前插 |
| 新建会话 | `/api/agent/conversations/create` | POST；clientRequestId、title、modelPolicy | 首次发送前建会话 |
| 发送消息 | `/api/agent/messages/send` | POST；conversationId、content、allowedCapabilities | 原有 run 启动入口 |
| Run 事件 | `/api/agent/runs/events` | POST-SSE；runId、afterSequence | 流式状态与正文 |
| Run 状态/取消 | `/api/agent/runs/status`、`/runs/cancel` | POST；runId/statusVersion | 恢复与停止 |
| 工具记录 | `/api/agent/runs/tool-calls/list` | POST；runId | 执行轨迹 |

## 测试用例矩阵

| 编号 | 分类 | 场景描述 | 前置条件 | 操作步骤 | 期望结果 | 优先级 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ARX-001 | 首屏加载 | 登录态正常渲染 | 后端可用、有会话 | 打开 `/agent` | 主区、Composer 可见，无 console error | P0 | PASS |
| ARX-002 | 依赖真实性 | MUI X 运行时节点存在 | 同上 | 检查 DOM | 出现 ConversationList、MessageList、Composer、Sources 的 `.MuiChat*` class | P0 | PASS |
| ARX-003 | 会话交互 | 搜索并切换会话 | 至少 2 个会话 | 输入关键词、选择结果 | listbox 过滤正确，URL 与消息切换，无串话 | P0 | PASS |
| ARX-004 | 发送/流式 | 发送真实研究问题 | 模型可用 | 输入股票问题并发送 | create/send/SSE 均成功，正文流式展示 | P0 | PASS |
| ARX-005 | 工具与证据 | 模型调用股票工具 | Tool 可用 | 查询 600519.SH 概览 | 工具调用完成，引用与 provenance 一致 | P0 | PASS |
| ARX-006 | Composer | 中文 IME、Enter/Shift+Enter | Composer 可编辑 | 模拟组合输入与换行 | 组合阶段不误发；Enter 发送；Shift+Enter 换行 | P0 | 单测 PASS |
| ARX-007 | 边界 | 空白与 10,001 字 | Composer 可编辑 | 分别提交空白、超长内容 | 禁止发送，超长原地提示 | P0 | 单测 PASS |
| ARX-008 | 历史/长会话 | 前插历史与 50+ 条消息 | 有分页历史 | 滚动顶部加载 | 触发原 loadOlder，锚点稳定；长列表启用 content-visibility | P1 | 组件回归 PASS；真实 50+ 数据未执行 |
| ARX-009 | 异常态 | 无权/不存在会话 | 无权限 ID | 深链访问 | 明确错误，不回退其他会话，不显示 Composer | P0 | 单测 PASS |
| ARX-010 | 响应式 | 375/1024/1440/1920 布局 | 页面有消息与引用 | 调整 viewport | Drawer/栏宽/正文/Composer 无页面级横滚 | P1 | PASS |
| ARX-011 | 可访问性 | listbox、option、article、表单 | 页面已加载 | 键盘浏览与 DOM 检查 | roving focus 语义、label、focus-visible 可用 | P1 | 组件测试 PASS |
| ARX-012 | 回归 | 停止、切换后恢复 | 运行中 Run | 停止；另起 Run 后切换返回 | cancel/status/续接保持原行为 | P0 | PASS（Round 1 真实联调 + 本轮状态渲染回归） |

## 发现并修复的问题

1. MUI X Chat 运行时依赖 `@mui/icons-material`，初次构建缺包；已精确锁定 `7.3.10`。
2. 375px 下模型按钮挤压标题；已隐藏桌面触发器，并收纳到“更多”菜单。
3. 1440px 下全局导航 + 会话栏 + 固定证据栏导致正文过窄；固定证据栏断点上调至 1720px，1440px 改用 Drawer。
4. 开发服务残留旧 TypeScript overlay；重启 Vite 后检查器报告 0 error，确认不是当前源码错误。

## 回归结果

- 真实链路：`conversations/create`、`messages/send`、`runs/events`、消息回填和 run status 均返回 200；SSE MIME 为 `text/event-stream`。
- 真实 Tool：`get_stock_overview(600519.SH)` 完成，返回“贵州茅台 / 2026-08-04”，页面展示 2 条引用与数据口径，无失败/停止状态。
- 运行时组件：ConversationList 1、MessageList 1、Composer 1、Sources 1；测试会话 10 条消息对应 10 个 `.MuiChatMessage-root`。
- 响应式：375、1024、1440、1920 均无页面级横向滚动；1920 下会话栏 256px、证据栏 312px、Composer 880px。
- 控制台：最终 warn/error 为 0。
- 自动化：18 个测试文件、84 个用例全部通过。
- 工程门禁：ESLint fix、ESLint 零输出、production build 均通过；最终构建 `✓ built in 8.25s`。

## 未修复问题

- 本轮未发现未修复的前端阻断问题。
- 未准备 50+ 条真实历史数据，因此 ARX-008 的超长会话真实浏览器场景未执行；顶部分页、滚动回调与渲染优化已有组件测试覆盖。
