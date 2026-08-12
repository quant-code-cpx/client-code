import { renderHook } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

import { useChart } from '../use-chart';

// ----------------------------------------------------------------------

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const theme = createTheme();
const originalMatchMedia = window.matchMedia;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation(
    (query: string): MediaQueryList =>
      ({
        matches: query === REDUCED_MOTION_QUERY && matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList
  );
}

describe('useChart reduced motion', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('disables all ApexCharts animation modes when reduced motion is preferred', () => {
    mockReducedMotion(true);

    const { result } = renderHook(
      () =>
        useChart({
          chart: {
            animations: {
              enabled: true,
              speed: 900,
              animateGradually: { enabled: true, delay: 300 },
              dynamicAnimation: { enabled: true, speed: 900 },
            },
          },
        }),
      { wrapper }
    );

    expect(window.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
    expect(result.current.chart?.animations).toMatchObject({
      enabled: false,
      animateGradually: { enabled: false },
      dynamicAnimation: { enabled: false },
    });
  });

  it('keeps explicit caller animation options when reduced motion is not preferred', () => {
    mockReducedMotion(false);

    const { result } = renderHook(
      () =>
        useChart({
          chart: {
            animations: {
              enabled: true,
              speed: 900,
              animateGradually: { enabled: false, delay: 25 },
              dynamicAnimation: { enabled: true, speed: 700 },
            },
          },
        }),
      { wrapper }
    );

    expect(result.current.chart?.animations).toMatchObject({
      enabled: true,
      speed: 900,
      animateGradually: { enabled: false, delay: 25 },
      dynamicAnimation: { enabled: true, speed: 700 },
    });
  });
});
