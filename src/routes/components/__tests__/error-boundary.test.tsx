import { render, screen } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { ErrorBoundary } from 'src/routes/components/error-boundary';

import { createTheme } from 'src/theme/create-theme';

// ----------------------------------------------------------------------

const { mockUseRouteError } = vi.hoisted(() => ({
  mockUseRouteError: vi.fn(),
}));

// Keep the real isRouteErrorResponse; only mock useRouteError
vi.mock('react-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useRouteError: () => mockUseRouteError() };
});

// ----------------------------------------------------------------------

const theme = createTheme();

/**
 * isRouteErrorResponse checks for:
 * { status: number, statusText: string, internal: boolean, data: any }
 */
function makeHttpError(status: number, statusText: string, data: string) {
  return { status, statusText, internal: false, data };
}

function renderWithError(error: unknown) {
  mockUseRouteError.mockReturnValue(error);
  return render(
    <ThemeProvider theme={theme}>
      <ErrorBoundary />
    </ThemeProvider>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

// ----------------------------------------------------------------------

describe('ErrorBoundary', () => {
  describe('Route Error Response（HTTP 错误）', () => {
    it('渲染 HTTP 状态码和 statusText', () => {
      renderWithError(makeHttpError(404, 'Not Found', 'Page not found'));

      expect(screen.getByText('404: Not Found')).toBeInTheDocument();
    });

    it('渲染 error.data 消息体', () => {
      renderWithError(makeHttpError(404, 'Not Found', 'The requested resource does not exist'));

      expect(screen.getByText('404: Not Found')).toBeInTheDocument();
      expect(screen.getByText('The requested resource does not exist')).toBeInTheDocument();
    });
  });

  describe('Error 实例', () => {
    it('渲染错误标题 "Unexpected Application Error!"', () => {
      renderWithError(new Error('something broke'));

      expect(screen.getByText('Unexpected Application Error!')).toBeInTheDocument();
    });

    it('渲染错误名和消息', () => {
      renderWithError(new Error('something broke'));

      expect(screen.getByText('Error: something broke')).toBeInTheDocument();
    });

    it('渲染完整堆栈（pre 元素）', () => {
      renderWithError(new Error('stack test'));

      const pre = document.querySelector('pre');
      expect(pre).not.toBeNull();
      expect(pre?.textContent).toContain('Error: stack test');
    });

    it('从堆栈中解析 /src/ 路径并展示', () => {
      const err = new Error('parse path test');
      err.stack =
        'Error: parse path test\n    at handleSignIn (/src/sections/auth/sign-in-view.tsx:42:15)';
      renderWithError(err);

      const filePathEl = document.querySelector('.error-boundary-file-path');
      expect(filePathEl).not.toBeNull();
      expect(filePathEl?.textContent).toContain('/src/sections/auth/sign-in-view.tsx');
    });

    it('从堆栈中解析函数名并展示', () => {
      const err = new Error('parse fn test');
      err.stack =
        'Error: parse fn test\n    at handleSignIn (/src/sections/auth/sign-in-view.tsx:42:15)';
      renderWithError(err);

      const filePathEl = document.querySelector('.error-boundary-file-path');
      expect(filePathEl?.textContent).toContain('handleSignIn');
    });

    it('堆栈中无 /src/ 路径时不渲染文件路径区域', () => {
      // A one-line stack with no 'at' means both filePath and functionName are null
      const err = new Error('no src path');
      err.stack = 'Error: no src path';
      renderWithError(err);

      expect(screen.getByText('Unexpected Application Error!')).toBeInTheDocument();
      expect(document.querySelector('.error-boundary-file-path')).toBeNull();
    });
  });

  describe('未知错误', () => {
    it('非 Error 非 Response 时显示 "Unknown Error"', () => {
      renderWithError('just a string error');

      expect(screen.getByText('Unknown Error')).toBeInTheDocument();
    });
  });
});
