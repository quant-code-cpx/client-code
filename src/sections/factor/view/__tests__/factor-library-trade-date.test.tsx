import type { FactorDef } from 'src/api/factor';

import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const {
  mockFactorLibrary,
  mockPrecomputeCustomFactor,
  mockBatchPrecomputeFactors,
  mockSetFactorFilters,
} = vi.hoisted(() => ({
  mockFactorLibrary: vi.fn(),
  mockPrecomputeCustomFactor: vi.fn(),
  mockBatchPrecomputeFactors: vi.fn(),
  mockSetFactorFilters: vi.fn(),
}));

vi.mock('src/api/factor', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/factor')>();
  return {
    ...actual,
    factorApi: { ...actual.factorApi, library: mockFactorLibrary },
    precomputeCustomFactor: mockPrecomputeCustomFactor,
    batchPrecomputeFactors: mockBatchPrecomputeFactors,
  };
});

vi.mock('src/sections/factor/library/hooks/use-factor-library-filters', () => ({
  useFactorLibraryFilters: () => ({
    filters: {
      view: 'card',
      category: 'ALL',
      search: '',
      sourceTypes: [],
      statuses: [],
      icMin: null,
      coverageMin: null,
      sortBy: 'name',
      sortOrder: 'asc',
      icPeriod: '10d',
    },
    setFilters: mockSetFactorFilters,
    reset: vi.fn(),
  }),
}));

vi.mock('src/sections/factor/library/factor-library-card', () => ({
  FactorLibraryCardV2: ({
    factor,
    onToggleSelect,
    onPrecompute,
  }: {
    factor: FactorDef;
    onToggleSelect: (factor: FactorDef) => void;
    onPrecompute?: (factor: FactorDef) => void;
  }) => (
    <div>
      <span>{factor.label}</span>
      <button type="button" onClick={() => onToggleSelect(factor)}>
        选择 {factor.label}
      </button>
      <button type="button" onClick={() => onPrecompute?.(factor)}>
        预计算 {factor.label}
      </button>
    </div>
  ),
}));

vi.mock('src/sections/factor/library/factor-library-bulk-bar', () => ({
  FactorLibraryBulkBar: ({
    selected,
    onBatchPrecompute,
  }: {
    selected: FactorDef[];
    onBatchPrecompute: () => void;
  }) => (
    <button type="button" onClick={onBatchPrecompute}>
      批量预计算 {selected.length}
    </button>
  ),
}));

vi.mock('src/sections/factor/library/factor-library-detail-drawer', () => ({
  FactorLibraryDetailDrawer: () => null,
}));

vi.mock('src/sections/factor/factor-custom-dialog', () => ({
  FactorCustomDialog: () => null,
}));

import { FactorLibraryView } from '../factor-library-view';

const customFactor: FactorDef = {
  id: 'custom-1',
  name: 'custom_momentum',
  label: '自定义动量',
  category: 'CUSTOM',
  sourceType: 'CUSTOM_SQL',
  isBuiltin: false,
  latestDate: '20260807',
};

describe('FactorLibraryView 预计算交易日', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrecomputeCustomFactor.mockResolvedValue({});
    mockBatchPrecomputeFactors.mockResolvedValue({ items: [] });
  });

  it('单个和批量预计算均使用后端快照 latestDate', async () => {
    mockFactorLibrary.mockResolvedValue({
      categories: [{ category: 'CUSTOM', label: '自定义', factors: [customFactor] }],
    });
    const user = userEvent.setup();
    renderWithProviders(<FactorLibraryView />);

    await user.click(await screen.findByRole('button', { name: '预计算 自定义动量' }));
    await waitFor(() =>
      expect(mockPrecomputeCustomFactor).toHaveBeenCalledWith({
        name: 'custom_momentum',
        tradeDate: '20260807',
      })
    );

    await user.click(screen.getByRole('button', { name: '选择 自定义动量' }));
    await user.click(await screen.findByRole('button', { name: '批量预计算 1' }));
    await waitFor(() =>
      expect(mockBatchPrecomputeFactors).toHaveBeenCalledWith({
        factorNames: ['custom_momentum'],
        tradeDate: '20260807',
      })
    );
  });

  it('无后端快照日期时不发送预计算请求', async () => {
    mockFactorLibrary.mockResolvedValue({
      categories: [
        { category: 'CUSTOM', label: '自定义', factors: [{ ...customFactor, latestDate: null }] },
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<FactorLibraryView />);

    await user.click(await screen.findByRole('button', { name: '预计算 自定义动量' }));

    expect(mockPrecomputeCustomFactor).not.toHaveBeenCalled();
    expect(await screen.findByText('无法确定最近有效交易日，未发送预计算请求')).toBeInTheDocument();
  });
});
