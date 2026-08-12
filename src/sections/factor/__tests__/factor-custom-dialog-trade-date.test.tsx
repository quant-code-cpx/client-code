import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockTestCustomExpression } = vi.hoisted(() => ({
  mockTestCustomExpression: vi.fn(),
}));

vi.mock('src/api/factor', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/factor')>();
  return { ...actual, testCustomExpression: mockTestCustomExpression };
});

import { FactorCustomDialog } from '../factor-custom-dialog';

describe('FactorCustomDialog 表达式试算交易日', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('使用因子库解析的最近快照交易日', async () => {
    mockTestCustomExpression.mockResolvedValueOnce({
      expression: 'close',
      tradeDate: '20260807',
      samples: [],
      stats: { count: 0, nonNull: 0, mean: null, stdDev: null },
    });
    const user = userEvent.setup();

    renderWithProviders(
      <FactorCustomDialog open tradeDate="20260807" onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    await user.type(screen.getByRole('textbox', { name: /表达式/ }), 'close');
    await user.click(screen.getByRole('button', { name: '试算表达式' }));

    await waitFor(() =>
      expect(mockTestCustomExpression).toHaveBeenCalledWith({
        expression: 'close',
        tradeDate: '20260807',
      })
    );
  });

  it('无有效交易日时禁用试算，不发请求', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FactorCustomDialog open tradeDate={null} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    await user.type(screen.getByRole('textbox', { name: /表达式/ }), 'close');

    expect(screen.getByRole('button', { name: '试算表达式' })).toBeDisabled();
    expect(screen.getByText('暂无可用的因子快照交易日，表达式试算已停用。')).toBeInTheDocument();
    expect(mockTestCustomExpression).not.toHaveBeenCalled();
  });
});
