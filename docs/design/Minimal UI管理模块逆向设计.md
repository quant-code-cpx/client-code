# Minimal Dashboard 多模块 UI 逆向设计文档

> 文档状态：逆向设计基线 v1.0  
> 目标站：[Minimal Dashboard](https://minimals.cc)  
> 目标范围：Course、User、Job、Tour、Chat、Calendar  
> 产品范围：PC 桌面浏览器  
> 采集日期：2026-08-24（Asia/Shanghai）  
> 本文只描述目标站自身的视觉、结构、状态和交互规则；不包含代码实现，也不讨论如何接入当前项目。

---

## 1. 文档目的与证据规则

本文用于支持后续对目标页面进行高保真复刻。它回答以下问题：

1. 需要复刻哪些路由、页面和交互状态。
2. 页面之间共享哪些布局、tokens、资源和组件。
3. 每个页面的父子层级、对齐线、尺寸、滚动边界和状态如何组织。
4. 目标在不同桌面宽度、Light/Dark、LTR/RTL 下如何变化。
5. 哪些结论已经直接测量，哪些只是推断，哪些仍需补证。

全文使用三种证据等级：

- **已测量**：来自 Chrome 中目标页面的 DOM、computed styles、CSS variables、资源请求、截图或真实交互。
- **有依据的推断**：由多个页面或多个状态共同支持，但没有直接暴露完整规则。
- **暂时假设**：当前材料不足，为后续设计预留的规则；不得当作目标事实。

### 1.1 采集环境

| 项目 | 采集值 | 证据等级 |
| --- | --- | --- |
| 浏览器 | 用户已登录的 Chrome | 已测量 |
| 操作系统 | macOS | 已测量 |
| 标准视口 | `1440 × 900` | 已测量 |
| 补充视口 | `1024 × 900`、`1199 × 900`、`1200 × 900`、`1536 × 900`、`2560 × 1212` | 已测量 |
| DPR | `1` | 已测量 |
| 页面语言 | `en` | 已测量 |
| 默认方向 | `ltr` | 已测量 |
| 默认模式 | Light | 已测量 |
| 默认导航 | Vertical | 已测量 |
| 默认主题色 | Integrate green | 已测量 |
| 默认字体 | Public Sans，16px | 已测量 |
| Compact | 开启 | 已测量 |

取证过程中没有提交、保存、上传、删除、批准 Booker、发送消息或创建事件。新增/编辑弹窗均通过 Cancel 关闭。

---

## 2. 复刻范围

### 2.1 路由与页面状态

| 编号 | 模块 | 路由 / 状态 | 页面标题或主要任务 |
| --- | --- | --- | --- |
| C-01 | Course | `/dashboard/course` | 学习概览、进度、图表、课程推荐、提醒 |
| U-01 | User | `/dashboard/user` | Profile feed |
| U-02 | User | `/dashboard/user?tab=followers` | Followers |
| U-03 | User | `/dashboard/user?tab=friends` | Friends |
| U-04 | User | `/dashboard/user?tab=gallery` | Gallery |
| U-05 | User | `/dashboard/user/cards` | User cards |
| U-06 | User | `/dashboard/user/list` | User table |
| U-07 | User | `/dashboard/user/new` | Create a new user |
| U-08 | User | `/dashboard/user/:id/edit` | Edit user |
| U-09 | User | `/dashboard/user/account` | Account / General |
| U-10 | User | `/dashboard/user/account/billing` | Account / Billing |
| U-11 | User | `/dashboard/user/account/notifications` | Account / Notifications |
| U-12 | User | `/dashboard/user/account/socials` | Account / Social links |
| U-13 | User | `/dashboard/user/account/change-password` | Account / Security |
| J-01 | Job | `/dashboard/job` | Job list |
| J-02 | Job | `/dashboard/job/:id` | Job details / Candidates |
| J-03 | Job | `/dashboard/job/new` | Create a new job |
| J-04 | Job | `/dashboard/job/:id/edit` | Edit job |
| T-01 | Tour | `/dashboard/tour` | Tour list |
| T-02 | Tour | `/dashboard/tour/:id` | Tour details / Booker |
| T-03 | Tour | `/dashboard/tour/new` | Create a new tour |
| T-04 | Tour | `/dashboard/tour/:id/edit` | Edit tour |
| CH-01 | Chat | `/dashboard/chat` | 联系人、会话、成员资料 |
| CA-01 | Calendar | `/dashboard/calendar` | Month / Week / Day / Agenda |

共计 **24 个可独立访问的路由或 URL Tab 状态**。

### 2.2 额外关键状态

| 模块 | 状态 |
| --- | --- |
| Job Details | Job content、Candidates 12 |
| Tour Details | Tour content、Booker 12 |
| Chat | Contact loading skeleton、无会话、已选会话、资料栏展开 |
| Calendar | Month、Week、Day、Agenda、Add event、Edit event |
| Forms | 新建空表单、编辑预填、字段 focus、选择器展开、上传、validation error、submit pending/success/error |
| Global shell | Light、Dark、LTR、RTL、导航组折叠/展开、Settings Drawer |

其中 Candidates、Booker、Chat 三态、Calendar 六态均已实际打开。表单提交结果、上传失败、删除确认和网络错误态未触发。

---

## 3. 全局信息架构

```text
Application
├── Fixed vertical navigation
│   ├── Logo
│   ├── Scrollable nav groups
│   │   ├── Overview
│   │   ├── Management
│   │   └── Misc
│   └── Account / plan promotion
├── Header
│   ├── Workspace selector
│   └── Utility actions
│       ├── Command search
│       ├── Language
│       ├── Notifications
│       ├── Contacts
│       ├── Settings
│       └── Account
└── Main
    ├── Page heading / breadcrumbs / primary action
    ├── Tabs or toolbar
    ├── Main content
    ├── Optional aside
    └── Dialog / menu / popover layer
```

### 3.1 全局 shell 尺寸

| 对象 | 标准桌面 `1440 × 900` | 证据等级 |
| --- | --- | --- |
| Vertical nav | `x=0, width=300px`；内容区域实际约 299px + 1px divider | 已测量 |
| Header | `height=72px`；从 nav 右侧开始 | 已测量 |
| Main | `x=300, y=72, width=1125px`；15px 为浏览器纵向滚动条 | 已测量 |
| 标准内容左右 padding | `40px` | 已测量 |
| 标准内容可用宽度 | `1045px` 或 `1060px`，取决于页面是否产生浏览器滚动条 | 已测量 |
| 页面顶部内容 padding | `8px` | 已测量 |
| 页面底部 padding | `64px` | 已测量 |

### 3.2 导航结构

目标导航包含以下与本轮有关的入口：

```text
Overview
└── Course

Management
├── User
│   ├── Profile
│   ├── Cards
│   ├── List
│   ├── Create
│   ├── Edit
│   └── Account
├── Job
│   ├── List
│   ├── Details
│   ├── Create
│   └── Edit
├── Tour
│   ├── List
│   ├── Details
│   ├── Create
│   └── Edit
├── Chat
└── Calendar
```

**已测量**：User、Job、Tour 使用可折叠父级按钮；子项是独立链接。Chat、Calendar、Course 为直接链接。

**已测量的可访问性问题**：

- Course 等直接活动链接未暴露 `aria-current="page"`。
- Disabled 示例项仍保留 `href` 和可聚焦属性，主要依赖 `pointer-events: none`，没有 `aria-disabled`。
- 部分仅图标按钮缺少可访问名称。
- Yearly 菜单按钮没有公开 `aria-expanded`。

复刻时应保持视觉一致，但修正以上语义；这是允许的有意偏离。

---

## 4. 页面 archetypes

本轮页面可归为八种稳定模式。

| 模式 | 页面 | 主要结构 |
| --- | --- | --- |
| Dashboard overview | Course | 图表、摘要卡、进度、横向 carousel、右侧信息栏 |
| Card grid list | User Cards、Followers、Friends、Gallery、Job List、Tour List、Candidates、Booker | Toolbar + 3 列卡片 + pagination |
| Data table | User List | Status Tabs + filters + table + pagination |
| Detail | Job Details、Tour Details | Action bar + Tabs + content / participant list |
| Two-column form | User Create/Edit、Account General | 左侧媒体/开关 + 右侧字段 |
| Centered long form | Job Create/Edit、Tour Create/Edit | 720px 卡片组纵向排列 |
| Settings | Billing、Notifications、Social links、Security | 顶部 Account Tabs + 单栏或双栏卡片 |
| Fixed workspace | Chat、Calendar | 页面标题 + 高度 680px 的主工作区 |

---

## 5. 页面地图与几何规则

## 5.1 Course

### 5.1.1 页面树

```text
Course main
├── Left content column (756px at 1440)
│   ├── Greeting
│   ├── KPI row
│   │   ├── Courses in progress
│   │   ├── Courses completed
│   │   └── Certificates
│   ├── Hours spent card
│   │   ├── Title
│   │   ├── Yearly menu
│   │   └── area chart
│   ├── Analysis row
│   │   ├── Course progress donut
│   │   └── Continue course list
│   └── Featured course carousel
└── Right aside (272px at 1440)
    ├── Student profile card
    ├── Strength radar chart
    └── Reminders list
```

### 5.1.2 已测量几何

| 对象 | Rect（`x, y, w, h`） |
| --- | --- |
| Main | `300, 72, 1125, 1648.5` |
| 左列 | `x=324, w=756` |
| 右列 | `x=1129, w=272` |
| KPI cards | 三张，每张 `236 × 118`，gap `24` |
| Hours spent | `756 × 396` |
| Course progress | `366 × 428.5` |
| Continue course | `366 × 420` |
| Profile aside | `272 × 168` |
| Strength | `272 × 308` |
| Reminders | `272 × 420` |
| Featured card | 约 `284.8 × 393`，横向 gap `24` |

Featured course 是横向 carousel。DOM 中后续卡片继续排列到可视区域之外，外层负责裁切/水平移动；不能把它误做成会撑宽页面的普通 Grid。

### 5.1.3 内容与交互

- KPI：`6 Courses in progress`、`3 Courses completed`、`2 Certificates`。
- Hours spent：Yearly 菜单；图表年份为 2018–2023。
- Continue course：56px 课程图、课程名、`Lessons: x/12`、线性进度百分比。
- Featured course：课程图、时长、学生数、标题、价格 `/ year`、Join。
- Carousel 提供 36×36 Prev/Next IconButton，具有可访问名称。
- 课程图片固有尺寸 `640 × 640`；头像固有尺寸 `192 × 192`。

---

## 5.2 User

### 5.2.1 Profile shell

```text
User Profile
├── Page heading + breadcrumbs
├── Profile hero card
│   ├── Cover image + dark overlay
│   ├── Avatar, name, role
│   └── Tabs: Profile / Followers / Friends / Gallery
└── Tab panel
```

Hero card 宽约 `1045px`、高约 `290px`。Avatar 覆盖 cover 与白色 tab 区的交界。

### 5.2.2 Profile Tab

```text
Profile panel
├── Left column: 332.3px
│   ├── Follower / Following stats
│   ├── About
│   └── Social
└── Right column: 688.7px
    ├── Post composer
    └── Feed cards
```

**已测量**：页面总高约 `3269px`。Composer 包含 textarea、Image/Video、Streaming、Post。Feed card 包含作者、时间、more menu、正文、图片及互动区。

### 5.2.3 Followers / Friends / Gallery

| Tab | Grid | 单卡尺寸 | 页面总高 |
| --- | --- | --- | --- |
| Followers | 3 列，gap 24 | `332.3 × 96` | 约 1360 |
| Friends | 3 列，gap 24 | `332.3 × 262` | 约 2376 |
| Gallery | 3 列，gap 24 | `332.3 × 332.3` | 约 2065 |

- Followers：Avatar、姓名、地区、Follow/Following。
- Friends：Cover、Avatar、姓名、角色、Unfriend。
- Gallery：正方形图片卡，无多余文字。

### 5.2.4 User Cards

- 三列布局，单卡约 `332.3 × 451.9`，页面总高约 `2234px`。
- Cover 固有尺寸约 `1080 × 720`，头像 `192 × 192`。
- 结构：cover → avatar → name/role → social/contact metrics → footer actions。

### 5.2.5 User List

```text
List card (1045 × 650)
├── Status tabs
│   ├── All 20
│   ├── Active 2
│   ├── Pending 10
│   ├── Banned 6
│   └── Rejected 2
├── Toolbar
│   ├── Role combobox
│   └── Search
├── Table
│   ├── selection
│   ├── Name / Email
│   ├── Phone number
│   ├── Company
│   ├── Role
│   ├── Status
│   └── Quick edit / more
└── Footer
    ├── Rows per page
    ├── range + prev/next
    └── Dense switch
```

**已测量**：表格一页显示 5 行；Avatar 渲染 40×40；页面总高约 908px。

### 5.2.6 Create / Edit

```text
User form: 1060px
├── Media card: 337.3px
│   ├── status label (Edit only)
│   ├── photo upload
│   ├── Banned switch (Edit only)
│   ├── Email verified switch
│   └── Delete user (Edit only)
└── Fields card: 698.7px
    ├── Full name
    ├── Email address
    ├── Phone number
    ├── Country
    ├── State / region
    ├── City
    ├── Address
    ├── Zip / code
    ├── Company
    ├── Role
    └── Save action
```

| 页面 | 左卡 | 右卡 | Form 高度 |
| --- | --- | --- | --- |
| Create | `337.3 × 434` | `698.7 × 485` | 485 |
| Edit | `337.3 × 566` | `698.7 × 485` | 566 |

### 5.2.7 Account

Account 顶部有五个 Tabs：General、Billing、Notifications、Social links、Security。

#### General

- 两列结构与 User Edit 相同：`337.3 + 24 + 698.7`。
- 左侧：头像上传、Public profile switch、Delete user。
- 右侧：Name、Email、Phone、Address、Country、State、City、Zip、About。

#### Billing

- 内容列宽 `683.3px`，页面总高约 `1914px`。
- Plan card：`683.3 × 560.8`。
- Payment method：`683.3 × 317.3`，内部两列支付卡约 `309.7 × 98.7`。
- Address book：`683.3 × 658`，地址条目约 `635.3 × 124–126`。
- 危险/高影响动作：Cancel plan、Upgrade plan、Add card、Add address。

#### Notifications

- 单卡 `1060 × 488`。
- 6 个 Switch，分 Activity 与 Application 两组。
- 当前 checked：评论通知、Weekly product updates。

#### Social links

- 单卡 `1060 × 404`。
- Facebook、Instagram、LinkedIn、Twitter 四个输入。

#### Security

- 单卡 `1060 × 348`。
- Old password、New password、Confirm new password。
- 帮助文字：Password must be minimum 6+。

---

## 5.3 Job

### 5.3.1 Job List

```text
Job List
├── Heading / breadcrumbs / Add job
├── Toolbar
│   ├── Search combobox
│   ├── Filters
│   └── Sort by: latest
├── 3-column job grid
└── Pagination
```

**已测量**：

- 12 张卡片，标准视口三列。
- 单卡约 `332.3 × 277`，gap `24`。
- 页面总高 `1631px`。
- 公司 logo 固有尺寸 `128 × 128`，渲染 `48 × 48`。
- 卡片内容：menu、logo、job title、posted date、12 candidates、divider、experience、employment type、salary、role。
- 分页显示 `1 2 3 4 5 … 8`。

### 5.3.2 Job Details / Job content

```text
Job Details
├── Action bar: Back / Go live / Edit / Published
├── Tabs: Job content / Candidates 12
└── Detail layout
    ├── Main content card: 688.7px
    │   ├── Job description
    │   ├── Key responsibilities
    │   ├── Why you'll love working here
    │   ├── Skills
    │   └── Benefits
    └── Aside: 332.3px
        ├── Job metadata
        └── Company information
```

**已测量**：主卡约 `688.7 × 1308`；右栏卡宽 `332.3px`；页面总高约 `1600px`。

### 5.3.3 Candidates

- 12 张 candidate cards，三列。
- 单卡 `332.3 × 136`，横纵 gap 均 `24px`。
- 内容：Avatar、姓名、职位、操作菜单。
- Tab 高 48px；Candidates tab 宽约 107px。
- Pagination 显示 `1 2 3 4 5 … 10`。
- 页面总高约 `1004px`。

### 5.3.4 Create / Edit Job

```text
Centered form: 720px
├── Details card
│   ├── Title
│   └── Rich text content editor
└── Properties card
    ├── Employment type
    ├── Experience
    ├── Role
    ├── Skills
    ├── Working schedule
    ├── Locations
    ├── Expired
    ├── Salary: Hourly / Custom
    ├── Benefits
    ├── Published switch
    └── Create / Save
```

| 页面 | Details | Properties | 页面总高 |
| --- | --- | --- | --- |
| Create | `720 × 539` | `720 × 1417` | 2342 |
| Edit | `720 × 779` | `720 × 1417` | 2582 |

Rich text editor 已出现的 toolbar：Heading、Bold、Italic、Underline、Strike、Bullet、Ordered list、Align left/center/right/justify、Insert/Remove link、Insert image、Hard break、Clear format、Fullscreen。

---

## 5.4 Tour

### 5.4.1 Tour List

- 12 张卡片，三列，gap 24。
- 单卡约 `332.3 × 376`，页面总高约 `2027px`。
- 卡片头部是旅行图片 mosaic；图片固有尺寸 `640 × 640`。
- 卡片信息：price、rating、title、destination、availability date range、duration、bookings、menu。

### 5.4.2 Tour Details / Tour content

```text
Tour Details
├── Action bar + Published
├── Tabs: Tour content / Booker 12
├── 5-image gallery
│   ├── Large image: 518.5 × 518.5
│   └── Four images: each 255.25 × 255.25
└── Centered content: 720px
    ├── Title / rating / favorite / destination
    ├── Guide / availability / contact / duration
    ├── Description
    ├── Highlights
    ├── Program
    └── Services
```

页面总高约 `2111px`。

### 5.4.3 Booker

- 12 张 Booker cards，三列。
- 单卡 `332.3 × 136`，gap 24。
- 内容：Avatar、姓名、`10–21 guests`、Approve、menu。
- Tab 高 48px；Booker tab 宽约 80px。
- Pagination 显示 `1 2 3 4 5 … 10`。
- 页面总高约 `996px`。

### 5.4.4 Create / Edit Tour

```text
Centered form: 720px
├── Details card
│   ├── Name
│   ├── Rich text content
│   └── Multi-image upload
└── Properties card
    ├── Tour guide
    ├── Available start/end
    ├── Duration
    ├── Destination
    ├── Services
    ├── Tags
    ├── Published
    └── Create / Save
```

| 页面 | Details | Properties | 页面总高 |
| --- | --- | --- | --- |
| Create | `720 × 877` | `720 × 934` | 2197 |
| Edit | `720 × 1035` | `720 × 934` | 2355 |

上传区文案：Drop or select files；支持 Remove All、Upload。未触发文件上传和失败状态。

---

## 5.5 Chat

### 5.5.1 固定工作区

| 对象 | Rect |
| --- | --- |
| Main | `300, 72, 1140, 828` |
| Chat card | `340, 156, 1060, 680` |
| Contact pane | `320 × 680` |
| Conversation root | `740 × 680` |

页面不产生纵向 document scroll，滚动发生在联系人、消息和资料三个局部容器内。

### 5.5.2 状态树

```text
Chat workspace
├── Contact pane: 320px
│   ├── Search contacts
│   └── Scrollable contact list
└── Conversation area: 740px
    ├── Empty
    │   ├── + Recipients
    │   ├── illustration
    │   └── disabled composer
    └── Selected
        ├── Header: 72px
        └── Body: 608px
            ├── Message column: 460px
            │   ├── Message scroller: 552px
            │   └── Composer: 56px
            └── Contact details: 280px
                ├── identity
                ├── information
                └── attachments
```

### 5.5.3 已测量状态

- 初次进入联系人区域显示 Skeleton；实测约 5 秒后加载完成，console 无错误。
- Empty：`Type a message` 为 disabled；Recipients 可操作。
- Selected：点击 Lucian Obrien 后 composer 启用；Header 显示姓名和 online。
- 联系人列表、消息区和详情区使用 SimpleBar 风格局部滚动。
- Contact details 中 attachments 区可折叠，内容可超过 1000px，由内部滚动承载。

**设计要求**：不能用页面整体滚动替代三个局部滚动容器，否则 680px 工作区几何和 composer 固定位置会失真。

---

## 5.6 Calendar

### 5.6.1 固定工作区

| 对象 | Rect |
| --- | --- |
| Main | `300, 72, 1140, 828` |
| Calendar card | `340, 156, 1060, 680` |
| Calendar engine root | `339, 236, 1062, 601` |
| Toolbar/header area | 约 80px 高 |

DOM 类名确认目标使用 FullCalendar，方向为 LTR、media screen、standard theme。

### 5.6.2 Toolbar

- Add event。
- View group：Month、Week、Day、Agenda；使用 `aria-pressed` 表达当前视图。
- Previous / Next。
- Date title。
- Today。
- Filter IconButton。

### 5.6.3 四种视图

| View | 标题示例 | Root | Event 数 | View class |
| --- | --- | --- | --- | --- |
| Month | August 2026 | `1062 × 601` | 9 | `fc-dayGridMonth-view` |
| Week | Aug 24 – 30, 2026 | `1062 × 601` | 7 | `fc-timeGridWeek-view` |
| Day | August 24, 2026 | `1062 × 601` | 1 | `fc-timeGridDay-view` |
| Agenda | Aug 24 – 30, 2026 | `1062 × 601` | 7 | `fc-listWeek-view` |

Month 以 Monday 为周起始日。非当前月日期和周末使用较弱的 neutral surface。事件过多时显示 `+1 more`。

### 5.6.4 Add / Edit Event Dialog

| 对象 | 值 |
| --- | --- |
| Dialog | `444 × 674`，`x=498, y=113`（1440×900） |
| Radius | 16px |
| Scrollable content | `444 × 514` |
| Footer | Cancel + Create / Save changes |

字段：

1. Title。
2. Description。
3. All day Switch。
4. Start date + time。
5. End date + time。
6. 8 个 color swatches。

Color swatches：`#00A76F`、`#8E33FF`、`#00B8D9`、`#003768`、`#22C55E`、`#FFAB00`、`#FF5630`、`#7A0916`。

Edit 在相同 Dialog 上增加：

- 预填 title、description、start、end、color。
- Delete event IconButton。
- Save changes。

Dialog 已确认具有可访问标题 `Add event` / `Edit event`；Delete event 与颜色按钮具有 accessible name。Escape、焦点循环和错误信息关联尚未单独验证。

---

## 6. 基础 UI tokens

## 6.1 Color primitives

以下色值直接来自目标 CSS variables。

| Scale | Lighter | Light | Main | Dark | Darker | Contrast |
| --- | --- | --- | --- | --- | --- | --- |
| Primary / Integrate | `#C8FAD6` | `#5BE49B` | `#00A76F` | `#007867` | `#004B50` | `#FFFFFF` |
| Secondary | `#EFD6FF` | `#C684FF` | `#8E33FF` | `#5119B7` | `#27097A` | `#FFFFFF` |
| Info | `#CAFDF5` | `#61F3F3` | `#00B8D9` | `#006C9C` | `#003768` | `#FFFFFF` |
| Success | `#D3FCD2` | `#77ED8B` | `#22C55E` | `#118D57` | `#065E49` | `#FFFFFF` |
| Warning | `#FFF5CC` | `#FFD666` | `#FFAB00` | `#B76E00` | `#7A4100` | `#1C252E` |
| Error | `#FFE9D5` | `#FFAC82` | `#FF5630` | `#B71D18` | `#7A0916` | `#FFFFFF` |

### 6.1.1 Grey

| Token | Value |
| --- | --- |
| Grey 50 | `#FCFDFD` |
| Grey 100 | `#F9FAFB` |
| Grey 200 | `#F4F6F8` |
| Grey 300 | `#DFE3E8` |
| Grey 400 | `#C4CDD5` |
| Grey 500 | `#919EAB` |
| Grey 600 | `#637381` |
| Grey 700 | `#454F5B` |
| Grey 800 | `#1C252E` |
| Grey 900 | `#141A21` |

## 6.2 Semantic colors

| Role | Light | Dark | 证据等级 |
| --- | --- | --- | --- |
| background.default | `#FFFFFF` | `#141A21` | 已测量 |
| background.paper | `#FFFFFF` | `#1C252E` | 已测量 |
| background.neutral | `#F4F6F8` | `#28323D` | 已测量 |
| text.primary | `#1C252E` | `#FFFFFF` | 已测量 |
| text.secondary | `#637381` | `#919EAB` | 已测量 |
| text.disabled | `#919EAB` | Grey 600 附近 | 已测量 / CSS variable |
| divider | `rgba(145 158 171 / 20%)` | 同值 | 已测量 |
| action.hover | `rgba(145 158 171 / 8%)` | 同规则 | 已测量 |
| action.selected | `rgba(145 158 171 / 16%)` | 同规则 | 已测量 |
| action.focus | `rgba(145 158 171 / 24%)` | 同规则 | 已测量 |
| action.disabled | `rgba(145 158 171 / 80%)` | 同规则 | 已测量 |
| action.disabledOpacity | `0.48` | `0.48` | 已测量 |

## 6.3 Typography

### 6.3.1 字体资源

- Body/UI：`Public Sans Variable`。
- Display h1–h3：`Barlow`。
- Fallback：`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`，随后 Apple/Segoe UI emoji。
- 已观察字体文件：`public-sans-latin-wght-normal-*.woff2`。
- Barlow 在本轮页面没有触发实际网络加载，因此文件路径和具体子集仍需补证。

### 6.3.2 排版表

| Variant | Family | Weight | Base size | Line height |
| --- | --- | --- | --- | --- |
| h1 | Barlow | 800 | 40px | 50px |
| h2 | Barlow | 800 | 32px | 42.67px |
| h3 | Barlow | 700 | 24px | 36px |
| h4 | Public Sans | 700 | 20px | 30px |
| h5 | Public Sans | 700 | 18px | 27px |
| h6 | Public Sans | 600 | 17px | 26.44px |
| subtitle1 | Public Sans | 600 | 16px | 24px |
| subtitle2 | Public Sans | 600 | 14px | 22px |
| body1 | Public Sans | 400 | 16px | 24px |
| body2 | Public Sans | 400 | 14px | 22px |
| caption | Public Sans | 400 | 12px | 18px |
| button | Public Sans | 700 | 14px | 24px |
| overline | Public Sans | 700 | 12px | 18px |

**已测量**：标准桌面页面 h4 最终渲染为 `24px / 36px`；h6 最终渲染为 `18px / 28px`。因此排版存在响应式字号提升，不能只复制 base CSS variable。

## 6.4 Spacing and sizing

- 基础 spacing unit：`8px`。
- 高频间距：8、12、16、24、32、40、48、64。
- 页面标准水平 padding：40。
- Card Grid gap：24。
- Form Card padding：24。
- 页面 heading 与正文主区通常相隔 40。
- Toolbar controls 常用 gap：8–16。
- 头像尺寸：32、40、48、56、64、84、128。
- IconButton：28、32、36、40；圆形。
- 小型主按钮：36px 高；Add job 实测 `98.75 × 36`、padding `6px 12px`。
- 标准 TextField 外框约 56–57px 高；Search 内部 input 高约 39px。

## 6.5 Shape, border, shadow

| Role | Rule |
| --- | --- |
| Base radius | 8px |
| Card / Dialog | 16px |
| Input / Button | 8px |
| IconButton | 50% |
| Pill / label | full radius |
| Divider | `rgba(145 158 171 / 20%)` |
| Outlined input | `rgba(145 158 171 / 20%)` |
| Outlined paper | `rgba(145 158 171 / 16%)` |

Card Light shadow：

```css
0 0 2px 0 rgba(145, 158, 171, 0.20),
0 12px 24px -4px rgba(145, 158, 171, 0.12)
```

Card Dark shadow：

```css
0 0 2px 0 rgba(0, 0, 0, 0.20),
0 12px 24px -4px rgba(0, 0, 0, 0.12)
```

## 6.6 Motion

| Component | 已测量 transition |
| --- | --- |
| Card | `box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)` |
| Button / link-button | background、shadow、border `250ms cubic-bezier(0.4, 0, 0.2, 1)` |
| IconButton | background `150ms cubic-bezier(0.4, 0, 0.2, 1)` |
| Pagination | color/background `250ms cubic-bezier(0.4, 0, 0.2, 1)` |

Drawer、Dialog、Menu 的完整进入/退出曲线没有单独测量。复刻时必须支持 `prefers-reduced-motion`，将非必要位移和长过渡关闭。

---

## 7. 资源清单

## 7.1 Font and CSS

| Resource | 观察地址 / 名称 | 用途 |
| --- | --- | --- |
| Public Sans | `public-sans-latin-wght-normal-*.woff2` | UI 主字体 |
| Main CSS | `index-*.css` | 全局主题与组件 |
| Editor CSS | `editor-*.css` | Rich text editor |
| Markdown CSS | `markdown-*.css` | Details rich content |

## 7.2 Images

目标资源域：

```text
https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/
```

| Pattern | 固有尺寸 | 用途 |
| --- | --- | --- |
| `images/mock/avatar/avatar-*.webp` | 192 × 192 | User、Chat、Candidates、Booker |
| `images/mock/cover/cover-*.webp` | 1080 × 720 | Profile、Friends、Gallery |
| `images/mock/company/company-*.webp` | 128 × 128 | Job logo |
| `images/mock/travel/travel-*.webp` | 640 × 640 | Tour cards/gallery |
| `images/mock/course/course-*.webp` | 640 × 640 | Course |
| `icons/workspaces/logo-1.webp` | 未单独测量 | Header workspace |
| `images/mock/avatar/avatar-25.webp` | 192 × 192 | Jaydon Frankie |

## 7.3 Icons

- Nav icons 为独立 SVG：`icons/navbar/ic-course.svg`、`ic-user.svg`、`ic-job.svg`、`ic-tour.svg`、`ic-chat.svg`、`ic-calendar.svg` 等。
- 业务 IconButton 大量使用 Iconify inline SVG，已观察 Solar、Eva、Carbon 等集合。
- 禁止用 Unicode 符号或系统 emoji 代替 nav、action、status 图标。

## 7.4 授权风险

资源地址可直接观察，但本文没有取得图片、logo、字体和商业模板的再分发授权证明。后续实现前应确认 Minimal UI 模板许可与 mock 资源许可；授权未确认时只能用于内部取证和设计对照。

---

## 8. 组件目录与受约束 API

以下 API 为实现中立的组件契约，不绑定具体框架或当前项目。

| Component | 核心输入 | 变体 |
| --- | --- | --- |
| AppShell | nav data、workspace、utility actions、direction、mode | vertical / compact nav；LTR / RTL |
| PageHeader | title、breadcrumbs、primary action、status actions | standard / action bar |
| EntityToolbar | search、filters、sort、result summary | inline / wrapped |
| EntityCard | image/logo、title、meta、metrics、actions | job / tour / user / candidate / booker |
| DetailTabs | tabs、count、selected | content / participants |
| DetailLayout | content、aside | two-column / centered |
| EntityFormSection | title、caption、children | details / properties |
| UploadZone | files、accept、size limit、state | avatar / single / multi |
| RichTextEditor | value、toolbar、state | default / fullscreen / readonly |
| DataTable | columns、rows、selection、density、pagination | standard / dense |
| AccountTabs | selected route、tabs | five fixed tabs |
| ChatWorkspace | contacts、conversation、details、loading | empty / selected |
| CalendarWorkspace | view、date、events、filters | month / week / day / agenda |
| EventDialog | mode、event、validation、pending | add / edit |

视觉参数不得由页面自由传入任意颜色、间距、圆角或阴影。可开放的参数应限制为 `variant`、`size`、`tone`、`state`、`density`、`selected`、`loading`、`disabled`、`fullWidth`。

---

## 9. 完整状态矩阵

| Component | Default | Hover | Focus-visible | Selected / Checked | Disabled | Loading | Empty | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nav link | 已测量 | 有 CSS 状态 | 需补证 | 已测量 | 发现语义缺陷 | N/A | N/A | N/A |
| Nav group | 已测量 | 有 CSS 状态 | 需补证 | expanded 已测量 | N/A | N/A | N/A | N/A |
| Button | 已测量 | transition 已测量 | 需补证 | pressed 适用 | 分页 disabled 已测量 | 未触发 | N/A | N/A |
| IconButton | 已测量 | transition 已测量 | 需补证 | pressed 适用 | 部分适用 | 未触发 | N/A | N/A |
| TextField | 已测量 | 边界需补证 | focus 外观需补证 | N/A | 适用 | N/A | empty 已测量 | 未触发 |
| Combobox | 已测量 | 需补证 | 需补证 | open 适用 | 适用 | N/A | empty 已测量 | 未触发 |
| Checkbox | 已测量 | 需补证 | 需补证 | checked 已测量 | 适用 | N/A | N/A | N/A |
| Radio | 已测量 | 需补证 | 需补证 | checked 已测量 | 适用 | N/A | N/A | N/A |
| Switch | 已测量 | 需补证 | 需补证 | checked 已测量 | 适用 | N/A | N/A | N/A |
| Tabs | 已测量 | 需补证 | 需补证 | selected 已测量 | 适用 | N/A | N/A | N/A |
| Card | 已测量 | shadow transition 已测量 | link focus 需补证 | selected 少量适用 | N/A | Skeleton 替代 | grid empty 未出现 | N/A |
| Table | 已测量 | row hover 需补证 | controls 需补证 | row selection 已出现 | pagination 已测量 | 未触发 | 未触发 | 未触发 |
| Chat | empty 已测量 | contacts 需补证 | 键盘需补证 | selected 已测量 | composer 已测量 | Skeleton 已测量 | empty 已测量 | 未出现 |
| Calendar | Month 已测量 | event hover 需补证 | keyboard 需补证 | view pressed 已测量 | N/A | 未出现 | 无事件未出现 | 未出现 |
| Dialog | add/edit 已测量 | N/A | focus trap 需补证 | color selected 已测量 | submit 适用 | 未触发 | N/A | validation 未触发 |
| Upload | empty/prefilled 已测量 | drop hover 未触发 | 需补证 | files selected 未触发 | 适用 | upload 未触发 | empty 已测量 | failure 未触发 |
| Rich editor | empty/prefilled 已测量 | toolbar 需补证 | 需补证 | toolbar active 适用 | readonly 适用 | N/A | empty 已测量 | N/A |

“需补证”不代表可忽略，而是后续视觉/交互验收必须生成证据的项目。

---

## 10. 桌面宽度规则

## 10.1 导航断点

| Viewport | Header | Nav | Main |
| --- | --- | --- | --- |
| 1024 | 64px | hidden / Drawer | `x=0, width≈1009` |
| 1199 | 64px | hidden / Drawer | `x=0, width≈1184` |
| 1200 | 72px | fixed 300px | `x=300, width≈885` |
| 1440 | 72px | fixed 300px | `x=300, width≈1125` |
| 1536 | 72px | fixed 300px | `x=300, width≈1221` |

**已测量**：断点精确发生在 1200px。1199→1200 会出现明显非连续变化：导航出现后，Main 突然减少 299px。

## 10.2 Job grid 实测

| Viewport | 第一行列数 | 单卡宽 |
| --- | --- | --- |
| 1024 | 3 | 304.3px |
| 1199 | 3 | 362.7px |
| 1200 | 3 | 252.3px |
| 1440 | 3 | 332.3px |
| 1536 | 3 | 357.3px |

目标没有在 1200px 因卡片变窄而降为两列。复刻时不能自行使用常见 tablet 两列规则替换这一行为。

## 10.3 超宽桌面

Course 在 `2560 × 1212` 下保持流式增长：

- Main：`x=300, width≈2245`。
- KPI card：约 585.3px。
- Hours chart：约 1804px。
- 下方两张分析卡：约 890px。

**已测量**：Course 没有在 1200px 左右固定最大内容宽；不能默认使用窄阅读容器。

## 10.4 Compact

Settings 中 Compact 为 checked。分别在 1440 与 2560 对 Course 采样时，开/关没有引起已测区域的几何变化。

因此：

- **已测量**：Compact 设置存在且可切换。
- **已测量**：采样页面与宽度没有发现布局差异。
- **暂时假设**：该设置可能只影响其他 layout variant 或部分页面；不得为本轮页面自行设计 Compact 差异。

---

## 11. Theme、RTL 与可访问性

## 11.1 Dark mode

**已测量**：切换 Mode 后 document 使用 `data-color-scheme="dark"`。

- body：`#141A21` / white text。
- card：`#1C252E`。
- neutral：`#28323D`。
- text.secondary：`#919EAB`。
- primary 保持 `#00A76F`。
- card shadow 从 Grey 500 alpha 改为 black alpha。

Dark 不是简单反色；必须独立映射 surface、text、shadow，同时保持图片原色。

## 11.2 RTL

在 `1440 × 900`：

- `document.dir` 从 `ltr` 变为 `rtl`。
- Nav 从 `x=0` 移到 `x≈1126`，宽 299。
- Main 从 `x=300` 移到 `x=0`。
- Course 三张 KPI card 顺序与对齐线镜像，左列变为右列。

所有 margin/padding/position 应使用逻辑方向，不应依赖硬编码 left/right。

## 11.3 Keyboard contract

后续实现应满足：

- Tab / Shift+Tab 按视觉与 DOM 顺序移动。
- Enter 激活 Link/Button/Menu item。
- Space 切换 Checkbox、Radio、Switch、pressed Button。
- Arrow keys 控制 Tabs、Radio group、Menu、Calendar roving focus。
- Escape 关闭 Menu、Popover、Dialog、Drawer，并将焦点还给触发器。
- Dialog 内焦点循环，打开时聚焦标题后的第一个可编辑字段。
- Chat composer：Enter 发送，Shift+Enter 换行；IME composing 时不得误发送。
- Calendar：视图切换和日期导航不依赖鼠标；事件可聚焦并打开 Edit Dialog。

其中部分属于明显可访问性补强，不代表目标站已全部实现。

## 11.4 Focus and contrast

- 目标 CSS 已存在 action.focus 24% alpha token，但本轮工具未可靠取得全部 `:focus-visible` pseudo-state 的最终外观。
- 复刻时统一使用 2px 可见 focus ring，并保证 ring 与当前 surface 对比清晰。
- 颜色不能作为唯一状态：Published、Status、rating、progress 必须同时有文字、图标或数值。
- forced-colors、高对比度、200% 文本放大尚未在目标站逐页验证，列为验收项。

---

## 12. 数据与内容模型

### 12.1 User

```text
User
├── id
├── name / email / phone
├── avatar / cover
├── company / role / location / address
├── status: Active | Pending | Banned | Rejected
├── verified / publicProfile / banned
├── socialLinks
└── follower / following metrics
```

### 12.2 Job

```text
Job
├── id / title / company / logo
├── description / responsibilities / reasons
├── employmentType / experience / role
├── skills / schedule / locations
├── expiredAt / salary / benefits
├── publishedAt / status
└── candidates[]
```

### 12.3 Tour

```text
Tour
├── id / name / destination / images[]
├── description / highlights / program
├── guides[] / availability / duration
├── services[] / tags[]
├── price / rating / bookings / status
└── bookers[]: user + guests + approval state
```

### 12.4 Chat

```text
Conversation
├── id / participants[] / unreadCount
├── lastMessage / updatedAt
└── messages[]
    ├── sender / body / createdAt
    ├── status
    └── attachments[]
```

### 12.5 Calendar

```text
CalendarEvent
├── id / title / description
├── start / end / allDay
├── color
└── optional recurrence / participants (目标本轮未出现)
```

目标演示数据的日期相对当前采集日生成，列表中的 Posted date、Calendar 当前月、Chat attachments 时间均会随访问日期变化。视觉验收必须冻结 fixture 和时区，否则 pixel diff 不可复现。

---

## 13. Loading、Empty、Error 与反馈

### 13.1 已出现

- 全局路由懒加载 LinearProgress。
- Chat 联系人 Skeleton。
- Chat 无会话 empty illustration。
- disabled composer。
- Pagination disabled previous。
- 空 Create form 与预填 Edit form。

### 13.2 未出现但必须设计

以下为远程或提交型界面应具备的完整状态，但目标本轮没有直接证据：

- User/Job/Tour 列表 Skeleton、empty、error + retry。
- Details 404 / permission denied / partial data。
- Form field validation、server validation、submit pending、submit error、submit success。
- Upload progress、format error、size error、network failure、remove confirmation。
- Chat loading error、send pending、send failure、retry、attachment failure、offline。
- Calendar loading、empty、create/update/delete error、conflict。

这些状态的布局应复用对应稳定页面骨架，不得切换成无关通用模板。具体文案、错误码和业务恢复动作需等真实契约后确定。

---

## 14. 技术事实与第三方边界

从资源 chunk、DOM 类名和运行时行为可确认：

- React 渲染。
- Material UI 组件和 CSS variables theme。
- Iconify inline SVG。
- FullCalendar：Month / timeGrid Week / timeGrid Day / list Week。
- SimpleBar 风格滚动容器。
- Day.js 日期处理。
- 富文本编辑器独立 CSS；toolbar 行为符合 Tiptap/ProseMirror 类编辑器，但具体包名本轮未直接确认。
- Course 图表使用 SVG/canvas 图表库；仅凭输出不能把具体图表引擎写死。

后续实现可选择等价技术，但不得改变已测 DOM 语义、键盘行为、几何、overflow 和视觉状态。

---

## 15. 验收方案

## 15.1 固定环境

- Chrome stable，macOS。
- DPR 1，缩放 100%。
- 字体确认已加载。
- 时区 Asia/Shanghai。
- 冻结相同 fixture、排序、日期和登录用户。
- Viewports：1024×900、1199×900、1200×900、1440×900、1536×900、2560×1212。

## 15.2 分层验收

| Level | 内容 | 通过条件 |
| --- | --- | --- |
| L0 | 路由、区域、DOM 语义、阅读顺序 | 页面/Tab/浮层完整，无错误路由 |
| L1 | 几何 | 关键框架偏差 ≤2px，普通间距/尺寸偏差 ≤4px |
| L2 | 视觉 | 字体、色值、radius、shadow、图片 crop、icon 一致 |
| L3 | 状态 | hover、focus、selected、disabled、loading、empty、error 完整 |
| L4 | 桌面适配 | 1200 断点、超宽流式、RTL、Dark 无横向页面溢出 |
| L5 | 交互工程 | 键盘、焦点还原、局部滚动、Dialog、Menu、Form 可用 |

## 15.3 对比方法

1. 同环境生成目标与实现截图。
2. 先对齐 shell 和页面起始坐标。
3. 做 50% alpha overlay，检查整体偏移。
4. 做 pixel diff，按结构、字体度量、颜色、资源、平台渲染分类。
5. 对关键节点做 DOM/computed diff。
6. 真实执行联系人选择、Tab 切换、Calendar 四视图、Add/Edit Dialog、表单键盘路径。

不因文字抗锯齿差异盲改布局；字体度量不一致时先检查字体文件、字重和 fallback。

---

## 16. 风险与未解决项

| 风险 | 当前状态 | 补证方式 |
| --- | --- | --- |
| 资源授权 | 未确认 | 核对 Minimal UI 许可和 mock 资源许可 |
| Barlow 文件 | 本轮未实际加载 | 打开使用 h1–h3 的页面并检查 font request |
| Hover 精确色值 | 部分仅取得 transition | 使用 CDP pseudo-state 或录屏逐控件取证 |
| Focus-visible 精确外观 | 工具未可靠取得 | 键盘走查 + 高倍率截图 |
| Contrast 模式 | 未切换 | 单独覆盖 Light/Dark × Contrast |
| forced-colors / 200% text | 未验证 | OS/浏览器辅助模式测试 |
| 表单 validation / server errors | 未触发 | 使用无副作用测试环境或源码状态注入 |
| 删除、批准、保存结果 | 未触发 | 在隔离数据环境补业务闭环 |
| Course 图表引擎 | 未直接确认 | 检查 bundle import 或源码 |
| Rich editor 具体实现包 | 未直接确认 | 检查 bundle/source map |
| Compact 的实际作用 | 采样页无几何变化 | 覆盖其他 layout variant 与页面 |
| Chat 5 秒加载 | 可能受网络与 demo 数据影响 | 重复多次记录 resource timing |

---

## 17. 最终设计结论

1. 这六个模块不是六套孤立页面，而是同一套 shell、theme、Card/Form/Table/Tabs/Workspace 模式的组合。
2. 最重要的布局常量是 300px nav、72px header、40px 内容 gutter、24px grid gap、16px card radius，以及 720px centered form。
3. User、Job、Tour 共享“列表—详情—创建—编辑”语言，但卡片内容、详情阅读顺序和表单字段不可强行抽成同一个万能组件。
4. Chat 与 Calendar 都是 1060×680 的固定工作区，但滚动和状态所有权完全不同，应只共享 workspace surface，不共享业务结构。
5. 目标在 1200px 发生导航断点，且 Job grid 保持三列，存在明显的宽度非连续性；复刻时必须保留。
6. Light/Dark 和 LTR/RTL 都是完整主题/布局映射，不是局部 class 切换。
7. 后续实现应先复刻 shell、tokens 和页面骨架，再实现组件状态与真实资源，最后完成逐层截图和键盘验收。

本文至此形成可以进入独立实现阶段的设计基线，但不包含任何当前项目接入决策。
