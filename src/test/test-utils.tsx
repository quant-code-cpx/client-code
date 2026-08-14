import type { ReactElement } from 'react';
import type { InitialEntry } from 'react-router';
import type { AuthContextValue } from 'src/auth/context';

import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

import { AuthContext } from 'src/auth/context';

// ----------------------------------------------------------------------

const defaultTheme = createTheme();

type RenderOptions = {
  initialEntries?: InitialEntry[];
  /** 注入 AuthContext 值，用于路由守卫等需要认证状态的测试 */
  authContext?: AuthContextValue;
};

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const { initialEntries = ['/'], authContext } = options ?? {};

  const content = authContext ? (
    <AuthContext.Provider value={authContext}>{ui}</AuthContext.Provider>
  ) : (
    ui
  );

  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider theme={defaultTheme}>
        <MemoryRouter initialEntries={initialEntries}>{content}</MemoryRouter>
      </ThemeProvider>
    ),
  };
}

export { render, userEvent };
