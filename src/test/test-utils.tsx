import type { ReactElement } from 'react';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ----------------------------------------------------------------------

/**
 * 自定义 render，后续可扩展 Provider 包裹（Theme / Auth / Router 等）
 */
export function renderWithProviders(ui: ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  };
}

export { render, userEvent };
