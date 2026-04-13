import { render, renderHook, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from 'src/test/test-utils';

import { ChartLoading } from '../components/chart-loading';
import { ChartLegends } from '../components/chart-legends';
import { useChart } from '../use-chart';

// ----------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// ----------------------------------------------------------------------

describe('useChart', () => {
  it('returns base chart options when called without arguments', () => {
    const { result } = renderHook(() => useChart(), { wrapper: Wrapper });
    expect(result.current.chart?.toolbar?.show).toBe(false);
    expect(result.current.chart?.zoom?.enabled).toBe(false);
    expect(result.current.dataLabels?.enabled).toBe(false);
  });

  it('merges caller overrides over the base options', () => {
    const { result } = renderHook(
      () => useChart({ chart: { toolbar: { show: true } } }),
      { wrapper: Wrapper }
    );
    expect(result.current.chart?.toolbar?.show).toBe(true);
    // Other base options are preserved
    expect(result.current.chart?.zoom?.enabled).toBe(false);
  });

  it('merges xaxis override without losing base yaxis config', () => {
    const { result } = renderHook(
      () => useChart({ xaxis: { categories: ['Jan', 'Feb', 'Mar'] } }),
      { wrapper: Wrapper }
    );
    expect(result.current.xaxis?.categories).toEqual(['Jan', 'Feb', 'Mar']);
    expect(result.current.yaxis).toBeDefined();
  });

  it('returns stroke width 2.5 from base config', () => {
    const { result } = renderHook(() => useChart(), { wrapper: Wrapper });
    expect((result.current.stroke as { width: number }).width).toBe(2.5);
  });

  it('override plotOptions preserves base config', () => {
    const { result } = renderHook(
      () => useChart({ plotOptions: { bar: { columnWidth: '28%' } } }),
      { wrapper: Wrapper }
    );
    expect((result.current.plotOptions?.bar as { columnWidth: string }).columnWidth).toBe('28%');
  });
});

// ----------------------------------------------------------------------

describe('ChartLoading', () => {
  it('renders for non-circular chart types with inherit border radius', () => {
    const { container } = renderWithTheme(<ChartLoading type="bar" />);
    const el = container.querySelector('[class*="chart__loading"]');
    expect(el).toBeInTheDocument();
  });

  it('renders for circular chart type (donut)', () => {
    const { container } = renderWithTheme(<ChartLoading type="donut" />);
    const el = container.querySelector('[class*="chart__loading"]');
    expect(el).toBeInTheDocument();
  });

  it('renders for pie type', () => {
    const { container } = renderWithTheme(<ChartLoading type="pie" />);
    const el = container.querySelector('[class*="chart__loading"]');
    expect(el).toBeInTheDocument();
  });

  it('renders for radialBar type', () => {
    const { container } = renderWithTheme(<ChartLoading type="radialBar" />);
    const el = container.querySelector('[class*="chart__loading"]');
    expect(el).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(<ChartLoading type="line" className="my-loading" />);
    const el = container.querySelector('.my-loading');
    expect(el).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('ChartLegends', () => {
  const defaultProps = {
    labels: ['Series A', 'Series B'],
    colors: ['#ff0000', '#00ff00'],
    values: ['1,234', '5,678'],
  };

  it('renders all label items', () => {
    renderWithTheme(<ChartLegends {...defaultProps} />);
    expect(screen.getByText('Series A')).toBeInTheDocument();
    expect(screen.getByText('Series B')).toBeInTheDocument();
  });

  it('renders all values', () => {
    renderWithTheme(<ChartLegends {...defaultProps} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('5,678')).toBeInTheDocument();
  });

  it('renders sublabels when provided', () => {
    const { container } = renderWithTheme(
      <ChartLegends
        {...defaultProps}
        sublabels={['(Q1)', '(Q2)']}
      />
    );
    // Sublabels appear as text nodes adjacent to the label text — check raw HTML
    expect(container.innerHTML).toContain('(Q1)');
    expect(container.innerHTML).toContain('(Q2)');
  });

  it('renders custom icons when provided', () => {
    renderWithTheme(
      <ChartLegends
        {...defaultProps}
        icons={[
          <span key="icon-a" data-testid="icon-a" />,
          <span key="icon-b" data-testid="icon-b" />,
        ]}
      />
    );
    expect(screen.getByTestId('icon-a')).toBeInTheDocument();
    expect(screen.getByTestId('icon-b')).toBeInTheDocument();
  });

  it('renders dot elements when no icons provided', () => {
    const { container } = renderWithTheme(<ChartLegends {...defaultProps} />);
    const dots = container.querySelectorAll('[class*="chart__legends__item__dot"]');
    expect(dots).toHaveLength(2);
  });

  it('renders with empty labels without crashing', () => {
    const { container } = renderWithTheme(<ChartLegends labels={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies legends root class', () => {
    const { container } = renderWithTheme(<ChartLegends {...defaultProps} />);
    const el = container.querySelector('[class*="chart__legends__root"]');
    expect(el).toBeInTheDocument();
  });
});
