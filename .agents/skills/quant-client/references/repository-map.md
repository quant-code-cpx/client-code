# 仓库地图

## 主链路

`src/routes/sections.tsx` → `src/pages/*.tsx` → `src/sections/<feature>/view/*-view.tsx` → 功能组件。

## 目录归属

- `src/api/`：业务请求、DTO 类型、生成契约和流式客户端。
- `src/pages/`：路由薄壳，不承载业务逻辑。
- `src/sections/<feature>/`：页面编排、私有组件、Hook、类型和纯函数。
- `src/components/`：跨功能共享 UI、ApexCharts 和 KLineCharts 封装。
- `src/theme/`：MUI palette、typography、component defaults、shadow 和主题配置。
- `src/routes/`：懒加载路由、守卫、元数据和导航行为。
- `src/layouts/`：应用 shell 与导航配置。
- `src/auth/`、`src/permission/`：认证和权限。
- `src/mocks/`、`src/test/`：MSW 与共享测试设施。
- `e2e/`：Playwright 业务流程与 fixture。

## 修改顺序

1. 核对 `../server-code` Controller/DTO/Swagger 或现有冻结契约。
2. 修改 `src/api/<feature>.ts` 或对应生成器输入。
3. 修改 `src/sections/<feature>/` 的类型、Hook、纯函数、组件和 View。
4. 仅在需要新路由时修改 `src/pages/`、`src/routes/sections.tsx` 与导航配置。
5. 同步最近 `__tests__/`、MSW handler/fixture、E2E 和文档。

## 查找原则

- 优先搜索现有同类页面和共享组件，避免重复实现。
- 生成文件通过 `scripts/generate-*.mjs` 更新。
- 后端字段不明确时查相邻 `../server-code/src/apps/<feature>/`，不要在前端猜。
