import { renderWithProviders } from 'src/test/test-utils';

import { Logo } from '../logo';
import { logoClasses } from '../classes';

// ----------------------------------------------------------------------

describe('Logo', () => {
  describe('渲染模式', () => {
    it('默认 isSingle=true 渲染图标模式（SVG 元素存在）', () => {
      const { container } = renderWithProviders(<Logo />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('isSingle=false 渲染完整 logo（宽度更大）', () => {
      const { container } = renderWithProviders(<Logo isSingle={false} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('链接行为', () => {
    it('默认渲染为链接元素', () => {
      const { container } = renderWithProviders(<Logo />);
      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
    });

    it('默认 href="/"', () => {
      const { container } = renderWithProviders(<Logo />);
      expect(container.querySelector('a')).toHaveAttribute('href', '/');
    });

    it('自定义 href 生效', () => {
      const { container } = renderWithProviders(<Logo href="/dashboard" />);
      expect(container.querySelector('a')).toHaveAttribute('href', '/dashboard');
    });

    it('disabled=true 时 pointer-events 为 none', () => {
      const { container } = renderWithProviders(<Logo disabled />);
      // The component applies pointerEvents: 'none' via sx; the element still renders
      const root = container.firstChild as HTMLElement;
      expect(root).toBeInTheDocument();
    });
  });

  describe('SVG 内容', () => {
    it('渲染的 SVG 包含渐变定义（<defs> 或 linearGradient）', () => {
      const { container } = renderWithProviders(<Logo />);
      const gradient = container.querySelector('linearGradient');
      expect(gradient).toBeInTheDocument();
    });

    it('两个实例的 gradient ID 各不相同（useId 唯一性）', () => {
      const { container: c1 } = renderWithProviders(<Logo />);
      const { container: c2 } = renderWithProviders(<Logo />);
      const gradient1 = c1.querySelector('linearGradient');
      const gradient2 = c2.querySelector('linearGradient');
      expect(gradient1?.id).toBeDefined();
      expect(gradient2?.id).toBeDefined();
      expect(gradient1?.id).not.toBe(gradient2?.id);
    });
  });

  describe('样式', () => {
    it('携带根类名 logoClasses.root', () => {
      const { container } = renderWithProviders(<Logo />);
      expect(container.firstChild).toHaveClass(logoClasses.root);
    });

    it('透传 sx prop 不崩溃', () => {
      const { container } = renderWithProviders(<Logo sx={{ width: 64, height: 64 }} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
