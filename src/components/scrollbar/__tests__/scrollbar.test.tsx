import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

// Mock simplebar-react — jsdom has no native scrollbar/resize support
vi.mock('simplebar-react', () => ({
  default: vi.fn(
    ({
      children,
      className,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => (
      <div data-testid="simplebar" className={className} {...rest}>
        {children}
      </div>
    )
  ),
}));

// Must import after vi.mock() hoisting
import { Scrollbar } from '../scrollbar';
import { scrollbarClasses } from '../classes';

// ----------------------------------------------------------------------

describe('Scrollbar', () => {
  it('渲染子内容', () => {
    renderWithProviders(
      <Scrollbar>
        <p>Hello scrollbar</p>
      </Scrollbar>
    );
    expect(screen.getByText('Hello scrollbar')).toBeInTheDocument();
  });

  it('携带根类名 scrollbarClasses.root', () => {
    renderWithProviders(<Scrollbar>content</Scrollbar>);
    const root = screen.getByTestId('simplebar');
    expect(root.className).toContain(scrollbarClasses.root);
  });

  it('透传自定义 className 并合并内置 class', () => {
    renderWithProviders(<Scrollbar className="custom-scroll">content</Scrollbar>);
    const root = screen.getByTestId('simplebar');
    expect(root.className).toContain('custom-scroll');
    expect(root.className).toContain(scrollbarClasses.root);
  });

  it('fillContent=true（默认）渲染不崩溃', () => {
    const { container } = renderWithProviders(<Scrollbar fillContent>content</Scrollbar>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('fillContent=false 渲染不崩溃', () => {
    const { container } = renderWithProviders(<Scrollbar fillContent={false}>content</Scrollbar>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('透传 sx prop 不崩溃', () => {
    const { container } = renderWithProviders(<Scrollbar sx={{ height: 300 }}>content</Scrollbar>);
    expect(container.firstChild).toBeInTheDocument();
  });
});
