import type { AddHoldingInput, HoldingDetailItem, UpdateHoldingInput } from 'src/api/portfolio';

import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import {
  addHolding,
  removeHolding,
  updateHolding,
  createHoldingMutationIdempotencyKey,
} from 'src/api/portfolio';

import { PortfolioHoldingTab } from '../portfolio-holding-tab';

vi.mock('src/api/portfolio', () => ({
  addHolding: vi.fn(),
  removeHolding: vi.fn(),
  updateHolding: vi.fn(),
  createHoldingMutationIdempotencyKey: vi.fn(),
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

vi.mock('../portfolio-holding-table', () => ({
  PortfolioHoldingTable: ({
    onDelete,
    onEdit,
  }: {
    onDelete: (holding: HoldingDetailItem) => void;
    onEdit: (holding: HoldingDetailItem) => void;
  }) => {
    const holding: HoldingDetailItem = {
      id: 'holding-1',
      tsCode: '000001.SZ',
      stockName: '平安银行',
      quantity: 100,
      avgCost: 12.5,
      currentPrice: null,
      marketValue: null,
      unrealizedPnl: null,
      pnlPct: null,
      weight: null,
      industry: null,
    };

    return (
      <>
        <button type="button" onClick={() => onEdit(holding)}>编辑模拟</button>
        <button type="button" onClick={() => onDelete(holding)}>删除模拟</button>
      </>
    );
  },
}));

vi.mock('../holding-add-dialog', () => ({
  HoldingAddDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: (data: AddHoldingInput) => Promise<void>;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() =>
          void onConfirm({ portfolioId: 'portfolio-1', tsCode: '000001.SZ', quantity: 100, avgCost: 12.5 })
        }
      >
        提交新增模拟
      </button>
    ) : null,
}));

vi.mock('../holding-edit-dialog', () => ({
  HoldingEditDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: (data: UpdateHoldingInput) => Promise<void>;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => void onConfirm({ holdingId: 'holding-1', quantity: 200, avgCost: 13 })}
      >
        提交编辑模拟
      </button>
    ) : null,
}));

vi.mock('../portfolio-rebalance-dialog', () => ({ PortfolioRebalanceDialog: () => null }));

// ----------------------------------------------------------------------

describe('PortfolioHoldingTab idempotency', () => {
  beforeEach(() => {
    vi.mocked(addHolding).mockResolvedValue({
      id: 'holding-1',
      tsCode: '000001.SZ',
      stockName: '平安银行',
      quantity: 100,
      avgCost: 12.5,
      updatedAt: '2026-08-08T00:00:00.000Z',
    });
    vi.mocked(updateHolding).mockResolvedValue({
      id: 'holding-1',
      tsCode: '000001.SZ',
      stockName: '平安银行',
      quantity: 200,
      avgCost: 13,
      updatedAt: '2026-08-08T00:00:00.000Z',
    });
    vi.mocked(removeHolding).mockResolvedValue({ message: 'ok' });
    vi.mocked(createHoldingMutationIdempotencyKey)
      .mockReturnValueOnce('portfolio-holding:add:11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('portfolio-holding:add:22222222-2222-4222-8222-222222222222')
      .mockReturnValueOnce('portfolio-holding:update:33333333-3333-4333-8333-333333333333')
      .mockReturnValueOnce('portfolio-holding:remove:44444444-4444-4444-8444-444444444444');
  });

  afterEach(() => vi.clearAllMocks());

  it('gives every add, edit, and delete action its own idempotency key', async () => {
    render(<PortfolioHoldingTab portfolioId="portfolio-1" holdings={[]} onRefresh={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '添加持仓' }));
    fireEvent.click(screen.getByRole('button', { name: '提交新增模拟' }));
    await waitFor(() =>
      expect(addHolding).toHaveBeenLastCalledWith({
        portfolioId: 'portfolio-1',
        tsCode: '000001.SZ',
        quantity: 100,
        avgCost: 12.5,
        idempotencyKey: 'portfolio-holding:add:11111111-1111-4111-8111-111111111111',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: '添加持仓' }));
    fireEvent.click(screen.getByRole('button', { name: '提交新增模拟' }));
    await waitFor(() => expect(addHolding).toHaveBeenCalledTimes(2));
    expect(vi.mocked(addHolding).mock.calls[1]?.[0]?.idempotencyKey).not.toBe(
      vi.mocked(addHolding).mock.calls[0]?.[0]?.idempotencyKey
    );

    fireEvent.click(screen.getByRole('button', { name: '编辑模拟' }));
    fireEvent.click(screen.getByRole('button', { name: '提交编辑模拟' }));
    await waitFor(() =>
      expect(updateHolding).toHaveBeenCalledWith({
        holdingId: 'holding-1',
        quantity: 200,
        avgCost: 13,
        idempotencyKey: 'portfolio-holding:update:33333333-3333-4333-8333-333333333333',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: '删除模拟' }));
    fireEvent.click(await screen.findByRole('button', { name: '删除' }));
    await waitFor(() =>
      expect(removeHolding).toHaveBeenCalledWith({
        holdingId: 'holding-1',
        idempotencyKey: 'portfolio-holding:remove:44444444-4444-4444-8444-444444444444',
      })
    );
  });
});
