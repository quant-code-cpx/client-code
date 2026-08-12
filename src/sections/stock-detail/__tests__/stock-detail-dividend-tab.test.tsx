import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { StockDetailDividendTab } from '../stock-detail-dividend-tab';

const financing = vi.hoisted(() => vi.fn());

vi.mock('src/api/stock', () => ({
  stockDetailApi: { financing },
}));

beforeEach(() => {
  financing.mockReset();
});

describe('StockDetailDividendTab', () => {
  it('不再请求已下线的分红接口，并明确展示能力降级', async () => {
    financing.mockResolvedValue({ tsCode: '600519.SH', items: [] });

    renderWithProviders(<StockDetailDividendTab tsCode="600519.SH" />);

    expect(await screen.findByText(/分红与配股数据接口已下线/)).toBeInTheDocument();
    expect(screen.getByText('暂无融资记录')).toBeInTheDocument();
    expect(financing).toHaveBeenCalledWith('600519.SH');
  });

  it('融资请求失败时支持局部重试', async () => {
    financing
      .mockRejectedValueOnce(new Error('融资接口不可用'))
      .mockResolvedValueOnce({ tsCode: '600519.SH', items: [] });
    const { user } = renderWithProviders(<StockDetailDividendTab tsCode="600519.SH" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('融资接口不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('暂无融资记录')).toBeInTheDocument();
    expect(financing).toHaveBeenCalledTimes(2);
  });
});
