import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailHeader } from '../stock-detail-header';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../realtime-quote-badge', () => ({
  RealtimeQuoteBadge: () => null,
}));

describe('StockDetailHeader', () => {
  it('返回触发浏览器后退，以回到详情页来源', async () => {
    mocks.navigate.mockClear();
    const view = renderWithProviders(
      <StockDetailHeader tsCode="600519.SH" overview={null} loading={false} />,
      { initialEntries: ['/stock/detail?code=600519.SH&tab=analysis'] }
    );

    await view.user.click(screen.getByRole('button', { name: '返回上一层' }));

    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });
});
