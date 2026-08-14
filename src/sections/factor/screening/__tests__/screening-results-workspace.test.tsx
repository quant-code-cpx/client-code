/** @vitest-environment jsdom */

import type { ComponentProps } from 'react';
import type { FactorDef, FactorCondition, FactorScreeningResult } from 'src/api/factor';

import { screen } from '@testing-library/react';
import { vi, it, expect, describe } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';

import { ScreeningResultsWorkspace } from '../screening-results-workspace';

// ----------------------------------------------------------------------

const factor: FactorDef = {
  id: 'roe_ttm',
  name: 'roe_ttm',
  label: 'ROE（TTM）',
  category: 'QUALITY',
  sourceType: 'FIELD_REF',
  isBuiltin: true,
};

const conditions: FactorCondition[] = [
  { factorName: factor.name, operator: 'gte', value: 0.1 },
];

const result: FactorScreeningResult = {
  tradeDate: '20240801',
  total: 1,
  page: 1,
  pageSize: 50,
  items: [
    {
      tsCode: '600000.SH',
      name: '浦发银行',
      industry: '银行',
      factors: { roe_ttm: 0.12 },
      score: 88,
      rank: 1,
    },
  ],
};

function renderWorkspace(overrides: Partial<ComponentProps<typeof ScreeningResultsWorkspace>> = {}) {
  const props: ComponentProps<typeof ScreeningResultsWorkspace> = {
    result,
    loading: false,
    factorColumns: [factor.name],
    factorLabelMap: new Map([[factor.name, factor.label]]),
    page: 0,
    onPageChange: vi.fn(),
    selected: new Set(),
    onToggleRow: vi.fn(),
    onToggleAll: vi.fn(),
    isStale: false,
    resultSnapshot: conditions,
    allFactors: [factor],
    actionLog: [{ time: '10:00:00', message: '运行选股成功，命中 1 只', severity: 'success' }],
    canSavePreset: true,
    onClearSelection: vi.fn(),
    onAddToWatchlist: vi.fn(),
    onSavePreset: vi.fn(),
    onSaveStrategy: vi.fn(),
    onQuickBacktest: vi.fn(),
    onCreateSubscription: vi.fn(),
    ...overrides,
  };

  return { ...renderWithProviders(<ScreeningResultsWorkspace {...props} />), props };
}

describe('ScreeningResultsWorkspace', () => {
  it('keeps table, diagnostics and action log as one result workspace', async () => {
    const { user } = renderWorkspace();

    expect(screen.getByRole('link', { name: '600000.SH' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '诊断' }));
    expect(screen.getByText('行业分布（Top 10）')).toBeInTheDocument();
    expect(screen.getByText('1 只 · 100.0%')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '动作日志 (1)' }));
    expect(screen.getByText('运行选股成功，命中 1 只')).toBeInTheDocument();
  });

  it('owns evidence drawer state while forwarding result actions', async () => {
    const onAddToWatchlist = vi.fn();
    const { user } = renderWorkspace({ onAddToWatchlist });

    await user.click(screen.getByRole('button', { name: '加入自选股' }));
    expect(onAddToWatchlist).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '解释' }));
    expect(screen.getByRole('heading', { name: '浦发银行' })).toBeInTheDocument();
    expect(screen.getByText(/条件：>= 0.1/)).toBeInTheDocument();
  });
});
