# Project Structure

> **Minimal UI** — A free React admin dashboard template built with Material-UI (MUI), Vite, and TypeScript.

---

## Root Directory

```
client-code/
├── public/               # Static assets served as-is by the dev/prod server
├── src/                  # All application source code
├── .gitignore            # Files and directories excluded from Git
├── .prettierignore       # Files excluded from Prettier formatting
├── CHANGELOG.md          # Version history and release notes
├── LICENSE.md            # MIT licence
├── PROJECT_STRUCTURE.md  # This document
├── README.md             # Project overview and quick-start guide
├── eslint.config.mjs     # ESLint flat-config (plugins: React, TS, import, perfectionist)
├── index.html            # HTML entry point – Vite injects the bundle here
├── package.json          # Dependencies, scripts, and project metadata
├── package-lock.json     # npm lock file (exact dependency tree)
├── prettier.config.mjs   # Prettier formatting rules
├── tsconfig.json         # TypeScript config for the browser bundle
├── tsconfig.node.json    # TypeScript config for Vite build-tool scripts
├── vite.config.ts        # Vite configuration (port 3039, path aliases, plugins)
├── vercel.json           # Vercel deployment rules (SPA rewrite for client-side routing)
└── yarn.lock             # Yarn lock file (exact dependency tree)
```

---

## `public/` — Static Assets

Files in this directory are served verbatim at the site root. They are **never processed by Vite**.

```
public/
├── favicon.ico                      # Browser tab icon
└── assets/
    ├── background/                  # Background shapes and overlay images
    ├── icons/
    │   ├── flags/                   # SVG flag icons (English, German, French)
    │   ├── glass/                   # Glass-effect icon illustrations (bag, users, buy, message)
    │   ├── navbar/                  # SVG icons used in the sidebar navigation
    │   ├── notification/            # Notification-type icons
    │   └── workspaces/              # Workspace / brand logo images
    ├── illustrations/               # Large decorative SVG illustrations (auth pages, etc.)
    └── images/
        ├── avatar/                  # 25 user avatar thumbnails (avatar-1.webp … avatar-25.webp)
        ├── cover/                   # 24 blog-post cover images (cover-1.webp … cover-24.webp)
        └── product/                 # 24 product images (product-1.webp … product-24.webp)
```

---

## `src/` — Application Source Code

```
src/
├── _mock/                # Mock data and data-generation helpers
├── components/           # Shared, reusable UI components
├── config-global.ts      # App-wide constants (name, version)
├── global.css            # Global CSS reset / base styles
├── layouts/              # Page layout shells (dashboard, auth) and nav configuration
├── main.tsx              # React entry point – mounts <App /> with BrowserRouter
├── app.tsx               # Root <App> component – ThemeProvider + scroll-to-top
├── pages/                # Thin page-level components (one per route)
├── routes/               # React Router route definitions and related hooks
├── sections/             # Feature-specific UI sections (complex, data-driven components)
├── theme/                # MUI theme configuration and provider
├── utils/                # Pure utility functions (number & date formatting)
└── vite-env.d.ts         # Vite environment type declarations
```

### `src/_mock/` — Mock Data

Used exclusively during development and demo. No real API calls are made.

| File | Purpose |
|------|---------|
| `_mock.ts` | Low-level generators: `_id`, `_fullName`, `_price`, `_company`, `_times`, etc. |
| `_data.ts` | Pre-built datasets (`_users`, `_posts`, `_products`, `_notifications`, …) composed from the generators above |
| `index.ts` | Re-exports everything from both files for clean imports |

---

### `src/components/` — Shared UI Components

Generic, project-agnostic components reused across multiple sections and layouts.

| Folder | Description |
|--------|-------------|
| `chart/` | Thin wrapper around **ApexCharts** (`<Chart>`, `useChart` hook, `<ChartLegends>`, loading skeleton) |
| `iconify/` | Wrapper around **Iconify React** for on-demand SVG icons; includes icon-set registration. Bundled icons live in `icon-sets.ts` (solar, eva, mingcute, custom including `custom:ai-sparkle`) |
| `label/` | Coloured badge / tag component with multiple colour variants (primary, success, error, …) |
| `logo/` | Brand logo component rendered in the sidebar and auth pages |
| `scrollbar/` | Custom scrollbar built on **SimpleBar React** |
| `svg-color/` | Utility that masks an SVG with the current CSS `color` value (used for recolouring icons) |
| `color-utils/` | `<ColorPicker>` and `<ColorPreview>` helpers used in product filters |

---

### `src/layouts/` — Layout Shells

Provide the structural frame (header, sidebar, content area) for groups of pages.

| Path | Description |
|------|-------------|
| `dashboard/layout.tsx` | Main two-column layout: collapsible sidebar + scrollable content area |
| `dashboard/nav.tsx` | Sidebar navigation renderer (reads `navData` config) |
| `dashboard/content.tsx` | `<DashboardContent>` wrapper – sets `maxWidth` and padding |
| `dashboard/css-vars.ts` | CSS custom-property values for the dashboard layout dimensions |
| `auth/layout.tsx` | Full-page centered layout for sign-in / register pages |
| `auth/content.tsx` | Content container inside the auth layout |
| `core/` | Primitive layout building blocks (`HeaderSection`, `LayoutSection`, `MainSection`) shared between dashboard and auth |
| `components/` | Layout-level UI widgets: `AccountPopover`, `NotificationsPopover`, `LanguagePopover`, `AiAssistantPopover` (AI chat widget), `Searchbar`, `WorkspacesPopover`, `MenuButton`, `NavUpgrade` |
| `nav-config-dashboard.tsx` | Array of navigation items (title, path, icon) shown in the sidebar |
| `nav-config-account.tsx` | Account-related navigation items shown in the account popover |
| `nav-config-workspace.tsx` | Workspace items shown in the workspace switcher |

---

### `src/pages/` — Page Components

Each file corresponds to exactly one route. Pages are **thin**: they set the `<title>` and render a single section view.

| File | Route | Rendered Section |
|------|-------|-----------------|
| `dashboard.tsx` | `/` | `OverviewAnalyticsView` |
| `user.tsx` | `/user` | `UserView` |
| `products.tsx` | `/products` | `ProductsView` |
| `blog.tsx` | `/blog` | `BlogView` |
| `sign-in.tsx` | `/sign-in` | `SignInView` |
| `page-not-found.tsx` | `/404` | `NotFoundView` |

---

### `src/routes/` — Routing

Declarative routing configuration using **React Router v7**.

| Path | Description |
|------|-------------|
| `sections.tsx` | Defines all `RouteObject`s; pages are **lazy-loaded** with `React.lazy()` + `<Suspense>` |
| `components/error-boundary.tsx` | Error boundary to catch rendering errors in a route subtree |
| `components/router-link.tsx` | MUI-compatible `<Link>` adapter that uses React Router's navigation |
| `hooks/use-router.ts` | Programmatic navigation hook (wraps `useNavigate`) |
| `hooks/use-pathname.ts` | Returns the current pathname (wraps `useLocation`) |

---

### `src/sections/` — Feature Sections

Contain the actual business-logic UI for each feature area. Sections are composed of multiple sub-components and consume mock data.

| Folder | Description |
|--------|-------------|
| `overview/` | Dashboard analytics widgets: `AnalyticsWidgetSummary`, `AnalyticsCurrentVisits`, `AnalyticsWebsiteVisits`, `AnalyticsConversionRates`, `AnalyticsCurrentSubject`, `AnalyticsNews`, `AnalyticsOrderTimeline`, `AnalyticsTrafficBySite`, `AnalyticsTasks` |
| `user/` | User management: data table with `UserTableHead`, `UserTableRow`, `UserTableToolbar`, empty/no-data states, and utility helpers |
| `product/` | Product catalogue: `ProductItem` card, `ProductFilters` drawer, `ProductSort` menu, `ProductCartWidget` |
| `blog/` | Blog listing: `PostItem` card, `PostSearch` field, `PostSort` tabs, and the list view |
| `auth/` | Sign-in form (email + password, remember-me, forgot-password link) |
| `error/` | 404 Not Found illustration and navigation link |

Each section folder exposes its components through an `index.ts` barrel file and contains a `view/` sub-folder with the top-level view component consumed by the corresponding page.

---

### `src/theme/` — MUI Theme

Centralises all visual design tokens and MUI component overrides.

| File | Description |
|------|-------------|
| `theme-provider.tsx` | Wraps the app in MUI's `<CssVarsProvider>` with the custom theme |
| `create-theme.ts` | Factory that composes palette, typography, shadows, and component overrides into a theme object |
| `theme-config.ts` | Design-token constants: primary colour `#1877F2`, secondary `#8E33FF`, font families (DM Sans, Barlow), CSS-variable prefix |
| `create-classes.ts` | Helper that namespaces BEM-style CSS class names |
| `types.ts` | Shared TypeScript types for theme-related props |
| `extend-theme-types.d.ts` | Module augmentation that adds custom palette keys to MUI's type system |
| `core/palette.ts` | Full colour palette with lighter / light / main / dark / darker shades for every semantic colour |
| `core/typography.ts` | Font-size scale and font-family definitions |
| `core/shadows.ts` | Standard elevation shadows |
| `core/custom-shadows.ts` | Project-specific coloured drop-shadows (primary, secondary, info, success, warning, error) |
| `core/components.tsx` | Per-component MUI theme overrides (Button radius, Card shadow, Table styles, …) |

---

### `src/utils/` — Utility Functions

Pure, side-effect-free helper functions with no UI dependencies.

| File | Exports |
|------|---------|
| `format-number.ts` | `fNumber`, `fPercent`, `fShortenNumber`, `fCurrency` — locale-aware number formatters |
| `format-time.ts` | `fDate`, `fDateTime`, `fTime`, `fToNow` — Day.js-powered date/time formatters |

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Dev server port 3039; path alias `src/*`; plugins: `@vitejs/plugin-react-swc`, `vite-plugin-checker` (TypeScript + ESLint) |
| `tsconfig.json` | Targets ES2020, strict mode, `bundler` module resolution, `react-jsx` JSX transform |
| `eslint.config.mjs` | Flat-config; plugins for React, React Hooks, TypeScript, import ordering, perfectionist, unused imports |
| `prettier.config.mjs` | Consistent code formatting rules across the project |
| `vercel.json` | Rewrites all paths to `index.html` so client-side routing works on Vercel |

---

## Tech Stack Summary

| Technology | Version | Role |
|-----------|---------|------|
| React | 19.x | UI component model |
| Material-UI (MUI) | 7.x | Design system & component library |
| Emotion | 11.x | CSS-in-JS engine for MUI |
| TypeScript | 5.x | Static typing |
| Vite | 6.x | Build tool & dev server |
| React Router | 7.x | Client-side routing |
| ApexCharts | 4.x | Interactive chart widgets |
| Iconify React | 5.x | On-demand SVG icon system |
| Day.js | 1.x | Lightweight date/time library |
| SimpleBar React | 3.x | Custom OS-agnostic scrollbar |
| minimal-shared | 1.x | Shared colour utilities (`varAlpha`, etc.) |
| es-toolkit | 1.x | Tree-shakeable utility functions |
