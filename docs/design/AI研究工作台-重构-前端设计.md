# AI 研究工作台 — UI 重构前端设计（范围修正版）

> 状态：✅ UI-only 已实现（MUI Core 等价实现，未引入 MUI X Chat runtime）
> 更新日期：2026-08-04
> 路由：`/agent`、`/agent/:conversationId`
> 主入口：`src/sections/agent/view/agent-view.tsx`
> 设计视角：资深金融产品经理 + 资深二级市场研究员 + 资深 UI/UE 设计师
> 本轮定义：**只重构 UI 与组件层；功能、API、状态机、工具权限、数据契约和业务流程全部保持不变**

---

## 一、功能提炼

### 1.1 用户诉求与纠偏结论

用户要解决的是“AI 研究界面太丑”，并允许使用 MUI X；不是重新定义 AI 研究产品，也不是增加新的 Agent 能力。

本方案因此采用严格的 UI-only 边界：

| 可以改变 | 不可以改变 |
| --- | --- |
| 页面布局、视觉层级、间距、密度、响应式 | 现有 API、POST-SSE 协议、请求参数与返回契约 |
| 现有内容的组件组织和展示位置 | reducer、generation/sequence、流恢复、取消竞态 |
| 会话、消息、工具记录、引用、provenance、Composer 的外观 | 工具权限、模型选择逻辑、消息发送逻辑、业务状态 |
| MUI / MUI X Chat 的主题、slots、可访问性能力 | 新增模板、附件、反馈、跨页上下文、会话治理、定时研究 |
| 桌面证据侧栏与移动 Drawer（同一批现有引用数据） | 新接口、新字段、新持久化偏好、新后端支持需求 |

**范围门禁：功能增减 = 0；API 变更 = 0；业务状态新增 = 0。**

### 1.2 重构目标

| # | UI 目标 | 用户价值 | 是否改变功能 |
| --- | --- | --- | --- |
| 1 | 压缩顶部区域并明确会话标题、模型与既有动作 | 首屏更聚焦回答 | 否 |
| 2 | 会话栏从 288px 收敛至 248px，并提升选中/分组/搜索层级 | 历史会话更易扫描 | 否 |
| 3 | Assistant 回答改为编辑式正文，不再层层套卡片 | 长回答更像研究稿 | 否 |
| 4 | 工具执行记录默认折叠为一组，失败项保持高可见 | 技术过程不打断正文 | 否 |
| 5 | 桌面端把当前回答已有引用与 provenance 放入证据栏 | 正文与证据可并行核验 | 否 |
| 6 | Composer 改为稳定的 MUI X 风格输入坞 | 输入、发送、停止更清晰 | 否 |
| 7 | 统一运行中、失败、断线、完成的视觉语义 | 状态可扫读且不跳动 | 否 |
| 8 | 保留现有移动 Drawer，并让正文优先占满屏幕 | 小屏可用性更好 | 否 |

### 1.3 三个专业视角

#### 金融产品经理视角

- 本轮成功标准不是“功能更多”，而是现有研究链路更易理解、更可信、更高效。
- 报告、记忆、通知和模型选择继续使用原动作与原权限，只调整顶部的分组与视觉权重。
- 完成态优先突出回答和来源；运行元信息降级，错误与断线状态升级。

#### 二级市场研究员视角

- 正文、财务指标、表格、K 线、风险块继续保留现有口径和渲染器。
- 引用、发布方、定位信息、数据时间和 provenance 是既有证据，桌面端并列展示更利于核验。
- 工具记录用于审计而非阅读主线；成功记录默认收起，失败记录可直接看到原因和重试入口。
- `null`、0、币种、比例、复权和 quality flags 的既有语义不得因换组件而变化。

#### UI/UE 设计师视角

- 视觉方向：**Quiet Research Desk（安静的研究桌面）**。
- 使用项目现有 MUI 主题、中性色面板、轻分隔和高密度排版；不使用紫色渐变、玻璃拟态、巨型欢迎卡。
- Assistant 正文不加外层气泡；边框只用于结构边界、工具详情和证据卡。
- 不通过新增控件制造“AI 感”，而用流式状态、来源编号、工具披露和 Composer 形态表达智能交互。

### 1.4 核心使用路径（完全沿用现有功能）

1. 用户从既有会话栏新建或选择会话。
2. 用户在既有 Composer 输入问题，按原规则发送。
3. 运行状态条显示现有 `stageLabel/progress`；用户可按原能力停止。
4. Assistant 按原消息、富响应块和工具调用数据持续渲染。
5. 用户按原能力查看工具详情、引用和 provenance。
6. 用户按原能力复制、重新生成、保存报告，或打开记忆/报告/通知入口。

### 1.5 待确认清单

- [x] **Q1：允许使用 MUI X。** 用户已确认；实现时仅选择性采用 UI 组件，不迁移运行时。
- [x] **Q2：桌面端采用 248px 会话栏 + 弹性正文 + 320px 证据栏。** 已实现；证据栏只显示当前 Assistant 回答已有的引用/provenance，窄屏降级为 Drawer。
- [x] **Q3：采用 MUI Core 复刻同一 UI 稿。** 未引入 MUI X Chat alpha，避免为表现层增加 Provider/runtime 或第二业务数据源。

---

## 二、现状盘点

### 2.1 当前能力基线

| 区域 | 当前实现 | 本轮处理 |
| --- | --- | --- |
| 页面与编排 | `AgentView` + `AgentProvider` + `AgentShell` | 只拆分展示组件与布局 |
| 状态与流 | normalized reducer、generation/sequence、乐观消息、POST-SSE、恢复/取消/重生成 | **完全不动** |
| 会话 | 288px 侧栏、新建、客户端搜索、分组、分页、移动 Drawer | 换布局密度与选中样式 |
| 消息 | `react-virtuoso`、用户/Assistant 消息、加载旧消息、回到最新 | **保留 Virtuoso 与行为**，换消息外观 |
| Composer | IME、Enter/Shift+Enter、10k、草稿、发送/停止 | **行为完全保留**，换容器和控件外观 |
| 运行状态 | `RunStatusBar` 使用既有阶段/进度/恢复状态 | 换为紧凑状态带 |
| 富响应 | Markdown、表格、图表、K 线、财务指标、风险提示 | 原渲染器原样嵌入新正文 |
| Tool/引用 | 工具记录、引用列表、provenance、脱敏详情按需加载 | 重新分组与排版，不改数据 |
| 辅助能力 | 报告、记忆、通知 Dialog/Drawer | 入口重排，功能和容器不改 |

### 2.2 现状视觉问题

| 优先级 | 问题 | 影响 | UI 对策 |
| --- | --- | --- | --- |
| P0 | 288px 会话栏 + 860px 正文上限造成宽屏大量留白 | 研究内容与来源不能并读 | 248 / flexible / 320 三段网格 |
| P0 | Assistant 正文、工具、引用、provenance 都是相似边框卡片 | 信息层级扁平，像日志面板 | 正文无外框；工具折叠；证据独立侧栏 |
| P0 | 顶部大标题、多个图标和模型按钮挤在一起 | 首屏占高且动作关系不明 | 56px 紧凑会话顶栏，动作分组 |
| P0 | 每条完成消息重复显示 Agent、完成、时间 | 元信息抢占阅读注意力 | 完成态元信息降级；异常态保持醒目 |
| P1 | Tool 名称、参数和来源 locator 打断正文节奏 | 研究结论不连贯 | 工具组默认折叠，证据编号内联 |
| P1 | Composer 外观接近普通表单 TextField | 发送/停止状态辨识弱 | 稳定输入坞、明确主动作、保持现有快捷键 |
| P1 | 移动端正文、侧栏和来源竞争空间 | 可读宽度不足 | 双 Drawer + 单列正文；操作栏允许换行 |

### 2.3 不纳入本轮的问题

以下内容即使未来有价值，也不能借 UI 重构顺带实现：

- 研究模板、快捷提示词、附件上传、消息反馈。
- `pageContext`、研究对象自动注入、工具 capability 开关。
- 会话重命名、置顶、归档、标签和服务端搜索。
- 定时研究、报告能力扩展、记忆表单重做、通知功能扩展。
- 后端 API、SSE 事件协议、Agent runtime、数据模型和权限策略迁移。

### 2.4 MUI X Chat 技术调研

核验日期：2026-08-04。项目当前为 React `^19.1.0`、MUI Material `^7.3.10`，满足 `@mui/x-chat` 当前 peer dependency 范围。

| 维度 | 调研结论 | 对本项目的决策 |
| --- | --- | --- |
| 组件 | 有 `ChatConversationList`、`ChatMessageList`、`ChatComposer` 及其 TextArea/SendButton 等独立 Material 组件 | 可按组件评估，不使用整页黑盒 |
| 定制 | 支持 theme、`sx`、classes、`slots/slotProps` | 与当前 MUI 风格匹配 |
| 受控状态 | `ChatProvider` 支持 messages、conversations、active id、composer value 受控 | 理论上可映射现有状态，但不能形成第二业务数据源 |
| 运行时 | `ChatBox/ChatRoot` 会创建或依赖自己的 ChatProvider；runtime 处理流式、归一化和状态 | **本轮不采用**，避免与现有 reducer/SSE 重叠 |
| 可访问性 | 消息列表提供 roving focus、键盘进入/退出消息控件和 live region | 适合作为消息层可访问性参考/候选实现 |
| 稳定性 | 当前 npm 版本 `9.0.0-alpha.15`，官方明确 API 尚不稳定 | 只允许精确锁版本，并用本地 wrapper 隔离 |
| 许可 | Community / MIT，无 Pro/Premium 分层 | 许可适配，无商业版依赖 |

官方依据：

- [MUI X Chat 总览](https://mui.com/x/react-chat/)：Material 主题、会话、消息、Composer 和可访问性能力。
- [Controlled state](https://mui.com/x/react-chat/backend/controlled-state/)：messages、conversations、active conversation、composer value 的受控模式，以及 `ChatBox`/`ChatRoot` 与 Provider 的边界。
- [Composer](https://mui.com/x/react-chat/material/composer/)：独立 Composer 结构与可替换 slots。
- [Message list](https://mui.com/x/react-chat/material/message-list/)：消息列表键盘模型与消息内控件 drill-in。
- [Material customization](https://mui.com/x/react-chat/material/customization/)：theme、`sx`、classes、slots 与 slotProps。
- [npm 包页](https://www.npmjs.com/package/@mui/x-chat)：版本、peer dependencies、MIT 和 alpha 风险声明。

### 2.5 选型结论

**交付选择 MUI Core 等价实现，保留 MUI X Chat 的视觉与可访问性原则，但拒绝运行时迁移。**

组件级决策：

| 候选 | 决策 | 原因 |
| --- | --- | --- |
| `ChatBox` / `ChatRoot` | 不使用 | 会引入自身 Provider/runtime，扩大状态与流式回归面 |
| `ChatMessageList` | 暂不替换生产列表 | 当前 Virtuoso 已解决长会话虚拟化、跟随和历史分页；先保留 |
| `ChatConversationList` | 未引入 | 现有会话列表以 MUI Core 重排，保留列表、选中、分页和搜索行为 |
| `ChatComposer` 子组件 | 未引入 | 以 MUI Core 保留文本、计数、发送/停止；不渲染附件或工具栏 |
| Message/Source 的 Material 样式与 slots | MUI Core 等价实现 | 现有 Markdown、富块、Tool、Citation 数据结构继续工作 |

实施时建立本地 `agent-chat-ui` wrapper。页面只能引用 wrapper，不直接散落 MUI X alpha API。若候选组件要求接管流式、发送或消息归一化，则该组件门禁失败，改用 MUI Core 实现同一 UI 稿。

Ant Design X 不作为依赖：它的 AI 交互模式可参考，但引入会形成 MUI/Ant Design 双主题和双 token；本项目已有 MUI 7，MUI X 或 MUI Core 的一致性更高。

---

## 三、功能细化

### 3.1 页面组件树

```text
AgentView
└─ AgentProvider（现有，保持）
   └─ AgentShell
      ├─ ConversationRail
      │  ├─ NewConversationButton（现有行为）
      │  ├─ ConversationSearch（现有客户端搜索）
      │  └─ ConversationList（现有分组/分页/选中）
      ├─ ThreadWorkspace
      │  ├─ ThreadHeader
      │  │  ├─ MobileRailTrigger
      │  │  ├─ ConversationTitle
      │  │  ├─ ModelControl（现有）
      │  │  └─ ExistingActions（报告/记忆/通知）
      │  ├─ RunStatusStrip（现有状态映射）
      │  ├─ MessageViewport（现有 react-virtuoso）
      │  │  ├─ UserMessage
      │  │  └─ AssistantArticle
      │  │     ├─ Markdown / ExistingRichBlocks
      │  │     ├─ ToolDisclosureGroup
      │  │     ├─ MobileEvidenceDisclosure
      │  │     └─ ExistingMessageActions
      │  └─ ComposerDock（现有行为）
      └─ EvidenceRail / EvidenceDrawer
         ├─ CitationList（当前回答已有数据）
         └─ ProvenancePanel（当前回答已有数据）
```

### 3.2 布局规则

| 断点 | 会话栏 | 正文 | 证据区 |
| --- | --- | --- | --- |
| `≥ 1440px` | 固定 248px | 弹性，正文内容最大 760px | 固定 320px |
| `1200–1439px` | 固定 232px | 弹性 | 288px 或按可用宽度转 Drawer |
| `900–1199px` | 232px | 单主栏 | Drawer |
| `< 900px` | Drawer | 单主栏占满 | Drawer / 消息内折叠区 |

- 证据栏展示“当前可见的最新 Assistant 回答”的已有 Citation/Provenance；无证据时整栏不占位。
- 证据栏内容只是现有数据的第二种布局，不产生新的选中持久化、查询或 API。
- Composer 与正文中心线对齐，最大宽度 820px；长表格/图表可在正文容器内使用现有横向滚动规则。

### 3.3 顶部区域

- 高度目标 56px，左侧为移动菜单/会话标题，右侧为现有模型控制和报告、记忆、通知动作。
- 图标按钮继续使用原 accessible name、权限、disabled 条件和事件处理器。
- 桌面端不再显示大 PageHeader；路由层级由紧凑标题承担。
- 标题过长单行截断，悬停/聚焦展示完整标题；不新增改名功能。

### 3.4 会话栏

- “新建研究”继续触发现有新建会话逻辑。
- 搜索仍只过滤当前已加载会话，不改成服务端搜索。
- 分组、加载更多、空态和错误态沿用现有状态。
- 会话项只重排标题、时间/预览、选中条；不新增菜单、置顶、归档、标签或未读状态。
- MUI X `ChatConversationList` 只有在能保留上述事件和测试语义时才替换；否则继续使用 MUI List 组件。

### 3.5 消息与富响应

#### 用户消息

- 右对齐、最大宽度 72%，使用主题浅色填充；保持发送中、失败、重试等既有状态。
- 时间和发送状态放在气泡下方弱化显示；错误原因和重试入口仍保持高对比度。

#### Assistant 消息

- 以正文文章呈现，不加整块气泡或大卡片。
- 角色/时间使用 12px 弱元信息；完成标签默认不重复显示，流式/失败/断线按原状态显示。
- Markdown、表格、图表、K 线、财务指标、风险块继续调用现有 renderer；不重写数据格式化。
- 正文中的引用编号维持现有数据顺序；点击/聚焦后在证据栏定位同一来源，移动端展开同一来源内容。

### 3.6 工具执行记录

- 多条 Tool Call 归入“工具执行记录 · N”Disclosure，默认收起成功项。
- 运行中、等待确认、失败等状态仍由现有 Tool 状态决定，不推导新状态。
- 展开后继续使用现有脱敏摘要、按需详情、审批/重试能力和 accessible name。
- 不展示模型私有思维链，不增加自造的“研究计划”或步骤数据。

### 3.7 引用与 provenance

- 桌面证据栏分为“引用来源”和“数据口径”两组。
- 引用卡只显示当前已有字段：序号、标题/URL、publisher、locator、时间等；缺失字段不造默认值。
- provenance 继续显示现有数据口径和质量信息，不增加置信分或来源等级。
- 当证据栏不可用时，引用与 provenance 回落到消息正文后的既有折叠区域，信息不能丢失。

### 3.8 Composer

- 外观采用 MUI X Chat Composer 的紧凑输入坞：圆角容器、自动增长文本区、底部辅助行、右侧主动作。
- **仅包含现有元素**：文本输入、字数/限制提示、发送或停止；没有附件按钮、模板、工具 chips、能力开关、上下文入口。
- 保持 IME、Enter 发送、Shift+Enter 换行、10k 限制、草稿隔离、发送禁用和停止语义。
- 若使用 MUI X 子组件，所有 `value/onChange/onSubmit` 继续由现有 Composer 接口提供；不得由 ChatProvider 管理业务草稿或发送。

### 3.9 状态与空态

| 状态 | 展示 | 行为来源 |
| --- | --- | --- |
| 初始空态 | 简洁标题、说明和 Composer | 现有空态；不加模板 |
| 运行中 | 紧凑状态带、现有阶段、进度、停止 | 现有 run state |
| 工具执行中 | Tool Disclosure 标记运行中 | 现有 tool call state |
| 断线/恢复 | 状态带显示原恢复文案和操作 | 现有 reconnect state |
| 失败 | 消息或状态带显示原错误与重试 | 现有 error/retry state |
| 完成 | 状态带弱化或退出，回答成为视觉主角 | 现有 terminal state |

---

## 四、UI/UE 设计

### 4.1 视觉语言

| 项目 | 规范 |
| --- | --- |
| 色彩 | 只使用 `theme.palette.*` 与 `varAlpha(...)`；背景、中性分隔、主色和语义色继承当前主题 |
| 字体 | 沿用项目字体；正文 14px/1.7，辅助信息不低于 12px，金融数字使用 tabular nums |
| 字重 | 正文 400，标题和关键标签 500；避免大面积 600/700 |
| 圆角 | 输入坞 12px；局部面板 8px；消息正文不使用外层卡片圆角 |
| 阴影 | 只给悬浮 Composer/Drawer 使用主题低层级阴影；普通内容不加阴影 |
| 分隔 | 主栏使用 divider；内容层级优先依靠留白与标题，不用连续边框盒子 |
| 动效 | 150–200ms 淡入/展开；遵循 `prefers-reduced-motion`；流式文本不逐 token 闪烁 |

### 4.2 桌面线框

```text
┌──────────── 248 ────────────┬──────────────── flexible ────────────────┬──── 320 ────┐
│ AI 研究        ＋新建研究   │ 会话标题        自动模型  报告 记忆 通知 │ 证据          │
│ [搜索会话…………………]        ├───────────────────────────────────────────┤ 引用来源      │
│ 今天                        │  当前阶段 · 已分析…                停止   │ [1] 来源标题  │
│ ▌选中的会话                 ├───────────────────────────────────────────┤     发布方/时间│
│   其他会话                  │                              用户问题     │ [2] 来源标题  │
│ 昨天                        │                                           │               │
│   历史会话                  │ Assistant · 时间                          │ 数据口径      │
│                             │ 研究回答正文，无外层气泡                  │ 数据日期      │
│                             │ 指标 / 表格 / 图表 / 风险块               │ 报告期/口径   │
│                             │ [工具执行记录 · 3]                        │               │
│                             │ 复制  重新生成  保存报告                  │               │
│                             ├───────────────────────────────────────────┤               │
│                             │ [继续提问………………………………]  0/10000  发送 │               │
└─────────────────────────────┴───────────────────────────────────────────┴───────────────┘
```

### 4.3 移动线框

```text
┌──────────────────────────────┐
│ ☰  会话标题      自动模型 ⋯  │
├──────────────────────────────┤
│ 当前阶段 · 已分析…      停止 │
├──────────────────────────────┤
│                   用户问题   │
│                              │
│ Assistant · 时间             │
│ 研究回答正文                 │
│ 富响应块                     │
│ [工具执行记录 · 3]           │
│ [引用与数据口径 · 2]         │
│ 复制  重新生成  保存报告     │
├──────────────────────────────┤
│ [继续提问…………………]         │
│ 0/10000                发送  │
└──────────────────────────────┘
```

### 4.4 关键交互

- 打开/关闭会话 Drawer、证据 Drawer、Tool Disclosure 使用既有数据，属于展示状态，不写入后端。
- 键盘焦点顺序：会话栏 → 顶部动作 → 消息列表 → Composer；移动 Drawer 打开后焦点被约束，关闭后回到触发按钮。
- 消息内链接、复制、工具详情、重新生成、保存报告继续可键盘访问。
- 新消息流入时沿用 Virtuoso 的“用户仍在底部才自动跟随”；离开底部显示原“回到最新”。
- 引用编号与证据栏采用 `aria-describedby`/可识别标签建立关系；不依赖颜色表示选择。

### 4.5 UI 稿状态覆盖

本轮交互 UI 稿至少覆盖：

1. 桌面完成态：三段布局、回答、Tool 折叠、证据栏、Composer。
2. Tool 展开态：显示现有执行记录层级。
3. 证据栏收起态：正文扩展但功能不变。
4. 移动布局：会话与证据进入 Drawer/折叠区。

UI 稿中的文案与数字仅用于表现布局，不代表新增数据字段或业务能力。

---

## 五、实现步骤

### 5.1 实施原则

- 阶段二只修改 `src/sections/agent/components/` 下的展示组件、局部样式与必要的 UI wrapper。
- `state/`、`hooks/use-agent-run`、API facade、契约类型、SSE parser 原则上零改动；若出现需求，视为越界并停止实现。
- 所有 MUI 组件继续子路径导入；若引入 `@mui/x-chat`，只能由本地 wrapper 集中导入。
- 先建立功能同等测试，再替换外观，避免把功能回归误认为 UI 问题。

### 5.2 Phase 0：基线冻结与 MUI X 兼容门禁（0.5–1 天）

1. 记录当前 Agent 单测/E2E、关键 accessible name、发送/停止/恢复/重试行为。
2. 在隔离分支验证 `@mui/x-chat@9.0.0-alpha.15` 与 React 19、MUI 7.3.10、项目主题和构建兼容；版本精确锁定，不使用 `^`。
3. 分别验证 ConversationList、Composer 子组件能否在不接管发送/流式/消息归一化的情况下工作。
4. 若需要 `ChatBox/ChatRoot` 或第二套业务状态才能完成，则判定该组件门禁失败，使用 MUI Core 等价实现。

### 5.3 Phase 1：布局壳与顶部区域（1 天）

1. 将 `AgentShell` 的纯展示布局拆为 ConversationRail、ThreadWorkspace、EvidenceRail。
2. 建立 248 / flexible / 320 响应式网格与两个 Drawer 断点。
3. 压缩 ThreadHeader，原样接回模型、报告、记忆、通知的 props 与处理器。
4. 保持 `AgentProvider`、路由和 Dialog/Drawer 容器不变。

### 5.4 Phase 2：消息、Tool 与证据排版（1.5–2 天）

1. 保留 `MessageViewport`/Virtuoso，重做 UserMessage 与 AssistantArticle 外观。
2. 原样嵌入 Markdown 与全部富响应 renderer。
3. 将现有 ToolCallList 包为 Disclosure，不修改详情加载和动作处理。
4. 将现有 CitationList/Provenance 复用到 EvidenceRail，并保留移动/无侧栏回退展示。
5. 保持复制、重新生成、保存报告、失败重试的原事件与文案语义。

### 5.5 Phase 3：Composer 与状态带（1 天）

1. 用通过门禁的 MUI X Composer 子组件或 MUI Core 等价组件实现 UI 稿。
2. 接回现有 value、IME、字数、草稿、submit、stop 与 disabled 逻辑。
3. 重排 RunStatusBar，仅映射现有 stage/progress/reconnect/error 字段。
4. 不渲染附件、模板、工具栏、能力 chips 或新提示词入口。

### 5.6 Phase 4：主题、响应式与回归（1 天）

1. 覆盖 light/dark、320/375/768/1024/1440/1920 宽度。
2. 检查长中文、长 URL、长 Tool 名、大表格、图表、K 线和空/失败/恢复状态。
3. 完成键盘、焦点、screen reader live region 和 reduced motion 检查。
4. 按项目顺序执行 ESLint fix → ESLint 零输出 → build，再执行 Agent 定向单测与 E2E。

### 5.7 预估与回滚

- 预估：5–6 个前端工作日，不需要后端任务。
- 回滚单位：布局壳、消息排版、Composer/MUI X wrapper 分独立提交。
- 若 MUI X alpha 出现破坏性问题，只回滚 wrapper 到 MUI Core；页面视觉与业务状态不变。

### 5.8 实施结果（2026-08-04）

- 已完成会话栏、消息正文、Tool 折叠、证据栏、Composer 与运行状态带的 UI-only 重构。
- 证据栏仅复用当前 Assistant 消息已有的 Citation 与 Provenance；`>=1440px` 并列展示，窄屏使用右侧 Drawer。
- 移动端把已有的记忆、通知、报告入口收纳到菜单，未删减任何动作或权限判断。
- 未修改 `state/`、Agent hooks、API facade、契约类型或 SSE parser；未新增 `@mui/x-chat` 依赖。
- 已完成 Agent 定向单测（45 项）、ESLint 零输出、TypeScript/Vite 生产构建，以及 1600px / 375px 浏览器视觉验收。

---

## 六、验收方式

### 6.1 范围验收（最高优先级）

| 验收项 | 通过标准 |
| --- | --- |
| 功能数量 | 与重构前一致，不出现模板、附件、反馈、上下文、工具开关、会话治理等新入口 |
| API | 网络请求 method、URL、body、SSE 事件与次数无设计性变化 |
| 状态 | reducer、generation/sequence、恢复、取消、重试、乐观消息行为一致 |
| 权限 | 模型、Tool、报告、记忆、通知的可见/禁用/确认条件一致 |
| 数据 | Markdown、Tool、Citation、Provenance、全部富块字段无转换损失 |

任一项不满足，即判定 UI 重构越界，不得以“新库需要”为理由接受。

### 6.2 视觉验收

- 1440px 下会话栏约 248px、证据栏约 320px，回答内容中心稳定且无大面积无意义留白。
- Assistant 正文无整块气泡/卡片；Tool 与 Citation 不再和正文同级连续堆框。
- Header 约 56px，模型和现有动作可识别、不过度抢占标题。
- Composer 始终与正文对齐，发送/停止位置稳定，输入区域不因流式状态跳动。
- light/dark 下对比度、hover、focus-visible、disabled、error 均可辨识。

### 6.3 功能同等回归

- 新建/选择/搜索/分页会话与移动 Drawer 行为一致。
- 发送、IME、Shift+Enter、10k、草稿、停止、断线恢复、重试、重新生成行为一致。
- 旧消息分页、自动跟随、离开底部、回到最新行为一致。
- Tool 详情加载、审批/重试（若当前消息提供）、Citation 链接和 provenance 完整可达。
- 复制、保存报告、模型选择、记忆、报告、通知入口行为一致。
- Markdown 安全、Block whitelist、ErrorBoundary、CSV 防注入和金融格式测试全通过。

### 6.4 响应式与可访问性

- 320px 起无页面级横向滚动；宽表/图表只在自身容器内滚动。
- `<900px` 会话与证据不挤压正文，Drawer 焦点管理正确。
- 关键控件命中区不小于 44×44px；辅助字号不低于 12px。
- 仅键盘可完成选择会话、查看消息/工具/来源、输入、发送/停止和消息动作。
- live region 不逐 token 重复播报；引用、错误和输入限制有可理解标签。

### 6.5 工程门禁

```bash
node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"
node_modules/.bin/eslint "src/**/*.{ts,tsx}"
yarn build
```

并执行 Agent 相关定向单测、Mock E2E；真实后端环境可用时回归 POST-SSE、Tool 调用、停止与恢复。文档阶段只校验 Markdown、链接、目录和 UI 稿，不改业务代码。

### 6.6 最终完成定义

- 用户能明显感知布局、阅读和输入体验升级。
- 用户找不到任何因本轮新增或删除的业务功能。
- 网络、状态、工具权限和富响应的回归结果与当前基线一致。
- MUI X 可替换、可回滚，不成为 Agent 业务层的新依赖中心。
