# 浏览器执行检查表

## 环境

- 确认 dev server URL、前后端/Mock 模式、账号角色、目标数据日期和服务健康。
- 默认视口 `1440×900`；记录暗/亮主题和 feature flag。
- 优先使用可保持登录态的 in-app browser/Chrome 能力；没有时使用仓库 Playwright。

## 每条用例

1. 导航到明确 URL，截图或快照记录初始状态。
2. 执行真实用户操作：点击、输入、键盘、滚动、切换和返回。
3. 检查新增 console error/warning。
4. 检查目标 network 请求的方法、URL、Body、状态、响应和耗时。
5. 检查 DOM/可见文本、loading/empty/error 和最终视觉状态。
6. 记录 PASS/FAIL/SKIP 与证据；FAIL 保存最短复现。

## 图表

- 检查容器尺寸、轴/图例/tooltip、单位和类别顺序。
- 精确点击实际数据元素，不用图表背景点击代替交互验证。
- 切换筛选后同时检查请求参数、series 更新和 console。
- 覆盖空数据、单点、极值、长标签和 resize/destroy。

## 结束

- 回归受影响功能和页面首屏。
- 关闭临时调试开关，不提交截图缓存、认证状态或个人数据。
- 报告环境限制与未覆盖路径。
