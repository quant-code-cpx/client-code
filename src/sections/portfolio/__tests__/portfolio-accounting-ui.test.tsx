import dayjs from 'dayjs';
import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const {
  mockRecordTrade,
  mockRecordCashEvent,
  mockApplyShareAction,
  mockListCashEvents,
  mockCreateIdempotencyKey,
} = vi.hoisted(() => ({
  mockRecordTrade: vi.fn(),
  mockRecordCashEvent: vi.fn(),
  mockApplyShareAction: vi.fn(),
  mockListCashEvents: vi.fn(),
  mockCreateIdempotencyKey: vi.fn((scope: string) => `${scope}:12345678`),
}));

vi.mock('src/api/portfolio', () => ({
  recordPortfolioTrade: mockRecordTrade,
  recordPortfolioCashEvent: mockRecordCashEvent,
  applyPortfolioShareAction: mockApplyShareAction,
  listPortfolioCashEvents: mockListCashEvents,
  createPortfolioAccountingIdempotencyKey: mockCreateIdempotencyKey,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/stock-search-autocomplete', () => ({
  StockSearchAutocomplete: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (value: unknown) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          tsCode: '000001.SZ',
          symbol: '000001',
          name: '平安银行',
          market: null,
          industry: null,
          listStatus: null,
        })
      }
    >
      {`选择${label}`}
    </button>
  ),
}));
vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label, onChange }: { label: string; onChange: (value: dayjs.Dayjs) => void }) => (
    <button type="button" onClick={() => onChange(dayjs('2026-08-20'))}>
      {`设置${label}`}
    </button>
  ),
}));

import { PortfolioTradeDialog } from '../portfolio-trade-dialog';
import { PortfolioCashLedgerTab } from '../portfolio-cash-ledger-tab';
import { PortfolioCashEventDialog } from '../portfolio-cash-event-dialog';
import { PortfolioShareActionDialog } from '../portfolio-share-action-dialog';

const holdings = [
  {
    id: 'holding-1',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    quantity: 100,
    avgCost: 10,
    currentPrice: 11,
    marketValue: 1100,
    unrealizedPnl: 100,
    pnlPct: 0.1,
    weight: 1,
    industry: '银行',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRecordTrade.mockResolvedValue({});
  mockRecordCashEvent.mockResolvedValue({});
  mockApplyShareAction.mockResolvedValue({});
  mockListCashEvents.mockResolvedValue({
    total: 1,
    page: 1,
    pageSize: 20,
    cashBalance: 8000,
    items: [
      {
        id: 'cash-1',
        portfolioId: 'portfolio-1',
        userId: 1,
        holdingEventId: 'event-1',
        tsCode: '000001.SZ',
        eventType: 'POSITION_ADJUSTMENT',
        amount: -2000,
        balanceAfter: null,
        externalFlow: false,
        realizedPnlDelta: null,
        isEstimated: true,
        effectiveDate: '20260820',
        occurredAt: '2026-08-20T01:00:00.000Z',
        idempotencyKey: 'position:key',
        source: 'MANUAL_POSITION',
        metadata: null,
      },
    ],
  });
});

describe('portfolio accounting dialogs', () => {
  it('买入成交把数量、价格、费用和 YYYYMMDD 原子记账', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <PortfolioTradeDialog
        open
        portfolioId="portfolio-1"
        holdings={holdings}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const dialog = screen.getByRole('dialog', { name: '记录成交' });
    await user.click(within(dialog).getByRole('button', { name: '选择成交标的' }));
    await user.type(within(dialog).getByLabelText('成交数量（股）'), '100');
    await user.type(within(dialog).getByLabelText('成交价（元/股）'), '12.5');
    await user.clear(within(dialog).getByLabelText('佣金（元）'));
    await user.type(within(dialog).getByLabelText('佣金（元）'), '5');
    await user.clear(within(dialog).getByLabelText('税费（元）'));
    await user.type(within(dialog).getByLabelText('税费（元）'), '1');
    await user.click(within(dialog).getByRole('button', { name: '设置交易日' }));
    await user.click(within(dialog).getByRole('button', { name: '确认记账' }));

    await waitFor(() =>
      expect(mockRecordTrade).toHaveBeenCalledWith({
        portfolioId: 'portfolio-1',
        tsCode: '000001.SZ',
        side: 'BUY',
        quantity: 100,
        price: 12.5,
        commission: 5,
        tax: 1,
        effectiveDate: '20260820',
        idempotencyKey: 'trade:12345678',
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('卖出数量超过持仓时在前端拦截', async () => {
    const { user } = renderWithProviders(
      <PortfolioTradeDialog
        open
        portfolioId="portfolio-1"
        holdings={holdings}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog', { name: '记录成交' });
    await user.click(within(dialog).getByRole('button', { name: '卖出' }));
    await user.click(within(dialog).getByLabelText('卖出持仓'));
    await user.click(screen.getByRole('option', { name: /000001\.SZ/ }));
    await user.type(within(dialog).getByLabelText('成交数量（股）'), '101');
    await user.type(within(dialog).getByLabelText('成交价（元/股）'), '12');
    await user.click(within(dialog).getByRole('button', { name: '确认记账' }));

    expect(await within(dialog).findByText('卖出数量不能超过可用持仓 100 股')).toBeVisible();
    expect(mockRecordTrade).not.toHaveBeenCalled();
  });

  it('入金和送股分别提交现金腿与成本不变的股数变更', async () => {
    const { user, rerender } = renderWithProviders(
      <PortfolioCashEventDialog
        open
        portfolioId="portfolio-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    let dialog = screen.getByRole('dialog', { name: '记录现金事件' });
    await user.type(within(dialog).getByLabelText('金额（元）'), '2000');
    await user.click(within(dialog).getByRole('button', { name: '设置生效日' }));
    await user.type(within(dialog).getByLabelText('备注（选填）'), '追加研究资金');
    await user.click(within(dialog).getByRole('button', { name: '确认记账' }));
    await waitFor(() =>
      expect(mockRecordCashEvent).toHaveBeenCalledWith({
        portfolioId: 'portfolio-1',
        eventType: 'DEPOSIT',
        amount: 2000,
        tsCode: undefined,
        effectiveDate: '20260820',
        idempotencyKey: 'cash:12345678',
        memo: '追加研究资金',
      })
    );

    rerender(
      <PortfolioShareActionDialog
        open
        portfolioId="portfolio-1"
        holdings={holdings}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    dialog = screen.getByRole('dialog', { name: '记录送股 / 拆并股' });
    await user.click(within(dialog).getByLabelText('持仓'));
    await user.click(screen.getByRole('option', { name: /000001\.SZ/ }));
    await user.clear(within(dialog).getByLabelText('变更后总股数'));
    await user.type(within(dialog).getByLabelText('变更后总股数'), '120');
    await user.click(within(dialog).getByRole('button', { name: '设置生效日' }));
    await user.click(within(dialog).getByRole('button', { name: '确认记账' }));

    await waitFor(() =>
      expect(mockApplyShareAction).toHaveBeenCalledWith({
        portfolioId: 'portfolio-1',
        tsCode: '000001.SZ',
        actionType: 'STOCK_DIVIDEND',
        newQuantity: 120,
        effectiveDate: '20260820',
        recordDate: undefined,
        idempotencyKey: 'corporate-action:12345678',
      })
    );
  });

  it('现金账本显示有符号的现金腿，并明确标记历史校正为估算', async () => {
    renderWithProviders(
      <PortfolioCashLedgerTab
        portfolioId="portfolio-1"
        holdings={holdings}
        onPortfolioRefresh={vi.fn()}
      />
    );

    expect(await screen.findByText('持仓校正')).toBeVisible();
    expect(screen.getByText('估算')).toBeVisible();
    expect(screen.getByText('-¥2,000')).toBeVisible();
    expect(mockListCashEvents).toHaveBeenCalledWith({
      portfolioId: 'portfolio-1',
      page: 1,
      pageSize: 20,
    });
  });
});
