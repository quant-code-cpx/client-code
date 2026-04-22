# ESLint Rules — Full Reference

> Load this file when: writing new code files, reviewing ESLint errors, or fixing lint violations.
> All rules are enforced by `eslint.config.mjs`. Run `node_modules/.bin/eslint --fix "src/**/*.{ts,tsx}"` to auto-fix most issues.

---

## Import Order (ERROR — `perfectionist/sort-imports`)

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

Within each group, imports are sorted by **line length ascending**. Named imports within a single statement are also sorted by line length ascending:

```tsx
// ✅ Correct
import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

// ❌ Wrong
import { fDateTime, fDate, fToNow } from 'src/utils/format-time';
```

---

## Rule 2 — `import type` for type-only imports (WARN)

```tsx
// ✅ Correct
import type { BoxProps } from '@mui/material/Box';

// ❌ Wrong
import { BoxProps } from '@mui/material/Box';
```

---

## Rule 3 — Newline after import block (ERROR)

```tsx
// ✅ Correct
import Box from '@mui/material/Box';

export function MyComponent() { … }

// ❌ Wrong
import Box from '@mui/material/Box';
export function MyComponent() { … }
```

---

## Rule 4 — MUI subpath imports (enforced by import grouping)

```tsx
// ✅ Correct
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

// ❌ Avoid
import { Box, Stack } from '@mui/material';
```

---

## Rule 5 — JSX self-closing components (ERROR)

```tsx
// ✅ <Box />
// ❌ <Box></Box>
```

---

## Rule 6 — Explicit boolean props (ERROR)

```tsx
// ✅ <TextField disabled={true} />
// ❌ <TextField disabled />
```

---

## Rule 7 — No useless fragments (WARN)

```tsx
// ✅ return <Box>{content}</Box>;
// ❌ return <><Box>{content}</Box></>;
```

Fragments allowed when wrapping multiple siblings or inside expressions.

---

## Rule 8 — No unnecessary curly braces (ERROR)

```tsx
// ✅ <Typography variant="h4">Hello</Typography>
// ❌ <Typography variant={"h4"}>{"Hello"}</Typography>
```

---

## Rule 9 — Arrow function body style (ERROR)

```tsx
// ✅ const double = (x: number) => x * 2;
// ✅ const rows = items.map((item) => <Row key={item.id} item={item} />);

// ❌ const double = (x: number) => { return x * 2; };
```

Exception: multiple statements or side effects require block body.

---

## Rule 10 — Object shorthand (WARN)

```tsx
// ✅ const obj = { name, value, onClick };
// ❌ const obj = { name: name, value: value };
```

---

## Rule 11 — No useless renaming (WARN)

```tsx
// ✅ import { foo } from './foo';
// ❌ import { foo as foo } from './foo';
```

---

## Rule 12 — No unused imports (WARN)

Remove any import that is never referenced. Cascade-delete: if you delete a function, its import may also become unused.

---

## Rule 13 — No unused variables (WARN)

```tsx
// Prefix with _ to intentionally suppress:
const _unused = computeSomething();
```

---

## Rule 14 — No variable shadowing (ERROR)

```tsx
// ❌ Wrong — inner userId shadows outer userId
function outer() {
  const userId = 1;
  function inner(userId: number) { … }
}
```

---

## Rule 15 — Consistent return (ERROR)

All code paths must either always return or never return:

```tsx
// ✅ Always returns
function getLabel(type: string): string {
  if (type === 'a') return 'Alpha';
  return 'Unknown';
}
```

---

## Rule 16 — Lines around directives (ERROR)

```tsx
// ✅
'use client';

import { useState } from 'react';
```

---

## Rule 17 — No bitwise operators (ERROR)

```tsx
// ✅ const isActive = status === 1 || status === 2;
// ❌ const flags = a | b;
```

---

## Rule 18 — Default case in switch (`default-case` + `default-case-last`)

```tsx
// ✅ default must be last
switch (status) {
  case 'active':
    return 'Active';
  default:
    return 'Unknown';
}

// ✅ Opt-out with comment
switch (action.type) {
  case 'INCREMENT':
    return state + 1;
  // no default
}
```

---

## Common ESLint Warnings & Fixes

| Warning                                                 | Fix                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars`                     | Delete unused variable or prefix with `_`                                          |
| `unused-imports/no-unused-imports`                      | Delete the import line (cascade-check after deleting functions)                    |
| `react-hooks/exhaustive-deps` — unnecessary dep         | Remove the unused variable from the deps array                                     |
| `react-hooks/exhaustive-deps` — changes every render    | Extract `result?.xxx ?? []` into a `useMemo`                                       |
| `@typescript-eslint/consistent-type-imports` in vi.mock | Add `// eslint-disable-next-line @typescript-eslint/consistent-type-imports` above |
| `perfectionist/sort-imports`                            | Run `node_modules/.bin/eslint --fix src/sections/<module>/`                        |
