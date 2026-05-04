# K 线形态匹配 — 前端设计（v2 重构）

> 状态：📐 设计中（阶段一）
> 创建日期：2026-04-28
> 主入口：`src/sections/pattern/view/pattern-view.tsx`
> 子入口：`src/sections/stock-detail/analysis/analysis-pattern-tab.tsx`
> 设计视角：资深金融产品经理 + 资深量化/二级市场从业者 + 资深 UI/UE 设计师
> 旧版对照：[archive/K线形态匹配-前端设计.md](../archive/K线形态匹配-前端设计.md)

---

## 一、功能要点提炼与补充（PM 视角）

### 1.1 用户原始诉求复述

> "审查形态匹配页面，看看是否有需要优化的点，落实到文档，需要后端支持的也落实到文档。"

即：对现有 `/stock/pattern` 独立页与股票详情『形态识别』Tab 进行体检 → 输出可落地的优化设计文档，并区分前端可独立完成项与需要后端配合项。

### 1.2 模块定位与价值主张

- **30 秒回答的问题**：当前股票（或全市场）历史上有没有出现过我关心的图形（头肩、双顶、楔形…），出现完后接下来涨还是跌？
- **3 分钟内能完成的动作**：选模板/画形态 → 设区间 → 拿到 Top N 匹配 → 点进任意一条看 K 线对照与"匹配完成后 N 日的收益"。
- **与相邻模块边界**：
  - 与"事件驱动研究"区别：事件驱动以**业绩、政策、公告**为锚；形态匹配以**纯价格曲线相似度**为锚。
  - 与"选股器"区别：选股器是**横截面截面筛选**；形态匹配是**时序窗口相似度**。
  - 与"股票详情 → 技术指标 Tab"区别：技术指标看**当前**形态状态；形态匹配看**历史窗口的全图相似度**。

### 1.3 功能要点提炼（结构化）

| #   | 功能点                      | 用户决策场景                                   | 数据来源                           |
| --- | --------------------------- | ---------------------------------------------- | ---------------------------------- |
| 1   | 浏览预定义形态模板库        | 选哪种图形是我的研究对象                       | `/api/pattern/templates/list`      |
| 2   | 单股 + 模板 + 区间 → Top K  | 这只票历史上出现过几次头肩底，最像的是哪段时间 | `/api/pattern/search`              |
| 3   | 全市场 + 模板 → Top K       | 最近一个月哪些票形成了上升三角形               | `/api/pattern/search`（scope=ALL） |
| 4   | 自定义价格序列 → Top K      | 我手画/粘贴一段曲线，找历史最像的窗口          | `/api/pattern/search-by-series`    |
| 5   | 算法选择（NED / DTW）       | 严格等长比对还是允许时间扭曲                   | 前端 UI + 后端参数                 |
| 6   | 匹配结果 K 线对照与未来表现 | 形态完成后 5/10/20 日涨跌幅，决定是否下注      | 需要后端补字段                     |
| 7   | 一键跳转到股票详情或加自选  | 看完匹配立刻去做交易决策                       | `/stock/{tsCode}` 路由             |
| 8   | URL 参数持久化与跨入口跳转  | 详情页发现匹配 → 一键到独立页扩大搜索同模板    | URL search params                  |

### 1.4 资深从业者补充（行业最佳实践）

二级市场/量化使用者必备但**当前页面缺失**的能力：

1. **未来收益分布**——形态匹配真正的商业价值不是"找到像的"，而是"过去这种像的发生后股价怎么走"。每条匹配必须显示 T+5 / T+10 / T+20 / T+60 日的累计收益与胜率。
2. **形态长度自定义**——头肩顶在日线上 30 日 vs 60 日含义完全不同，必须支持窗口长度选择。
3. **算法可选**——NED 适合**形态严格、长度一致**；DTW 容忍时间拉伸/压缩，更接近"形似"。两者互不可替代。
4. **相似度阈值**——只看 ≥ 80% 的匹配，而不是看 Top 10 里夹杂 30% 的"勉强匹配"。
5. **K 线对照视图**——纯 sparkline 只能看走势；判断头肩**必须看顶/底点位、量能配合**。
6. **历史触发统计**——每个模板单独显示"过去 3 年 A 股共触发 X 次，平均后 20 日 +Y%，胜率 Z%"，否则模板库就是装饰。
7. **去重与冷静期**——同一只票相邻日期会出现近乎一样的匹配窗口，必须按"匹配结束日距离 ≥ 形态长度"去重。
8. **行业/市值/流动性过滤**——全市场搜索若不过滤，结果里全是涨停板妖股或停牌票，没有交易价值。
9. **ST/停牌排除**——默认 ON。
10. **形态完成 vs 形态进行中**——区分"已经走完"和"正在形成中"的窗口。后者更有交易价值（能进场），前者只能复盘。

### 1.5 待确认清单（已回复，含后端代码核查）

> 已直接读取 `server-code/src/apps/pattern/{controller,service,dto,utils}` 确认后端真实契约。

- [x] **Q1**：后端**不支持** `patternId` 参数。`/api/pattern/search` 入参为 `tsCode + startDate + endDate`（从该股该区间**实价格序列**提取查询形态），`/api/pattern/search-by-series` 入参为 `series: number[]`。
      → **结论**：前端选模板 → 直接用模板的标准化 `series[]` 调 `search-by-series`，**无需后端改动**。后端 `getTemplates()` 当前只返回 `{id, name, description, length}`，**不返回 series 数组** → 前端在 `pattern-template-meta.ts` 内置 8 个模板的标准化 series + 类型/语义元数据。
- [x] **Q2**：后端 `PatternMatchDto.futureReturns: number[]` 已返回 **T+5 / T+10 / T+20** 三个累计涨跌幅（百分比，例如 `5.8` 代表 +5.8%）。**没有 T+60**。
      → **结论**：前端只展示 T+5/10/20；T+60 从蓝图删除。
- [x] **Q3**：作为资深从业者判断，A 股研究最常用的指数池为以下 6 个，前端硬编码下拉：
  - `000300.SH` 沪深 300（大盘核心）
  - `000905.SH` 中证 500（中盘代表）
  - `000852.SH` 中证 1000（小盘代表）
  - `000016.SH` 上证 50（核心权重）
  - `399006.SZ` 创业板指（成长主题）
  - `000688.SH` 科创 50（科创主题）
- [x] **Q4**：不做。模式 B 仅保留"粘贴数列"+"从历史区段提取"两种输入；画线 Canvas 移除。
- [x] **Q5**：作为产品判断，**不做**私有模板。理由：
  1. 8 个预定义经典形态已覆盖二级市场绝大多数研究语境；
  2. 私有模板真正高价值的形态学习需要回测/统计支撑，而本期"未来收益条形图""历史触发统计"才是核心痛点；
  3. CRUD + 权限 + 校验 + 后端持久化的工程成本不低，且使用频次远低于"模板图鉴 + 模式 A/B"；
  4. 后续若用户自然产生需求（例：研究员沉淀私有形态库），再单独立项。

### 1.6 后端真实契约（核查结果，覆盖原蓝图）

| 端点                            | 已支持入参                                                                                  | 已返回字段                                                                                                                                                             | 蓝图原假设但**实际不存在**的字段                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/pattern/templates/list`   | 无入参                                                                                      | `id, name, description, length`                                                                                                                                        | `series, type, expectedSignal, defaultLength, historicalStats`                                                                                                                                    |
| `/api/pattern/search`           | `tsCode, startDate, endDate, algorithm, topK, scope, indexCode, lookbackYears, excludeSelf` | `patternLength, algorithm, candidateCount, elapsedMs, querySeries, matches[{tsCode, name, startDate, endDate, distance, similarity, futureReturns, normalizedSeries}]` | `patternId, minSimilarity, patternLength(入参), industryCodes, minMarketCap, excludeST, excludeHalt, cooldownDays, page, pageSize`；返回的 `matches` 也无 `industryName/Code, isST, isHalt, ohlc` |
| `/api/pattern/search-by-series` | `series, algorithm, topK, scope, indexCode, lookbackYears`                                  | 同上                                                                                                                                                                   | 同上                                                                                                                                                                                              |

**关键修正**：

1. 后端 `similarity` 是 **0–100** 的百分比（`round(distanceToSimilarity(...), 2)`），不是 0–1 比例 — 前端显示直接用，不再 ×100。
2. 后端 `futureReturns` 元素是**百分比数值**（例如 `5.8` = +5.8%），不是 0.058。
3. 后端 `normalizedSeries` 是 0–1 标准化（min-max），与前端模式 B 的 `normalizeSeries` 口径一致 → 模式 B 的 z-score 担忧消除。
4. 后端 `/pattern/search` 语义为"以 `tsCode+区间` 作为**查询样板**，去 ALL/INDEX 候选池找相似"——并非"在本股内找形态"。原蓝图"模式 A · 单股样板"概念应整体调整为下述 3 模式。

---

## 二、现状盘点与不足（重构场景）

### 2.1 现有功能清单

| 模块/Tab              | 入口文件                                                      | 主要数据/接口         | 行为                             |
| --------------------- | ------------------------------------------------------------- | --------------------- | -------------------------------- |
| 独立页 — 按形态搜索   | `src/sections/pattern/view/pattern-view.tsx` `ModeAPanel`     | `searchPatterns`      | 选模板 + 区间 + topK，渲染 Cards |
| 独立页 — 按序列搜索   | `src/sections/pattern/view/pattern-view.tsx` `ModeBPanel`     | `searchBySeries`      | 粘贴数字 + 标准化预览 + topK     |
| 详情页 — 形态识别 Tab | `src/sections/stock-detail/analysis/analysis-pattern-tab.tsx` | `searchPatterns`      | 类型筛选 + 模板宫格 + 区间搜索   |
| 模板库展示            | `TemplateDisplayCard` / `TemplateCard`（两份重复实现）        | `getPatternTemplates` | sparkline + 名称 + 类型 Label    |
| 匹配结果卡            | `MatchCard`（独立页与详情页两份重复实现）                     | —                     | sparkline + 相似度进度条         |
| Mock 数据             | `src/mocks/data/pattern.json` + `handlers.ts`                 | —                     | templates 列表 + search 空数组   |

### 2.2 不足之处（按严重性排序）

| #    | 问题                                                                                       | 影响                                                     | 触发场景                       |
| ---- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------ |
| P0-1 | `ModeAPanel` 把 `selectedPatternId` 错误塞进 `algorithm` 字段（仅接受 `'NED'/'DTW'`）      | **后端无法识别用户选了哪个形态**，搜索结果不可信         | 独立页"按形态搜索"任何一次点击 |
| P0-2 | `tsCode` fallback 到 `'000001.SZ'`（代码注释 "demo"）                                      | 用户没选股票时，结果全是平安银行的——错误数据冒充真实结果 | 独立页未选股票就点搜索         |
| P0-3 | API 类型 `PatternSearchParams` 缺 `patternId` 字段                                         | TypeScript 无法约束、契约模糊                            | 任何调用                       |
| P0-4 | mock 模板数据缺 `type` 与 `series`                                                         | 类型筛选无效、模板 sparkline 全空                        | 开发环境与所有 E2E 测试        |
| P0-5 | mock `/api/pattern/search` 返回 `{ matches: [] }` 缺 `total` 字段                          | UI "共找到 N 个匹配" 显示 NaN/undefined                  | 开发环境任何搜索               |
| P1-1 | 模式 A 独立页缺**类型筛选 ToggleButton**（详情页有，独立页无）                             | 模板多时无法快速定位                                     | 独立页模板库 ≥ 8 个时          |
| P1-2 | 模式 A 独立页缺 **scope / lookbackYears / excludeSelf / 算法选项** UI（API 已定义）        | 高级用户无法用全市场/历史/算法切换                       | 量化研究者使用                 |
| P1-3 | 模式 B `startDate/endDate` 状态保留但**未传给 API**（死代码）                              | 用户以为限制了时间窗口，结果未生效                       | 模式 B 任何使用                |
| P1-4 | 匹配结果只有 sparkline，**无 K 线、无成交量、无未来收益**                                  | 形态匹配核心价值（"匹配完后涨没涨"）未呈现               | 所有匹配结果                   |
| P1-5 | 匹配卡**不可点击**，没有跳转到股票详情/加自选/加入回测                                     | 决策路径断裂，用户复制 tsCode 手动跳                     | 任何一次匹配                   |
| P1-6 | 顶部反转用 `error`(红)、底部反转用 `success`(绿) 当 Label 颜色                             | 违反项目铁律"涨红跌绿仅作数据色，不污染 UI 主色"         | 所有模板渲染                   |
| P2-1 | 缺 **形态长度** / **相似度阈值** / **行业/市值/ST 过滤** / **去重冷静期**                  | 全市场搜索结果价值很低（夹杂停牌、ST、连续涨停）         | scope=ALL 全市场搜索           |
| P2-2 | 模板 `description` 字段加载了不显示；模板缺"看涨/看跌"语义化提示                           | 用户分辨不出模板含义，需要去外网查                       | 模板库浏览                     |
| P2-3 | 模板缺"历史触发频次/胜率/平均后续涨跌幅"统计                                               | 模板库变成装饰，缺少筛选优劣模板的依据                   | 模板库浏览                     |
| P2-4 | 独立页与详情页存在 **2 份 `MatchCard` / `PatternMiniChart` / `TemplateCard` 重复实现**     | 维护成本高，后续改动易遗漏                               | 任何后续优化                   |
| P2-5 | 独立页与详情页**状态不互通**（无 URL 持久化）                                              | 详情页发现匹配后无法带参跳到独立页扩大搜索；刷新即丢     | 跨页跳转/分享/收藏             |
| P2-6 | 模式 B **仅支持粘贴数字**，无画线/选取历史区间作为输入                                     | 实际很少用户会手敲 N 个价格                              | 模式 B 任何使用                |
| P2-7 | 模式 B `normalizeSeries` 在前端用 min-max；与后端比对算法可能用 z-score → 标准化口径不一致 | 用户看的标准化预览图与后端搜索基础不一致，匹配率失真     | 模式 B 任何使用                |
| P3-1 | `getPatternTemplates().catch(() => {})` 静默吞错                                           | 模板加载失败时用户看到空白模板库，无任何提示             | 后端不可用                     |
| P3-2 | 加载/搜索请求**无取消机制**，切参数时可能竞态                                              | 前一次搜索的结果晚到时覆盖最新结果                       | 用户快速切模板/区间            |
| P3-3 | `topK` 最大 50，**无分页 / 无流式**                                                        | 全市场搜索想看 200 条匹配做不到                          | 量化批量研究场景               |
| P3-4 | 模式 A 独立页加载模板时整个 `ModeAPanel` 被 Skeleton 替换                                  | 首次进入页面 1-2 秒内表单完全消失，体感卡                | 任何首次访问                   |

### 2.3 重设计应对策略（一一对应 2.2）

| 对应问题   | 应对策略                                                                                                                      | 取舍说明                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| P0-1, P0-3 | 修正 `PatternSearchParams`：新增 `patternId`，`algorithm` 单独字段；UI 拆出"形态"和"算法"两个独立 Select                      | 必须改后端契约 → 写到 §5.x 后端配合清单               |
| P0-2       | 独立页"按形态搜索"模式拆为两种 scope：`SINGLE_STOCK`（必填股票）/ `WHOLE_MARKET`（不传 tsCode）                               | 删除 demo fallback；按 scope 决定 tsCode 是否必填     |
| P0-4, P0-5 | 重写 mock：templates 补 `type/series/description/historicalStats`；search 返回 `matches[] + total + stats{}`                  | 与后端字段对齐，前后端一稿                            |
| P1-1       | 独立页与详情页统一抽出 `<PatternTemplateGallery>` 组件，自带类型筛选                                                          | 顺手解决 P2-4 重复实现                                |
| P1-2       | 在独立页搜索参数区新增高级抽屉：scope / 指数 / 回看年限 / 算法 / 形态长度 / 相似度阈值 / 行业 / 排除 ST                       | 抽屉收纳，避免主表单膨胀                              |
| P1-3       | 模式 B 删除日期 state，或将其作为"仅在最近 N 年内搜索"，并真正传给 API                                                        | 与后端确认是否支持 `lookbackYears` 字段               |
| P1-4       | 设计新的 `<PatternMatchDetailDrawer>`：左半屏 K 线（模板叠加） + 右半屏未来收益条形图与统计                                   | 需要后端补 `ohlc[]` 或前端二次请求 `/api/stock/kline` |
| P1-5       | `MatchCard` 顶部加股票名链接 → `/stock/:tsCode`；右上加"加自选/加入回测"图标按钮                                              | 链接级跳转，遵循"≤ 2 次点击进个股详情页"验收项        |
| P1-6       | Label 颜色统一使用 `info`/`primary`/`secondary`/`default` 中性色；用 Iconify 上下箭头图标表达涨跌方向                         | 数据色（涨红跌绿）只在收益条形图、K 线 mini 上使用    |
| P2-1       | 高级抽屉里加：形态长度（10/20/30/60 日）、相似度阈值（默认 70%）、行业多选、市值阈值、ST/停牌开关、去重冷静期                 | 默认值合理化：ST/停牌默认排除                         |
| P2-2       | `<PatternTemplateCard>` 加 hover Tooltip 显示 `description` + 看涨/看跌语义化标签（`expectedSignal`）                         | `expectedSignal` 由后端提供                           |
| P2-3       | 模板卡底部加一行 "近 1 年触发 X 次 · 平均后 20 日 +Y% · 胜率 Z%"（数据来自 `/api/pattern/templates/list` 扩展字段）           | 后端必须配合补字段                                    |
| P2-4       | 抽出 `src/sections/pattern/components/`：`pattern-template-gallery.tsx` / `pattern-match-card.tsx` / `pattern-mini-chart.tsx` | 独立页与详情页都引用                                  |
| P2-5       | URL 同步：`/pattern?mode=template&pattern=HEAD_SHOULDERS_TOP&scope=ALL&topK=20` 等；详情页 Tab 也用 query 持久化              | 用 React Router v7 的 `useSearchParams`               |
| P2-6       | 模式 B 改为三种输入源 Tabs：① 粘贴数列 ② 鼠标画线（HTML5 Canvas）③ 从历史区段提取                                             | 画线为可选 P1，历史区段提取与详情页"形态识别"打通     |
| P2-7       | 标准化口径与后端对齐（建议统一 z-score）；前端 normalize 与展示分开                                                           | 后端确认                                              |
| P3-1       | 模板加载失败显示 `Alert severity="error"` + 重试按钮，不再静默                                                                | 提升可观测性                                          |
| P3-2       | 所有 fetch 用 `let cancelled = false` Pattern B 模式 + AbortController                                                        | quant-client 既有约定                                 |
| P3-3       | 列表区改成 `TablePagination`（page/pageSize），后端 `/api/pattern/search` 支持分页                                            | 后端配合                                              |
| P3-4       | 模板加载时不阻塞表单，仅模板宫格区显示 Skeleton                                                                               | 表单可在模板加载完成前先填日期等参数                  |

---

## 三、功能细化拆分（基于后端真实契约）

### 3.0 三模式定义（重要语义修正）

| 模式              | URL              | 触发接口                        | 用户操作                              | 候选池来源                     |
| ----------------- | ---------------- | ------------------------------- | ------------------------------------- | ------------------------------ |
| 模式 A · 模板搜索 | `?mode=template` | `/api/pattern/search-by-series` | 选模板（前端用 meta 表中的 series）   | scope=ALL / INDEX              |
| 模式 B · 区间搜索 | `?mode=range`    | `/api/pattern/search`           | 选股票 + 区间（用该股该段为查询样板） | scope=ALL / INDEX, excludeSelf |
| 模式 C · 序列搜索 | `?mode=series`   | `/api/pattern/search-by-series` | 粘贴数列 / 从历史区段提取             | scope=ALL / INDEX              |

> 旧蓝图"模式 A · 单股 + 模板"概念被分裂为模式 A（模板）和模式 B（个股区间），后端语义清晰，UI 也更易理解。
> 详情页『形态识别』Tab：默认模式 B（用本股最近 N 日为样板找相似），可切到模式 A（让本股作为候选，验证某模板在本股是否触发——通过 `excludeSelf=false` + 结果筛选）。

### 3.1 模块结构树（修订后）

```
形态匹配 模块
├── 独立页 /pattern
│   ├── PageHeader (标题 + 模式切换 ToggleButtonGroup)
│   ├── 模式 A：按形态搜索
│   │   ├── PatternTemplateGallery（共享组件，含类型筛选）
│   │   ├── SearchParamsBar（基础：scope / 股票 / 区间 / topK）
│   │   ├── AdvancedFiltersDrawer（算法 / 长度 / 阈值 / 行业 / ST）
│   │   ├── ResultsList（PatternMatchCard × N + TablePagination）
│   │   └── PatternMatchDetailDrawer（点击卡片打开）
│   ├── 模式 B：按序列搜索
│   │   ├── SeriesInputTabs（粘贴 / 画线 / 历史区段）
│   │   ├── SeriesPreview（标准化曲线 + 长度/标准化方式 chip）
│   │   ├── SearchParamsBar（同上，无股票字段）
│   │   ├── AdvancedFiltersDrawer
│   │   └── ResultsList
│   └── 模式 C（新增）：浏览模板统计（默认进入页时显示）
│       └── PatternTemplateGallery（含历史胜率排序）
├── 详情页 Tab /stock/:tsCode → 形态识别
│   ├── PatternTemplateGallery（共享组件，无 scope 切换）
│   ├── SearchParamsBar（区间 + topK，固定单股）
│   ├── ResultsList
│   └── PatternMatchDetailDrawer（K 线 + 未来收益）
└── components/（共享）
    ├── pattern-template-gallery.tsx
    ├── pattern-template-card.tsx (含 Tooltip / 历史统计)
    ├── pattern-match-card.tsx
    ├── pattern-match-detail-drawer.tsx
    ├── pattern-mini-chart.tsx
    ├── pattern-future-return-chart.tsx
    ├── advanced-filters-drawer.tsx
    └── series-input-tabs.tsx (含 series-canvas-drawer.tsx)
```

### 3.2 子模块逐个细化

#### 3.2.1 `<PatternTemplateGallery>`

- **职责**：展示所有模板 + 类型筛选 + 选中态
- **数据**：`/api/pattern/templates/list`（含 `type / series / description / expectedSignal / historicalStats`）
- **交互**：
  - 类型 ToggleButton（全部/顶部反转/底部反转/持续/双向）
  - 排序 Select：默认/胜率高→低/触发频次高→低/形态长度
  - 卡片 hover 显示 description Tooltip
  - 卡片点击切换选中（同 id 二次点击取消）
- **状态**：loading（Skeleton 6 格） / error（Alert + 重试按钮） / empty（"该类型暂无模板"）
- **边界**：模板数量 > 24 时分页或滚动；Tooltip 在 sparkline 上不被遮挡

#### 3.2.2 `<PatternTemplateCard>`

- **职责**：单卡渲染
- **结构**：
  ```
  ┌───────────────────────────┐
  │  [模板 sparkline 60px]    │
  │  头肩顶               [↓]  │ ← Iconify 箭头表达 expectedSignal
  │  顶部反转 · 17 日          │ ← Label 中性色
  │  ───────────────────────  │
  │  近 1 年触发 12 次         │
  │  平均后 20 日 −3.4% · 胜率 67%
  └───────────────────────────┘
  ```
- **选中态**：2px primary 边框 + `varAlpha(primary.mainChannel, 0.08)` 背景

#### 3.2.3 `<SearchParamsBar>`

- 字段：scope（独立页才有）/ 股票（仅 SINGLE_STOCK 时显示）/ 区间 DatePicker × 2 / topK Select / [高级筛选] 按钮 / [搜索] Button
- 状态：disabled when (templateId 必选项缺失 || loading)
- 验证：开始日期 < 结束日期；区间 ≥ 形态长度的 2 倍（否则警告）

#### 3.2.4 `<AdvancedFiltersDrawer>`

- 字段分组：
  - **算法**：NED / DTW / Auto（Tooltip 解释差异）
  - **形态长度**：10 / 20 / 30 / 60 日（默认跟模板）
  - **相似度阈值**：Slider 50%-100%（默认 70%）
  - **市场过滤**：行业多选（来自 `industry-dict`）/ 市值 ≥ Slider / 排除 ST / 排除停牌 / 去重冷静期（5/10/20 日）
  - **结果**：仅形态完成 / 包括进行中
- 持久化：抽屉关闭时把当前筛选条件序列化进 URL search params

#### 3.2.5 `<PatternMatchCard>`

- **结构**（高度 96px，行高 36 表格）：
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │ [板块色条 2px] 平安银行 000001.SZ ↗ │ 头肩底 │ 0301→0415 │ ...  │
  │                                    │ 92.3%  │ T+20 +5.8% │ ⋯   │
  └─────────────────────────────────────────────────────────────────┘
  ```
- **元素**：
  - 左侧 2px 色条按行业上色
  - 股票名 → `/stock/:tsCode` 链接
  - 模板名 + 相似度进度条
  - sparkline mini（标准化）
  - **T+20 收益 chip**（涨红跌绿数据色）
  - 右上角图标动作：加自选 / 加回测样本 / 打开详情抽屉
- **整卡点击 → 打开 `<PatternMatchDetailDrawer>`**

#### 3.2.6 `<PatternMatchDetailDrawer>`

- 右侧抽屉，宽度 720px
- 结构：
  - 顶部：股票名 + 模板名 + 跳详情按钮
  - 中部：K 线图（窗口区间，叠加模板曲线为虚线）+ 成交量副图
  - 下部：未来收益条形图（T+5/10/20/60 日 vs 同期同行业基准 vs 大盘）
  - 底部：相似窗口列表（同股票同模板的其他历史匹配，便于横向对比）
- 数据：需要后端补 `ohlc[]`、`volume[]`、`forwardReturns{}`，否则前端二次请求 `/api/stock/kline`

#### 3.2.7 `<SeriesInputTabs>`（模式 B 专属）

- 三个 Tab：
  1. **粘贴数列**：现有 TextField + parse + min-max preview
  2. **鼠标画线**：HTML5 Canvas 320×120，鼠标按下拖动画线，松开后采样为 30 个点；右上 [清空] [撤销]
  3. **从历史区段**：选股票 + DatePicker 区间 → 后端返回标准化序列（复用 `/api/pattern/extract-series`，需新增）

### 3.3 数据流与状态管理

- **共享上下文**：URL search params 作为唯一 source of truth；组件挂载时从 URL 解析初始状态。
- **跨子模块联动**：
  - 模板选中 → 自动把"形态长度"高级参数对齐到模板默认长度
  - 匹配卡点击 → Drawer 打开 → 内部"相似窗口"列表点击 → Drawer 内容刷新（不关闭）
  - 详情页 Tab 中的"扩大到全市场搜索"按钮 → 跳 `/pattern?mode=template&pattern=...&scope=ALL`，参数透传
- **请求竞态**：每次发起搜索生成 `requestId`，回调里比对当前 id；切参/切 Tab 时 `AbortController.abort()`

---

## 四、UI/UE 设计（设计师视角）

> 已加载 [.agents/skills/frontend-design/SKILL.md](../../.agents/skills/frontend-design/SKILL.md) 方法论。

### 4.1 设计概念关键词

**"Trading Terminal + Editorial Pattern Atlas"** —— 交易终端的密度与冷静感 + 形态图鉴的可读性与教学性。

### 4.2 必须遵守的项目 UI 规范

- 颜色：仅用 `theme.palette.*` / `varAlpha(...)`；模板类型 Label 改用中性色（`default`/`info`/`primary`/`secondary`），**不再用 `error`/`success`** 表达"顶部/底部反转"
- 涨红跌绿（`error`/`success`）**只**用于数据色：未来收益 chip、K 线、收益条形图
- 字号最小 12px；相似度百分比、收益数字使用等宽字体（`fontFamily: 'JetBrains Mono'` 或 theme 提供的 mono variant）
- MUI 组件 sx prop 优先；间距 8 倍数（卡内 16，卡间 16，section 间 24）
- 动效：Drawer 进入 200ms ease-out；K 线 Tooltip fade 150ms；其余禁止

### 4.3 页面布局（独立页 /pattern）

```
┌──────────────────────────────────── 顶部 ────────────────────────────────────┐
│ 形态匹配                  [按形态搜索] [按序列搜索] [模板图鉴]    [文档]    │
├──────────────────────────────── 模板图鉴 / 模板库 ───────────────────────────┤
│  类型: [全部][顶部反转][底部反转][持续][双向]   排序: [胜率↓ ▼]              │
│                                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │ 头肩顶│ │ 双顶 │ │ V反转│ │ 牛旗 │ │ 楔形 │ │ 三角 │  …                   │
│  │ ┈┈┈ │ │ ┈┈┈ │ │ ┈┈┈ │ │ ┈┈┈ │ │ ┈┈┈ │ │ ┈┈┈ │                       │
│  │ 顶反↓│ │ 顶反↓│ │ 持续↑│ │ 持续↑│ │ 双向 │ │ 持续↑│                       │
│  │1y/12次│ │1y/9次│ │1y/4次│ │1y/22次│ │1y/8次│ │1y/15次│                    │
│  │−3.4% │ │−2.8% │ │+6.1% │ │+4.7% │ │±1.2% │ │+3.0% │                       │
│  │胜67% │ │胜55% │ │胜78% │ │胜71% │ │胜52% │ │胜69% │                       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                       │
├────────────────────────── 搜索参数 ──────────────────────────────────────────┤
│ 范围: ◉ 单股 ○ 全市场 ○ 指数成分                                             │
│ 股票: [搜索股票 ▼]    区间: [开始] - [结束]    Top: [20 ▼]   [高级 ⚙] [搜索]│
├────────────────────────── 匹配结果（共 173 条） ─────────────────────────────┤
│  ┌─ 平安银行 000001.SZ ↗ │ 头肩顶 ████████████ 92% │ T+20: -3.2% │ ⋯ ─┐   │
│  └────────────────────────────────────────────────────────────────────┘   │
│  ┌─ 招商银行 600036.SH ↗ │ 头肩顶 ██████████░░ 88% │ T+20: -1.7% │ ⋯ ─┐   │
│  └────────────────────────────────────────────────────────────────────┘   │
│  …                                                                          │
│  [ ◀ 上页  1/9  下页 ▶ ]                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 关键组件设计要点

- **TemplateCard**：左侧无色条（与 MatchCard 区分）；选中态 primary 边框；Tooltip 在卡上方 8px 偏移
- **MatchCard**：左侧 2px 色条按"行业"上色（中性色，从 `theme.palette.info/secondary/...` 中循环）；股票名采用 `text.primary` + 下划线 hover；T+20 chip 用 `error.main` / `success.main` filled
- **AdvancedFiltersDrawer**：右侧 360px 抽屉；底部固定 [重置] [应用] 双按钮；Slider 走 `theme.palette.text.primary`
- **PatternMatchDetailDrawer**：右侧 720px；K 线区高度 360px；未来收益条形图 200px；二级抽屉用 z-index +1，不堆叠遮挡
- **Tooltip**：仅图标触发，禁止整卡触发；模板卡 description Tooltip 例外（hover 卡触发，因为卡很小）
- **Empty / Error**：
  - Empty: "未找到匹配。建议：① 降低相似度阈值 ② 扩大区间 ③ 切换 DTW 算法"
  - Error: 区分 4xx（参数不合法）与 5xx（"匹配引擎暂不可用，1 分钟后重试"）

### 4.5 交互细节（micro-interactions）

- 切 Tab（按形态/按序列/模板图鉴）**不重置**已选模板与高级筛选
- 模板卡选中后 200ms scroll 到搜索参数区
- 高级筛选打开时主区域不模糊不变暗（避免阅读结果）
- 鼠标画线 Canvas：松开后采样动画 200ms 平滑（不要瞬时跳变）
- 匹配卡分页切换时保持滚动位置在结果顶部
- 详情抽屉 K 线支持鼠标滚轮缩放，但形态匹配窗口高亮（背景 `varAlpha(primary, 0.06)`）始终可见

### 4.6 暗色 / 亮色双主题适配检查

- 所有色值通过 `theme.vars.palette.*Channel`
- K 线涨绿跌红用项目既有 `useChartColor` hook（待确认；若无，则用 `error.main` / `success.main`）
- 阴影使用 `theme.shadows[2]`（卡）/ `theme.shadows[16]`（抽屉）

---

## 五、实现步骤与要点

### 5.1 实现顺序（按 quant-client 项目铁律）

1. **`src/api/pattern.ts`**：
   - 修正 `PatternSearchParams`：新增 `patternId`、`minSimilarity`、`patternLength`、`industryCodes`、`minMarketCap`、`excludeST`、`excludeHalt`、`cooldownDays`、`page`、`pageSize`
   - 修正 `PatternMatch`：新增 `industryName`、`industryCode`、`isST`、`isHalt`、`forwardReturns: { d5, d10, d20, d60 }`、`ohlc?: OhlcPoint[]`
   - 修正 `PatternTemplate`：新增 `expectedSignal: 'bullish' | 'bearish' | 'neutral'`、`defaultLength`、`historicalStats: { triggerCount1y, avgForwardReturn20, winRate20 }`
   - 修正 `PatternSearchResult`：保证 `total` 必填；新增 `aggregateStats?` 用于结果区头部摘要
   - 新增 `getPatternStats(patternId)`、`extractSeriesFromKline({tsCode,startDate,endDate})`（模式 B 输入源 3）
2. **`src/sections/pattern/components/`**（新建）：
   - `pattern-mini-chart.tsx`、`pattern-template-card.tsx`、`pattern-template-gallery.tsx`、`pattern-match-card.tsx`、`pattern-match-detail-drawer.tsx`、`pattern-future-return-chart.tsx`、`advanced-filters-drawer.tsx`、`series-input-tabs.tsx`、`series-canvas-drawer.tsx`
3. **`src/sections/pattern/view/pattern-view.tsx`**：组合三模式（按形态 / 按序列 / 模板图鉴），使用 `useSearchParams` 持久化
4. **`src/sections/stock-detail/analysis/analysis-pattern-tab.tsx`**：删除重复的 TemplateCard/MatchCard/MiniChart，改用共享组件；新增"扩大到全市场搜索"按钮
5. **`src/pages/pattern.tsx`**：保持薄壳不变
6. **`src/routes/sections.tsx` / `nav-config-dashboard.tsx`**：路由已存在，无需新增；导航项保持
7. **`src/mocks/data/pattern.json` + `src/mocks/handlers.ts`**：补齐 templates 字段（type/series/description/expectedSignal/historicalStats）；search 返回真实结构 `{ matches[], total, aggregateStats }`；新增 `extract-series`、`stats` mock
8. **测试**：
   - `pattern-view.test.tsx`：渲染三模式切换、URL 持久化
   - `pattern-match-card.test.tsx`：跳转、动作按钮
   - `series-canvas-drawer.test.tsx`：画线采样函数纯函数单测

### 5.2 关键技术点

- **状态共享方案**：URL search params + 局部 `useState`；不引入 Context/Zustand
- **性能敏感处**：
  - 模板库 `React.memo(PatternTemplateCard)`，因为类型筛选会频繁重渲染整列
  - 结果列表分页或虚拟滚动（> 50 条用 `react-virtuoso`，已在项目内）
  - K 线 Drawer 懒加载 ApexCharts 候补 echarts-for-react？— 暂保持 ApexCharts，禁动画
- **容错**：
  - 接口失败：模板用 Alert + 重试；搜索用 Alert + "联系管理员"
  - 字段缺失：`forwardReturns?.d20` 缺则显示 "—"；`ohlc?` 缺则提示 "K 线数据加载中"
  - 跨日：详情 Drawer 打开时区间跨非交易日，按 `tradeCalendar` 筛除
- **请求取消**：所有 fetch 用 AbortController；切 Tab/参数立即 abort 旧请求
- **画线 Canvas**：基于 `pointerdown / pointermove / pointerup`，松开后用线性插值降采样为固定 30 点；前端 z-score 标准化与后端口径对齐

### 5.3 风险与回退

- **后端契约改动是 P0 阻塞项**：若后端暂时无法补 `patternId`、`forwardReturns`、`historicalStats`，前端按 feature flag 隐藏对应 UI（环境变量 `VITE_PATTERN_FUTURE_RETURN_ENABLED`），其他能力先上线
- **模式 B 画线**：可作为 P1 后续迭代；上线版先保留粘贴 + 历史区段两种
- **回退**：保留旧版 `pattern-view.tsx` 一份在 `view/pattern-view.legacy.tsx`，1 个版本周期后删除
- **灰度**：通过路由前缀 `?legacy=1` 切到旧版，便于 A/B 对比

### 5.4 后端配合清单（修订：基于代码核查后的真实差距）

> 替代原列表的最终版本（核查后）：

| 优先级 | 端点 / 字段                              | 改动                                                                                      | 前端兜底                                                                                                                 |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P1     | `templates/list` 出参                    | 增加 `series`、`type`、`expectedSignal`                                                   | 前端 `pattern-template-meta.ts` 内置 8 个模板的 series + type + expectedSignal（与后端 `pattern-templates.ts` 同步维护） |
| P2     | `search` 出参                            | 增加 `industryName/Code`、`isST`、`isHalt`                                                | 客户端用 `/api/stock/list` 缓存补齐                                                                                      |
| P2     | `search` 入参                            | 增加 `industryCodes[]`、`excludeST`、`minMarketCap`、`page/pageSize`                      | 客户端筛选 + 切片分页                                                                                                    |
| P3     | `templates/list` 出参                    | 增加 `historicalStats`                                                                    | 缺失则模板卡只显示 description + sparkline                                                                               |
| —      | `forwardReturns`                         | **后端已支持** T+5 / T+10 / T+20                                                          | —                                                                                                                        |
| —      | `patternId`                              | **不需要新增**：模板搜索改走 `search-by-series` 传 series                                 | —                                                                                                                        |
| 不做   | `extract-series` / `stats` / `favorites` | 不新增（私有模板与画线已确认不做；从历史区段提取由前端调 `/api/stock/detail/chart` 完成） | —                                                                                                                        |

后端约束（核查后均已满足）：

- 标准化口径已统一（min-max → 0–1）✅
- 跨日逻辑使用真实交易日 ✅
- `forwardReturns` 用百分比累计涨跌幅 ✅

### 5.4-旧 原蓝图后端清单（已被上表替换，仅留作历史对照）

| 优先级 | 端点                                    | 改动                                                                                                                                                                                                                             |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| P0     | `POST /api/pattern/search`              | 入参新增 `patternId` (必填，与 `customSeries` 二选一)；新增 `algorithm`、`minSimilarity`、`patternLength`、`scope`、`indexCode`、`industryCodes`、`minMarketCap`、`excludeST`、`excludeHalt`、`cooldownDays`、`page`、`pageSize` |
| P0     | `POST /api/pattern/search` 出参         | 每条 match 新增 `industryName/Code`、`isST`、`isHalt`、`forwardReturns: {d5,d10,d20,d60}`；返回 `total`、`aggregateStats`（命中数/平均收益/胜率）                                                                                |
| P0     | `POST /api/pattern/templates/list` 出参 | 每个 template 新增 `type` (4 类)、`series` (标准化 0-1 数组)、`expectedSignal`、`defaultLength`、`historicalStats`                                                                                                               |
| P1     | `POST /api/pattern/search-by-series`    | 入参新增 `lookbackYears`、`scope`、`indexCode`、`industryCodes`、`minSimilarity`、`patternLength`；与 `/search` 字段尽量对齐                                                                                                     |
| P1     | `POST /api/pattern/extract-series`      | 新增端点：入参 `{tsCode, startDate, endDate, normalize?: 'minmax'                                                                                                                                                                | 'zscore'}`，出参 `series: number[]` |
| P2     | `POST /api/pattern/stats`               | 新增端点：入参 `{patternId, lookbackYears}`，出参完整统计（用于模板详情弹窗）                                                                                                                                                    |
| P2     | `POST /api/pattern/templates/list`      | 增加 `category`、`difficulty`、`teachingNotes`，用于"模板图鉴"模式                                                                                                                                                               |
| P3     | `POST /api/pattern/favorites/*`         | 用户私有模板 CRUD（如 §1.5 Q5 确认需要）                                                                                                                                                                                         |

后端约束：

- 标准化口径统一（建议 z-score；与前端 series 预览对齐）
- 跨日逻辑使用 `tradeCalendar`，不要用自然日
- `forwardReturns` 用累计涨跌幅（不用对数收益），保留 4 位小数

---

## 六、验收方式与细节

### 6.1 功能验收清单（可勾选）

- [ ] 第 1 章每个功能点都有对应实现入口
- [ ] 独立页"按形态搜索"在未选股票时**不再**回落到 `000001.SZ`
- [ ] `searchPatterns` 调用包含 `patternId` 字段且后端正确响应
- [ ] 模式 B 的 `startDate/endDate` 真实传给 API（或被删除）
- [ ] 共享日期/选中模板在切 Tab 时不重置
- [ ] URL search params 完整反映当前筛选状态，刷新后自动还原
- [ ] 详情页 Tab 与独立页共享同一组 `pattern/components/*`，零重复实现
- [ ] 个股 → 详情抽屉 → 个股详情页 路径 ≤ 2 次点击
- [ ] T+5/T+10/T+20 收益在每条匹配卡可见
- [ ] 模板卡显示 description（hover）+ 历史触发统计 + 看涨/看跌 Iconify 箭头
- [ ] 全市场搜索默认排除 ST 与停牌
- [ ] 高级筛选抽屉支持算法/长度/阈值/行业/市值/冷静期

### 6.2 UI/UE 验收清单

- [ ] 通过 `web-design-guidelines` skill 审查（阶段二末执行）
- [ ] 暗色 / 亮色双主题截图对比无问题
- [ ] 字号 ≥ 12px，无硬编码颜色（`grep -rE "#[0-9a-fA-F]{3,6}|rgba?\(" src/sections/pattern src/sections/stock-detail/analysis/analysis-pattern-tab.tsx` 应仅返回测试或注释）
- [ ] 模板类型 Label **不**使用 `error`/`success`
- [ ] 关键页面在 1440 / 1920 宽度下无横向滚动
- [ ] 详情抽屉在 1366×768 屏幕下完整显示

### 6.3 性能与质量验收

- [ ] `node_modules/.bin/eslint --fix "src/sections/pattern/**/*.{ts,tsx}" "src/sections/stock-detail/analysis/analysis-pattern-tab.tsx" "src/api/pattern.ts"` 退出码 0 且无输出
- [ ] `yarn build` 输出 `✓ built in ...`
- [ ] 主页面首屏交互延迟 < 200ms（本地 dev server）
- [ ] 切换模板/参数时无请求竞态（旧请求被 abort）
- [ ] 共享组件覆盖单元测试

### 6.4 验收数据样例

- **正常交易日**：选某只活跃股 + 头肩顶 + 近 1 年 → 返回 ≥ 3 条匹配，T+20 收益均显示
- **停牌日 / 极端区间**：区间内股票全程停牌 → Empty + 友好提示
- **零数据日**：自定义序列 100 个相同值 → 模式 B 提示"序列无波动，无法标准化"
- **跨日 / 节假日**：区间含国庆假期 → K 线只显示交易日，匹配窗口长度按交易日计算
- **后端字段缺失**：`forwardReturns: null` → 匹配卡显示 "—"，不报错

---

## 附：阶段一交付边界

- 本文档**不写代码**，所有代码示例仅为类型/字段定义，便于阶段二快速落地
- 第 1.5 节 5 个待确认问题需要用户回复后，再启动阶段二
- 一句话引导：**"如确认设计，请回复『实现 K 线形态匹配重构』进入阶段二"**
