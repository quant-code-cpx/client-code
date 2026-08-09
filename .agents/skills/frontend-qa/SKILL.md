---
name: frontend-qa
description: 对当前量化前端执行页面测试、业务联调、冒烟、回归、浏览器诊断和缺陷复现。用户要求测试、验证、找问题、检查 console/network、联调或回归时使用；默认只诊断，明确要求修复时才修改代码并进入回归闭环。
---

# Frontend QA

先从业务与契约设计用例，再用真实浏览器、网络证据和自动化测试验证。

## 授权边界

- “测试/找问题/诊断”只允许读取、运行和报告，不自动改代码。
- “测试并修复/修好后回归”允许做最小修复、补回归测试并验证。
- 后端、数据或设计缺口不擅自改前端契约；记录证据和责任边界。

## 工作流

1. 读取根 `AGENTS.md`、`$quant-client`、对应设计/需求、后端 Controller/DTO、前端 API 和业务入口。
2. 从业务规则独立写测试模型：用户目标、核心不变量、金融公式、权限、日期、单位、联动和失败语义。
3. 完整读取 `references/test-case-design.md`，在执行前形成用例矩阵；不让现有 spec 决定“应该正确”的结果。
4. 检查目标 View、子组件、Hook、API、MSW/fixture 和既有测试，补足执行路径与可观测点。
5. 按 `references/browser-checklist.md` 准备前端、后端或 mock 环境；记录版本、账号角色、数据日期和视口。
6. 逐条执行：页面/DOM、用户操作、请求 Body、响应、console、network、视觉状态和可访问性；记录 PASS/FAIL/SKIP。
7. 对 FAIL 做根因分类：frontend-code、frontend-contract、backend、data、environment、design-gap；给出最短复现和证据。
8. 仅在授权修复时读取根因实现、补失败测试、做最小修改，再运行相关 Vitest、lint、typecheck、build 和浏览器回归。
9. 需要报告时使用 `references/report-template.md`；新增文档同步 `docs/README.md` 与已知问题清单。

## 必测维度

- 首屏、loading、empty、error/retry、权限和会话过期。
- 核心指标、单位、精度、排序、日期、`null`、极值和长文本。
- 筛选、分页、Tab、URL、刷新、返回、Drawer/Dialog 和下钻。
- ApexCharts/KLineCharts 的轴、图例、tooltip、选中、缩放、销毁和空数据。
- 请求方法、Body、取消、并发、401 refresh、错误映射和重复操作。
- `1440×900` 桌面布局、键盘、焦点、ARIA、对比度和 reduced-motion。

## 完成标准

- 每个结论都能指向业务依据、请求/响应、console、DOM、截图或自动化测试。
- FAIL 有严重度、复现、期望/实际、根因分类和影响范围。
- 修复任务具有失败前测试、最小修复、相关回归和构建证据。
- SKIP 和未验证项说明具体技术原因，不伪造覆盖。
