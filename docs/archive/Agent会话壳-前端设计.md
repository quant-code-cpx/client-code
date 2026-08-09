# Agent 会话壳前端设计

> 对应服务端架构任务 Batch 016。公共契约以 `server-code/docs/agent/api/` 为准，本文件只记录前端落地边界。

## 功能概述

在现有受保护 Dashboard 内提供 `/agent` 与 `/agent/:conversationId`，完成新建会话、历史切换、发送问题、流式回答、停止、恢复和重新生成的最小闭环。视觉保持量化研究终端的中性、紧凑和可审计风格，不引入独立 AI 主题。

`VITE_AGENT_ENABLED` 默认 `false`。关闭时导航与路由都不暴露 Agent；开启后仍由现有 `AuthGuard` 鉴权。

## 路由与页面

- `/agent`：新建态，首次成功提交时创建会话。
- `/agent/:conversationId`：加载指定会话和消息，支持刷新与深链。
- 深链 404/无权限展示明确页面错误，不自动跳转到其他会话。
- `src/pages/agent.tsx` 只渲染 `AgentView`；Provider 仅覆盖 Agent 页面。

## 组件结构

```text
AgentView
└── AgentProvider
    └── AgentShell
        ├── ConversationSidebar
        └── 研究主区
            ├── PageHeader
            ├── RunStatusBar
            ├── MessageViewport (react-virtuoso)
            │   └── MessageItem
            └── Composer
```

- 桌面端侧栏固定显示；小屏使用 Drawer。
- 消息区使用虚拟列表。用户离开底部后暂停自动跟随并显示“回到最新”。
- Batch 016 对消息正文只做 React 转义纯文本渲染；Markdown、引用、Tool 和图表由 Batch 017 接入。
- 输入区支持 IME、Enter 发送、Shift+Enter 换行、长度反馈和运行中编辑下一条草稿。

## API 映射

| 场景 | Agent API |
| --- | --- |
| 新建与历史列表 | `createConversation`、`listConversations` |
| 深链与消息快照 | `getConversation`、`listMessages` |
| 发送与重新生成 | `sendMessage`、`regenerateMessage` |
| 流与恢复 | `streamAgentRun`、`getRunStatus` |
| 停止 | `cancelRun` |
| 模型偏好 | `updateConversationModel` |

全部请求复用 Batch 015 facade。组件不得直接创建 reader 或自行解析 SSE。

## 状态模型

- Provider 使用 `useReducer`，会话、消息、Run 使用 `byId + orderedIds`。
- reducer 只保存可序列化状态，不保存 `AbortController`、reader、Promise 或计时器。
- 会话加载、消息加载和流连接各带 generation；旧响应、旧连接和倒序 sequence 被拒绝。
- 用户消息先乐观插入；服务端确认后在原位置替换 `localId`，不得追加重复项。
- 网络断开只改变连接状态，不把 Run 推断为失败；终态后拉取服务端消息快照。
- 页面切换只中止本地 reader；只有“停止”按钮调用取消 API。

## 草稿与隐私

- 草稿写入 `sessionStorage`，键包含 schema version、用户 ID 和会话 ID/新建态。
- 消息、Tool 结果、访问令牌和页面敏感上下文不写入长期存储。
- 退出登录清理所有 Agent 草稿；版本不匹配或内容损坏时丢弃旧值。

## 错误与恢复

- 输入错误靠近 Composer；页面权限错误使用完整错误态；流恢复错误保留部分回答。
- 取消请求失败时查询权威 Run 状态，不能直接显示“已取消”。
- 若任务在取消请求前已完成，保留最终答案并按完成态展示。
- 快速切换会话后，旧详情响应和旧流都不能覆盖当前会话。

## 验收

实现与测试范围见 [Agent会话壳-测试方案](testing/Agent会话壳-测试方案.md)。最终门禁顺序：ESLint 自动修复、ESLint 检查、Vitest、契约漂移检查、生产构建、浏览器桌面/移动联调。
