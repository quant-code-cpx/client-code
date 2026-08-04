# AI 研究工作台 — 前端设计（v2 重构）

> 状态：🔧 待实现（阶段一方案与 UI 稿已完成）
> 创建日期：2026-08-04
> 路由：`/agent`、`/agent/:conversationId`
> 主入口：`src/sections/agent/view/agent-view.tsx`
> 设计视角：资深金融产品经理 + 资深二级市场研究员 + 资深 UI/UE 设计师
> 本阶段边界：技术调研、重构方案、UI 稿；**不修改业务代码，不替换 Agent 协议与状态层**

---

## 一、功能提炼

### 1.1 用户原始诉求复述

> “调研 AI 研究界面的 UI 重构。Ant Design X 是 AI 交互库，但不限定只能用它；需要比较更适合现有 MUI 风格的方案，产出技术方案与 UI 稿。”

本次不是补一个按钮，而是重新确定 `/agent` 的产品形态、信息层级和技术边界。目标是把“能和模型对话、模型能调用工具”的工程能力，升级为研究员可以长期使用、可以审计证据、可以理解过程的金融研究工作台。

### 1.2 产品定位与价值主张

- **30 秒回答**：模型正在做什么、引用了哪些数据、结论能否信、数据截止到哪一天。
- **3 分钟动作**：追问假设、查看工具和来源、复制结论、重新生成、保存为报告。
- **持续研究闭环**：会话沉淀 → 证据核验 → 报告归档 → 长期记忆 → 通知；定时研究作为后续独立能力，不塞进本轮主界面。
- **产品边界**：AI 研究负责“提出问题、组织分析、解释证据”；行情、因子、回测、组合等专业页面继续负责深度操作和权威数据展示。
- **风险边界**：任何回答都必须保留来源、数据时点、质量提示和投资建议免责声明；工具调用成功不等于结论可靠。

### 1.3 本轮功能目标

| # | 功能目标 | 用户价值 | 本轮优先级 |
| --- | --- | --- | --- |
| 1 | 三栏研究工作台 | 会话、结论、证据各归其位，减少长回答中的卡片堆叠 | P0 |
| 2 | 研究过程概览 | 展示计划、当前步骤、工具数量、耗时和失败恢复，不展示原始思维链 | P0 |
| 3 | 编辑式研究回答 | Assistant 正文以“报告正文”呈现，不再套大气泡；关键指标与结论优先 | P0 |
| 4 | 证据账本 | 引用、数据口径、质量提示移到右栏，与正文行内编号联动 | P0 |
| 5 | 强化 Composer | 显示模型策略、工具范围、上下文、附件入口，发送/停止保持同一位置 | P0 |
| 6 | 新建态研究模板 | 给出估值、财报、行业、组合、策略等任务模板，降低空白页门槛 | P1 |
| 7 | 辅助入口收敛 | 记忆、报告、通知从连续图标改为清晰的工作台动作和统一抽屉 | P1 |
| 8 | 上下文研究入口 | 允许未来从股票、组合、回测页带 `pageContext` 发起研究 | P1 |
| 9 | 会话治理 | 搜索、重命名、置顶、归档、标签；服务端能力不足时分阶段落地 | P2 |
| 10 | 定时研究 | 复用已有 schedule 契约，但作为后续独立设计，不扩大本轮范围 | 后续 |

### 1.4 三种专业视角补充

#### 金融产品经理视角

- 首页不是“ChatGPT 克隆”，而是研究任务入口；模板按任务而不是按模型分类。
- 模型、工具、记忆属于研究配置，不应与“报告、通知”混成一排无文案图标。
- 完成态首要动作是“核验证据”和“保存报告”，不是继续展示大量运行状态标签。
- 会话标题、数据对象、研究日期、模型策略应在顶部形成可扫描摘要。

#### 二级市场研究员视角

- 结论必须明确数据截止日、报告期、公告日、预测口径、币种和复权口径。
- 一致预期、渠道数据、公司公告、内部计算的可信度不同，来源类型和质量等级必须可见。
- 工具运行记录服务于审计，不应打断正文；默认展示摘要，详细输入/输出按需展开。
- 估值、收益率、增长率等数值列统一右对齐并使用 tabular nums；`null` 永远显示 `—`，不转成 0。
- “计划/步骤”只展示可审计任务轨迹，不展示模型私有 chain-of-thought。

#### UI/UE 设计师视角

- 视觉方向定为 **Research Desk + Evidence Ledger（研究桌面 + 证据账本）**。
- 使用现有 MUI 中性金融主题，不增加紫色渐变、玻璃拟态、巨型欢迎语或营销式大卡。
- 主回答使用编辑式排版；边框只表达结构，不让每段内容都成为独立卡片。
- 运行中、完成、失败、断线必须通过位置稳定的状态条表达，避免界面跳动。
- 右栏是证据的固定归宿；窄屏转 Drawer，不在消息底部重复铺完整来源卡。

### 1.5 待确认清单

> 若没有另行指定，阶段二按每题的“推荐”执行。

- [ ] **Q1（技术路线）**：是否确认“保留现有 Agent 状态/SSE/富块运行时，使用 MUI 原生组件重做视觉层”？**推荐：确认。**
- [ ] **Q2（MUI X Chat）**：是否允许阶段二先做一个不进入生产包的适配 POC？**推荐：允许，限时 1 天，未通过门禁即删除 POC。**
- [ ] **Q3（右侧证据栏）**：桌面完成态默认展开、运行中按首次引用自动展开；用户关闭后记住当前会话偏好。**推荐：采用。**
- [ ] **Q4（本轮范围）**：定时研究、会话标签/归档不纳入 P0，只在后端能力和独立设计完成后进入。**推荐：采用，防止 UI 重构膨胀为全量 Agent 产品重做。**
- [ ] **Q5（新建态）**：首屏展示 6 个研究模板 + 最近研究对象，不使用居中插画。**推荐：采用。**
- [ ] **Q6（工具控制）**：首期默认“研究工具自动”，高级用户可在弹层中按 capability 开关，不在 Composer 平铺多个开关。**推荐：采用。**

---

## 二、现状盘点

### 2.1 现有代码与能力基线

`src/sections/agent/` 约 7,376 行，其中生产代码约 6,024 行、单测约 1,352 行；另有约 1,403 行 Agent E2E。该模块不是空白原型，底层已经完成较强的可靠性建设。

| 区域 | 当前实现 | 结论 |
| --- | --- | --- |
| 页面与编排 | `AgentView` + `AgentProvider` + `AgentShell` | 页面薄壳正确；`AgentShell` 269 行，承载过多 UI 编排 |
| 状态与流 | 规范化 reducer、generation/sequence、乐观消息、POST-SSE、恢复/取消/重生成 | **完整保留，不因 UI 库替换而重写** |
| 会话 | 288px 侧栏、新建、客户端搜索、分组、分页、移动 Drawer | 能用，但治理能力和视觉层级较弱 |
| 消息 | `react-virtuoso`、用户气泡、Assistant 正文、富响应块 | 长会话基础好；回答、工具、引用同流堆叠 |
| Composer | IME、Enter/Shift+Enter、10k 限制、草稿、发送/停止 | 行为完整，研究配置和上下文不可见 |
| Run | 一行 `RunStatusBar` | 已有 `planSummary/currentStep`，UI 只展示压缩后的 `stageLabel` |
| 富响应 | Markdown、表格、图表、K 线、财务指标、风险提示、ErrorBoundary | 是项目差异化资产，必须保留 |
| Tool/引用 | 脱敏摘要按需加载；引用含 URL、publisher、locator、时间 | 审计信息完整，但文案偏后端、位置打断阅读 |
| 报告/记忆/通知 | Dialog/Drawer 内已有完整 CRUD、确认和安全流程 | 能力强但入口割裂，组件体积大，缺少工作台层级 |
| 定时研究 | 已包装 8 个 JSON 端点，另有 `/agent/schedules/run` 契约 | 当前没有 UI，本轮不顺带实现 |

现有 API facade 已达到 34 个 JSON POST，另有 1 个 POST-SSE；`docs/已有功能汇总.md` 中“10 个 JSON + 1 SSE”的口径已过期，阶段三应同步修正文档。

### 2.2 现状优点（重构必须保留）

- normalized reducer、请求 generation、SSE sequence、断线恢复与终态权威快照。
- 乐观用户消息原位替换、取消 CAS、重生成独立历史。
- `react-virtuoso` 长会话、离开底部暂停跟随与“回到最新”。
- 中文 IME、草稿按用户/会话隔离、运行中停止、10,000 字边界。
- 安全 Markdown、白名单 `BlockRenderer`、单块 ErrorBoundary 和前端展示预算。
- 金融数值 null/0、单位、比例、币种、复权、quality flags、CSV 防注入。
- 报告两阶段确认、记忆显式确认、Webhook secret 不回显、通知 CAS。
- 现有单测、Mock E2E、真实后端 E2E 的 accessible name 与键盘路径。

### 2.3 问题清单与重构对策

| # | 当前问题 | 用户影响 | 重构对策 |
| --- | --- | --- | --- |
| P0-1 | Assistant 正文、Tool、引用、provenance 同级纵向堆叠 | 长回答像后台日志，结论被淹没 | 正文留中栏；Tool 归并“研究过程”；引用和口径移右栏 |
| P0-2 | Run 只有一行阶段文字 | 模型会调用工具但用户看不懂执行进度 | 状态条 + 可折叠步骤时间线；映射 `planSummary/currentStep` |
| P0-3 | 288px 侧栏 + 860px 回答，宽屏右侧空白 | 屏幕利用率低，无法并列核验证据 | 252 + 弹性正文 + 318 三栏布局 |
| P0-4 | 新建态只有通用空文案 | 用户不知道能问什么、能用哪些数据 | 任务模板、能力说明、最近研究对象、上下文入口 |
| P0-5 | Composer 只有 TextField | 模型/工具/上下文是隐形状态 | 输入框下方显示附件、工具策略、模型策略和上下文 chip |
| P1-1 | `pageContext` 从未发送 | 不能从个股、组合、回测自然发起研究 | 设计 `ResearchContextChip` 与跨模块入口，分阶段接入 |
| P1-2 | 首次消息前不能选模型 | 新会话固定 AUTO，配置入口晚 | 新建态即可选择策略；默认仍 AUTO |
| P1-3 | `allowedCapabilities` 总是全部能力 | 工具授权不可见、不可控 | Composer 高级弹层；默认自动并展示摘要 |
| P1-4 | 每条完成消息仍显示 Agent/完成/时间 | 高频元信息抢正文注意力 | 完成态降级为 overline；失败/未发送才保留强状态标签 |
| P1-5 | Tool 名和 locator 原样展示 | 像开发日志，不像研究语言 | 建立 tool/locator 文案映射与受控摘要组件 |
| P1-6 | 记忆要求手写 JSON | 普通用户难以使用 | 后续改成结构化表单；本轮只重排入口，不改安全流程 |
| P1-7 | 报告、记忆、通知分别为大 Dialog/Drawer | 辅助能力割裂 | 统一工作台动作与容器规范；报告库后续支持深链 |
| P2-1 | 会话搜索只覆盖已加载 30 条 | 长期使用后难找历史 | 后端 server search；未支持前保留本地搜索并说明范围 |
| P2-2 | 无重命名、置顶、归档、标签 | 会话积累后不可治理 | 等后端端点，设计菜单但不做假交互 |
| P2-3 | Citation/Block 组合在消息与报告中重复 | 修改时易产生不一致 | 抽 `ResearchAnswerContent`、`CitationEvidenceList` 复用 |
| P2-4 | reducer 870 行、run hook 472 行 | UI 与协议同时修改时回归面大 | 本轮只动表现层；状态层拆分另立技术任务 |

### 2.4 AI 交互 UI 库调研

调研口径：React 19、MUI v7、Vite、现有 POST-SSE、自定义消息契约、Tool/引用/富块、可访问性、主题一致性、成熟度和锁定风险。信息核验日期为 2026-08-04，均优先引用官方文档或官方仓库。

| 候选 | AI 能力 | MUI 适配 | 对现有运行时侵入 | 成熟度/风险 | 结论 |
| --- | --- | --- | --- | --- | --- |
| **MUI X Chat** | 会话、流式、Tool、Sources、Reasoning、Task、Adapter、slots | **最高**；直接使用 MUI theme、`sx`、slots，支持 React 19 与 MUI 7 | 中高；其 runtime 与现有 reducer 重叠 | `9.0.0-alpha.15`，官方明确 API 不稳定 | **首选 POC，暂不直接进生产** |
| **Ant Design X** | Bubble、Conversations、Sender、Prompts、ThoughtChain、Sources、X SDK | 低；依赖 `antd`、CSS-in-JS、icons、dayjs，形成第二套 token/组件语义 | 中；可只用组件，但视觉和运行时边界仍需适配 | 组件覆盖成熟、产品模式值得借鉴 | **只借鉴交互模式，不引包** |
| **assistant-ui** | 无样式 primitives、runtime、Tool、自动滚动、快捷键、生成式 UI | 中；primitives 可包 MUI，但预制层偏 shadcn | 高；要求 `AssistantRuntimeProvider`，与现有 store 重叠 | 活跃、能力完整 | **MUI X 延迟时的次选 POC** |
| **CopilotKit / AG-UI** | Agent chat、Tool rendering、shared state、HITL、generative UI | 中；支持 headless/自定义 React 组件 | 很高；适合后端采用 AG-UI 协议时整体接入 | Agent 协议能力强 | **仅在后端迁移 AG-UI 时评估** |
| **Vercel AI SDK UI** | `useChat`、stream、Tool/生成式 UI 状态 | 视觉无关，可接任意 UI | 高；会替换现有 stream/store | 成熟，但主要解决运行时而非视觉 | **不用于本次 UI 重构** |
| **AI Elements** | Conversation、Message、Reasoning、Sources、PromptInput | 低；基于 shadcn、Tailwind 4，要求 Next.js/AI SDK 生态 | 高 | 组件丰富、React 19 友好 | **不适配当前 Vite + MUI** |
| **NLUX** | 通用 LLM Chat、adapter、stream、主题 | 中低；可自定义但不是 MUI 语义 | 中 | 通用聊天强，Agent 审计与金融富块弱；许可证需法务复核 | **不选** |
| **Chatscope** | 通用会话、消息、输入 | 低 | 中 | 更偏即时通讯，Agent 过程/Tool/证据不足 | **不选** |

关键官方依据：

- [MUI X Chat 总览](https://mui.com/x/react-chat/)说明其支持流式、多会话、Tool、主题与可访问性；[Quickstart](https://mui.com/x/react-chat/quickstart/)列出 React 17/18/19 与 MUI peer dependencies；[npm 包页](https://www.npmjs.com/package/@mui/x-chat)明确当前仍为 alpha 且 API 不稳定。
- [MUI X Chat Adapter](https://mui.com/x/react-chat/core/adapters/)可接 HTTP/SSE/WebSocket，并覆盖 history、stop、regenerate、tool approval；[Customization](https://mui.com/x/react-chat/material/customization/)支持 theme overrides、`sx`、classes、slots。
- [Ant Design X 组件总览](https://x.ant.design/components/introduce/)覆盖 Bubble、Conversations、Sender、Prompts、ThoughtChain、Sources，但官方同时说明依赖 `antd`、`@ant-design/cssinjs` 和图标包。
- [assistant-ui Headless Primitives](https://www.assistant-ui.com/docs/primitives)提供无样式、可访问的 Thread/Composer/Message 原语，但依赖其 runtime context。
- [CopilotKit](https://docs.copilotkit.ai/)的优势是 AG-UI、shared state、human-in-the-loop 和生成式 UI；[AG-UI 介绍](https://docs.copilotkit.ai/ag-ui/introduction)将其定义为 Agent 与前端之间的事件协议。
- [AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui/overview)主要提供 `useChat/useCompletion/useObject`；[AI Elements](https://elements.ai-sdk.dev/docs)基于 shadcn/ui、Tailwind CSS 4，并以 Next.js + AI SDK 为前置条件。

### 2.5 技术决策（ADR）

**决策：本轮不引入 Ant Design X、assistant-ui、CopilotKit、AI SDK UI 或 NLUX 作为生产运行时。**

生产方案采用：

```text
现有 Agent API / POST-SSE / reducer / hooks / react-virtuoso
                         ↓
             本地 AI Interaction Layer
          （MUI 组件 + 项目主题 + slots 思路）
                         ↓
     Conversation Rail / Research Answer / Evidence Rail / Composer
```

原因：

1. 当前项目最难的序列去重、断线恢复、取消竞态、权威快照和金融富块已经实现，替换 runtime 收益低、回归风险高。
2. Ant Design X 设计模式优秀，但引入后会出现 MUI/Ant Design 双主题、双 token、双图标和双表单语义。
3. MUI X Chat 是唯一真正与现有视觉系统同源的候选，但当前仍为 alpha；适合作为短期 POC 和长期迁移观察对象。
4. UI 重构的核心问题是信息架构和呈现层，不是缺少一个新的 LLM 请求 hook。

---

## 三、功能细化

### 3.1 组件结构树

```text
AgentView（保持 pages 薄壳）
└── AgentProvider（保留现有状态与协议）
    └── AgentWorkbenchV2
        ├── ConversationRail
        │   ├── ConversationRailHeader
        │   ├── ConversationSearch
        │   └── ConversationGroupList
        ├── ResearchThread
        │   ├── ResearchThreadHeader
        │   │   ├── ConversationIdentity
        │   │   ├── ModelPolicyButton
        │   │   └── WorkbenchActions
        │   ├── ResearchRunOverview
        │   │   └── ResearchPlanTrace（按需展开）
        │   ├── MessageViewport（继续使用 react-virtuoso）
        │   │   └── ResearchMessage
        │   │       ├── UserPromptMessage
        │   │       └── AssistantResearchAnswer
        │   │           ├── ResearchAnswerContent
        │   │           ├── RichBlockRenderer（复用）
        │   │           ├── ToolTraceSummary
        │   │           └── AnswerActions
        │   └── ResearchComposer
        │       ├── ResearchContextChips
        │       ├── ComposerInput
        │       └── ComposerControlRow
        ├── EvidenceRail
        │   ├── ProvenanceLedger
        │   ├── CitationEvidenceList
        │   ├── QualityNotices
        │   └── ActiveToolAudit（运行中）
        └── WorkbenchOverlays
            ├── AgentMemoryDrawer
            ├── ReportLibraryPanel
            ├── ReportPreviewDialog
            └── NotificationSettingsDrawer
```

### 3.2 子模块职责

#### 3.2.1 `ConversationRail`

- 桌面宽度 252px；当前 288px 缩窄，减少对正文的挤压。
- 新建按钮、搜索、分组和运行中标记保留。
- 当前会话使用左侧 3px 语义条 + 轻背景，不用大面积主色填充。
- 行内只展示标题、消息数/运行状态、相对时间；更多菜单承载重命名/置顶/归档，未接后端时不显示假入口。
- 1024px 以下转 Drawer；Drawer 关闭后把焦点还给会话按钮。

#### 3.2.2 `ResearchThreadHeader`

- 第一行：会话标题 + 状态 pill；第二行：模型策略、研究模式、数据截止时间。
- 桌面动作使用“图标 + 短文案”：记忆、报告、证据；通知和更多设置收进 overflow menu。
- 标题不再使用通用大号 `PageHeader`；工作台内采用紧凑 local header。
- 模型不可用或 fallback 时在状态条解释，不把 fallback 当正文 delta。

#### 3.2.3 `ResearchRunOverview`

状态映射：

| Run 状态 | 顶部状态条 | 时间线默认行为 |
| --- | --- | --- |
| `QUEUED/RUNNING` | 当前步骤、完成数/总数、停止入口 | 自动展开当前步骤，旧步骤折叠 |
| `RETRYING/PAUSED` | 断线说明、继续接收 | 保留部分回答，不推断失败 |
| `COMPLETED` | 来源数、Tool 数、耗时、可信度摘要 | 默认折叠，正文优先 |
| `FAILED` | 安全错误信息、可恢复性、重新生成 | 展开失败步骤，不泄露原始 payload |
| `CANCELLED` | “已停止，保留已生成内容” | 折叠，提供重新生成 |

- 使用 `planSummary`、`currentStep.kind/status/ordinal` 和 Tool 状态生成可审计轨迹。
- 不显示私有思维链；文案只描述“查了什么、算了什么、是否完成”。
- 多个 Tool 调用合并成一个 `ToolTraceSummary`，详细审计按需加载。

#### 3.2.4 `AssistantResearchAnswer`

- Assistant 回答不使用外围大气泡；采用编辑式正文、段落标题、关键指标带和行内引用。
- 用户消息继续右对齐小气泡，最大宽度 78%，形成明确角色区分。
- 完成态只保留“研究结论 · 模型 · 耗时”弱 overline；失败/取消才强化状态。
- `RichBlockRenderer` 继续白名单渲染；表格/图表/K 线不改变契约。
- 回答底部只保留复制、重新生成、保存报告、反馈；Tool 和完整引用不再重复铺开。
- 抽出 `ResearchAnswerContent`，同时供消息与报告预览复用。

#### 3.2.5 `EvidenceRail`

- 右栏宽 318px，分为：数据口径、引用来源、质量提示、活动 Tool。
- 点击正文 `[1]`：打开右栏、滚动到来源、短暂高亮；点击来源可反向定位正文首个引用位置。
- `ProvenanceLedger` 合并重复 provenance：数据截止、时区、币种、单位、复权和预测口径只在变化时提示。
- citation `sourceType/publisher/retrievedAt/conclusionLevel` 使用研究语言；locator key 经映射后展示。
- 危险 URL 继续降级纯文本；不在新窗口打开前自动发送任何上下文。
- 1200px 以下转右侧 Drawer；390px 手机为全宽 Drawer。

#### 3.2.6 `ResearchComposer`

- 输入区 2–6 行，保持 IME、Enter/Shift+Enter、10k、草稿恢复、错误靠近输入框。
- 底部控制行：附件、上下文 chip、“研究工具自动”、模型策略、发送/停止。
- 发送和停止使用同一右下角位置；运行中仍允许编辑下一条草稿。
- 高级工具选择在 Popover/Dialog 中显示 capability，不在 Composer 平铺开关。
- 未来 `pageContext` 以可移除 chip 显示：如“贵州茅台 600519.SH”“回测 run-xxx”；敏感内容不写长期存储。
- 输入区底部固定风险文案与键盘提示，不依赖 Tooltip 承载主要信息。

#### 3.2.7 新建态 `ResearchStarter`

推荐 6 个任务模板：

1. 个股估值与催化剂。
2. 最新财报质量复盘。
3. 行业景气与龙头比较。
4. 组合风险与归因诊断。
5. 策略表现异常排查。
6. 事件影响与情景分析。

模板展示“将使用的数据/工具”和预填问题，不自动发送。新建态允许先选模型策略和上下文，第一次成功提交后再创建会话，保留当前懒创建语义。

### 3.3 状态与数据流

```text
用户输入 / 模板 / pageContext
→ ResearchComposer 组装 UI command
→ 现有 useAgentRun.send
→ createConversation（仅新建态）
→ optimistic USER message
→ /agent/messages/send
→ POST /agent/runs/events SSE
→ reducer 依 sequence 更新 Run / Message
→ ResearchRunOverview + MessageViewport + EvidenceRail 分区投影
→ terminal status + 权威消息快照
```

状态边界：

- **服务端/协议状态**：继续由 `AgentProvider/reducer/hooks` 管理。
- **工作台 UI 状态**：左右栏开合、活动 citation、时间线展开、Composer 高级弹层，放在 `AgentWorkbenchV2` 或局部 context。
- **禁止双 store**：不能同时让 MUI X Chat/assistant-ui runtime 和现有 reducer 管理同一组 message/run。
- **持久化范围**：只允许草稿和无敏感的 UI 偏好；消息、Tool payload、Token、持仓和记忆不写 `localStorage`。

### 3.4 API 映射与本轮契约边界

| UI 行为 | 现有 API/状态 | 是否需后端变更 |
| --- | --- | --- |
| 会话列表/切换/分页 | `listConversations/getConversation/listMessages` | 否 |
| 发送/停止/重生成 | `sendMessage/cancelRun/regenerateMessage` + SSE | 否 |
| 模型策略 | `listModels/updateConversationModel` | 否 |
| 研究过程 | reducer 的 `planSummary/currentStep` + `listToolCalls` | P0 否；更细步骤可 P1 增强 |
| 证据账本 | message citations + block provenance | 否 |
| 报告、记忆、通知 | 现有 reports/memories/channels APIs | 否 |
| capability 选择 | `sendMessage.allowedCapabilities` | 否；前端需停止硬编码全部能力 |
| 跨页面上下文 | 请求已预留 `pageContext` | 需核验契约字段和各业务页入口 |
| 服务端会话搜索/治理 | 当前缺少完整端点 | 是，P2 |
| 定时研究 | 已有 schedules 契约 | UI 另立设计；`schedules/run` facade 需补 |

### 3.5 容错与安全

- 右栏失败不能阻断正文；引用加载/定位异常降级为消息底部简短来源列表。
- Tool 审计延迟加载；失败只显示服务端安全错误，不展开嵌套 payload。
- 断线时保留部分回答和最后可信 sequence，继续沿用现有恢复策略。
- 富块单块故障继续由 ErrorBoundary 隔离，不让整个回答消失。
- 完成后快照若改变 citation/provenance，右栏以权威快照覆盖流式临时数据。
- UI 只展示“任务轨迹”，禁止显示或伪造 chain-of-thought。

---

## 四、UI/UE 设计

### 4.1 视觉方向

**关键词：克制、研究编辑、证据优先、低噪音、可审计。**

- 延续现有 Dashboard 的 MUI v7、DM Sans/Barlow、浅深双主题。
- 主色只用于焦点、当前会话、发送、成功状态；引用使用 info 语义色，质量问题使用 warning。
- 页面不使用装饰性渐变、彩色大面积背景或大圆角聊天气泡。
- 圆角基准 8px；Composer 12px；状态 pill 可用全圆角；正文段落不套卡。
- 分隔线用于三栏、Header、指标带和段落层级；避免“卡片套卡片”。

### 4.2 桌面信息架构

```text
┌──────────── 252 ───────────┬────────────────── flex / min 560 ──────────────────┬──── 318 ────┐
│ AI 研究        [收起]       │ 贵州茅台估值与催化剂  [已完成]    [记忆][报告][证据] │ 证据与口径  × │
│ [＋ 新建研究]               ├───────────────────────────────────────────────────┼───────────────┤
│ [搜索研究主题……]           │ 研究完成 · 4 个来源 · 3 个工具          18.4s       │ 数据口径       │
├─────────────────────────────┤───────────────────────────────────────────────────│ 截止日 / 时区  │
│ 今天                        │                         ┌──── 用户问题 ─────────┐ │ 币种 / 预测口径│
│ ▌贵州茅台估值与催化剂       │                         └───────────────────────┘ │               │
│   8 条消息             刚刚 │ ✦ 研究结论 · 18.4 秒 · 自动模型                   │ 引用来源 4     │
│ 银行板块净息差压力测试      │ 估值进入合理区间，但安全边际仍取决于批价企稳       │ [1] 公司公告   │
│   研究中              12 分 │ 正文与行内引用 [1][2]                              │ [2] 一致预期   │
│ 最近 7 天                   │ ─── PE / 五年分位 / EPS 增速 ───                   │ [3] 渠道周报   │
│ …                           │ 核心判断 / 催化剂 / 风险                           │ [4] 内部计算   │
│                             │ [研究过程 · 3 个工具，5 个步骤 ▾]                  │               │
│                             │ [复制][重生成][存报告][反馈]                        │ 质量提示       │
│                             ├───────────────────────────────────────────────────┤ 渠道数据中质量 │
│                             │ [附件] 研究工具自动  自动模型           [发送/停止] │               │
└─────────────────────────────┴───────────────────────────────────────────────────┴───────────────┘
```

### 4.3 尺寸与密度

| 元素 | 规格 | 说明 |
| --- | --- | --- |
| 工作台最小高度 | 560px | 继续适配 Dashboard 可用高度 |
| 会话栏 | 252px | 比现有 288px 紧凑；可折叠 |
| 正文阅读宽度 | 760–820px | 居中但不浪费整个中栏；富表格可突破至中栏宽 |
| 证据栏 | 318px | 足以展示标题、publisher、时间和质量 |
| Header | 60–64px | 两行摘要，替代大 `PageHeader` |
| 状态条 | 36–40px | 位置固定，运行中和完成态不跳动 |
| Composer | 2–6 行 | 最大 132px，底部控制行 42px 左右 |
| 正文基础字号 | 14px | 研究正文行高 1.7–1.8 |
| 辅助字号 | 最小 12px | 仅编号/图形内标记可视觉等效 11px |
| 点击热区 | 最小 36×36px；移动 44×44px | 图标必须有可访问名称 |

### 4.4 视觉层级

1. **一级：结论**——回答标题、lead、关键指标。
2. **二级：论据**——正文段落、图表、财务指标、风险提示。
3. **三级：证据**——引用、数据口径、质量 flags，集中到右栏。
4. **四级：审计**——Tool 输入/输出摘要、attempt、耗时，折叠展示。

状态、Tool、引用不得与结论使用相同字体重量和边框强度。完成态隐藏不必要的绿色“已完成”标签；只有顶部会话状态保留一次。

### 4.5 关键交互

- 点击正文 citation：右栏打开并定位；高亮 1.2 秒，`prefers-reduced-motion` 下取消动画。
- 点击“研究过程”：展开任务步骤；只加载当前 run 的 Tool 摘要，关闭后保留缓存到页面生命周期。
- 运行中状态条随 `currentStep` 更新；不会随着每个 token 频繁改变 `aria-live`。
- 用户离开底部继续保留“回到最新”；按钮避开 Composer 和右栏。
- 切换会话时先更新选中态和 URL，旧 generation 仍由现有逻辑拒绝。
- 证据栏开合是会话级 UI 偏好；1200px 以下始终使用 Drawer，不改变正文宽度。
- 报告保存成功后，报告入口显示轻量 badge；报告库提供显式刷新，阶段二不依赖关闭重开。

### 4.6 新建态 UI

- 顶部仍使用紧凑工作台 Header，允许模型策略、记忆和报告入口保持位置稳定。
- 中区标题“开始一次可核验的研究”，下方一行说明“将使用内部数据与受控工具，回答附来源和数据时点”。
- 模板采用两列列表/按钮，不做六张彩色卡；每项含任务名、示例问题、预计使用能力。
- 最近研究对象来自当前业务上下文或最近会话；无数据时不显示空占位。
- Composer 保持页面底部，不在中央重复一个输入框。

### 4.7 响应式

| 宽度 | 布局 |
| --- | --- |
| `>= 1280` | 三栏；证据栏按会话偏好展开 |
| `1024–1279` | 会话栏 + 正文；证据栏为右 Drawer |
| `768–1023` | 单正文；会话栏和证据栏均为 Drawer，Header 动作只保留图标 |
| `< 768` | 单栏；用户气泡最大 90%；关键指标纵向；Composer 控制项收进菜单 |
| `320–390` | 标题单行截断；状态 pill 保留；所有主要按钮 44px 热区；无横向滚动 |

### 4.8 主题与组件规范

- 实现时只使用 `theme.palette.*`、`theme.vars.palette.*Channel`、`varAlpha()`，不写十六进制颜色。
- 背景优先 `background.default/paper`；分隔 `divider`；活动会话使用 `action.selected`。
- 成功、警告、失败、引用分别使用 `success/warning/error/info` 语义，不自建品牌色。
- MUI 必须子路径导入；图标继续复用项目 `Iconify`，不额外引入 Ant Design Icons/Lucide 依赖。
- 数值使用 `fontVariantNumeric: 'tabular-nums'`；代码/ID 才使用等宽字体。
- Tooltip 只解释图标和口径，不承载关键状态或唯一操作。

### 4.9 UI 稿说明

本轮可交互 UI 稿覆盖：

- 1440px 三栏完成态。
- “运行中/完成态”切换。
- 证据栏开合。
- 行内 citation 与右栏来源联动。
- 736px 以下单栏降级。
- 亮/暗主题跟随宿主。

UI 稿使用示例数据展示信息密度和交互层级，不代表真实投资结论；阶段二实现以本文、现有 API 契约和项目主题为准。

---

## 五、实现步骤

### 5.1 Phase 0：MUI X Chat 限时 POC（不进生产）

目标：验证是否能只复用其 Material/Headless 层，而不破坏现有协议状态。

POC 通过门禁：

- 可用 `ChatAdapter` 映射当前 POST-SSE，保留 `afterSequence/Last-Event-ID`、断线恢复和取消 CAS。
- 不创建第二份 message/run store，或能以完全受控模式读取现有 reducer。
- 可自定义 Tool、Sources、Task、Message slots，复用现有 `BlockRenderer` 和 `react-virtuoso`，不出现双虚拟列表。
- React 19 + MUI 7.3.10 + Vite 6 构建通过；无主题错位、额外全局 CSS 和不可接受 bundle 增长。
- 现有 Agent 单测与 E2E 的关键语义不需要大范围重写。

任一核心门禁失败：删除 POC，不在 `package.json` 保留 `@mui/x-chat`，按本地 MUI Interaction Layer 实施。即使通过，也只形成独立 ADR，由用户确认后才进入生产方案。

### 5.2 Phase 1：建立 v2 表现层骨架

1. 增加 feature flag `VITE_AGENT_WORKBENCH_V2_ENABLED`，旧 `AgentShell` 保留为回退。
2. 新建 `src/sections/agent/workbench/`，按三栏拆分布局；`src/pages/agent.tsx` 不增加业务逻辑。
3. `AgentWorkbenchV2` 继续调用现有 hooks/provider，不复制 API 请求和 reducer。
4. 完成桌面三栏、两种 Drawer 和 320px 响应式骨架，再迁消息内容。

建议目录：

```text
src/sections/agent/workbench/
├── agent-workbench-v2.tsx
├── conversation-rail/
├── research-thread/
│   ├── research-thread-header.tsx
│   ├── research-run-overview.tsx
│   ├── research-plan-trace.tsx
│   └── research-composer.tsx
├── messages/
│   ├── research-message.tsx
│   ├── assistant-research-answer.tsx
│   ├── research-answer-content.tsx
│   └── tool-trace-summary.tsx
├── evidence/
│   ├── evidence-rail.tsx
│   ├── provenance-ledger.tsx
│   └── citation-evidence-list.tsx
└── state/
    └── workbench-ui-context.tsx
```

### 5.3 Phase 2：迁移消息、过程与证据

1. 保留 `MessageViewport` 的 Virtuoso 配置和 key，替换 item renderer 为 `ResearchMessage`。
2. 抽取 `ResearchAnswerContent`，统一消息与报告预览的 Markdown、Block、引用组合。
3. 将 `ToolCallList` 改成合并摘要；详细卡仅在 `ResearchPlanTrace/ActiveToolAudit` 中按需请求。
4. 把 citation/provenance 投影到 `EvidenceRail`；保留窄屏 fallback。
5. 建立 tool 名、summary key、locator key 的受控中文映射；未知字段安全降级。
6. 使用 `planSummary/currentStep` 完成任务轨迹，不扩展或伪造思维链。

### 5.4 Phase 3：Composer、新建态与辅助入口

1. 在现有 Composer 行为上增加控制行和上下文 chips，不重写 IME/草稿逻辑。
2. `useAgentRun.send` 接收 UI 选择的 `allowedCapabilities`，默认值保持现有全部允许。
3. 新建态加入 6 个研究模板；模板只填入输入框，需用户显式发送。
4. 首次消息前开放模型策略选择；会话创建时传当前 policy/model。
5. 记忆、报告、通知入口统一；保留现有确认、安全和 CRUD 流程。
6. 报告列表增加显式刷新和中文状态；`dataAsOf` 日期格式按项目规则修正。

### 5.5 Phase 4：复用、测试与灰度

1. 合并 `CitationList`/报告引用渲染、消息/报告 Block 组合等重复代码。
2. 现有 accessible name 尽量不变；DOM 改动处同步 RTL/E2E。
3. 增加 v2 视觉与交互测试：三栏、Drawer、citation 联动、过程折叠、模板、工具选择。
4. v2 flag 默认关闭；真实后端联调通过后逐步开启，旧壳至少保留一个发布周期。
5. 阶段二末使用 `web-design-guidelines` 审查，再执行 ESLint、测试、契约检查和生产构建。

### 5.6 后端支持清单

#### P0

无。视觉重构、过程摘要、证据栏和 Composer 主流程均可基于现有契约完成。

#### P1

| 能力 | 建议契约 | 用途 |
| --- | --- | --- |
| 服务端会话搜索 | `POST /agent/conversations/search` 或扩展 list body 的 `query` | 搜索全部历史，不限已加载 30 条 |
| 会话治理 | rename/pin/archive/tag 全部使用 POST body | 长期使用后的组织管理 |
| 更细计划步骤 | Run/status 或 SSE 返回安全 step summary、startedAt、finishedAt | 提升过程可读性，不返回 chain-of-thought |
| 页面上下文 schema | 明确 `pageContext` allowlist、大小上限、敏感字段 | 跨股票/组合/回测研究 |

#### P2

- 定时研究 UI 独立设计；补 `/agent/schedules/run` facade 和执行详情深链。
- 报告库支持服务端搜索、筛选、生成进度推送。
- 引用可选增加 `confidence/qualityLevel`，但必须由权威数据侧生成，不由前端猜测。

所有新增端点继续使用 `POST` + Body；涉及 `trade_date` 时固定 `YYYYMMDD` 字符串。

### 5.7 风险与回退

| 风险 | 影响 | 控制/回退 |
| --- | --- | --- |
| UI 库接管现有 runtime | 断线、取消、快照、富块回归 | POC 与生产隔离；默认本地 MUI 表现层 |
| Tool/引用移到右栏后移动端难发现 | 证据入口隐蔽 | Header 固定“证据”按钮；首次引用自动打开 Drawer |
| 三栏压缩正文 | 1024–1280 宽度拥挤 | 1200 以下右栏 Drawer；1024 以下会话栏 Drawer |
| 时间线过度暴露过程 | 安全和误导风险 | 只展示任务轨迹和 Tool 状态，不展示思维链 |
| 组件重排破坏 Virtuoso 高度测量 | 跳动/滚动错位 | 保持稳定 message key；富块展开后调用现有测量机制/回归测试 |
| v2 改动范围大 | 发布风险 | feature flag 双壳灰度，旧 `AgentShell` 可即时回退 |

---

## 六、验收方式

### 6.1 功能验收

- [ ] `/agent` 新建态可选择模板、模型策略并发送，首次成功提交后创建会话。
- [ ] `/agent/:conversationId` 深链、刷新、无权限/不存在错误态不回退。
- [ ] 会话切换、加载旧消息、回到最新、草稿恢复、IME、发送、停止、重生成均不回归。
- [ ] 运行中显示当前安全步骤、完成数/总数；完成后折叠为来源/Tool/耗时摘要。
- [ ] Assistant 正文、结构化块、Tool 摘要、引用、provenance 各处于正确层级。
- [ ] 点击行内引用可打开并定位证据；危险 URL 仍降级纯文本。
- [ ] 右栏加载失败不影响主回答；移动端有等价 Drawer/fallback。
- [ ] 保存报告、报告库、记忆、通知流程与安全确认不回归。
- [ ] 模型 fallback 只改变 Run 状态，不拼接不同 provider 的回答流。
- [ ] 未实现的会话治理/定时研究入口不展示假按钮。

### 6.2 UI/UE 验收

- [ ] 1440/1920 显示三栏；1280 内容不拥挤；1024/768/390/320 无横向滚动。
- [ ] 正文阅读宽度稳定在 760–820px；富表格和图表能合理使用中栏剩余宽度。
- [ ] 用户问题右对齐，Assistant 回答为编辑式正文，不出现大面积 Assistant 气泡。
- [ ] 完成态页面最多保留一个强“已完成”状态，不在每条消息重复绿色标签。
- [ ] Tool 默认只展示摘要；来源和数据口径默认集中在右栏。
- [ ] 亮色/暗色截图均无硬编码色错位，状态语义一致。
- [ ] 正文最小 14px、辅助文字最小 12px；主要触控区移动端至少 44px。
- [ ] 焦点环可见；Drawer 打开/关闭焦点恢复正确；Esc、Tab、Enter/Shift+Enter 可用。
- [ ] `prefers-reduced-motion` 下无脉冲或高亮动画依赖。
- [ ] 通过阶段二 `web-design-guidelines` skill 审查。

### 6.3 技术与架构验收

- [ ] `src/pages/agent.tsx` 继续是薄壳。
- [ ] 所有 API 继续 POST + Body；组件不直接解析 SSE。
- [ ] 现有 reducer/generation/sequence/messageId/runId/statusVersion 身份模型未改变。
- [ ] 没有第二套 AI message/run store，没有双虚拟列表。
- [ ] MUI 子路径导入；无 Ant Design/Tailwind/shadcn 全局样式进入生产。
- [ ] 新代码无硬编码颜色，只使用 theme tokens/`varAlpha()`。
- [ ] `ResearchAnswerContent` 复用消息与报告，引用和 Block 组合不再重复。
- [ ] Tool payload、Token、记忆和持仓不写日志或持久存储。
- [ ] MUI X Chat POC 若未全过门禁，依赖和 POC 文件已删除。

### 6.4 自动化与构建验收

按项目固定顺序执行：

```bash
node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"
node_modules/.bin/eslint "src/**/*.{ts,tsx}"
yarn test
yarn api:agent:check
yarn build
```

要求：

- [ ] ESLint 检查退出码 0 且无输出。
- [ ] Agent 单测、Mock E2E、真实后端 E2E 全部通过。
- [ ] 40+ 消息、表格/K 线/图表混合会话滚动稳定，无重复消息和明显跳动。
- [ ] 连续发送/停止/切会话/恢复连接不会被旧响应覆盖。
- [ ] 构建输出 `✓ built in ...`；对比 v1 Agent route chunk，新增包体符合约定预算。

### 6.5 验收数据场景

| 场景 | 输入/状态 | 预期 |
| --- | --- | --- |
| 新建研究 | 无历史，选择“个股估值”模板 | 模板填入 Composer，不自动发送；可先换模型 |
| 正常完成 | 4 引用、3 Tool、2 富块 | 正文优先；右栏 4 来源；过程摘要折叠 |
| 运行中 | 5 步完成 3 步、当前 Tool RUNNING | 状态条和当前步骤更新；发送键原位变停止键 |
| Tool 失败 | 1 Tool FAILED、回答保留部分内容 | 时间线标失败；正文不消失；安全错误可见 |
| 断线恢复 | SSE PAUSED/RETRYING | 保留最后内容；显示继续接收；sequence 不重复 |
| 引用危险 URL | canonical URL 非 allowlist | 来源显示为纯文本，不可点击 |
| 大型富响应 | 200 行表、K 线、图表 | 单块预算生效；中栏可滚；证据不重复铺底 |
| 移动 390px | 证据 4 条、长标题 | 单栏无横滚；证据 Drawer 全宽；标题截断 |
| 深色主题 | 完成态与 warning | 对比度清晰；成功/警告不靠颜色单独表达 |
