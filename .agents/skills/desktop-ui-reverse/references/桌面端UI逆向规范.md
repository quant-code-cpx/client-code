# PC 桌面端 UI 逆向规范

本规范在用户确认首次取证结果后读取。所有表格和结论持续使用“已测量 / 有依据的推断 / 暂时假设”标记。

## 1. 输入与取证基线

先归档：

- 目标地址、页面名称、路由、截图或录屏路径、源码位置。
- 技术栈、目录约束、禁止修改项、依赖、启动和构建命令。
- 目标桌面浏览器、操作系统、视口范围、设备像素比与缩放比例。
- logo、字体、图标、图片、视频、设计稿和已有组件。
- 品牌色、固定文案、版权、隐私和业务约束。

每份证据记录来源、页面/状态、viewport、浏览器、操作系统、设备像素比、缩放、采集时间和可复现步骤。无法取得的元数据标为未知，不猜测。

页面可运行时检查：

- DOM、computed styles、继承链、CSS variables、样式来源和媒体查询。
- 字体请求、字体文件与格式、fallback、字重、可变轴和加载结果。
- SVG、图标字体、响应式图片、固有尺寸、裁切、懒加载和失败行为。
- 网络请求、第三方组件、主题切换、路由与可操作状态。
- hover、focus-visible、active、pressed、selected、disabled、loading、error、empty、expanded 和拖拽状态。

## 2. 首次交付：证据与页面地图

### 2.1 复刻范围与材料清单

列出已提供、已访问、不可访问和仍需补充的材料；明确本轮页面、状态、主题和桌面宽度范围。

### 2.2 证据与风险清单

每项至少包含：对象、结论、证据等级、来源、环境、置信度、风险、补证方式。重点暴露字体、图标、图片、隐藏状态、主题、桌面宽度和第三方组件的不确定性。

### 2.3 页面地图

每页记录：

- 路由、标题、页面任务、主要用户动作。
- header、nav、main、aside、footer、面包屑、标题区、工具栏、内容区、侧栏和浮层。
- 父子关系、DOM/阅读顺序、主要对齐线、容器嵌套和滚动边界。
- 全局结构、页面模式、业务组件和一次性装饰的归属。
- 固定宽度、比例宽度、最小/最大宽度、可折叠宽度、sticky、悬浮和 overflow 行为。
- 超宽、标准、紧凑桌面下的显示、隐藏、压缩、换行、重排和替代。

用树或简图表达层级；不要只写方位描述。首次交付到此停止，等待确认。

## 3. 基础 UI tokens

建立 primitive、semantic、component 三层。每个 token 记录名称、值、使用位置、证据来源、跨页面复用、主题变化、状态变化和局部例外。

### 3.1 颜色

区分：

- 页面背景、区块背景、surface、surface-variant、卡片和反差区域。
- 主文本、次级文本、辅助文本、placeholder、disabled、反色文本和链接。
- border、divider、outline、input ring、focus ring 和 hover 边界。
- primary、secondary、tertiary、link、visited、hover、pressed、selected 和 active。
- success、warning、danger、info 的背景、文字、边框和图标。
- 渐变、遮罩、透明度、玻璃材质、图片叠加、混合模式和主题映射。

除色值外必须写语义角色。分别检查普通文本、大号文本、图标、边框、focus ring 和图片上文字的对比度。

### 3.2 字体

记录：

- 字体家族、文件、格式、fallback、子集、字重和可变轴。
- display、h1、h2、h3、body、body-small、label、button、caption、numeric、code 的字号、字重、行高和字距。
- 大小写、数字特性、中英文混排、标题/正文最大宽度、最大行数、截断、断词和换行。
- 超宽、标准、紧凑桌面下的字号、行高和标题折行变化。
- 字体失败、系统字体放大、浏览器缩放和 200% 文本放大表现。

截图只能提供字体度量线索，不能单独证明字体家族。

### 3.3 间距与尺寸

记录：

- viewport gutter、容器最大宽度和正文阅读宽度。
- 区块外间距、容器内间距、元素 gap、标签/帮助文本/图标与文字间距。
- 按钮、输入、菜单项、表格行、头像和图标按钮的高度、宽度与 padding。
- Grid 列数、列宽、row/column gap、跨列、对齐线和最小宽度。
- sticky header、底部浮层和滚动容器的避让距离。

先记录渲染值，再统计重复值，最后判断是否归并为刻度；不得强行套用 4 或 8 的倍数。

### 3.4 形状、边框、阴影与层级

记录各角圆角、边框宽度/透明度/样式、内外描边、阴影参数、模糊、扩散和透明度。区分页面、普通表面、悬浮表面、menu、popover、dialog、toast、tooltip 和最高层提示的 z-index；记录 hover、pressed、主题和背景变化。

### 3.5 动效

记录属性、时长、easing、delay、触发与退出条件、中断行为和 reduced-motion 替代。无法通过录屏或 computed styles 确认时，不猜测曲线。

## 4. 资源清单

为字体、logo、SVG、图标、图片和视频记录：来源、文件、格式、固有尺寸、用途、加载策略、授权状态、主题变体、失败状态和替代方案。

优先级：目标真实资源 > 项目已有同源资源 > 明确授权的等价资源 > 标注风险的临时替代。禁止静默替换。

## 5. 组件目录与状态矩阵

先盘点实际出现的组件，不为未出现的控件虚构规范。至少核查以下类别中已出现的项：

- Button、IconButton、Link、ButtonGroup、Split Button。
- Input、Textarea、Select、Combobox、Checkbox、Radio、Switch、Slider、Date Picker。
- Badge、Tag、Chip、Avatar、Tooltip、Progress、Spinner、Skeleton。
- Card、List、Table、Tree、Feed、Pagination、Breadcrumb、Tabs、Accordion。
- Header、Navigation、Sidebar、Toolbar、Footer。
- Dialog、Drawer、Popover、Dropdown Menu、Toast、Alert、Banner、Command Palette。

每个组件记录：

1. 原生语义元素和 DOM 结构。
2. 必选/可选子元素、图标位置、内容约束。
3. 尺寸、变体、色彩、排版、padding、gap、radius、border、shadow、z-index。
4. default、hover、focus-visible、active、pressed、selected、checked、disabled、loading、error、success、empty、expanded。
5. 鼠标和键盘行为；复合控件写清方向键、Enter、Space、Escape、Home、End、Tab 与 Shift+Tab。
6. 长文本、长数字、图片失败、慢网络、多语言和桌面宽度变化。
7. 在卡片、弹窗、工具栏和滚动容器中的组合边界。

组件 API 分离业务数据与视觉变体。优先有限枚举和组合，拒绝页面自由传入未约束的颜色、间距和阴影。

## 6. 桌面宽度与主题规则

断点由内容证据决定：导航拥挤、标题折行、表格失去可读性、工具栏无法容纳或主要任务受阻时才发生变化。记录每个断点前后证据，不套固定设备模板。

- 超宽桌面：容器增长上限、阅读宽度、侧栏和装饰位置。
- 标准桌面：完整导航、侧栏、工具栏、hover 和多列布局。
- 紧凑桌面：导航压缩、列数减少、按钮换行、标题缩放、侧栏收缩和横向滚动边界。

分别映射 light、dark 和 system 主题。检查表单、滚动条、原生选择菜单、图片遮罩、阴影、插画和图表。另验收 reduced-motion、forced-colors、高对比度、系统字体放大、浏览器缩放和桌面窗口高度变化。

## 7. 映射到代码

先给建议结构，再实现。适配当前仓库 canonical 结构，不为满足文件名清单而复制既有能力：

- tokens：primitive、semantic、component tokens；当前项目优先进入 `src/theme/`。
- themes：light、dark、brand 和 system 映射。
- reset/globals：box-sizing、默认元素、body、排版、focus 和全局行为。
- assets：fonts、icons、images、videos、预加载与失败策略。
- components：基础组件、组合组件、页面模式和布局容器。
- tests：视觉状态、键盘路径、对比度、桌面宽度和性能检查。

优先 CSS variables、Grid、Flexbox、逻辑属性、相对单位、`clamp()`、容器查询和 `prefers-reduced-motion`。每个关键选择需关联目标证据，不能为使用新技术改变目标视觉。

## 8. 实现顺序

1. 页面骨架、容器、网格、桌面宽度和主要阅读路径。
2. 字体、颜色、间距、形状、边框、阴影、层级和主题 tokens。
3. 基础组件、变体和完整状态。
4. 真实图片、字体、图标、文案和数据状态。
5. 动效、焦点管理、键盘行为、加载、空数据、错误和性能优化。

每阶段运行页面并确认结果后再继续。发现证据冲突时返回证据表修正规则，不把偏差堆到最终验收。

## 9. 视觉与交互验收

固定 viewport、浏览器、操作系统、设备像素比、缩放、字体加载和数据内容，生成目标与实现截图。使用 overlay、pixel diff、DOM/computed diff 和真实交互走查。

- L0 结构：路由、区域、DOM 语义、组件数量和阅读路径。
- L1 几何：容器、列宽、高度、对齐、间距、折行、溢出和裁切。
- L2 视觉：颜色、字体、字重、行高、字距、边框、圆角、阴影、图标和图片。
- L3 状态：hover、focus、active、selected、disabled、loading、error、success、empty。
- L4 桌面适配：超宽、标准、紧凑宽度下的显示、隐藏、压缩、重排和替代。
- L5 交互与工程：键盘、滚动、弹窗、菜单、表单、主题、焦点、对比度、性能和桌面浏览器兼容。

偏差分类为整体偏移、尺寸、字体度量、颜色、资源或平台渲染；不要因抗锯齿差异盲改布局。

## 10. 最终交付顺序

1. 复刻范围与材料清单。
2. 证据与风险清单。
3. 页面地图与布局关系。
4. 颜色、字体、间距、尺寸、形状、阴影、层级和动效 tokens。
5. 资源清单与缺失资源替代方案。
6. 组件目录、API、变体和状态矩阵。
7. 桌面宽度、主题、鼠标、键盘和可操作性规则。
8. 工程结构与实现计划。
9. 实现代码或修改文件。
10. 视觉对比、状态回归、键盘、对比度和性能结果。
11. 未解决问题、暂时假设、人工确认项和下一步建议。

即使用户要求直接交付代码，也先给简短取证结论。若新目标尚未通过首次门禁，不以通用模板冒充设计系统。
