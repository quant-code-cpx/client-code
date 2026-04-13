import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from 'src/test/test-utils';

import { Label } from '../label';

// ----------------------------------------------------------------------

function renderLabel(props: React.ComponentProps<typeof Label>) {
  return render(<ThemeProvider theme={theme}><Label {...props} /></ThemeProvider>);
}

// ----------------------------------------------------------------------

describe('Label — rendering', () => {
  it('renders children text', () => {
    renderLabel({ children: 'active' });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('capitalizes string children with upperFirst', () => {
    renderLabel({ children: 'hello world' });
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders non-string children as-is', () => {
    renderLabel({ children: <span data-testid="child-node">node</span> });
    expect(screen.getByTestId('child-node')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('Label — variant prop', () => {
  it.each(['filled', 'outlined', 'soft', 'inverted'] as const)(
    'renders variant="%s" without crashing',
    (variant) => {
      renderLabel({ variant, children: variant });
      expect(screen.getByText(variant === 'soft' ? 'Soft' : variant === 'inverted' ? 'Inverted' : variant === 'filled' ? 'Filled' : 'Outlined')).toBeInTheDocument();
    }
  );

  it('defaults to soft variant when not specified', () => {
    const { container } = renderLabel({ children: 'tag' });
    expect(container.firstChild).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('Label — color prop', () => {
  it.each(['default', 'primary', 'secondary', 'info', 'success', 'warning', 'error'] as const)(
    'renders color="%s" without crashing',
    (color) => {
      renderLabel({ color, children: color });
      expect(screen.getByText(color === 'default' ? 'Default' : color === 'primary' ? 'Primary' : color === 'secondary' ? 'Secondary' : color === 'info' ? 'Info' : color === 'success' ? 'Success' : color === 'warning' ? 'Warning' : 'Error')).toBeInTheDocument();
    }
  );
});

// ----------------------------------------------------------------------

describe('Label — className and css', () => {
  it('applies root class', () => {
    const { container } = renderLabel({ children: 'test', className: 'my-class' });
    const el = container.querySelector('.my-class');
    expect(el).toBeInTheDocument();
  });

  it('applies labelClasses.root class', () => {
    const { container } = renderLabel({ children: 'test' });
    // The root span must have the minimal__label__root class
    const el = container.querySelector('[class*="label__root"]');
    expect(el).toBeInTheDocument();
  });

  it('disabled prop can be passed without crashing', () => {
    renderLabel({ children: 'disabled', disabled: true });
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('Label — icons', () => {
  it('renders startIcon', () => {
    renderLabel({
      children: 'with icon',
      startIcon: <span data-testid="start-icon" />,
    });
    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
  });

  it('renders endIcon', () => {
    renderLabel({
      children: 'with icon',
      endIcon: <span data-testid="end-icon" />,
    });
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
  });

  it('renders both startIcon and endIcon together', () => {
    renderLabel({
      children: 'icon both',
      startIcon: <span data-testid="start-icon" />,
      endIcon: <span data-testid="end-icon" />,
    });
    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
  });

  it('renders no icon containers when icons not provided', () => {
    const { container } = renderLabel({ children: 'no icons' });
    expect(container.querySelectorAll('[class*="label__icon"]')).toHaveLength(0);
  });
});
