---
name: quant-client
description: >
  Project-specific coding skill for the quant-client frontend dashboard.
  USE THIS whenever working on this codebase. Contains architecture conventions,
  component patterns, theming rules, and project-specific best practices.
---

# Quant Client — Project Coding Skill

This is a financial/quant dashboard frontend built on:

- **React 19.1.0** + **TypeScript 5.8.2**
- **MUI v7.0.1** (Material UI) + **Emotion** (CSS-in-JS)
- **React Router v7.4.1** (file-based sections pattern)
- **Vite 6.2.5** + SWC compiler
- **ApexCharts 4.5.0** for data visualizations
- **Iconify React 5.2.1** for icons
- **minimal-shared 1.0.7** shared utility library

---

## Architecture Overview

```
main.tsx → app.tsx (ThemeProvider + RouterProvider)
    → routes/sections.tsx (lazy-loaded routes)
        → pages/*.tsx (thin containers, just renders the view)
            → sections/*/view/*.tsx (actual feature views)
                → sections/*/*.tsx (feature-specific components)
                    → components/* (shared UI components)
```

**Critical rule**: `pages/` files are thin shell — they only import and render the corresponding `sections/*/view/` component. All logic and JSX live in `sections/`.

---

## File Naming & Directory Conventions

| File type           | Convention                        | Example                         |
| ------------------- | --------------------------------- | ------------------------------- |
| React components    | kebab-case `.tsx`                 | `user-table-row.tsx`            |
| Type definitions    | `types.ts` per component folder   | `label/types.ts`                |
| CSS class name maps | `classes.ts` per component folder | `label/classes.ts`              |
| Barrel exports      | `index.ts` per folder             | `label/index.ts`                |
| Hooks               | `use-*.ts`                        | `use-chart.ts`, `use-router.ts` |
| Utils               | kebab-case `.ts`                  | `format-time.ts`                |
| Navigation configs  | `nav-config-*.tsx` in `layouts/`  | `nav-config-dashboard.tsx`      |
| **Test files**      | `__tests__/<模块名>.test.{ts,tsx}` in same dir | `utils/__tests__/format-number.test.ts` |

---

## Adding a New Page / Section

When the user asks to add a new route/page, the workflow is:

1. **Create section view** → `src/sections/<feature>/view/<feature>-view.tsx`
2. **Create feature components** → `src/sections/<feature>/<component-name>.tsx`
3. **Create thin page wrapper** → `src/pages/<feature>.tsx`
4. **Register lazy route** in `src/routes/sections.tsx`:
   ```tsx
   const FeaturePage = lazy(() => import('src/pages/feature'));
   // Inside routes array:
   { path: '/feature', element: <FeaturePage /> }
   ```
5. **Add nav item** in `src/layouts/nav-config-dashboard.tsx`

---

## Theming — How to Use the MUI Theme

This project has an extended MUI v7 theme. Always use theme tokens, never hardcode colors.

### Palette Colors (6 semantic colors)

```tsx
// Usage in sx prop or styled
sx={{ color: 'primary.main' }}           // #1877F2
sx={{ bgcolor: 'secondary.light' }}      // lighter purple
sx={{ color: 'success.dark' }}           // dark green
// Other: info, warning, error
```

Each color has 5 depths: `lighter`, `light`, `main`, `dark`, `darker`

### CSS Variable Alpha (varAlpha)

For transparent colors, use the CSS variable channel pattern:

```tsx
import { varAlpha } from 'minimal-shared/utils';

sx={{ bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08) }}
```

### Typography Variants

```tsx
<Typography variant="h1" />   // Barlow Bold, large heading
<Typography variant="h4" />   // Barlow Bold, section title
<Typography variant="body1" /> // DM Sans, main body text
<Typography variant="body2" /> // DM Sans, secondary text
<Typography variant="caption" /> // Small labels
<Typography variant="overline" /> // Track letters, uppercase labels
```

### Theme Access

```tsx
import { useTheme } from '@mui/material/styles';
const theme = useTheme();
// theme.vars.palette.primary.main (CSS variable)
// theme.palette.primary.main (JS value)
```

---

## Layout System

### DashboardLayout

All authenticated pages use `DashboardLayout` from `src/layouts/dashboard/`.

```
DashboardLayout
├── HeaderSection (sticky AppBar with: menu button, logo, searchbar, notifications, language, account)
├── NavDesktop / NavMobile (from nav-config-dashboard.tsx)
└── Main content area
```

`layoutQuery` prop controls the breakpoint where desktop nav appears (default: `'lg'`).

### AuthLayout

Login/auth pages use `AuthLayout` from `src/layouts/auth/`.

```
AuthLayout
├── Logo + help link header
├── Centered content area
└── Decorative illustration panel (desktop)
```

---

## Component Patterns

### Every shared component folder structure:

```
components/my-component/
├── my-component.tsx   ← main component
├── types.ts           ← prop types (use export type { MyComponentProps })
├── classes.ts         ← CSS class name constants (myComponentClasses)
├── styles.tsx         ← styled components (if complex)
└── index.ts           ← barrel: export { MyComponent } from './my-component'
                                  export type { MyComponentProps } from './types'
```

### Label Component (shared badge/tag)

```tsx
import { Label } from 'src/components/label';

<Label color="success" variant="filled">Active</Label>
<Label color="error" variant="outlined">Banned</Label>
// colors: primary, secondary, info, success, warning, error, default
```

### Iconify Icons

```tsx
import { Iconify } from 'src/components/iconify';

<Iconify icon="solar:home-bold" />
<Iconify icon="solar:user-rounded-bold" width={24} />
// Icon prefix conventions: solar:*, eva:*, mdi:*
```

当遇到 icon 类的类型错误或缺失（例如编译/运行时提示某个 Iconify 图标不存在或类型不匹配）时，参考 https://docs.minimals.cc/icons/ 中的说明补充图标定义。具体做法：

- 将缺失或自定义的 SVG body 添加到本地图标集合（`src/components/iconify/icon-sets.ts`）中，使用 `"前缀:名称"` 作为键（例如 `"solar:home-bold"`）。
- 在 `src/components/iconify/register-icons.ts` 中确保已将对应集合通过 Iconify 的 `addCollection`/注册流程注册到运行时。
- 优先在本地注册缺失图标并恢复原有图标名，不要通过替换为其它图标来规避问题，以保持 UI 语义一致。

本项目通常把 Iconify 图标局部存放并集中注册，遵循以上步骤可以快速修正 icon 相关的类型/运行错误。

### SvgColor (for nav icons from public/assets)

```tsx
import { SvgColor } from 'src/components/svg-color';

<SvgColor src="/assets/icons/navbar/ic-dashboard.svg" />;
```

---

## Chart Components

All charts use ApexCharts via `use-chart` hook:

```tsx
import { Chart, useChart } from 'src/components/chart';

const chartOptions = useChart({
  // override defaults here — toolbar disabled, zoom disabled by default
  xaxis: { categories: [...] },
  plotOptions: { bar: { columnWidth: '28%' } },
});

<Chart type="bar" series={series} options={chartOptions} height={320} />
```

---

## Mock Data (Development Only)

All mock data lives in `src/_mock/`. Use this pattern:

```tsx
import { _users, _posts, _products } from 'src/_mock';
// Each is an array of 24 pre-generated objects

// For single items:
import { _myAccount } from 'src/_mock';
```

Mock generators from `_mock.ts`:

- `_id(index)` → UUID
- `_fullName(index)` → person name
- `_price(index)` → price number
- `_times(index)` → date string
- `_boolean(index)` → verified status

**When creating a new data shape**, add generators to `_mock.ts` and pre-generated array to `_data.ts`, then export from `index.ts`.

---

## Routing

```tsx
// src/routes/sections.tsx pattern
const MyPage = lazy(() => import('src/pages/my-page'));

// Inside: element wrapping with Suspense (already in place via RouterProvider)
{ path: '/my-path', element: <MyPage /> }
```

**Route params and navigation** via hooks:

```tsx
import { useRouter, usePathname } from 'src/routes/hooks';

const router = useRouter();
router.push('/dashboard'); // navigate
router.back(); // history.back()

const pathname = usePathname(); // current path string
```

**RouterLink** for `<Link>` behaviors:

```tsx
import { RouterLink } from 'src/routes/components';
<Button component={RouterLink} href="/sign-in">
  Go to sign in
</Button>;
```

---

## Code Style & ESLint Rules

> All rules below are **enforced by ESLint** (`eslint.config.mjs`). Violations will cause lint errors or warnings. Always run `npm run lint` before committing.

---

### 1. Import Order (ERROR — `perfectionist/sort-imports`)

Imports must follow this exact group order, with a **blank line between each group**:

```tsx
// ── Group 1: style / CSS ──────────────────────────────────
import 'src/global.css';

// ── Group 2: side-effect imports ─────────────────────────
import 'reflect-metadata';

// ── Group 3: type-only imports ───────────────────────────
import type { FC } from 'react';
import type { User } from 'src/types/user';

// ── Group 4: external (builtins + npm packages) ───────────
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

// ── Group 5: @mui/* ───────────────────────────────────────
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ── Group 6: src/routes/* ─────────────────────────────────
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

// ── Group 7: src/hooks/* ──────────────────────────────────
import { useBoolean } from 'src/hooks/use-boolean';

// ── Group 8: src/utils/* ──────────────────────────────────
import { fDate } from 'src/utils/format-time';

// ── Group 9: other src/* internals (src/api, src/config…) ─
import { userApi } from 'src/api/user';
import { CONFIG } from 'src/config-global';

// ── Group 10: src/components/* ───────────────────────────
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ── Group 11: src/sections/* ─────────────────────────────
import { UserTableRow } from 'src/sections/user';

// ── Group 12: src/auth/* ──────────────────────────────────
import { useAuthContext } from 'src/auth/hooks';

// ── Group 13: src/types/* ─────────────────────────────────
import type { UserItem } from 'src/types/user';

// ── Group 14: relative imports (parent / sibling / index) ─
import { MyHelper } from '../utils';
import type { MyProps } from './types';
```

Within each group, imports are sorted by **line length ascending**.

**Named imports** within a single `import { … }` statement are also sorted by line length ascending:

```tsx
// ✅ Correct
import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

// ❌ Wrong order
import { fDateTime, fDate, fToNow } from 'src/utils/format-time';
```

---

### 2. `import type` for type-only imports (WARN — `@typescript-eslint/consistent-type-imports`)

Use `import type` whenever importing only TypeScript types/interfaces:

```tsx
// ✅ Correct
import type { BoxProps } from '@mui/material/Box';
import type { UserItem } from 'src/types/user';

// ❌ Wrong — regular import used for a type
import { BoxProps } from '@mui/material/Box';
```

---

### 3. Newline after import block (ERROR — `import/newline-after-import`)

There must be exactly one blank line between the last `import` statement and the first non-import code:

```tsx
// ✅ Correct
import Box from '@mui/material/Box';

export function MyComponent() { … }

// ❌ Wrong — no blank line
import Box from '@mui/material/Box';
export function MyComponent() { … }
```

---

### 4. MUI Import Style (enforced by import grouping)

Always import from the specific subpath (better tree-shaking):

```tsx
// ✅ Correct
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// ❌ Avoid — barrel import
import { Box, Stack, Typography } from '@mui/material';
```

---

### 5. JSX — Self-closing components (ERROR — `react/self-closing-comp`)

```tsx
// ✅ Correct
<Box />
<Divider />

// ❌ Wrong
<Box></Box>
```

---

### 6. JSX — Explicit boolean props (ERROR — `react/jsx-boolean-value`)

```tsx
// ✅ Correct
<TextField disabled={true} />
<Switch checked={false} />

// ❌ Wrong — shorthand boolean
<TextField disabled />
```

---

### 7. JSX — No useless fragments (WARN — `react/jsx-no-useless-fragment`)

```tsx
// ✅ Correct — no wrapping fragment needed
return <Box>{content}</Box>;

// ❌ Wrong — unnecessary fragment
return (
  <>
    <Box>{content}</Box>
  </>
);
```

Fragments are allowed when wrapping multiple siblings or inside expressions (e.g. `condition && <>{a}{b}</>`).

---

### 8. JSX — No unnecessary curly braces (ERROR — `react/jsx-curly-brace-presence`)

Do not wrap string literals or non-dynamic values in curly braces in JSX props or children:

```tsx
// ✅ Correct
<Typography variant="h4">Hello</Typography>
<Box className="my-class" />

// ❌ Wrong — unnecessary curly braces around string
<Typography variant={"h4"}>{"Hello"}</Typography>
<Box className={"my-class"} />
```

---

### 9. Arrow function body style (ERROR — `arrow-body-style`)

Omit curly braces and `return` for arrow functions that return a single expression:

```tsx
// ✅ Correct
const double = (x: number) => x * 2;
const getLabel = (item: Item) => item.label;
const rows = items.map((item) => <Row key={item.id} item={item} />);

// ❌ Wrong — unnecessary block body
const double = (x: number) => {
  return x * 2;
};
const rows = items.map((item) => {
  return <Row key={item.id} item={item} />;
});
```

Exception: when the function body contains multiple statements or side effects, the block body is required.

---

### 10. Object shorthand (WARN — `object-shorthand`)

Use shorthand property and method syntax:

```tsx
// ✅ Correct
const obj = { name, value, onClick };
const api = { fetchUser() { … } };

// ❌ Wrong
const obj = { name: name, value: value, onClick: onClick };
const api = { fetchUser: function() { … } };
```

---

### 11. No useless renaming (WARN — `no-useless-rename`)

Don't rename imports, exports, or destructured vars to the same name:

```tsx
// ✅ Correct
import { foo } from './foo';
const { bar } = obj;
export { baz };

// ❌ Wrong
import { foo as foo } from './foo';
const { bar: bar } = obj;
export { baz as baz };
```

---

### 12. No unused imports (WARN — `unused-imports/no-unused-imports`)

Remove any import that is never referenced in the file:

```tsx
// ✅ Correct — all imports are used
import Box from '@mui/material/Box';
import { fDate } from 'src/utils/format-time';

// ❌ Wrong — fDate imported but never used
import Box from '@mui/material/Box';
import { fDate } from 'src/utils/format-time';
// (fDate never appears in the file)
```

---

### 13. No unused variables (WARN — `@typescript-eslint/no-unused-vars`)

Variables that are declared but never used trigger a warning (function arguments are excluded):

```tsx
// ✅ Correct
const [open, setOpen] = useState(false);
// both open and setOpen are used

// ❌ Wrong — value declared but never read
const unusedVar = computeSomething();
```

Prefix with `_` to intentionally suppress the warning: `const _unused = …`.

---

### 14. No variable shadowing (ERROR — `@typescript-eslint/no-shadow`)

Do not declare a variable with the same name as one in an outer scope:

```tsx
// ✅ Correct — different names
function outer() {
  const userId = 1;
  function inner(currentUserId: number) { … }
}

// ❌ Wrong — inner userId shadows outer userId
function outer() {
  const userId = 1;
  function inner(userId: number) { … }  // shadows outer userId
}
```

---

### 15. Consistent return (ERROR — `consistent-return`)

All code paths in a function must either always return a value or never return one:

```tsx
// ✅ Correct — always returns
function getLabel(type: string): string {
  if (type === 'a') return 'Alpha';
  return 'Unknown';
}

// ✅ Correct — never returns (void)
function logMessage(msg: string) {
  console.log(msg);
}

// ❌ Wrong — some paths return, others don't
function getLabel(type: string) {
  if (type === 'a') return 'Alpha';
  // missing return on other paths
}
```

---

### 16. Lines around directives (ERROR — `lines-around-directive`)

`'use client'` and similar directives must have a blank line **before and after** them when they appear alongside other code:

```tsx
// ✅ Correct — blank line after the directive, before imports

'use client';

import { useState } from 'react';

// ✅ Also correct — if preceding content exists, blank line before AND after
// (In practice this rule fires when mixing directives with other statements.)
```

---

### 17. No bitwise operators (ERROR — `no-bitwise`)

Bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`) are not allowed. Use logical operators instead:

```tsx
// ✅ Correct
const isActive = status === 1 || status === 2;

// ❌ Wrong
const flags = a | b;
```

---

### 18. Default case placement & requirement (`default-case-last` + `default-case`)

Two rules work together here:

- **`default-case-last`** (ERROR): the `default` clause must always be the **last** case in a `switch` statement.
- **`default-case`** (ERROR): every `switch` statement must have a `default` case, **unless** you explicitly opt out with a `// no default` comment.

```tsx
// ✅ Correct — default last
switch (status) {
  case 'active':
    return 'Active';
  case 'banned':
    return 'Banned';
  default:
    return 'Unknown';
}

// ❌ Wrong — default not last (violates default-case-last)
switch (status) {
  default:
    return 'Unknown';
  case 'active':
    return 'Active';
}

// ✅ Correct — intentionally omitted default with opt-out comment
switch (action.type) {
  case 'INCREMENT':
    return state + 1;
  case 'DECREMENT':
    return state - 1;
  // no default
}
```

---

## Utility Functions

```tsx
// Time formatting
import { fDate, fDateTime, fToNow, fTime } from 'src/utils/format-time';

fDate(date); // e.g. "11 Feb 2024"
fDateTime(date); // e.g. "11 Feb 2024 09:00"
fToNow(date); // e.g. "2 minutes ago"

// Number formatting
import { fNumber, fCurrency, fPercent, fShortenNumber, fData } from 'src/utils/format-number';

fNumber(1234567); // "1,234,567"
fCurrency(9999); // "$9,999.00"
fPercent(0.85); // "85%"
fShortenNumber(1234567); // "1.23M"
fData(1024); // file size formatting
```

### Stock quantity formatting convention

- In stock-related screens, quantities should prefer only **万 / 亿** two levels.
- Keep **2 decimal places** consistently for quantity displays.
- Use `fWanYuan(...)` for values already expressed in **万元**.
- Use `fQianYuan(...)` for values expressed in **千元**; it should still render only **万 / 亿**.
- Use `fWanYi(value, suffix)` for non-currency quantities like **成交量（手）** or **股本（股）**.
- In `stock-detail-header.tsx`, do **not** repeat the stock code inside the metric grid if it is already shown in the title row.

### Date / time field formatting (REQUIRED)

- **Never render raw date values directly in JSX** — raw ISO strings (e.g., `2025-01-01T00:00:00.000Z`), `Date` objects, or YYYYMMDD integers must always be formatted first.
- Use `fDate(value, 'YYYY-MM-DD')` for date-only fields (report periods, user timestamps, any date field from the backend). Calling `fDate(date)` without a template outputs English locale ("17 Apr 2022") — always pass `'YYYY-MM-DD'` for financial screens.
- For stock-specific dates that arrive as YYYYMMDD integers from tushare (e.g., `20250101`), use the local component helpers `fmtD()` (market-tab) or `fmtPeriod()` (financials-tab) — they handle both YYYYMMDD integers and ISO strings.
- Full timestamp: use `fDateTime(value)`. Relative time: use `fToNow(value)`.

---

## Scrollbar

Use the custom Scrollbar wrapper instead of native scroll where appropriate:

```tsx
import { Scrollbar } from 'src/components/scrollbar';

<Scrollbar sx={{ maxHeight: 500 }}>{/* content */}</Scrollbar>;
```

---

## Global Config

```tsx
import { CONFIG } from 'src/config-global';

CONFIG.appName; // application name
CONFIG.appVersion; // current version
CONFIG.assetsDir; // public assets base path
```

---

## Finding Backend Code

The backend lives at `../server-code/src` relative to the client project root (`client-code/`).

- **Feature modules**: `../server-code/src/apps/<feature>/` — e.g., `../server-code/src/apps/stock/` for all stock endpoints
- **File types to search**: `*.controller.ts` for route definitions, `*.dto.ts` for request/response shapes, `*.service.ts` for business logic

---

## 文档管理约定

### 1. 新增或修改 docs/ 文件时必须同步更新 docs/README.md

- 在 `docs/` 任意子目录下新增文档后，必须同步在 `docs/README.md` 对应分类表格中新增一行，包含：文件链接、说明和状态标记。
- 修改文档状态（如从「待实现」变为「已实现」）后，也要同步更新 `docs/README.md` 中对应条目的状态列。
- 状态标记规范：✅ 已实现 / 🔧 待实现 / 📋 需求稿 / 🗓️ 规划中。
- 删除文档时，同步从 `docs/README.md` 移除对应条目。

### 2. docs/ 文件一律使用中文命名

- 除 `README.md` 外，所有文档文件名必须使用中文。
- 命名格式：`<模块名>-前端设计.md`（功能设计）。
- 文档内容也应以中文撰写。

### 3. 所有 API 请求统一使用 POST

- 本项目所有后端接口均为 `POST`，前端 API 层（`src/api/`）调用时一律使用 `apiClient.post()`。
- 查询参数通过请求 Body 传递，不使用 URL query string。
- 资源 ID 通过 Body 传递，不拼入 URL 路径。
- When on a GitHub / cloud environment (no local file access): search the same organization's **`server-code`** repository under its `src/` directory.

---

## What NOT to Do

- **Do not** hardcode hex colors — always use theme palette tokens
- **Do not** put business logic in `pages/` — all goes in `sections/*/view/`
- **Do not** use lodash — use `es-toolkit` or native JS
- **Do not** create new icons SVG files in `components/`; use Iconify
- **Do not** use barrel imports from `@mui/material` — import from subpaths
- **Do not** use `React.FC` type annotation — use plain function return types
- **Do not** use `<Fragment>` when not needed
- **Do not** use `import { SomeType }` for type-only imports — use `import type { SomeType }`
- **Do not** wrap string literals in JSX props/children with curly braces: `variant={"h4"}` → `variant="h4"`
- **Do not** use shorthand boolean JSX props: `<Comp disabled />` → `<Comp disabled={true} />`
- **Do not** leave unused imports in a file — remove them
- **Do not** use block-body arrow functions when expression suffices: `(x) => { return x; }` → `(x) => x`
- **Do not** shadow outer-scope variable names in nested functions or callbacks
- **Do not** use `{ name: name }` object literals — use shorthand `{ name }`

---

## API 日期参数格式约定

前后端所有涉及 `trade_date` 参数的接口，**统一使用 `YYYYMMDD` 格式**（8 位纯数字字符串），例如 `'20240101'`。

- 后端 NestJS DTO 通过 `@Matches(/^\d{8}$/)` 校验，不符合格式会返回 400 参数校验失败
- 前端 `MarketQueryBase.trade_date` 类型为 `string`，传参时必须确保 YYYYMMDD 格式
- 不传 `trade_date` 时，后端自动取对应数据表的最新交易日
- **禁止**使用 `YYYY-MM-DD`、ISO 8601 或其他格式作为 `trade_date` 参数

### 枚举参数大小写约定

后端 DTO 中使用 `@IsEnum` 校验的枚举值**均为大写**，前端传参必须匹配：

| 参数                   | 合法值                                                 |
| ---------------------- | ------------------------------------------------------ |
| `content_type`         | `'INDUSTRY'` \| `'CONCEPT'` \| `'REGION'`              |
| `sort_by` (sector)     | `'net_amount'` \| `'pct_change'` \| `'buy_elg_amount'` |
| `order`                | `'asc'` \| `'desc'`                                    |
| `period` (index-trend) | `'1m'` \| `'3m'` \| `'6m'` \| `'1y'` \| `'3y'`         |

### API 响应空值处理

后端返回的数值字段可能为 `null`（如非交易日、数据缺失等场景），前端类型必须标注 `| null` 并在渲染时做兜底：

```tsx
// ✅ 正确
const color = flowColor(data.netAmount); // flowColor 接受 number | null
{
  toYi(data.someField);
} // toYi 内部处理 null → '-'

// ❌ 错误：假设字段永远非空
{
  data.someField.toFixed(2);
} // 当 someField 为 null 时会崩溃
```

---

## 文档管理约定

项目设计文档统一存放在 `docs/` 目录下：

- **文件名使用中文**，格式为 `<模块名>-<文档类型>.md`（如 `首页仪表盘-前端设计.md`）
- **每次新增或修改文档后，必须同步更新 `docs/readme.md`**，保持导航索引与实际文件一致
- `docs/readme.md` 按"设计文档"和"规划与待办"两个分类列出所有文档及简要说明

---

## 功能迭代三段式工作流（必须遵守）

本项目所有新功能的开发，**严格按照「设计 → 实现 → 文档更新」三个阶段推进**，每个阶段各自独立，由用户用明确指令触发，不得跨阶段操作。

### 阶段一：设计（用户指令："开始设计" / "设计 XX 模块"）

**此阶段只产出设计文档，不写任何代码。**

1. 阅读 `docs/前端功能缺口盘点.md`，找到目标模块的端点清单和建议。
2. 阅读后端对应 `../server-code/src/apps/<feature>/` 下的 `*.dto.ts` 和 `*.controller.ts`，掌握请求/响应结构。
3. 参照 `docs/design/` 下已有设计文档的格式，在 `docs/design/` 下新建 `<模块名>-前端设计.md`。
4. 设计文档必须包含以下章节：
   - **功能概述**：模块目标与用户价值
   - **路由规划**：新增的路由路径与页面结构
   - **API 端点映射**：每个后端端点对应的前端调用场景
   - **组件拆分**：页面组件树与各组件职责
   - **数据类型定义**：关键 TypeScript 类型/接口（参照后端 DTO）
   - **交互说明**：状态变化、Loading/Error 处理、用户操作流程
5. 设计文档创建后，同步在 `docs/README.md` 中新增对应条目，状态标记为 `🔧 待实现`。
6. **不创建任何 `.tsx` / `.ts` 代码文件，不修改 `src/` 下任何文件。**

---

### 阶段二：实现（用户指令："开始实现" / "实现 XX 模块"）

**此阶段按照已有设计文档编写代码。**

1. 先读取 `docs/design/<模块名>-前端设计.md`，严格按设计文档落地，不自行扩展功能。
2. 按顺序完成：
   - `src/api/<feature>.ts` — API 函数和 TypeScript 类型
   - `src/sections/<feature>/` — 所有功能组件
   - `src/sections/<feature>/view/<feature>-view.tsx` — 主视图
   - `src/pages/<feature>.tsx` — 薄页面容器
   - `src/routes/sections.tsx` — 注册懒加载路由
   - `src/layouts/nav-config-dashboard.tsx` — 添加导航项
3. 代码完成后，**必须运行 `npm run build` 并修复全部报错**（见下方「构建验证」章节）。
4. 构建通过后，立即进入阶段三。

---

### 阶段三：更新文档（实现完成后立即执行，无需用户再次指令）

**此阶段在构建通过后自动执行，不需要用户触发。**

1. 更新 `docs/前端功能缺口盘点.md`：
   - 将已实现的端点从"未接入"移入"已接入"列表。
   - 更新对应模块的覆盖数量和百分比。
   - 如模块已完全覆盖，在总览表中将状态改为 `✅`。
   - 在变更日志顶部新增一行，记录本次变更日期和内容。
2. 更新 `docs/已有功能汇总.md`：
   - 在对应模块表格中新增功能行，或新增整个模块章节。
   - 更新文件头部的"路由总数"和"API 文件数"统计。
3. 更新 `docs/README.md`：
   - 将设计文档条目的状态从 `🔧 待实现` 改为 `✅ 已实现`。

---

### 阶段触发速查

| 用户指令示例       | 执行阶段  | 产出物                 |
| ------------------ | --------- | ---------------------- |
| "设计信号模块"     | 阶段一    | `信号-前端设计.md`     |
| "开始设计行业轮动" | 阶段一    | `行业轮动-前端设计.md` |
| "实现信号模块"     | 阶段二+三 | 代码 + 文档状态更新    |
| "开始实现行业轮动" | 阶段二+三 | 代码 + 文档状态更新    |
| "更新一下文档"     | 阶段三    | 仅更新盘点/汇总/README |

> **重要**：如果用户没有明确说明阶段，**优先询问**而非假设，防止误操作写代码或误操作只写文档。

---

## 功能开发完成后的构建验证（必须执行）

每次基于需求文档完成一个功能模块的开发后，**必须运行 `npm run build` 并修复全部报错**，才能认为任务完成。

```bash
npm run build
```

IDE 的 TypeScript 检查无法捕获所有错误，实际 `tsc && vite build` 流水线会额外发现：

- **图标未注册**（TS2820）：使用了 `src/components/iconify/icon-sets.ts` 中不存在的图标名 → 在 `icon-sets.ts` 末尾追加对应的 SVG entry
- **类型字段缺失**（TS2339）：视图中访问了 API 类型里未声明的字段 → 在 `src/api/*.ts` 对应类型中补充该字段
- **ESLint 导入排序**（`perfectionist/sort-imports`）：新文件的 import 顺序不符合规范 → 批量自动修复：`npx eslint --fix src/sections/<模块>/`

**流程**：

1. 完成功能代码
2. 运行 `npm run build`
3. 若有报错，按上述类型逐一修复
4. 重新运行 `npm run build`，确认 `✓ built in ...` 成功输出
5. 任务完成

---

## 测试规范（必须遵守）

### 测试文件目录约定

**测试文件必须放在与源文件同目录下的 `__tests__/` 子文件夹中，禁止与源文件同级放置。**

```
src/
├── utils/
│   ├── format-number.ts         ← 源文件
│   ├── format-time.ts           ← 源文件
│   └── __tests__/               ← 测试子目录
│       ├── format-number.test.ts
│       └── format-time.test.ts
├── api/
│   ├── client.ts
│   └── __tests__/
│       └── client.test.ts
├── auth/
│   ├── auth-reducer.ts
│   └── __tests__/
│       └── auth-reducer.test.ts
└── test/                        ← 测试基础设施（setup、工具函数）
    ├── setup.ts
    └── test-utils.tsx
```

**命名规则：**

| 测试类型 | 文件名格式 | 示例 |
| -------- | ---------- | ---- |
| 单元测试 | `<模块名>.test.ts` | `format-number.test.ts` |
| 组件测试 | `<组件名>.test.tsx` | `label.test.tsx` |

测试文件内 import 源文件时使用**相对路径 `../`**（因为 `__tests__/` 是子目录）：

```ts
// ✅ 正确（从 __tests__/ 向上一层引用源文件）
import { fNumber } from '../format-number';
import { tokenStorage } from '../client';

// ❌ 错误（同级路径，测试文件不与源文件同级）
import { fNumber } from './format-number';
```

### 测试脚本

```bash
npm test              # 运行全部测试（CI 使用）
npm run test:watch    # 开发时 watch 模式
npm run test:coverage # 生成覆盖率报告（html + lcov）
npm run test:ui       # Vitest 可视化 UI
```

### 修改代码时必须同步更新测试（强制要求）

**每次修改源文件，必须同步检查并更新对应的测试文件。** 具体规则：

1. **新增导出函数/方法** → 在对应 `__tests__/` 文件中新增测试用例
2. **修改函数签名或行为** → 更新受影响的测试断言
3. **删除函数/方法** → 删除对应测试用例，避免死代码
4. **新增源文件模块** → 在同目录创建 `__tests__/<模块名>.test.ts`，至少覆盖主要路径和 null/边界值
5. **修改类型定义**（如 `AuthState`、`UserProfile`）→ 检查测试中的 mock 对象是否仍符合新类型

**工作流要求：**

- 实现阶段（阶段二）完成功能代码后，**构建验证之前**，必须检查是否需要新增或更新测试
- 提交 PR 时，涉及源文件的变更应当有对应的 `__tests__/` 文件变更（新增或修改）
- 如果某个变更确实不需要测试（如纯文档修改、类型别名），需在 PR 描述中明确说明原因

**示例：**

```ts
// 原函数
export function fWanYuan(value: InputNumberValue, decimals = 2): string { … }

// 修改后新增 suffix 参数
export function fWanYuan(value: InputNumberValue, decimals = 2, suffix = ''): string { … }

// 必须同步更新 __tests__/format-number.test.ts，添加 suffix 参数的测试用例
it('appends suffix', () => {
  expect(fWanYuan(50000, 2, '元')).toBe('5.00亿元');
});
```
