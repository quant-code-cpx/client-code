import { renderHook } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';
import { renderWithProviders } from 'src/test/test-utils';

// Mock apexcharts (dynamic import + constructor) — jsdom has no canvas/SVG engine
vi.mock('apexcharts', () => {
  const ApexChartsMock = vi.fn().mockImplementation(() => ({
    render: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    updateOptions: vi.fn(),
    updateSeries: vi.fn(),
  }));
  (ApexChartsMock as unknown as Record<string, unknown>).getChartByID = vi.fn();
  (ApexChartsMock as unknown as Record<string, unknown>).exec = vi.fn();
  return { default: ApexChartsMock };
});

// Must import after vi.mock
import { Chart } from '../chart';
import { useChart } from '../use-chart';
import { chartClasses } from '../classes';

// ----------------------------------------------------------------------

const theme = createTheme();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('useChart', () => {
  it('返回包含 chart / colors / grid / tooltip 等核心配置', () => {
    const { result } = renderHook(() => useChart(), { wrapper });
    const opts = result.current;
    expect(opts).toHaveProperty('chart');
    expect(opts).toHaveProperty('colors');
    expect(opts).toHaveProperty('grid');
    expect(opts).toHaveProperty('tooltip');
    expect(opts).toHaveProperty('legend');
  });

  it('默认禁用 toolbar', () => {
    const { result } = renderHook(() => useChart(), { wrapper });
    expect((result.current!.chart as { toolbar: { show: boolean } }).toolbar.show).toBe(false);
  });

  it('默认禁用 zoom', () => {
    const { result } = renderHook(() => useChart(), { wrapper });
    expect((result.current!.chart as { zoom: { enabled: boolean } }).zoom.enabled).toBe(false);
  });

  it('调色盘包含 9 种颜色', () => {
    const { result } = renderHook(() => useChart(), { wrapper });
    expect(Array.isArray(result.current!.colors)).toBe(true);
    expect((result.current!.colors as string[]).length).toBe(9);
  });

  it('合并用户自定义选项（覆盖 toolbar.show）', () => {
    const { result } = renderHook(() => useChart({ chart: { toolbar: { show: true } } }), {
      wrapper,
    });
    expect((result.current!.chart as { toolbar: { show: boolean } }).toolbar.show).toBe(true);
  });

  it('合并后其余默认值仍保留', () => {
    const { result } = renderHook(() => useChart({ chart: { toolbar: { show: true } } }), {
      wrapper,
    });
    // zoom 保持原默认
    expect((result.current!.chart as { zoom: { enabled: boolean } }).zoom.enabled).toBe(false);
  });

  it('稳定的输入引用复用合并后的配置', () => {
    const updatedOptions = { chart: { toolbar: { show: true } } };
    const { result, rerender } = renderHook(() => useChart(updatedOptions), { wrapper });
    const firstOptions = result.current;

    rerender();

    expect(result.current).toBe(firstOptions);
  });
});

describe('Chart 组件', () => {
  it('渲染根容器并携带 chartClasses.root', () => {
    const { container } = renderWithProviders(
      <Chart type="line" series={[{ name: 'A', data: [1, 2, 3] }]} options={{}} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.className).toContain(chartClasses.root);
  });

  it('初始渲染时显示 ChartLoading 骨架（isReady=false）', () => {
    const { container } = renderWithProviders(<Chart type="line" series={[]} options={{}} />);
    // ChartLoading renders a MuiSkeleton while chart is not yet ready
    const skeleton = container.querySelector('.MuiSkeleton-root');
    expect(skeleton).toBeInTheDocument();
  });

  it('透传 sx prop 不崩溃', () => {
    const { container } = renderWithProviders(
      <Chart type="bar" series={[]} options={{}} sx={{ height: 400 }} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('渲染 type="donut" 不崩溃', () => {
    const { container } = renderWithProviders(
      <Chart type="donut" series={[44, 55]} options={{}} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
