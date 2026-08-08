import type { ReactNode } from 'react';

import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationDetailDrawer } from '../rotation-detail-drawer';

const apiMock = vi.hoisted(() => ({ fetchRotationDetail: vi.fn() }));
const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('src/api/market', () => ({ fetchRotationDetail: apiMock.fetchRotationDetail }));
vi.mock('src/routes/hooks', () => ({ useRouter: () => routerMock }));
vi.mock('src/components/chart', () => ({ Chart: () => null, useChart: () => ({}) }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('RotationDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.fetchRotationDetail.mockResolvedValue({
      sectorName: '银行',
      tradeDate: '20260808',
      pctChange: 1.2,
      amount: null,
      netAmount: 0,
      momentum: null,
      pePercentile: null,
      pbPercentile: null,
      returnTrend: [],
      flowTrend: [],
      topStocks: [
        {
          tsCode: '000001.SZ',
          name: '平安银行',
          pctChg: 1.2,
          peTtm: 5.6,
          pb: 0.5,
          totalMv: 100000,
        },
      ],
    });
  });

  it('成分股行可由键盘进入个股详情，且保持至少 40px 点击高度', async () => {
    const { user } = renderWithProviders(
      <RotationDetailDrawer open onClose={vi.fn()} sectorName="银行" period="1m" />
    );

    await user.click(await screen.findByRole('tab', { name: '成分股' }));
    const row = await screen.findByLabelText('查看 平安银行 股票详情');
    expect(row).toHaveStyle({ height: '40px' });
    act(() => row.focus());
    await user.keyboard(' ');

    expect(routerMock.push).toHaveBeenCalledWith('/stock/detail?code=000001.SZ');
  });
});
