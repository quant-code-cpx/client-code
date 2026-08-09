# 前端 API 与数据契约

## 请求

- 业务模块只调用 `apiClient.post()`。
- 查询、筛选、分页和资源 ID 放在 JSON Body；不新增 query string 或 path-ID 变体。
- 调用函数提供明确参数与返回类型；不要向组件暴露原始 `ResponseModel` 包装。
- `AbortSignal`、timeout 和 401 replay 使用 `src/api/client.ts` 现有能力，不在每个模块重复实现。

## 日期与空值

- `trade_date` 使用 `YYYYMMDD` 八位字符串；禁止传 `YYYY-MM-DD` 或 ISO。
- 展示 date-only 金融字段时显式格式化为目标格式；完整时间使用现有日期工具。
- 后端 nullable 数值声明 `number | null`；排序、计算、颜色和格式化必须保留“未知”与“零”的区别。
- 对单位、币种、百分比、万/亿和精度使用现有 formatter；禁止页面各自重复换算。

## 枚举与金融语义

- 枚举大小写以 Controller DTO/Swagger 为准，不从标签文本反推。
- A 股涨为红、跌为绿；零和 `null` 使用中性样式并显示明确占位。
- 指标必须明确日频/区间、前复权/后复权/不复权、金额/数量单位和报告期。

## 生成契约

- `src/api/generated/agent-api.ts` 由 `yarn api:agent:generate` 生成，使用 `yarn api:agent:check` 查漂移。
- `src/api/generated/news-api.ts` 由 `yarn api:news:generate` 生成，使用 `yarn api:news:check` 查漂移。
- 不手工修改生成文件；先改生成输入、后端契约或生成脚本。

## 契约变更检查

1. 后端路径、Body、响应 DTO、错误与权限已冻结。
2. API 类型、MSW fixture、组件空值处理和测试同步。
3. 旧调用方与旧路由兼容方式明确。
4. 相关 contract/API test 和 build 通过。
