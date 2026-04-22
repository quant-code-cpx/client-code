# Feature Iteration Workflow & Skill Invocation Rules

> Load this file when: starting a new feature iteration (design or implementation), or when you need the detailed skill invocation rules.

---

## 三段式工作流总览

| 用户指令示例       | 执行阶段  | 产出物                 |
| ------------------ | --------- | ---------------------- |
| "设计信号模块"     | 阶段一    | `信号-前端设计.md`     |
| "开始设计行业轮动" | 阶段一    | `行业轮动-前端设计.md` |
| "实现信号模块"     | 阶段二+三 | 代码 + 文档状态更新    |
| "开始实现行业轮动" | 阶段二+三 | 代码 + 文档状态更新    |
| "更新一下文档"     | 阶段三    | 仅更新盘点/汇总/README |

> **重要**：如果用户没有明确说明阶段，**优先询问**而非假设，防止误操作写代码或误操作只写文档。

---

## 完整技能调用流程

```
阶段一（设计）
  └─ 读取 frontend-design skill (~/.agents/skills/frontend-design/SKILL.md)
  └─ 结合 quant-client 风格约束（专业金融、信息密度优先，避免实验性设计）
  └─ 产出 docs/design/<模块名>-前端设计.md
  └─ 在 docs/README.md 新增条目，状态 🔧 待实现

阶段二（实现）
  └─ 读取 mui skill（编写 MUI 组件、sx 样式时）
  └─ 读取 vercel-react-best-practices skill（数据获取、性能敏感代码时）
  └─ 按顺序：src/api/ → src/sections/ → src/pages/ → routes → nav
  └─ 完成后：ESLint → yarn build → 确认 ✓ built in ...
  └─ 检查并更新测试文件（load resources/testing.md）

阶段二完成后（代码审查）
  └─ 读取 web-design-guidelines skill
  └─ fetch https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
  └─ 输出 file:line — 问题描述 格式的审查报告
  └─ 修复技术合规问题（不改动视觉方向）

阶段三（文档更新，构建通过后自动执行）
  └─ docs/前端功能缺口盘点.md：将端点从"未接入"移至"已接入"，更新覆盖率
  └─ docs/已有功能汇总.md：新增模块行，更新路由总数/API 文件数
  └─ docs/README.md：状态从 🔧 待实现 → ✅ 已实现
```

> **注意**：`web-design-guidelines` 会 fetch 远端规则文件，需要网络连接。若网络不通，跳过 fetch，使用已知规则（dark mode、animation、typography、accessibility）。

---

## Skill 职责边界（防冲突规则）

| Skill                         | 职责                                     | 触发时机 | 输出     |
| ----------------------------- | ---------------------------------------- | -------- | -------- |
| `frontend-design`             | 视觉方向：组件层级、色调、排版、空间结构 | 阶段一   | 设计文档 |
| `mui`                         | MUI v7 组件 API、sx prop、主题用法       | 阶段二   | 代码     |
| `vercel-react-best-practices` | React 性能：memo、数据获取、bundle       | 阶段二   | 代码     |
| `web-design-guidelines`       | 技术合规：dark mode、aria、transitions   | 阶段二末 | 审查报告 |

**三条铁律**：

1. `frontend-design` 管"长什么样"，`web-design-guidelines` 管"代码写得对不对" — **职责不重叠**
2. 先设计 → 再实现 → 再审查 — **顺序不可颠倒**
3. `web-design-guidelines` 审查只纠正技术问题，不推翻设计文档已定的视觉方向 — **设计文档是边界**
