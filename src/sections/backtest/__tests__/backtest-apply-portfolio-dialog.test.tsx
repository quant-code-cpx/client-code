import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const mocks = vi.hoisted(() => ({
  applyBacktest: vi.fn(),
  listPortfolios: vi.fn(),
  createApplyBacktestIdempotencyKey: vi.fn(() => 'portfolio-apply-backtest:fixed-key'),
}));

vi.mock('src/api/portfolio', () => mocks);

import { BacktestApplyPortfolioDialog } from '../backtest-apply-portfolio-dialog';

describe('BacktestApplyPortfolioDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPortfolios.mockResolvedValue([
      {
        id: 'portfolio-1',
        name: '核心组合',
        description: null,
        initialCash: 1_000_000,
        holdingCount: 0,
        createdAt: '2026-08-10T09:00:00.000Z',
        updatedAt: '2026-08-10T09:00:00.000Z',
      },
    ]);
  });

  it('reuses the same idempotency key when retrying the same failed submission', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mocks.applyBacktest.mockRejectedValueOnce(new Error('网络暂时不可用')).mockResolvedValueOnce({
      portfolioId: 'portfolio-1',
      portfolioName: '核心组合',
      backtestRunId: 'run-1',
      mode: 'REPLACE',
      snapshotDate: '20260808',
      changes: [],
      summary: { added: 0, updated: 0, removed: 0, unchanged: 0, totalHoldings: 0 },
    });

    const { user } = renderWithProviders(
      <BacktestApplyPortfolioDialog open runId="run-1" onClose={onClose} onSuccess={onSuccess} />
    );

    const submitButton = await screen.findByRole('button', { name: '确认导入' });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);
    await screen.findByText('网络暂时不可用');
    await user.click(submitButton);

    await waitFor(() => expect(mocks.applyBacktest).toHaveBeenCalledTimes(2));
    const firstRequest = mocks.applyBacktest.mock.calls[0][0];
    const retryRequest = mocks.applyBacktest.mock.calls[1][0];

    expect(firstRequest).toEqual({
      backtestRunId: 'run-1',
      portfolioId: 'portfolio-1',
      mode: 'REPLACE',
      idempotencyKey: 'portfolio-apply-backtest:fixed-key',
    });
    expect(retryRequest.idempotencyKey).toBe(firstRequest.idempotencyKey);
    expect(mocks.createApplyBacktestIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('portfolio-1', '核心组合');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
