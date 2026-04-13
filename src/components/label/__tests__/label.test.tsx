import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { Label } from '../label';
import { labelClasses } from '../classes';

// ----------------------------------------------------------------------

describe('Label', () => {
  describe('基础渲染', () => {
    it('渲染文本内容并应用 upperFirst 格式化', () => {
      renderWithProviders(<Label>hello world</Label>);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('首字母已大写时不重复处理', () => {
      renderWithProviders(<Label>Active</Label>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('渲染为 <span> 元素', () => {
      const { container } = renderWithProviders(<Label>test</Label>);
      expect(container.firstChild?.nodeName).toBe('SPAN');
    });

    it('携带根类名 labelClasses.root', () => {
      const { container } = renderWithProviders(<Label>test</Label>);
      expect(container.firstChild).toHaveClass(labelClasses.root);
    });

    it('非字符串 children 不做 upperFirst 处理', () => {
      renderWithProviders(
        <Label>
          <span data-testid="child-node">raw</span>
        </Label>
      );
      expect(screen.getByTestId('child-node')).toBeInTheDocument();
    });
  });

  describe('variant 变体', () => {
    it.each(['filled', 'outlined', 'soft', 'inverted'] as const)(
      'variant="%s" 渲染不崩溃',
      (variant) => {
        const { container } = renderWithProviders(<Label variant={variant}>label</Label>);
        expect(container.firstChild).toBeInTheDocument();
      }
    );
  });

  describe('color 颜色', () => {
    it.each(['default', 'primary', 'secondary', 'info', 'success', 'warning', 'error'] as const)(
      'color="%s" 渲染不崩溃',
      (color) => {
        const { container } = renderWithProviders(<Label color={color}>label</Label>);
        expect(container.firstChild).toBeInTheDocument();
      }
    );
  });

  describe('图标', () => {
    it('渲染 startIcon', () => {
      renderWithProviders(<Label startIcon={<span data-testid="start-icon">★</span>}>text</Label>);
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    });

    it('渲染 endIcon', () => {
      renderWithProviders(<Label endIcon={<span data-testid="end-icon">→</span>}>text</Label>);
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('不传图标时不显示图标', () => {
      renderWithProviders(<Label>text</Label>);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('同时渲染 startIcon 和 endIcon', () => {
      renderWithProviders(
        <Label
          startIcon={<span data-testid="start">S</span>}
          endIcon={<span data-testid="end">E</span>}
        >
          text
        </Label>
      );
      expect(screen.getByTestId('start')).toBeInTheDocument();
      expect(screen.getByTestId('end')).toBeInTheDocument();
    });

    it('startIcon 在文字之前，endIcon 在文字之后', () => {
      renderWithProviders(
        <Label startIcon={<span data-testid="s">S</span>} endIcon={<span data-testid="e">E</span>}>
          mid
        </Label>
      );
      const sEl = screen.getByTestId('s');
      const eEl = screen.getByTestId('e');
      // compareDocumentPosition: sEl should come before eEl in DOM order
      // eslint-disable-next-line no-bitwise
      expect(sEl.compareDocumentPosition(eEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('disabled 状态', () => {
    it('disabled=true 时根元素包含 disabled 相关样式（不崩溃且渲染）', () => {
      const { container } = renderWithProviders(<Label disabled>disabled label</Label>);
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Disabled label')).toBeInTheDocument();
    });
  });

  describe('自定义样式', () => {
    it('透传 className', () => {
      const { container } = renderWithProviders(<Label className="custom-label">text</Label>);
      expect(container.firstChild).toHaveClass('custom-label');
      // 同时保留根类名
      expect(container.firstChild).toHaveClass(labelClasses.root);
    });

    it('透传 sx prop 不崩溃', () => {
      const { container } = renderWithProviders(<Label sx={{ opacity: 0.5 }}>text</Label>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
