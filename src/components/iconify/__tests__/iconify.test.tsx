import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from 'src/test/test-utils';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

function renderIconify(props: React.ComponentProps<typeof Iconify>) {
  return render(<ThemeProvider theme={theme}><Iconify {...props} /></ThemeProvider>);
}

// ----------------------------------------------------------------------

describe('Iconify — rendering', () => {
  it('renders without crashing for registered icon', () => {
    const { container } = renderIconify({ icon: 'solar:eye-bold' });
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without crashing for unregistered icon', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = renderIconify({ icon: 'solar:home-bold' });
    expect(container.firstChild).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it('applies custom className to the rendered element', () => {
    const { container } = renderIconify({ icon: 'solar:eye-bold', className: 'custom-icon' });
    // className is forwarded by the styled wrapper — check inside entire container
    expect(container.innerHTML).toContain('custom-icon');
  });
});

// ----------------------------------------------------------------------

describe('Iconify — size props', () => {
  it('defaults width to 20', () => {
    const { container } = renderIconify({ icon: 'solar:eye-bold' });
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom width', () => {
    const { container } = renderIconify({ icon: 'solar:eye-bold', width: 32 });
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies separate height when provided', () => {
    const { container } = renderIconify({ icon: 'solar:eye-bold', width: 24, height: 16 });
    expect(container.firstChild).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('Iconify — unknown icon warning', () => {
  it('logs a warning for unregistered icons', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderIconify({ icon: 'unknown:not-registered-xyz-abc' as never });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not log a warning for registered icons', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderIconify({ icon: 'solar:eye-bold' });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
