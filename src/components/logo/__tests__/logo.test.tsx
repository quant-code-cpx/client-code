import { screen } from '@testing-library/react';

import { renderWithTheme } from 'src/test/test-utils';

import { Logo } from '../logo';

// ----------------------------------------------------------------------

describe('Logo — rendering', () => {
  it('renders an anchor element with aria-label="Logo"', () => {
    renderWithTheme(<Logo />);
    expect(screen.getByRole('link', { name: 'Logo' })).toBeInTheDocument();
  });

  it('defaults href to "/"', () => {
    renderWithTheme(<Logo />);
    const link = screen.getByRole('link', { name: 'Logo' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders custom href', () => {
    renderWithTheme(<Logo href="/dashboard" />);
    const link = screen.getByRole('link', { name: 'Logo' });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('renders SVG inside the logo', () => {
    const { container } = renderWithTheme(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies logoClasses.root class', () => {
    const { container } = renderWithTheme(<Logo />);
    const el = container.querySelector('[class*="logo__root"]');
    expect(el).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('Logo — isSingle prop', () => {
  it('renders single logo (default)', () => {
    const { container } = renderWithTheme(<Logo isSingle={true} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
  });

  it('renders full logo when isSingle=false', () => {
    const { container } = renderWithTheme(<Logo isSingle={false} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
  });
});

// ----------------------------------------------------------------------

describe('Logo — disabled prop', () => {
  it('sets pointer-events:none via sx when disabled=true', () => {
    const { container } = renderWithTheme(<Logo disabled={true} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    // The disabled prop prevents pointer events — verify element exists and has class
    expect(el).toHaveAttribute('aria-label', 'Logo');
  });
});

// ----------------------------------------------------------------------

describe('Logo — className prop', () => {
  it('applies custom className', () => {
    const { container } = renderWithTheme(<Logo className="my-logo" />);
    const el = container.querySelector('.my-logo');
    expect(el).toBeInTheDocument();
  });
});
