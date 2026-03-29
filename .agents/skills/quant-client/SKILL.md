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

### Import Order (ENFORCED — perfectionist plugin)

```tsx
// 1. CSS/styles
import 'src/global.css';

// 2. type imports
import type { User } from './types';

// 3. External packages
import { useState } from 'react';

// 4. MUI group
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// 5. Project internals (hooks, utils, types, routes, sections, components)
import { useRouter } from 'src/routes/hooks';
import { Label } from 'src/components/label';
```

### JSX Rules

```tsx
// ✅ Self-close empty components
<Box />

// ❌ Not
<Box></Box>

// ✅ Explicit booleans
<TextField disabled={true} />

// ❌ Not
<TextField disabled />

// ✅ No empty Fragments
return <Box>{content}</Box>;

// ❌ Not
return <><Box>{content}</Box></>;
```

### MUI Import Style

Always import from the specific subpath (not the barrel import):

```tsx
// ✅ Correct (better tree-shaking)
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ❌ Avoid
import { Box, Stack, Typography } from '@mui/material';
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
