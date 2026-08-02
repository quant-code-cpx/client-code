import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailView } from '../stock-detail-view';

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  setSearchParams: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('code=600519.SH&tab=market'), mocks.setSearchParams],
  };
});

vi.mock('src/api/stock', () => ({
  stockDetailApi: { overview: mocks.overview },
}));

vi.mock('../../stock-detail-header', () => ({ StockDetailHeader: () => null }));
vi.mock('../../stock-detail-market-tab', () => ({ StockDetailMarketTab: () => null }));
vi.mock('../../stock-detail-analysis-tab', () => ({ StockDetailAnalysisTab: () => null }));
vi.mock('../../stock-detail-financials-tab', () => ({ StockDetailFinancialsTab: () => null }));
vi.mock('../../stock-detail-company-suite-tab', () => ({ StockDetailCompanySuiteTab: () => null }));
vi.mock('../../stock-detail-notes-drawer', () => ({ StockDetailNotesDrawer: () => null }));
vi.mock('src/sections/report/report-generate-dialog', () => ({ ReportGenerateDialog: () => null }));

beforeEach(() => {
  mocks.overview.mockResolvedValue(null);
  mocks.setSearchParams.mockClear();
});

describe('StockDetailView', () => {
  it('切换详情 Tab 时替换当前 URL，保留返回来源页的历史记录', async () => {
    const view = renderWithProviders(<StockDetailView />);

    await view.user.click(screen.getByRole('tab', { name: '分析' }));

    expect(mocks.setSearchParams).toHaveBeenCalledOnce();
    const [params, options] = mocks.setSearchParams.mock.calls[0];
    expect(params.get('code')).toBe('600519.SH');
    expect(params.get('tab')).toBe('analysis');
    expect(options).toEqual({ replace: true });
  });
});
