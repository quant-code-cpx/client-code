import type { ReactElement } from 'react';

import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

// ----------------------------------------------------------------------

const theme = createTheme();

/**
 * 自定义 render，后续可扩展 Provider 包裹（Theme / Auth / Router 等）
 */
export function renderWithProviders(ui: ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  };
}

/**
 * 包裹 MUI ThemeProvider，用于渲染需要主题的组件
 */
export function renderWithTheme(ui: ReactElement, { initialEntries = ['/'] } = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider theme={theme}>{ui}</ThemeProvider>
      </MemoryRouter>
    ),
  };
}

export { render, userEvent, theme };
