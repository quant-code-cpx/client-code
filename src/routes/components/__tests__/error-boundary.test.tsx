import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from 'src/test/test-utils';

import { ErrorBoundary } from '../error-boundary';

// ----------------------------------------------------------------------
// vi.mock is hoisted — declare mock fns with vi.hoisted() so they're
// available both in the factory and in test assertions.
// ----------------------------------------------------------------------

const { mockUseRouteErrorFn, mockIsRouteErrorResponseFn } = vi.hoisted(() => ({
  mockUseRouteErrorFn: vi.fn(),
  mockIsRouteErrorResponseFn: vi.fn<typeof import('react-router').isRouteErrorResponse>(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useRouteError: mockUseRouteErrorFn,
    isRouteErrorResponse: mockIsRouteErrorResponseFn,
  };
});

beforeEach(() => {
  mockIsRouteErrorResponseFn.mockReturnValue(false);
  mockUseRouteErrorFn.mockReset();
});

function renderErrorBoundary() {
  return render(
    <ThemeProvider theme={theme}>
      <ErrorBoundary />
    </ThemeProvider>
  );
}

// ----------------------------------------------------------------------

describe('ErrorBoundary — standard Error', () => {
  it('renders "Unexpected Application Error!" title', () => {
    mockUseRouteErrorFn.mockReturnValue(new Error('something broke'));
    renderErrorBoundary();
    const titleEl = document.querySelector('.error-boundary-title');
    expect(titleEl?.textContent).toBe('Unexpected Application Error!');
  });

  it('renders the error message in the message paragraph', () => {
    mockUseRouteErrorFn.mockReturnValue(new Error('database connection failed'));
    renderErrorBoundary();
    const msgEl = document.querySelector('.error-boundary-message');
    expect(msgEl?.textContent).toContain('database connection failed');
  });

  it('renders a <pre> element for the stack trace', () => {
    mockUseRouteErrorFn.mockReturnValue(new Error('test error with stack'));
    renderErrorBoundary();
    expect(document.querySelector('pre')).toBeInTheDocument();
  });

  it('renders error name (TypeError) in the message element', () => {
    mockUseRouteErrorFn.mockReturnValue(new TypeError('invalid argument'));
    renderErrorBoundary();
    const msgEl = document.querySelector('.error-boundary-message');
    expect(msgEl?.textContent).toContain('TypeError');
    expect(msgEl?.textContent).toContain('invalid argument');
  });

  it('renders title element with correct class', () => {
    mockUseRouteErrorFn.mockReturnValue(new Error('boom'));
    renderErrorBoundary();
    const titleEl = document.querySelector('.error-boundary-title');
    expect(titleEl?.textContent).toBe('Unexpected Application Error!');
  });
});

// ----------------------------------------------------------------------

describe('ErrorBoundary — route error response (4xx/5xx)', () => {
  it('renders status + statusText for a 404 route error response', () => {
    const routeErr = { status: 404, statusText: 'Not Found', data: 'The page does not exist', internal: false };
    mockIsRouteErrorResponseFn.mockReturnValue(true);
    mockUseRouteErrorFn.mockReturnValue(routeErr);
    renderErrorBoundary();
    const titleEl = document.querySelector('.error-boundary-title');
    expect(titleEl?.textContent).toContain('404');
    expect(titleEl?.textContent).toContain('Not Found');
  });

  it('renders error.data in the message element for route errors', () => {
    const routeErr = { status: 403, statusText: 'Forbidden', data: 'Access denied', internal: false };
    mockIsRouteErrorResponseFn.mockReturnValue(true);
    mockUseRouteErrorFn.mockReturnValue(routeErr);
    renderErrorBoundary();
    const msgEl = document.querySelector('.error-boundary-message');
    expect(msgEl?.textContent).toBe('Access denied');
  });
});

// ----------------------------------------------------------------------

describe('ErrorBoundary — unknown error', () => {
  it('renders "Unknown Error" for a plain string error', () => {
    mockUseRouteErrorFn.mockReturnValue('a string error');
    renderErrorBoundary();
    const titleEl = document.querySelector('.error-boundary-title');
    expect(titleEl?.textContent).toBe('Unknown Error');
  });

  it('renders "Unknown Error" for null', () => {
    mockUseRouteErrorFn.mockReturnValue(null);
    renderErrorBoundary();
    const titleEl = document.querySelector('.error-boundary-title');
    expect(titleEl?.textContent).toBe('Unknown Error');
  });

  it('renders "Unknown Error" for a plain object', () => {
    mockUseRouteErrorFn.mockReturnValue({ code: 500 });
    renderErrorBoundary();
    const titleEl = document.querySelector('.error-boundary-title');
    expect(titleEl?.textContent).toBe('Unknown Error');
  });
});
