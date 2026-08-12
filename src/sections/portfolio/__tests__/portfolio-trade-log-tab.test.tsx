import { screen, within } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const mocks = vi.hoisted(() => ({
  queryTradeLog: vi.fn(),
  tradeLogSummary: vi.fn(),
}));

vi.mock('src/api/portfolio', () => mocks);
vi.mock('src/components/date-picker', () => ({ DatePicker: () => null }));

import { PortfolioTradeLogTab } from '../portfolio-trade-log-tab';

describe('PortfolioTradeLogTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryTradeLog.mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [
        {
          id: 'log-1',
          portfolioId: 'portfolio-1',
          tsCode: '000001.SZ',
          stockName: null,
          action: 'BUY',
          quantity: 100,
          price: null,
          amount: null,
          reason: 'MANUAL',
          createdAt: '2026-08-10T12:30:00.000Z',
        },
      ],
    });
    mocks.tradeLogSummary.mockResolvedValue({
      portfolioId: 'portfolio-1',
      totalTrades: 3,
      totalBuyAmount: null,
      totalSellAmount: null,
      byAction: [{ action: 'BUY', count: 3, totalAmount: null }],
      byStock: [{ tsCode: '000001.SZ', stockName: null, count: 3 }],
    });
  });

  it('formats createdAt and renders null prices, amounts, names, and summary amounts as placeholders', async () => {
    renderWithProviders(<PortfolioTradeLogTab portfolioId="portfolio-1" />);

    const row = await screen.findByRole('row', { name: /000001\.SZ/ });
    expect(screen.getByRole('columnheader', { name: '发生时间' })).toBeInTheDocument();
    expect(within(row).getByText(/2026-08-10/)).toBeInTheDocument();
    expect(within(row).queryByText('2026-08-10T12:30:00.000Z')).not.toBeInTheDocument();
    expect(within(row).getAllByText('—')).toHaveLength(3);

    const totalCard = screen.getByText('总交易笔数').closest<HTMLElement>('.MuiCard-root');
    const buyAmountCard = screen.getByText('总买入金额').closest<HTMLElement>('.MuiCard-root');
    const sellAmountCard = screen.getByText('总卖出金额').closest<HTMLElement>('.MuiCard-root');

    expect(totalCard).not.toBeNull();
    expect(buyAmountCard).not.toBeNull();
    expect(sellAmountCard).not.toBeNull();
    expect(within(totalCard!).getByText('3')).toBeInTheDocument();
    expect(within(buyAmountCard!).getByText('—')).toBeInTheDocument();
    expect(within(sellAmountCard!).getByText('—')).toBeInTheDocument();
  });
});
