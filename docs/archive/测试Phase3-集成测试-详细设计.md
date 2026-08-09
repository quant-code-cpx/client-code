# Phase 3：集成测试 — 详细设计文档

> **关联主文档**：[测试框架与计划-前端设计.md](测试框架与计划-前端设计.md) § Phase 3  
> **范围**：路由守卫 + WebSocket 通知 Context + 路由结构验证  
> **预计新增测试**：~55–65 个测试用例，4 个测试文件  
> **预计覆盖率**：35% → 45%
> **归档说明（2026-08-09）**：AuthGuard、SyncNotification 与路由结构的目标测试已落地；本文仅保留历史实施设计。

---

## 一、测试基础设施增强

Phase 3 测试涉及 AuthProvider、WebSocket、MemoryRouter 组合，需要在现有基础设施上做以下增强。

### 1.1 增强 renderWithProviders — 支持 AuthProvider 包裹

Phase 2 的 `renderWithProviders` 仅包含 ThemeProvider + MemoryRouter。Phase 3 需要支持可选的 `AuthProvider` 模拟注入，用于路由守卫测试。

策略：**不真正包裹 AuthProvider**，而是允许在选项中直接注入一个 mock `AuthContext.Provider`，因为 `AuthGuard` 只消费 `useAuth()` 返回的 `isAuthenticated` 和 `isLoading`。

```tsx
// src/test/test-utils.tsx（增强后）
import type { ReactElement } from 'react';
import type { AuthContextValue } from 'src/auth/context';

import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';

import { AuthContext } from 'src/auth/context';
import { createTheme } from 'src/theme/create-theme';

// ----------------------------------------------------------------------

const defaultTheme = createTheme();

type RenderOptions = {
  initialEntries?: string[];
  /** 注入 AuthContext 值，用于路由守卫等需要认证状态的测试 */
  authContext?: AuthContextValue;
};

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const { initialEntries = ['/'], authContext } = options ?? {};

  let content = ui;
  if (authContext) {
    content = <AuthContext.Provider value={authContext}>{ui}</AuthContext.Provider>;
  }

  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider theme={defaultTheme}>
        <MemoryRouter initialEntries={initialEntries}>{content}</MemoryRouter>
      </ThemeProvider>
    ),
  };
}

export { render, userEvent };
```

> **兼容性**：未传 `authContext` 时行为与 Phase 2 完全一致，不影响已有测试。

### 1.2 新增测试数据工厂

#### 1.2.1 用户资料工厂

```ts
// src/test/factories/user.ts（新建）
import type { UserProfile } from 'src/api/user-manage';

export function createMockUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 1,
    account: 'testuser',
    nickname: 'Test User',
    email: 'test@example.com',
    wechat: null,
    role: 'USER',
    status: 'ACTIVE',
    backtestQuota: 10,
    watchlistLimit: 5,
    ...overrides,
  };
}
```

#### 1.2.2 AuthContext 值工厂

```ts
// src/test/factories/auth-context.ts（新建）
import type { AuthContextValue } from 'src/auth/context';

import { createMockUserProfile } from './user';

/** 生成已认证状态的 AuthContext 值 */
export function createAuthenticatedContext(
  overrides?: Partial<AuthContextValue>
): AuthContextValue {
  return {
    isAuthenticated: true,
    isLoading: false,
    role: 'USER',
    userProfile: createMockUserProfile(),
    signIn: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** 生成未认证状态的 AuthContext 值 */
export function createUnauthenticatedContext(
  overrides?: Partial<AuthContextValue>
): AuthContextValue {
  return {
    isAuthenticated: false,
    isLoading: false,
    role: null,
    userProfile: null,
    signIn: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** 生成加载中状态的 AuthContext 值 */
export function createLoadingContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    isAuthenticated: false,
    isLoading: true,
    role: null,
    userProfile: null,
    signIn: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

#### 1.2.3 WebSocket 事件 payload 工厂

```ts
// src/test/factories/sync-events.ts（新建）
import type { ViolationItem } from 'src/api/portfolio';
import type {
  SyncStartedPayload,
  SyncCompletedPayload,
  SyncFailedPayload,
  RiskViolationPayload,
} from 'src/contexts/sync-notification-context';

export function createSyncStartedPayload(
  overrides?: Partial<SyncStartedPayload>
): SyncStartedPayload {
  return {
    trigger: 'manual',
    mode: 'incremental',
    ...overrides,
  };
}

export function createSyncCompletedPayload(
  overrides?: Partial<SyncCompletedPayload>
): SyncCompletedPayload {
  return {
    trigger: 'manual',
    mode: 'incremental',
    executedTasks: ['daily_basic', 'money_flow'],
    skippedTasks: ['adj_factor'],
    failedTasks: [],
    targetTradeDate: '20260413',
    elapsedSeconds: 12.5,
    ...overrides,
  };
}

export function createSyncFailedPayload(overrides?: Partial<SyncFailedPayload>): SyncFailedPayload {
  return {
    trigger: 'scheduler',
    mode: 'full',
    reason: 'Tushare API 超时',
    ...overrides,
  };
}

export function createRiskViolationPayload(
  overrides?: Partial<RiskViolationPayload>
): RiskViolationPayload {
  return {
    portfolioId: 'portfolio-001',
    portfolioName: '测试组合',
    violations: [
      {
        ruleType: 'MAX_POSITION_RATIO',
        tsCode: '000001.SZ',
        stockName: '平安银行',
        currentValue: 35,
        threshold: 30,
        message: '平安银行持仓占比 35% 超出单只上限 30%',
      } satisfies ViolationItem,
    ],
    checkedAt: '2026-04-13T10:00:00Z',
    ...overrides,
  };
}
```

### 1.3 Socket Mock 辅助

Phase 3 的 `SyncNotificationProvider` 测试需要模拟 Socket.io 连接。策略：**mock `src/lib/socket` 模块**，返回一个 fake EventEmitter 风格的对象。

```ts
// 各测试文件内联 mock（不抽公共文件，避免依赖链复杂化）
vi.mock('src/lib/socket', () => {
  const listeners = new Map<string, Set<Function>>();

  const mockSocket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      listeners.get(event)?.delete(handler);
    }),
    // 测试辅助：模拟服务器推送事件
    __emit: (event: string, payload: unknown) => {
      listeners.get(event)?.forEach((fn) => fn(payload));
    },
    __listeners: listeners,
  };

  return {
    getSocket: vi.fn(() => mockSocket),
    destroySocket: vi.fn(),
    __mockSocket: mockSocket,
  };
});
```

> `__emit` 和 `__listeners` 是测试辅助方法，让测试可以模拟服务器端推送事件。

---

## 二、逐模块测试规格

### 2.1 AuthGuard 路由守卫

| 属性          | 值                                                                |
| ------------- | ----------------------------------------------------------------- |
| **源码**      | `src/routes/components/auth-guard.tsx` (28 行)                    |
| **测试文件**  | `src/routes/components/__tests__/auth-guard.test.tsx`             |
| **Mock 依赖** | `src/auth` (通过 `renderWithProviders` 的 `authContext` 选项注入) |
| **渲染方式**  | `renderWithProviders`（需 AuthContext + MemoryRouter）            |
| **优先级**    | P2-A（路由安全是核心业务规则）                                    |

#### 源码关键逻辑分析

```tsx
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // ← 分支 1
  if (!isAuthenticated && import.meta.env.MODE !== 'screenshot')
    // ← 分支 2
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  return <>{children}</>; // ← 分支 3
}
```

三条路径、三个关键业务规则：

1. **isLoading 期间不闪跳**：避免 token 校验未完成就重定向
2. **未认证 → 强制跳转 /sign-in**：携带 `state.from` 以便登录后回跳
3. **已认证 → 正常渲染子组件**

#### 测试用例

```
describe('AuthGuard', () => {

  it('isLoading=true 期间不渲染任何内容（不闪跳）', () => {
    // renderWithProviders(
    //   <AuthGuard><div>Protected</div></AuthGuard>,
    //   { authContext: createLoadingContext() }
    // )
    // expect(screen.queryByText('Protected')).not.toBeInTheDocument()
    // 同时断言未发生导航（无 Navigate 渲染）
  })

  it('未认证时重定向到 /sign-in', () => {
    // renderWithProviders(
    //   <Routes>
    //     <Route path="/dashboard" element={<AuthGuard><div>Protected</div></AuthGuard>} />
    //     <Route path="/sign-in" element={<div>Sign In</div>} />
    //   </Routes>,
    //   {
    //     initialEntries: ['/dashboard'],
    //     authContext: createUnauthenticatedContext(),
    //   }
    // )
    // expect(screen.getByText('Sign In')).toBeInTheDocument()
    // expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('未认证重定向时携带 state.from 保存原始路径', () => {
    // 需要自定义渲染以检查 location.state
    // 在 /sign-in 路由中渲染一个读取 location.state.from 的组件
    // 断言 state.from.pathname === '/dashboard'
  })

  it('已认证时正常渲染子组件', () => {
    // renderWithProviders(
    //   <AuthGuard><div>Protected Content</div></AuthGuard>,
    //   { authContext: createAuthenticatedContext() }
    // )
    // expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('已认证时不发生重定向', () => {
    // renderWithProviders with Routes
    // 断言仍在 /dashboard 路径，未跳转到 /sign-in
  })

  it('isLoading 从 true 变为 false 后，已认证则显示子组件', () => {
    // 需要 rerender 测试：先 isLoading=true，再更新为 isLoading=false + isAuthenticated=true
    // 断言从"不渲染"到"渲染子组件"的过渡
  })

  it('isLoading 从 true 变为 false 后，未认证则重定向', () => {
    // 先 isLoading=true（什么都不渲染），
    // 再更新为 isLoading=false + isAuthenticated=false
    // 断言跳转到 /sign-in
  })

})
```

**预计用例数**：7

---

### 2.2 ErrorBoundary 错误边界

| 属性          | 值                                                                                   |
| ------------- | ------------------------------------------------------------------------------------ |
| **源码**      | `src/routes/components/error-boundary.tsx` (169 行)                                  |
| **测试文件**  | `src/routes/components/__tests__/error-boundary.test.tsx`                            |
| **Mock 依赖** | `react-router` 的 `useRouteError`（通过 `createMemoryRouter` + `errorElement` 触发） |
| **渲染方式**  | `createMemoryRouter` + `RouterProvider`（ErrorBoundary 依赖 `useRouteError`）        |
| **优先级**    | P2-B                                                                                 |

#### 源码关键逻辑分析

`ErrorBoundary` 依赖 `useRouteError()` — 它只能在 react-router 的错误处理上下文中调用。因此不能用普通 render 测试，需要用 `createMemoryRouter` 构造路由错误场景。

三个错误分支：

1. `isRouteErrorResponse(error)` → HTTP 错误码 + statusText
2. `error instanceof Error` → 错误名 + 消息 + 堆栈 + 解析的文件路径/函数名
3. 其他未知错误 → "Unknown Error"

辅助函数 `parseStackTrace`：

- 提取 `/src/xxx` 文件路径
- 提取 `at FunctionName` 函数名

#### 测试用例

```
describe('ErrorBoundary', () => {

  describe('Route Error Response（HTTP 错误）', () => {
    it('渲染 HTTP 状态码和 statusText', () => {
      // 构造 loader throw json(data, { status: 404, statusText: 'Not Found' })
      // 断言 "404: Not Found" 存在于页面中
    })

    it('渲染 error.data 消息体', () => {
      // 断言 response.data 的内容出现在 message 区域
    })
  })

  describe('Error 实例', () => {
    it('渲染错误标题 "Unexpected Application Error!"', () => {
      // loader 中 throw new Error('something broke')
      // 断言标题文案存在
    })

    it('渲染错误名和消息 — "Error: something broke"', () => {
      // 断言包含 error.name + error.message
    })

    it('渲染完整堆栈（<pre> 元素）', () => {
      // 断言堆栈信息在 <pre> 元素中呈现
    })

    it('从堆栈中解析 /src/ 路径并展示', () => {
      // 构造含 /src/sections/auth/sign-in-view.tsx 的堆栈
      // 断言文件路径出现在界面上
    })

    it('从堆栈中解析函数名并展示', () => {
      // 构造含 at handleSignIn 的堆栈
      // 断言函数名出现在界面上
    })
  })

  describe('未知错误', () => {
    it('非 Error 非 Response 时显示 "Unknown Error"', () => {
      // loader 中 throw 'string error'
      // 断言 "Unknown Error" 标题存在
    })
  })

})

describe('parseStackTrace（内部辅助函数，通过 ErrorBoundary 间接测试）', () => {
  it('无堆栈信息时不渲染文件路径', () => {
    // Error 对象但 stack 为 undefined
    // 断言不出现文件路径 / 函数名区域
  })
})
```

**预计用例数**：9

---

### 2.3 SyncNotificationProvider（WebSocket 通知 Context）

| 属性          | 值                                                          |
| ------------- | ----------------------------------------------------------- |
| **源码**      | `src/contexts/sync-notification-context.tsx` (308 行)       |
| **测试文件**  | `src/contexts/__tests__/sync-notification-context.test.tsx` |
| **Mock 依赖** | `src/lib/socket`（getSocket / destroySocket）               |
| **渲染方式**  | `renderHook` + 自定义 wrapper（SyncNotificationProvider）   |
| **优先级**    | P2-A（WebSocket 通知是多个模块共享的核心状态）              |

#### 源码关键逻辑分析

Provider 在 mount 时：

1. 调用 `getSocket()` 获取 socket 单例
2. 调用 `socket.connect()` 建立连接
3. 注册 6 个事件监听器：`tushare_sync_started`、`tushare_sync_completed`、`tushare_sync_failed`、`data_quality_completed`、`auto_repair_queued`、`risk_violation`
4. unmount 时调用 `socket.off()` 逐个移除监听 + `destroySocket()`

状态机变化：

- `started` → `isSyncing=true`，清除 lastSyncResult/lastSyncError
- `completed` → `isSyncing=false`，设置 lastSyncResult，生成通知
- `failed` → `isSyncing=false`，设置 lastSyncError，生成通知
- `risk_violation` → 生成通知（不影响 isSyncing）
- `data_quality_completed` → 设置 lastQualitySummary

通知列表规则：

- 最新在最前（unshift 语义）
- 最多保留 50 条（MAX_NOTIFICATIONS）
- 每条自动生成唯一 ID（timestamp + counter）
- `markNotificationRead(id)` — 标记单条
- `markAllRead()` — 全部标记
- `clearLastResult()` — 清除 lastSyncResult + lastSyncError

#### 测试用例

```
describe('SyncNotificationProvider', () => {

  describe('Socket 生命周期', () => {
    it('mount 时调用 getSocket() 并执行 socket.connect()', () => {
      // renderHook → wrapper = SyncNotificationProvider
      // expect(getSocket).toHaveBeenCalled()
      // expect(mockSocket.connect).toHaveBeenCalled()
    })

    it('mount 时注册全部 6 个事件监听器', () => {
      // 断言 socket.on 被调用了 6 次
      // 事件名：tushare_sync_started, tushare_sync_completed,
      // tushare_sync_failed, data_quality_completed,
      // auto_repair_queued, risk_violation
    })

    it('unmount 时移除全部事件监听器并调用 destroySocket()', () => {
      // renderHook → unmount
      // expect(socket.off).toHaveBeenCalledTimes(6)
      // expect(destroySocket).toHaveBeenCalled()
    })
  })

  describe('同步状态 — tushare_sync_started', () => {
    it('收到 started 事件后 isSyncing 变为 true', () => {
      // __emit('tushare_sync_started', createSyncStartedPayload())
      // expect(result.current.isSyncing).toBe(true)
    })

    it('started 事件清除上次的 lastSyncResult 和 lastSyncError', () => {
      // 先模拟 completed（设置 lastSyncResult），
      // 再模拟 started，断言 lastSyncResult === null && lastSyncError === null
    })
  })

  describe('同步完成 — tushare_sync_completed', () => {
    it('收到 completed 后 isSyncing 变为 false', () => {
      // 先 started → 再 completed
      // expect(result.current.isSyncing).toBe(false)
    })

    it('设置 lastSyncResult 为 completed payload', () => {
      // __emit completed with payload
      // expect(result.current.lastSyncResult).toEqual(payload)
    })

    it('生成一条 type="tushare-sync-completed" 的通知', () => {
      // 断言 notifications 长度为 1
      // 断言 notifications[0].type === 'tushare-sync-completed'
    })

    it('通知标题：无失败任务 → "数据同步成功"', () => {
      // payload.failedTasks = []
      // 断言 title === '数据同步成功'
    })

    it('通知标题：有失败任务 → "数据同步完成（有失败任务）"', () => {
      // payload.failedTasks = ['index_daily']
      // 断言 title === '数据同步完成（有失败任务）'
    })

    it('通知描述包含耗时和任务计数', () => {
      // payload: executedTasks 2个, skippedTasks 1个, elapsedSeconds 12.5
      // 断言 description 包含 '12.5 秒'、'成功 2 个'、'跳过 1 个'
    })
  })

  describe('同步失败 — tushare_sync_failed', () => {
    it('收到 failed 后 isSyncing 变为 false', () => {
      // 先 started → 再 failed
    })

    it('设置 lastSyncError 为 failed payload', () => {
      // 断言 lastSyncError.reason
    })

    it('生成一条 type="tushare-sync-failed" 的通知', () => {
      // 断言 notifications[0].type === 'tushare-sync-failed'
      // 断言 title === '数据同步异常'
      // 断言 description === payload.reason
    })
  })

  describe('风控违规 — risk_violation', () => {
    it('生成一条 type="risk-violation" 的通知', () => {
      // __emit('risk_violation', createRiskViolationPayload())
      // 断言 notifications[0].type === 'risk-violation'
    })

    it('通知标题包含组合名称和违规条数', () => {
      // 断言 title 包含 '测试组合' 和 '1 条'
    })

    it('描述：≤3 条违规直接展示 message', () => {
      // 1 条违规 → description === violation.message
    })

    it('描述：>3 条违规截断展示 + "…等 N 条"', () => {
      // 4 条违规 → 断言包含 '…等 4 条'
    })

    it('风控事件不影响 isSyncing 状态', () => {
      // 断言 isSyncing 保持 false
    })
  })

  describe('数据质量 — data_quality_completed', () => {
    it('收到事件后更新 lastQualitySummary', () => {
      // __emit('data_quality_completed', mockSummary)
      // expect(result.current.lastQualitySummary).toEqual(mockSummary)
    })
  })

  describe('通知列表管理', () => {
    it('新通知插入到列表最前面', () => {
      // 连续 emit 两次 completed（不同 executedTasks）
      // 断言 notifications[0] 是第二次的通知
    })

    it('通知列表最多保留 50 条', () => {
      // 连续 emit 51 次 completed
      // 断言 notifications.length === 50
      // 断言最旧那条已被 FIFO 淘汰
    })

    it('每条通知有唯一 ID', () => {
      // emit 两次 → 断言 notifications[0].id !== notifications[1].id
    })

    it('新通知默认 isUnRead=true', () => {
      // 断言 notifications[0].isUnRead === true
    })

    it('markNotificationRead 标记单条为已读', () => {
      // emit 一次 → markNotificationRead(id)
      // 断言 isUnRead === false
    })

    it('markNotificationRead 不影响其他通知', () => {
      // emit 两次 → markNotificationRead(第一条 id)
      // 断言第二条 isUnRead 仍为 true
    })

    it('markAllRead 将全部通知标记为已读', () => {
      // emit 三次 → markAllRead()
      // 断言所有 isUnRead === false
    })
  })

  describe('clearLastResult', () => {
    it('清除 lastSyncResult 和 lastSyncError', () => {
      // 先 emit completed → 断言 lastSyncResult !== null
      // 调用 clearLastResult()
      // 断言 lastSyncResult === null && lastSyncError === null
    })
  })

  describe('useSyncNotification hook', () => {
    it('在 Provider 外部调用时抛出错误', () => {
      // renderHook(useSyncNotification)（无 wrapper）
      // expect → throw '必须在 SyncNotificationProvider 内部使用'
    })
  })

})
```

**预计用例数**：28

---

### 2.4 路由结构验证

| 属性          | 值                                                                            |
| ------------- | ----------------------------------------------------------------------------- |
| **源码**      | `src/routes/sections.tsx` (218 行) + `src/routes/hooks/use-router.ts` (22 行) |
| **测试文件**  | `src/routes/__tests__/routes.test.tsx`                                        |
| **Mock 依赖** | `src/auth`（AuthGuard 内部消费），所有 `lazy` 页面组件                        |
| **渲染方式**  | `createMemoryRouter` + `RouterProvider`，或直接对路由配置数组做结构断言       |
| **优先级**    | P2-B                                                                          |

#### 源码关键逻辑分析

`routesSection` 是一个 `RouteObject[]` 数组，包含：

1. **受保护路由组**：最外层 `AuthGuard > DashboardLayout > Suspense > Outlet`，children 包含 40+ 条子路由
2. **公开路由**：`/sign-in`（AuthLayout 包裹，无 AuthGuard）
3. **错误页面**：`/404` 和 `*`（catch-all）
4. **向后兼容重定向**：`/signal → /strategy/signal`、`/event-study → /research/event-study` 等 8 条

测试策略：

- **结构断言**（不渲染 DOM）：直接 import `routesSection` 数组，遍历检查路由配置的正确性
- **渲染测试**：通过 `createMemoryRouter` + mock auth 验证实际导航行为

#### 测试用例

```
describe('路由结构', () => {

  describe('受保护路由 — AuthGuard 包裹', () => {
    it('DashboardLayout 子树被 AuthGuard 包裹', () => {
      // 直接检查 routesSection[0].element 的组件树
      // 断言最外层包含 AuthGuard 组件
    })

    it('未认证访问受保护路由时被重定向到 /sign-in', () => {
      // mock useAuth → isAuthenticated: false, isLoading: false
      // createMemoryRouter(routesSection, { initialEntries: ['/stock'] })
      // 断言当前路径为 /sign-in
    })

    it('已认证访问受保护路由时正常显示页面', () => {
      // mock useAuth → isAuthenticated: true
      // 断言页面内容或 Suspense fallback 出现
    })
  })

  describe('公开路由 — 无需认证', () => {
    it('/sign-in 路由无 AuthGuard 包裹', () => {
      // 检查 routesSection 中 path='sign-in' 的 element
      // 断言不包含 AuthGuard
    })

    it('未认证可以直接访问 /sign-in', () => {
      // createMemoryRouter → initialEntries: ['/sign-in']
      // 断言页面正常渲染（不重定向）
    })
  })

  describe('错误页面', () => {
    it('/404 路由存在且渲染 Page404', () => {
      // 访问 /404，断言渲染了 Page404
    })

    it('任何未匹配路径渲染 Page404（catch-all）', () => {
      // 访问 /nonexistent-path，断言渲染了 Page404
    })
  })

  describe('向后兼容重定向', () => {
    it.each([
      ['/signal', '/strategy/signal'],
      ['/signal/history', '/strategy/signal/history'],
      ['/event-study', '/research/event-study'],
      ['/report', '/research/report'],
      ['/pattern', '/stock/pattern'],
      ['/tushare-sync', '/admin/tushare-sync'],
      ['/user-manage', '/admin/user-manage'],
      ['/stock/screener', '/stock'],
    ])(
      '访问 %s 重定向到 %s',
      (from, to) => {
        // mock useAuth → authenticated
        // createMemoryRouter → initialEntries: [from]
        // 断言当前位置为 to
      }
    )
  })

  describe('Suspense 降级', () => {
    it('懒加载页面未就绪时显示 LinearProgress', () => {
      // mock 使 lazy 组件 pending（不 resolve）
      // 断言 LinearProgress 出现在 DOM 中
    })
  })

})

describe('useRouter hook', () => {

  it('push 调用 navigate(href)', () => {
    // 在 MemoryRouter 内 renderHook
    // act → router.push('/stock')
    // 断言当前路径变为 /stock
  })

  it('replace 调用 navigate(href, { replace: true })', () => {
    // router.replace('/new-path')
    // 断言当前路径为 /new-path
    // 断言 history 长度不变（replace 不增加历史条目）
  })

  it('back 调用 navigate(-1)', () => {
    // 先 push 到 /a → 再 push 到 /b → router.back()
    // 断言回到 /a
  })

})
```

**预计用例数**：17

---

## 三、Mock 策略总结

| 被 Mock 模块                      | Mock 方式                                                              | 使用场景                 |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| `src/auth`                        | `renderWithProviders` 的 `authContext` 选项注入 `AuthContext.Provider` | AuthGuard、路由结构测试  |
| `src/lib/socket`                  | `vi.mock` → 返回 fake socket（含 `__emit` 辅助）                       | SyncNotificationProvider |
| `react-router` 的 `useRouteError` | 通过 `createMemoryRouter` + loader `throw` 自然触发                    | ErrorBoundary            |
| lazy 页面组件                     | 对 `src/pages/*` 做 `vi.mock → () => <div>PageName</div>`              | 路由结构渲染测试         |

---

## 四、实现顺序

| 步骤 | 任务                                                                | 依赖               |
| ---- | ------------------------------------------------------------------- | ------------------ |
| 0    | 增强 `test-utils.tsx`（添加 `authContext` 选项），新建 3 个工厂文件 | 无                 |
| 1    | `auth-guard.test.tsx`（7 例）                                       | Step 0             |
| 2    | `error-boundary.test.tsx`（9 例）                                   | 无额外依赖         |
| 3    | `sync-notification-context.test.tsx`（28 例）                       | Step 0（工厂文件） |
| 4    | `routes.test.tsx`（17 例，含 useRouter hook 测试）                  | Step 0             |
| 5    | 运行全量测试，修复失败用例                                          | Steps 1-4          |

---

## 五、预计产出与风险

### 产出统计

| 测试文件                                                    | 预计用例数 |
| ----------------------------------------------------------- | ---------- |
| `src/routes/components/__tests__/auth-guard.test.tsx`       | 7          |
| `src/routes/components/__tests__/error-boundary.test.tsx`   | 9          |
| `src/contexts/__tests__/sync-notification-context.test.tsx` | 28         |
| `src/routes/__tests__/routes.test.tsx`                      | 17         |
| **总计**                                                    | **~61**    |

### 风险与应对

| 风险                                      | 说明                                                   | 应对                                                                                               |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| ErrorBoundary 需要 `useRouteError` 上下文 | 不能用普通 `render`                                    | 使用 `createMemoryRouter` + `RouterProvider`，在 loader 中 throw 来触发                            |
| Socket mock 的 EventEmitter 行为          | `__emit` 需要触发 `act()` 包裹的状态更新               | 所有 emit 操作包裹在 `act(async () => { ... })` 中                                                 |
| 懒加载路由在测试环境中的行为              | `lazy()` + dynamic import 在 vitest 中可能立即 resolve | 如果需要测试 Suspense fallback，使用 `vi.mock` 让 import 返回 pending Promise                      |
| AuthGuard 的 `import.meta.env.MODE` 分支  | screenshot 模式跳过认证检查                            | 测试中 `import.meta.env.MODE` 默认为 `'test'`，不会命中 screenshot 分支；如需覆盖，用 `vi.stubEnv` |
| `routesSection` 中的 40+ 子路由           | 逐条渲染测试成本过高                                   | 结构断言（遍历配置数组）为主，仅对关键路径做渲染测试                                               |

---

_最后更新：2026-04-13_
