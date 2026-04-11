# 量化研究前端

> **技术栈**：React 19 · TypeScript 5.8 · MUI v7 · Vite 6 · ApexCharts · Socket.IO
> **基于**：Minimal UI Free Template

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产包
pnpm build
```

浏览器打开 `http://localhost:3039`

---

## 已实现功能模块

| 模块             | 路由                      | 说明                               |
| ---------------- | ------------------------- | ---------------------------------- |
| 首页仪表盘       | `/`                       | Dashboard 布局、行情概览、快捷入口 |
| 市场概览         | `/market/overview`        | 指数、情绪指标、板块、成交量       |
| 资金动态         | `/market/money-flow`      | 市场/板块/个股级资金流向           |
| 因子市场         | `/factor/*`               | 因子库、因子详情、相关性分析、选股 |
| 回测工作台       | `/backtest/*`             | 策略回测、任务历史、报告详情       |
| 回测高级功能     | `/backtest/walk-forward`, `/backtest/comparison` | 步进式优化、策略对比分析 |
| 股票列表 & 详情  | `/stock`, `/stock/detail` | 行情列表、个股多维度分析           |
| 选股器           | `/stock` (对话框)         | 多维度筛选、排序、策略保存         |
| 自选股           | `/watchlist`              | 自选股 CRUD、行情汇总、批量操作    |
| 研究笔记         | `/research-notes`, `/research-notes/:id` | CRUD + 标签 + 按股票查询 |
| 策略管理         | `/strategy`, `/strategy/:id` | 策略模板 CRUD、克隆、发起回测、草稿箱 |
| 选股条件订阅     | `/screener-subscription`  | 条件订阅 + 定期执行 + 执行日志     |
| Tushare 同步管理 | `/tushare-sync`           | 数据同步计划、缓存状态、质量检查   |
| 用户管理         | `/user-manage`            | 用户 CRUD、状态管理、审计日志      |
| 用户个人中心     | `/profile`                | 修改密码、修改资料                 |
| 认证             | `/sign-in`                | 登录、验证码、Token 管理           |

---

## 🔶 待开发 — 后端已实现但前端缺失

| 优先级 | 模块         | 说明                                           |
| ------ | ------------ | ---------------------------------------------- |
| 🔶 中  | **热力图**   | 市场涨跌幅分布热力图 — 市场概览增强             |
| 🔶 中  | **指数行情** | 指数列表/日线/成分股独立页面 — 市场数据补充    |

---

## 文档

详细设计文档与待办清单见 [docs/README.md](docs/README.md)。
