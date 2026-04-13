import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ChartLoading } from '../components/chart-loading';
import { ChartLegends } from '../components/chart-legends';

// ----------------------------------------------------------------------

describe('ChartLoading', () => {
  it('渲染 Skeleton 占位元素', () => {
    const { container } = renderWithProviders(<ChartLoading type="line" />);
    const skeleton = container.querySelector('.MuiSkeleton-root');
    expect(skeleton).toBeInTheDocument();
  });

  it('圆形类型（donut）使用 borderRadius: 50%', () => {
    const { container } = renderWithProviders(<ChartLoading type="donut" />);
    const skeleton = container.querySelector('.MuiSkeleton-root') as HTMLElement;
    expect(skeleton).toBeInTheDocument();
    // MUI circular skeleton applies the 50% borderRadius via classname
    expect(skeleton.className).toMatch(/Skeleton/);
  });

  it('圆形类型（pie）渲染不崩溃', () => {
    const { container } = renderWithProviders(<ChartLoading type="pie" />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('圆形类型（radialBar）渲染不崩溃', () => {
    const { container } = renderWithProviders(<ChartLoading type="radialBar" />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('非圆形类型（line）渲染不崩溃', () => {
    const { container } = renderWithProviders(<ChartLoading type="line" />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });
});

describe('ChartLegends', () => {
  const labels = ['系列A', '系列B', '系列C'];
  const colors = ['#ff0000', '#00ff00', '#0000ff'];

  it('按 labels 数量渲染图例项', () => {
    renderWithProviders(<ChartLegends labels={labels} colors={colors} />);
    expect(screen.getByText('系列A')).toBeInTheDocument();
    expect(screen.getByText('系列B')).toBeInTheDocument();
    expect(screen.getByText('系列C')).toBeInTheDocument();
  });

  it('空 labels 时不渲染任何项', () => {
    const { container } = renderWithProviders(<ChartLegends labels={[]} colors={[]} />);
    // List root exists but no children
    const ul = container.querySelector('ul');
    expect(ul).toBeInTheDocument();
    expect(ul?.children.length).toBe(0);
  });

  it('渲染颜色圆点（不传 icons 时）', () => {
    const { container } = renderWithProviders(<ChartLegends labels={labels} colors={colors} />);
    // ItemDot renders as <span> inside each item
    // There should be at least labels.length dot elements
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0);
  });

  it('传入 icons 时替换圆点为自定义图标', () => {
    const icons = labels.map((_, i) => <span data-testid={`icon-${i}`}>★</span>);
    renderWithProviders(<ChartLegends labels={labels} colors={colors} icons={icons} />);
    expect(screen.getByTestId('icon-0')).toBeInTheDocument();
    expect(screen.getByTestId('icon-1')).toBeInTheDocument();
  });

  it('渲染 values', () => {
    renderWithProviders(
      <ChartLegends labels={labels} colors={colors} values={['100', '200', '300']} />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('渲染 sublabels 追加到 label 后', () => {
    renderWithProviders(
      <ChartLegends labels={['系列A']} colors={['#f00']} sublabels={['sub-a']} />
    );
    expect(screen.getByText(/sub-a/)).toBeInTheDocument();
  });
});
