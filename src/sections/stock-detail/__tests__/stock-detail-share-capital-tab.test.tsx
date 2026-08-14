import { screen } from '@testing-library/react';

import { stockDetailApiExtra } from 'src/api/stock';
import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailShareCapitalTab } from '../stock-detail-share-capital-tab';

vi.mock('src/api/stock', () => ({
  stockDetailApiExtra: {
    shareCapital: vi.fn(),
  },
}));

vi.mock('src/components/chart', () => ({
  Chart: () => <div data-testid="share-capital-chart" />,
  useChart: (options: unknown) => options,
}));

const mockShareCapital = vi.mocked(stockDetailApiExtra.shareCapital);

describe('StockDetailShareCapitalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

it('兼容 latest/history 并格式化股本变动公告日', async () => {
    mockShareCapital.mockResolvedValueOnce({
      tsCode: '688525.SH',
      latest: {
        totalShare: 470837.73,
        floatShare: 470837.73,
        freeShare: 363863.36,
        restrictedShare: 0,
        totalMv: null,
        circMv: null,
      },
      history: [
        {
          changeDate: '2026-05-20',
          totalShare: 470837.73,
          floatShare: 470837.73,
          changeReason: '定期披露',
        },
      ],
      changes: [
        {
          annDate: '20260520',
          changeReason: '定期披露',
          totalShareBefore: 460000,
          totalShareAfter: 470837.73,
          changeAmount: 10837.73,
        },
      ],
    } as never);

    const { user } = renderWithProviders(<StockDetailShareCapitalTab tsCode="688525.SH" />);

    expect(await screen.findByText('股本结构')).toBeInTheDocument();
    expect(screen.getByText('历史股本明细')).toBeInTheDocument();
    expect(screen.getAllByText('2026-05-20')).toHaveLength(2);
    expect(screen.queryByText('20260520')).not.toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: '展开历史股本明细' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard(' ');

    expect(screen.getByRole('button', { name: '收起历史股本明细' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
