# Quant Client — AI 编程规则

> **本文件精简设计**：只保留最小必知规则 + 导航入口。详细内容在 skill 文件中，**按需加载，不提前读**。

---

## 第一步（强制）：接触任何代码前必须加载

```
.claude/skills/quant-client/SKILL.md
```

不得凭名字推断内容，必须用 `read_file` 实际读取。

---

## Skill 按需加载表

| 触发场景                                     | 加载文件                                               |
| -------------------------------------------- | ------------------------------------------------------ |
| 接触任何代码（必须）                         | `.claude/skills/quant-client/SKILL.md`                 |
| 写 MUI 组件 / sx 样式                        | `.claude/skills/mui/SKILL.md`                          |
| 写 React 组件 / 数据获取                     | `.claude/skills/vercel-react-best-practices/SKILL.md`  |
| 阶段一：用户说"设计 / 重设计 / 重构 XX"      | `.claude/skills/design-blueprint/SKILL.md`（**入口**） |
| 阶段一：design-blueprint 第 4 章生成视觉方向 | `.claude/skills/frontend-design/SKILL.md`              |
| 阶段二末：yarn build 通过后                  | `.claude/skills/web-design-guidelines/SKILL.md`        |

quant-client 子资源（按需）：

- `resources/eslint-rules.md` — 18 条 ESLint 规则详解
- `resources/testing.md` — 测试模板与原则
- `resources/workflow.md` — 三段式工作流与 skill 协同

---

## 不加载 skill 也绝对不能违反的 5 条

1. **`pages/` 只做薄壳** — 业务逻辑与 JSX 全在 `src/sections/*/view/`
2. **所有请求用 `apiClient.post()`** — 参数走 Body，禁止 GET / query string / URL 路径 ID
3. **禁止硬编码颜色** — 只用 `theme.palette.*` / `varAlpha(...)`
4. **MUI 必须子路径导入** — `import Box from '@mui/material/Box'`，禁止 barrel
5. **`trade_date` 固定 `YYYYMMDD` 字符串**

---

## 三段式工作流（阶段不明时必须先问用户）

| 用户指令               | 执行阶段    | 产出                                           |
| ---------------------- | ----------- | ---------------------------------------------- |
| "设计 XX" / "开始设计" | 阶段一      | `docs/design/<模块名>-前端设计.md`，**零代码** |
| "实现 XX" / "开始实现" | 阶段二 + 三 | 代码落地 + 验证 + 更新 3 份文档                |
| "更新文档"             | 阶段三      | 仅更新 docs/ 三份文件                          |

---

## 验证（每次改代码后必须，顺序不可颠倒）

```bash
node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"
node_modules/.bin/eslint "src/**/*.{ts,tsx}"   # 退出码 0 且无输出
yarn build                                      # 必须看到 "✓ built in ..."
```
