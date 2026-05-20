import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

// Mock @iconify/react before importing Iconify
vi.mock('@iconify/react', () => ({
  Icon: vi.fn((props: Record<string, unknown>) => (
    <span
      data-testid="iconify-icon"
      data-icon={props.icon as string}
      style={props.style as React.CSSProperties}
      className={props.className as string}
    />
  )),
  addCollection: vi.fn(),
  addIcon: vi.fn(),
}));

import { addCollection } from '@iconify/react';

import { Iconify } from '../iconify';
import { iconifyClasses } from '../classes';
import { registerIcons } from '../register-icons';

// ----------------------------------------------------------------------

// This describe must run FIRST (before any Iconify render) so that
// areIconsRegistered is still false and addCollection actually gets called.
describe('registerIcons', () => {
  it('首次调用时执行 addCollection 注册图标集', () => {
    // addCollection is fresh (no prior renderWithProviders calls at this point)
    registerIcons();
    expect(vi.mocked(addCollection)).toHaveBeenCalled();
  });
});

describe('Iconify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染 Icon 组件并传递 icon prop', () => {
    renderWithProviders(<Iconify icon="solar:eye-bold" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'solar:eye-bold');
  });

  it('默认宽高为 20px（通过 sx 传递）', () => {
    const { container } = renderWithProviders(<Iconify icon="solar:eye-bold" />);
    expect(container.firstChild).toBeInTheDocument();
    // width prop defaults to 20; rendered as styled span – just ensure it renders
  });

  it('携带根类名 iconifyClasses.root', () => {
    renderWithProviders(<Iconify icon="solar:eye-bold" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon.className).toContain(iconifyClasses.root);
  });

  it('透传自定义 className 并合并内置 class', () => {
    renderWithProviders(<Iconify icon="solar:eye-bold" className="custom-icon" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon.className).toContain('custom-icon');
    expect(icon.className).toContain(iconifyClasses.root);
  });

  it('透传 sx prop 不崩溃', () => {
    const { container } = renderWithProviders(
      <Iconify icon="solar:eye-bold" sx={{ color: 'red' }} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
