/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { FactorDef } from 'src/api/factor';

import userEvent from '@testing-library/user-event';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Link, Route, Routes, MemoryRouter } from 'react-router-dom';

import { ThemeProvider } from '@mui/material/styles';

import { factorApi } from 'src/api/factor';
import { createTheme } from 'src/theme/create-theme';

import { FactorDetailView } from '../factor-detail-view';

vi.mock('src/api/factor', () => ({ factorApi: { detail: vi.fn() } }));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

vi.mock('src/sections/factor/factor-backtest-panel', () => ({ FactorBacktestPanel: () => null }));
vi.mock('src/sections/factor/factor-detail-ic-chart', () => ({ FactorDetailIcChart: () => null }));
vi.mock('src/sections/factor/factor-detail-decay-chart', () => ({ FactorDetailDecayChart: () => null }));
vi.mock('src/sections/factor/factor-detail-params-panel', () => ({
  FactorDetailParamsPanel: () => null,
}));
vi.mock('src/sections/factor/factor-detail-quantile-chart', () => ({
  FactorDetailQuantileChart: () => null,
}));
vi.mock('src/sections/factor/factor-detail-distribution-chart', () => ({
  FactorDetailDistributionChart: () => null,
}));
vi.mock('src/sections/factor/factor-detail-cross-section-table', () => ({
  FactorDetailCrossSectionTable: () => null,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function factor(name: string, label: string): FactorDef {
  return {
    id: name,
    name,
    label,
    category: 'TECHNICAL',
    sourceType: 'FIELD_REF',
    isBuiltin: true,
  };
}

function DetailHarness() {
  return (
    <Routes>
      <Route
        path="/factor/detail/:name"
        element={
          <>
            <Link to="/factor/detail/second">切换因子</Link>
            <FactorDetailView />
          </>
        }
      />
    </Routes>
  );
}

function renderDetailHarness() {
  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter initialEntries={['/factor/detail/first']}>
          <DetailHarness />
        </MemoryRouter>
      </ThemeProvider>
    ),
  };
}

describe('FactorDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels the old detail request before applying the next route response', async () => {
    const first = deferred<FactorDef>();
    const second = deferred<FactorDef>();
    vi.mocked(factorApi.detail).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { user } = renderDetailHarness();

    await waitFor(() => expect(factorApi.detail).toHaveBeenCalledTimes(1));
    const firstSignal = vi.mocked(factorApi.detail).mock.calls[0][1];

    await user.click(screen.getByRole('link', { name: '切换因子' }));

    await waitFor(() => expect(factorApi.detail).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);

    second.resolve(factor('second', '第二个因子'));
    expect(await screen.findByRole('heading', { name: '第二个因子' })).toBeInTheDocument();
  });
});
