# Phase 2：组件测试 — 详细设计文档

> **关联主文档**：[测试框架与计划-前端设计.md](测试框架与计划-前端设计.md) § Phase 2  
> **范围**：`src/components/` 通用 UI 组件 + `src/sections/auth/sign-in-view.tsx` 登录表单  
> **预计新增测试**：~65–75 个测试用例，9 个测试文件  
> **预计覆盖率**：20% → 35%

---

## 一、测试基础设施增强

Phase 2 涉及 React 组件渲染，需要对现有测试基础设施进行以下增强。

### 1.1 增强 renderWithProviders

当前 `src/test/test-utils.tsx` 只做了 `userEvent.setup()` + `render()`，尚未包裹任何 Provider。  
Phase 2 需要 **ThemeProvider**（Label / Logo 等 styled 组件依赖主题）和 **MemoryRouter**（Logo 使用 RouterLink）。

```tsx
// src/test/test-utils.tsx（增强后）
import type { ReactElement } from 'react';

import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const defaultTheme = createTheme();

type RenderOptions = {
  initialEntries?: string[]; // MemoryRouter 初始路径
};

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const { initialEntries = ['/'] } = options ?? {};

  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider theme={defaultTheme}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </ThemeProvider>
    ),
  };
}

export { render, userEvent };
```

> **注意**：Phase 2 暂不需要 AuthProvider 包裹（sign-in-view 测试通过 mock `useAuth` 解决）。Phase 3 再统一加入。

### 1.2 增强 setup.ts 全局 Mock

jsdom 缺少部分浏览器 API，会导致组件初始化报错。在 `src/test/setup.ts` 补充：

```ts
// src/test/setup.ts（增强后）
import '@testing-library/jest-dom/vitest';

// --- 浏览器 API polyfill / mock ---
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 1.3 新增测试数据工厂

```ts
// src/test/factories/stock.ts（新建）
import type { StockSearchItem } from 'src/api/stock';

export function createMockStockSearchItem(
  overrides?: Partial<StockSearchItem>
): StockSearchItem {
  return {
    tsCode: '000001.SZ',
    name: '平安银行',
    market: '主板',
    industry: '银行',
    ...overrides,
  };
}
```

```ts
// src/test/factories/captcha.ts（新建）
export function createMockCaptchaResponse(
  overrides?: Partial<{ captchaId: string; svgImage: string }>
) {
  return {
    captchaId: 'captcha-test-001',
    svgImage: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="56"><text>1234</text></svg>',
    ...overrides,
  };
}
```

---

## 二、逐组件测试规格

### 2.1 Label 组件

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/label/label.tsx` + `styles.tsx` |
| **测试文件** | `src/components/label/__tests__/label.test.tsx` |
| **Mock 依赖** | 无（纯 UI 组件） |
| **渲染方式** | `renderWithProviders`（需要 ThemeProvider） |
| **优先级** | P1-A（最先实现，无外部依赖，适合验证基础设施） |

#### 测试用例

```
describe('Label', () => {

  describe('基础渲染', () => {
    it('渲染文本内容并应用 upperFirst 格式化', () => {
      // 传入 "hello world"，断言渲染结果为 "Hello world"
      // expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('默认 variant="soft"、color="default"', () => {
      // 不传 variant/color，断言 DOM 元素上包含对应的 CSS class
      // 通过 labelClasses 中定义的 class name 验证
    })

    it('渲染为 <span> 元素', () => {
      // expect(container.firstChild?.tagName).toBe('SPAN')
    })
  })

  describe('variant 变体', () => {
    it.each(['filled', 'outlined', 'soft', 'inverted'] as const)(
      '渲染 variant="%s" 应用对应样式类',
      (variant) => {
        // 传入不同 variant，断言组件根元素携带对应 class
      }
    )
  })

  describe('color 颜色', () => {
    it.each(['default','primary','secondary','info','success','warning','error'] as const)(
      '渲染 color="%s" 应用对应样式类',
      (color) => {
        // 传入不同 color，断言组件根元素携带对应 class
      }
    )
  })

  describe('图标', () => {
    it('渲染 startIcon', () => {
      // 传入 startIcon={<span data-testid="start-icon">★</span>}
      // expect(screen.getByTestId('start-icon')).toBeInTheDocument()
    })

    it('渲染 endIcon', () => {
      // 传入 endIcon={<span data-testid="end-icon">→</span>}
      // expect(screen.getByTestId('end-icon')).toBeInTheDocument()
    })

    it('不传图标时不渲染图标容器', () => {
      // 不传 startIcon / endIcon
      // 断言不存在图标容器元素
    })

    it('同时渲染 startIcon 和 endIcon', () => {
      // 同时传入两个图标，断言两者均存在且顺序正确
    })
  })

  describe('disabled 状态', () => {
    it('disabled=true 时降低透明度', () => {
      // 传入 disabled={true}
      // 断言 style 或 class 中包含 opacity 相关设置
    })
  })

  describe('自定义样式', () => {
    it('透传 sx prop', () => {
      // 传入 sx={{ backgroundColor: 'red' }}
      // 断言组件根元素的 computed style
    })

    it('透传 className', () => {
      // 传入 className="custom-label"
      // expect(container.firstChild).toHaveClass('custom-label')
    })
  })
})
```

**预计用例数**：~15 个

---

### 2.2 Iconify 组件

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/iconify/iconify.tsx` + `icon-sets.ts` + `register-icons.ts` |
| **测试文件** | `src/components/iconify/__tests__/iconify.test.tsx` |
| **Mock 依赖** | `@iconify/react` → mock `Icon` 组件 |
| **渲染方式** | `renderWithProviders` |
| **优先级** | P1-A |

#### Mock 策略

```ts
// 在测试文件顶部 mock @iconify/react
vi.mock('@iconify/react', () => ({
  Icon: vi.fn((props: any) => <span data-testid="iconify-icon" data-icon={props.icon} {...props} />),
  addCollection: vi.fn(),
  addIcon: vi.fn(),
}));
```

#### 测试用例

```
describe('Iconify', () => {

  it('渲染 Icon 组件并传递 icon prop', () => {
    // 渲染 <Iconify icon="solar:eye-bold" />
    // 断言 mock 的 Icon 组件被调用，且 icon 属性正确
  })

  it('默认宽高为 20px', () => {
    // 不传 width/height
    // 断言渲染输出的 width=20
  })

  it('自定义 width 时 height 自动匹配', () => {
    // 传入 width={32}
    // 断言 width=32
  })

  it('透传 className 并合并内置 class', () => {
    // 传入 className="custom-icon"
    // 断言元素同时有内置 class 和 custom-icon
  })

  it('透传 sx prop', () => {
    // 传入 sx={{ color: 'red' }}
  })
})

describe('registerIcons', () => {
  it('调用 addCollection 注册图标集', () => {
    // 调用 registerIcons()
    // 断言 addCollection 被调用（至少 1 次）
  })
})
```

**预计用例数**：~6 个

---

### 2.3 Logo 组件

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/logo/logo.tsx` |
| **测试文件** | `src/components/logo/__tests__/logo.test.tsx` |
| **Mock 依赖** | 无（需要 Router + Theme） |
| **渲染方式** | `renderWithProviders`（MemoryRouter 提供 RouterLink 上下文） |
| **优先级** | P1-A |

#### 测试用例

```
describe('Logo', () => {

  describe('渲染模式', () => {
    it('默认渲染为 isSingle=true（图标模式）', () => {
      // 不传 isSingle
      // 断言渲染了 SVG 元素（单图标 logo）
    })

    it('isSingle=false 渲染完整 logo（含文字）', () => {
      // 传入 isSingle={false}
      // 断言渲染了更宽的 SVG + 文字部分
    })
  })

  describe('链接行为', () => {
    it('默认 href="/" 渲染为链接', () => {
      // 断言 <a> 元素的 href 属性为 '/'
    })

    it('自定义 href 生效', () => {
      // 传入 href="/dashboard"
      // 断言链接 href 为 '/dashboard'
    })

    it('disabled=true 时移除链接行为', () => {
      // 传入 disabled={true}
      // 断言无 <a> 标签或链接不可点击（pointer-events: none）
    })
  })

  describe('SVG 渲染', () => {
    it('渲染的 SVG 包含 <defs> 渐变定义', () => {
      // 断言 SVG 内部存在 linearGradient 元素
    })

    it('每个实例生成唯一 gradient ID（无 ID 冲突）', () => {
      // 同时渲染两个 Logo 组件
      // 断言两个实例的 gradient ID 不同
    })
  })

  describe('样式', () => {
    it('透传 sx prop', () => {
      // 传入 sx={{ width: 64, height: 64 }}
    })
  })
})
```

**预计用例数**：~7 个

---

### 2.4 Scrollbar 组件

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/scrollbar/scrollbar.tsx` |
| **测试文件** | `src/components/scrollbar/__tests__/scrollbar.test.tsx` |
| **Mock 依赖** | `simplebar-react` → mock SimpleBar |
| **渲染方式** | `renderWithProviders` |
| **优先级** | P1-B |

#### Mock 策略

```ts
// SimpleBar 在 jsdom 中无法正常初始化（无滚动条 API），需要 mock
vi.mock('simplebar-react', () => ({
  default: vi.fn(({ children, ...props }: any) => (
    <div data-testid="simplebar" {...props}>{children}</div>
  )),
}));
```

#### 测试用例

```
describe('Scrollbar', () => {

  it('渲染子内容', () => {
    // <Scrollbar><p>Hello</p></Scrollbar>
    // expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('将 sx prop 传递给根元素', () => {
    // 传入 sx={{ height: 300 }}
  })

  it('透传 className 并合并内置 class', () => {
    // 传入 className="custom-scroll"
    // 断言元素包含内置 class + custom-scroll
  })

  it('fillContent=true 时内容区应用 flex 填充', () => {
    // 传入 fillContent={true}
    // 断言容器 class 或样式包含 fillContent 相关标记
  })

  it('slotProps 样式正确传递', () => {
    // 传入 slotProps={{ contentSx: { padding: 2 } }}
    // 验证 SimpleBar 收到对应属性
  })
})
```

**预计用例数**：~5 个

---

### 2.5 Chart / useChart

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/chart/chart.tsx` + `use-chart.ts` |
| **测试文件** | `src/components/chart/__tests__/chart.test.tsx` |
| **Mock 依赖** | `apexcharts` + `react-apexcharts` → mock |
| **渲染方式** | `renderWithProviders`（useChart 依赖 Theme） |
| **优先级** | P1-B |

#### Mock 策略

```ts
// ApexCharts 在 jsdom 中无法运行（无 Canvas/SVG 渲染引擎）
vi.mock('apexcharts', () => ({
  default: {
    getChartByID: vi.fn(),
    exec: vi.fn(),
  },
}));

vi.mock('react-apexcharts', () => ({
  default: vi.fn((props: any) => (
    <div data-testid="apex-chart" data-type={props.type} />
  )),
}));
```

#### 测试用例

```
describe('useChart', () => {

  it('返回默认配置（包含调色盘、grid、tooltip 等）', () => {
    // renderHook(() => useChart()) 在 ThemeProvider 中
    // 断言 result.current 包含 chart, colors, grid, tooltip 等 key
  })

  it('合并用户自定义选项', () => {
    // renderHook(() => useChart({ chart: { toolbar: { show: true } } }))
    // 断言 result.current.chart.toolbar.show === true
    // 且其余默认值仍保留
  })

  it('默认禁用 toolbar 和 zoom', () => {
    // 断言 result.current.chart.toolbar.show === false
    // 断言 result.current.chart.zoom.enabled === false
  })

  it('调色盘包含 9 种颜色', () => {
    // 断言 result.current.colors.length === 9
  })
})

describe('Chart 组件', () => {

  it('渲染时传递 type / series / options 给 ApexCharts', () => {
    // <Chart type="line" series={[...]} options={{}} />
    // 断言 mock 的 react-apexcharts 被调用且收到正确 props
  })

  it('未加载完成时显示 ChartLoading', () => {
    // 需要验证加载中状态的渲染（isClient 为 false 时）
  })

  it('透传 sx prop 到容器', () => {
    // 传入 sx={{ height: 400 }}
  })
})
```

**预计用例数**：~7 个

---

### 2.6 ChartLoading / ChartLegends

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/chart/components/chart-loading.tsx` + `chart-legends.tsx` |
| **测试文件** | `src/components/chart/__tests__/chart-components.test.tsx` |
| **Mock 依赖** | 无（纯 UI 组件） |
| **渲染方式** | `renderWithProviders` |
| **优先级** | P1-B |

#### 测试用例

```
describe('ChartLoading', () => {

  it('渲染 Skeleton 占位', () => {
    // expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('圆形图表类型（donut/pie/radialBar/polarArea）使用圆形 Skeleton', () => {
    // 传入 type="donut"
    // 断言 Skeleton 的 variant="circular" 或 borderRadius 为 50%
  })

  it('非圆形图表类型使用继承圆角', () => {
    // 传入 type="line"
    // 断言 Skeleton borderRadius 为 inherit
  })
})

describe('ChartLegends', () => {

  it('按 labels 数量渲染图例项', () => {
    // 传入 labels={['A', 'B', 'C']} colors={['red','green','blue']}
    // expect(screen.getByText('A')).toBeInTheDocument() 等
  })

  it('渲染颜色圆点', () => {
    // 不传 icons，断言存在 dot 元素且 color 对应
  })

  it('传入 icons 时替换圆点为自定义图标', () => {
    // 传入 icons={[<span>★</span>, ...]}
    // 断言显示 ★ 而非圆点
  })

  it('渲染 values', () => {
    // 传入 values={['100', '200', '300']}
    // expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('渲染 sublabels 追加到 label 后', () => {
    // 传入 labels={['A']} sublabels={['sub-a']}
    // 断言文本包含 "(sub-a)"
  })

  it('空 labels 时不渲染任何项', () => {
    // 传入 labels={[]}
    // 断言列表为空
  })
})
```

**预计用例数**：~9 个

---

### 2.7 StockSearchAutocomplete

| 属性 | 值 |
|------|-----|
| **源码** | `src/components/stock-search-autocomplete/stock-search-autocomplete.tsx` |
| **测试文件** | `src/components/stock-search-autocomplete/__tests__/stock-search-autocomplete.test.tsx` |
| **Mock 依赖** | `src/api/stock` → mock `searchStocks` |
| **渲染方式** | `renderWithProviders` |
| **优先级** | P1-C（依赖 API mock + 异步交互，复杂度较高） |

#### Mock 策略

```ts
vi.mock('src/api/stock', () => ({
  searchStocks: vi.fn(),
}));
```

#### 测试用例

```
describe('StockSearchAutocomplete', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  })

  afterEach(() => {
    vi.useRealTimers();
  })

  it('初始渲染显示 placeholder', () => {
    // 断言 input 的 placeholder 为 '输入股票代码或名称...'
  })

  it('自定义 placeholder 生效', () => {
    // 传入 placeholder="搜索..."
    // 断言 input.placeholder === '搜索...'
  })

  describe('搜索与防抖', () => {
    it('输入内容后等待 300ms 才触发 API 请求', async () => {
      // 输入 "平安"
      // 立即断言：searchStocks 未被调用
      // vi.advanceTimersByTime(300)
      // await waitFor → 断言 searchStocks 被调用 { keyword: '平安', limit: 20 }
    })

    it('300ms 内连续输入只触发最后一次请求', async () => {
      // 输入 "平"，100ms 后输入 "平安"，再 300ms
      // 断言 searchStocks 只被调用一次，keyword 为 '平安'
    })

    it('输入清空时不触发请求并清空选项', async () => {
      // 输入后清空 input
      // 断言 searchStocks 未被再次调用
    })
  })

  describe('搜索结果展示', () => {
    it('API 返回结果后渲染选项列表', async () => {
      // mock searchStocks 返回 [{ tsCode: '000001.SZ', name: '平安银行', ... }]
      // 输入并等待防抖
      // 断言下拉列表出现 "平安银行" 和 "000001.SZ"
    })

    it('加载中显示 CircularProgress', async () => {
      // mock searchStocks 返回一个 pending promise
      // 输入并等待防抖触发
      // 断言存在 CircularProgress（role="progressbar"）
    })

    it('API 出错时选项列表为空（不崩溃）', async () => {
      // mock searchStocks 抛出异常
      // 断言不显示错误信息，选项为空
    })
  })

  describe('选择与回调', () => {
    it('选择选项后调用 onChange 传递 StockSearchItem', async () => {
      // mock 返回结果 → 输入 → 等待列表出现 → 点击选项
      // 断言 onChange 被调用，参数为完整的 StockSearchItem 对象
    })

    it('清除选中值后调用 onChange(null)', async () => {
      // 已选中某项 → 清除
      // 断言 onChange(null)
    })
  })

  describe('选项渲染', () => {
    it('每个选项显示 name + tsCode', async () => {
      // 断言选项中包含股票名称和代码
    })

    it('有 industry 时显示 market · industry', async () => {
      // mock 返回 { market: '主板', industry: '银行', ... }
      // 断言选项中包含 "主板 · 银行"
    })
  })
})
```

**预计用例数**：~10 个

---

### 2.8 SignInView 登录表单

| 属性 | 值 |
|------|-----|
| **源码** | `src/sections/auth/sign-in-view.tsx` |
| **测试文件** | `src/sections/auth/__tests__/sign-in-view.test.tsx` |
| **Mock 依赖** | `src/api/auth`（getCaptcha / login）、`src/auth/context`（useAuth）、`src/routes/hooks`（useRouter） |
| **渲染方式** | `renderWithProviders` |
| **优先级** | P1-C（依赖多个 mock，交互流程复杂） |

#### Mock 策略

```ts
// Mock API
vi.mock('src/api/auth', () => ({
  authApi: {
    getCaptcha: vi.fn(),
    login: vi.fn(),
  },
}));

// Mock Auth Context
const mockSignIn = vi.fn();
const mockLoadProfile = vi.fn();
vi.mock('src/auth/context', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    loadProfile: mockLoadProfile,
  }),
}));

// Mock Router
const mockPush = vi.fn();
vi.mock('src/routes/hooks', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

#### 测试用例

```
describe('SignInView', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // mock getCaptcha 默认返回成功
    vi.mocked(authApi.getCaptcha).mockResolvedValue({
      captchaId: 'cap-001',
      svgImage: '<svg><text>1234</text></svg>',
    });
  })

  describe('表单渲染', () => {
    it('渲染账号、密码、验证码三个输入框', () => {
      // 断言存在 label 为 "账号" / "密码" / "验证码" 的 input
    })

    it('密码输入框默认隐藏密码（type="password"）', () => {
      // 断言密码 input.type === 'password'
    })

    it('渲染登录按钮', () => {
      // expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
    })
  })

  describe('验证码', () => {
    it('mount 时自动请求验证码', async () => {
      // await waitFor → expect(authApi.getCaptcha).toHaveBeenCalledTimes(1)
    })

    it('验证码 SVG 图片正确渲染', async () => {
      // 断言页面中包含 svg 元素或 dangerouslySetInnerHTML 区域
    })

    it('验证码加载中显示 Skeleton', () => {
      // mock getCaptcha 返回 pending promise
      // 断言显示加载骨架屏
    })

    it('点击验证码图片刷新验证码', async () => {
      // 等待首次加载完成 → 点击验证码区域
      // expect(authApi.getCaptcha).toHaveBeenCalledTimes(2)
    })

    it('60 秒后验证码过期显示过期提示', async () => {
      // vi.useFakeTimers()
      // 等待验证码加载成功 → vi.advanceTimersByTime(60_000)
      // 断言界面出现过期提示（Badge 或 overlay）
    })
  })

  describe('密码可见性', () => {
    it('点击眼睛图标切换密码可见性', async () => {
      // 从 type="password" → 点击 → type="text" → 再次点击 → type="password"
    })
  })

  describe('表单提交', () => {
    it('所有字段填写后点击登录按钮提交', async () => {
      // 填写 account, password, captchaCode
      // 点击登录按钮
      // expect(authApi.login).toHaveBeenCalledWith({
      //   account: '...', password: '...', captchaId: 'cap-001', captchaCode: '...'
      // })
    })

    it('登录成功后依次调用 signIn → loadProfile → router.push("/")', async () => {
      // mock login 返回 { accessToken: 'token-abc' }
      // 填写并提交
      // 断言调用顺序：signIn('token-abc') → loadProfile() → push('/')
    })

    it('提交中按钮禁用并显示 loading', async () => {
      // mock login 返回 pending promise (用 never-resolving 或延迟)
      // 提交后断言按钮 disabled + CircularProgress 存在
    })
  })

  describe('错误处理', () => {
    it('未填写必填项时阻止提交并无 API 调用', async () => {
      // 不填任何字段，点击登录
      // expect(authApi.login).not.toHaveBeenCalled()
    })

    it('登录失败显示 Alert 错误信息', async () => {
      // mock login 抛出 Error('密码错误')
      // 提交后断言 Alert 中显示 "密码错误"
    })

    it('登录失败后自动刷新验证码', async () => {
      // mock login 抛出异常
      // 提交后断言 getCaptcha 再次被调用
    })
  })

  describe('键盘交互', () => {
    it('账号输入框按 Enter 触发提交', async () => {
      // 填写所有字段 → 在账号输入框按 Enter
      // expect(authApi.login).toHaveBeenCalled()
    })

    it('密码输入框按 Enter 触发提交', async () => {
      // 同上
    })
  })
})
```

**预计用例数**：~15 个

---

## 三、实施顺序与依赖图

```
┌───────────────────────────────────────────────────────────┐
│  Step 0: 基础设施增强                                       │
│  ├── 增强 test-utils.tsx (ThemeProvider + MemoryRouter)     │
│  ├── 增强 setup.ts (ResizeObserver / matchMedia mock)       │
│  └── 新建 test factories (stock.ts, captcha.ts)            │
└───────────────────┬───────────────────────────────────────┘
                    ▼
┌───────────────────────────────────────────────────────────┐
│  Step 1: 无外部依赖的纯 UI 组件（P1-A）                     │
│  ├── label.test.tsx          (~15 tests)                   │
│  ├── iconify.test.tsx        (~6 tests)                    │
│  └── logo.test.tsx           (~7 tests)                    │
└───────────────────┬───────────────────────────────────────┘
                    ▼
┌───────────────────────────────────────────────────────────┐
│  Step 2: 需要 Mock 第三方库的组件（P1-B）                    │
│  ├── scrollbar.test.tsx      (~5 tests)                    │
│  ├── chart.test.tsx          (~7 tests, mock ApexCharts)   │
│  └── chart-components.test.tsx (~9 tests)                  │
└───────────────────┬───────────────────────────────────────┘
                    ▼
┌───────────────────────────────────────────────────────────┐
│  Step 3: 需要 Mock API + 复杂交互（P1-C）                   │
│  ├── stock-search-autocomplete.test.tsx  (~10 tests)       │
│  └── sign-in-view.test.tsx               (~15 tests)       │
└───────────────────────────────────────────────────────────┘
```

### 依赖关系说明

| 步骤 | 依赖 | 说明 |
|------|------|------|
| Step 0 → Step 1 | `renderWithProviders` + Theme | Label/Logo styled 组件需要 ThemeProvider |
| Step 1 → Step 2 | Step 1 验证基础设施可用 | Chart/Scrollbar 需要额外 mock 第三方库 |
| Step 2 → Step 3 | 同上 + mock 模式成熟 | SignInView mock 较多，需要确立 mock 最佳实践 |

---

## 四、Mock 对照表

| 组件 | 需要 Mock 的模块 | Mock 方式 |
|------|-----------------|-----------|
| Label | 无 | — |
| Iconify | `@iconify/react` | `vi.mock()` → 返回虚拟 `<span>` |
| Logo | 无（需 Router + Theme） | `renderWithProviders` 已内置 |
| Scrollbar | `simplebar-react` | `vi.mock()` → 返回普通 `<div>` |
| Chart | `apexcharts` + `react-apexcharts` | `vi.mock()` → 静态对象 + 虚拟 `<div>` |
| ChartLoading | 无 | — |
| ChartLegends | 无 | — |
| StockSearch | `src/api/stock` | `vi.mock()` → mock `searchStocks` |
| SignInView | `src/api/auth` + `src/auth/context` + `src/routes/hooks` | `vi.mock()` × 3 |

---

## 五、全局 Setup 变更汇总

| 文件 | 变更内容 |
|------|---------|
| `src/test/test-utils.tsx` | 添加 `ThemeProvider` + `MemoryRouter` 包裹，支持 `initialEntries` 选项 |
| `src/test/setup.ts` | 添加 `ResizeObserver` / `IntersectionObserver` / `matchMedia` 全局 mock |
| `src/test/factories/stock.ts` | 新建 `createMockStockSearchItem` 工厂函数 |
| `src/test/factories/captcha.ts` | 新建 `createMockCaptchaResponse` 工厂函数 |

---

## 六、预期成果

| 指标 | Phase 1（已完成） | Phase 2（目标） |
|------|-------------------|-----------------|
| 测试文件数 | 11 | 11 + 9 = **20** |
| 测试用例数 | 143 | 143 + ~70 = **~213** |
| 覆盖率 | ~20% | **≥ 35%** |
| 覆盖模块 | utils / api / auth / permission | + components / sections/auth |

### 关键质量指标

- 所有 9 个测试文件 **零跳过**（不使用 `it.skip`）
- 异步测试必须使用 `waitFor` / `findBy*`，禁止裸 `setTimeout`
- 每个 `vi.mock()` 在 `beforeEach` 中 `vi.clearAllMocks()`
- 测试运行时间 < 15 秒（`npm test` 全量）

---

_创建日期：2026-04-13_
