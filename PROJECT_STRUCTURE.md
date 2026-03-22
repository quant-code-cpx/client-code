# Project Structure

This document describes the directory and file layout of the **Minimal UI** dashboard — a React + Material UI (MUI) admin template built with Vite and TypeScript.

---

## Root Files

| File / Folder | Description |
|---|---|
| `index.html` | Single HTML entry point. Vite injects the bundled JS/CSS here. |
| `vite.config.ts` | Vite build & dev-server configuration (plugins, path aliases `src/`). |
| `tsconfig.json` | TypeScript compiler options for the application source. |
| `tsconfig.node.json` | TypeScript compiler options scoped to Node.js tooling (Vite config itself). |
| `package.json` | NPM manifest — lists dependencies, scripts (`dev`, `build`, `lint`, etc.) and engine requirements. |
| `eslint.config.mjs` | ESLint flat-config with rules for React, hooks, import ordering, and unused imports. |
| `prettier.config.mjs` | Prettier formatting rules shared across the project. |
| `vercel.json` | Vercel deployment configuration (SPA rewrites so React Router handles all paths). |
| `CHANGELOG.md` | Version history and notable changes. |
| `LICENSE.md` | MIT licence. |
| `README.md` | Quick-start guide and feature overview. |
| `PROJECT_STRUCTURE.md` | *(this file)* Detailed explanation of the project layout. |

---

## `public/`

Static assets served as-is by Vite — not processed or bundled.

```
public/
├── favicon.ico              # Browser tab icon
└── assets/
    ├── icons/
    │   ├── navbar/          # SVG icons rendered by the side-nav (ic-analytics.svg, ic-user.svg, …)
    │   ├── flags/           # Country flag SVGs used by the language switcher
    │   └── glass/           # Decorative glass-style icons for analytics widget cards
    ├── images/
    │   ├── avatar/          # User avatar images (avatar-1.webp … avatar-25.webp)
    │   ├── cover/           # Blog post cover images
    │   └── product/         # Product listing images
    └── background/          # Full-page background illustrations (auth page, etc.)
```

---

## `src/`

All application source code lives here.

```
src/
├── main.tsx                 # React entry point — mounts <App /> into #root
├── app.tsx                  # Root component: wraps the app in ThemeProvider + Router
├── global.css               # Global CSS resets and base styles
├── vite-env.d.ts            # Vite-specific TypeScript ambient declarations
├── config-global.ts         # App-wide constants (appName, appVersion)
│
├── _mock/                   # Static mock / fixture data (no real API)
├── components/              # Shared, reusable UI components
├── layouts/                 # Page-level layout shells (dashboard, auth)
├── pages/                   # Thin page entry-points that compose section views
├── routes/                  # React Router configuration and helper hooks
├── sections/                # Feature-specific UI sections (one folder per domain)
├── theme/                   # MUI theme customisation
└── utils/                   # Pure utility functions
```

---

### `src/_mock/`

Provides deterministic fake data used throughout the UI without a backend.

| File | Description |
|---|---|
| `_mock.ts` | Low-level generators: random IDs, names, prices, dates, etc. |
| `_data.ts` | Domain datasets built from `_mock.ts`: `_users`, `_products`, `_posts`, `_skills`, `_tasks`, `_timeline`, `_traffic`, `_notifications`, `_langs`. |
| `index.ts` | Re-exports everything from `_mock.ts` and `_data.ts` for a single import path. |

---

### `src/components/`

Atomic, project-wide UI primitives shared across multiple sections.

| Folder | Description |
|---|---|
| `chart/` | Thin wrapper around **react-apexcharts**. Exports `<Chart>`, `useChart` hook, `<ChartLegends>`, and `<ChartLoading>`. |
| `color-utils/` | `<ColorPicker>` and `<ColorPreview>` used by the product filter panel. |
| `iconify/` | Thin wrapper around **@iconify/react** that adds MUI `sx` support and pre-registers icon sets. |
| `label/` | Coloured pill badge (`<Label>`) used for statuses, counts, and tags throughout the app. |
| `logo/` | `<Logo>` component — renders the branded logotype for the sidebar header. |
| `scrollbar/` | Custom thin scrollbar (`<Scrollbar>`) built on **simplebar-react**, applied inside tables and panels. |
| `svg-color/` | `<SvgColor>` — applies a `currentColor` mask to SVG files, letting them adopt the MUI palette. Used for navbar icons. |

---

### `src/layouts/`

Defines the visual chrome that wraps page content.

| Path | Description |
|---|---|
| `dashboard/` | Side-navigation + top-header shell used by all authenticated pages. Exports `<DashboardLayout>` and `<DashboardContent>`. |
| `auth/` | Centred, illustration-based wrapper for the Sign-in page. Exports `<AuthLayout>`. |
| `core/` | Primitive layout atoms (`<LayoutSection>`, `<HeaderSection>`, `<MainSection>`) reused by both shells. |
| `components/` | Header bar widgets: `<AccountPopover>`, `<NotificationsPopover>`, `<SearchBar>`, `<LanguagePopover>`, `<WorkspacesPopover>`, `<NavUpgrade>`, `<MenuButton>`. |
| `nav-config-dashboard.tsx` | Data array (`navData`) that drives the side-nav link list (title, path, icon, badge). |
| `nav-config-account.tsx` | Menu items shown inside the account popover dropdown. |
| `nav-config-workspace.tsx` | Workspace switcher options shown in the workspaces popover. |

---

### `src/pages/`

Thin route-level components — each file corresponds to one URL.  
They simply set the `<title>` tag and render the matching section view.

| File | Route | Description |
|---|---|---|
| `dashboard.tsx` | `/` | Overview / Analytics page |
| `user.tsx` | `/user` | User management table |
| `products.tsx` | `/products` | Product grid with filters |
| `blog.tsx` | `/blog` | Blog post listings |
| `skills.tsx` | `/skills` | Technology skills showcase |
| `sign-in.tsx` | `/sign-in` | Authentication form |
| `page-not-found.tsx` | `/404` | 404 error page |

---

### `src/routes/`

React Router v7 configuration.

| Path | Description |
|---|---|
| `sections.tsx` | Defines the `routesSection` array. Pages are lazy-loaded with `React.lazy`. The dashboard pages share `<DashboardLayout>` as a common parent. |
| `hooks/use-router.ts` | Thin wrapper around `useNavigate` for programmatic navigation. |
| `hooks/use-pathname.ts` | Thin wrapper around `useLocation().pathname`. |
| `components/router-link.tsx` | MUI-compatible `<RouterLink>` that bridges MUI's `component` prop with React Router's `<Link>`. |
| `components/error-boundary.tsx` | React error boundary used to catch rendering errors in lazy-loaded pages. |

---

### `src/sections/`

Feature-specific UI code. Each sub-folder owns all components, logic, and sub-views for one domain.

| Folder | Description |
|---|---|
| `overview/` | Analytics dashboard widgets: summary cards, line/bar/radar/donut charts, news feed, timeline, traffic-by-site, and task list. The `view/` sub-folder exports `<OverviewAnalyticsView>`. |
| `user/` | User management: sortable/filterable data table with inline row actions (edit/delete). The `view/` sub-folder exports `<UserView>` which also contains the `useTable` hook. |
| `product/` | Product grid with sidebar filters, sort dropdown, color swatch picker, and a floating cart icon. The `view/` sub-folder exports `<ProductsView>`. |
| `blog/` | Blog listing with search, sort, and post cards. The `view/` sub-folder exports `<BlogView>`. |
| `skill/` | Technology skill cards showing icon, category label, description, and a proficiency progress bar. The `view/` sub-folder exports `<SkillsView>`. |
| `auth/` | Sign-in form with email + password fields. Exports `<SignInView>`. |
| `error/` | 404 not-found illustration and back-to-home button. Exports `<NotFoundView>`. |

---

### `src/theme/`

Full MUI theme customisation layer.

| File / Folder | Description |
|---|---|
| `create-theme.ts` | Assembles the final MUI theme by merging palette, typography, shadows, and component overrides. |
| `theme-provider.tsx` | `<ThemeProvider>` wrapper that also handles Emotion's `<CacheProvider>` for SSR/CSP compatibility. |
| `theme-config.ts` | Central constants: default font family, direction, primary colour token, etc. |
| `create-classes.ts` | Helper that generates BEM-like CSS class strings for custom components. |
| `extend-theme-types.d.ts` | TypeScript module augmentation to add custom palette tokens and shadow slots to MUI's theme types. |
| `types.ts` | Shared TypeScript types for theme-related values. |
| `index.ts` | Public API for the theme — re-exports everything consumers need. |
| `core/palette.ts` | Colour palette definition (primary, secondary, info, success, warning, error, grey, common). |
| `core/typography.ts` | Font family, size scale, and weight definitions. |
| `core/shadows.ts` | Standard box-shadow scale. |
| `core/custom-shadows.ts` | Extended semantic shadow tokens (e.g. `primary`, `secondary`, `card`). |
| `core/components.tsx` | Per-component MUI style overrides (Button, Card, Table, Chip, etc.). |

---

### `src/utils/`

Pure, side-effect-free helper functions.

| File | Description |
|---|---|
| `format-number.ts` | Number formatters: compact notation (`fShortenNumber`), currency (`fCurrency`), percentages (`fPercent`), and data sizes (`fData`). |
| `format-time.ts` | Date/time formatters built on **dayjs**: `fDate`, `fTime`, `fDateTime`, `fToNow`. |

---

## Key Technology Stack

| Technology | Role |
|---|---|
| **React 19** | UI rendering, hooks, component model |
| **Material UI (MUI) v7** | Component library, design system, theming |
| **TypeScript** | Static typing across all source files |
| **Vite** | Dev server, HMR, production bundler |
| **React Router v7** | Client-side routing with lazy loading |
| **ApexCharts** | Interactive SVG charts for the analytics dashboard |
| **Emotion** | CSS-in-JS engine behind MUI's `sx` prop |
| **Iconify** | Unified icon system with thousands of icon sets |
| **dayjs** | Lightweight date/time parsing and formatting |
| **ESLint + Prettier** | Code linting and consistent formatting |
