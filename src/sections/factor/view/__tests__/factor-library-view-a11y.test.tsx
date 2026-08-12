import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockFactorLibrary, mockSetFactorFilters, mockResetFactorFilters } = vi.hoisted(() => ({
  mockFactorLibrary: vi.fn(),
  mockSetFactorFilters: vi.fn(),
  mockResetFactorFilters: vi.fn(),
}));

vi.mock('src/api/factor', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/factor')>();
  return {
    ...actual,
    factorApi: { ...actual.factorApi, library: mockFactorLibrary },
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
      sortBy: 'ir',
      sortOrder: 'desc',
      icPeriod: '10d',
    },
    setFilters: mockSetFactorFilters,
    reset: mockResetFactorFilters,
  }),
}));

vi.mock('src/sections/factor/library/factor-library-detail-drawer', () => ({
  FactorLibraryDetailDrawer: () => null,
}));

import { FactorLibraryView } from '../factor-library-view';

describe('FactorLibraryView accessibility and desktop layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFactorLibrary.mockResolvedValue({
      categories: [],
      meta: { totalCount: 0, enabledCount: 0, customCount: 0, staleCount: 0 },
    });
  });

  it('names the view buttons and allows the filter toolbar to wrap', async () => {
    renderWithProviders(<FactorLibraryView />);

    expect(screen.getByRole('group', { name: '因子库视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '卡片视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '表格视图' })).toBeInTheDocument();

    const filterGroup = screen.getByRole('group', { name: '因子库筛选条件' });
    expect(filterGroup).toHaveStyle({ flexWrap: 'wrap' });
    await waitFor(() => expect(mockFactorLibrary).toHaveBeenCalledTimes(1));
  });
});
