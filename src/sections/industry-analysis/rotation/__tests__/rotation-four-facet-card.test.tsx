import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationFourFacetCard } from '../rotation-four-facet-card';

const apiMock = vi.hoisted(() => ({
  fetchFlowAnalysis: vi.fn(),
  fetchMomentumRanking: vi.fn(),
  fetchSectorValuation: vi.fn(),
  fetchReturnComparison: vi.fn(),
}));

vi.mock('src/api/market', () => apiMock);

describe('RotationFourFacetCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('四维独立结算，6M 使用 120 日且单维失败不吞掉其他维度', async () => {
    apiMock.fetchMomentumRanking.mockResolvedValueOnce({ rankings: [] });
    apiMock.fetchReturnComparison.mockRejectedValueOnce(new Error('return failed'));
    apiMock.fetchFlowAnalysis.mockResolvedValueOnce({ flows: [] });
    apiMock.fetchSectorValuation.mockResolvedValueOnce({ sectors: [] });

    renderWithProviders(<RotationFourFacetCard period="6m" />);

    expect(await screen.findByText('收益数据加载失败')).toBeInTheDocument();
    expect(screen.getByText('动量 Top 10')).toBeInTheDocument();
    expect(screen.getByText('资金 Top 10')).toBeInTheDocument();
    expect(screen.getByText('估值低位 Top 10')).toBeInTheDocument();
    expect(apiMock.fetchReturnComparison).toHaveBeenCalledWith(
      expect.objectContaining({ periods: [120], sort_period: 120 })
    );
    expect(apiMock.fetchFlowAnalysis).toHaveBeenCalledWith(expect.objectContaining({ days: 120 }));
  });

  it('可点击行业行支持键盘打开详情，且点击目标至少 40px 高', async () => {
    apiMock.fetchMomentumRanking.mockResolvedValue({ rankings: [{ name: '银行', momentum: 9.8 }] });
    apiMock.fetchReturnComparison.mockResolvedValue({ sectors: [] });
    apiMock.fetchFlowAnalysis.mockResolvedValue({ flows: [] });
    apiMock.fetchSectorValuation.mockResolvedValue({ sectors: [] });
    const onSectorClick = vi.fn();
    const { user } = renderWithProviders(
      <RotationFourFacetCard period="1m" onSectorClick={onSectorClick} />
    );

    const row = await screen.findByLabelText('查看 银行 行业详情');
    expect(row).toHaveStyle({ height: '40px' });
    act(() => row.focus());
    await user.keyboard('{Enter}');

    expect(onSectorClick).toHaveBeenCalledWith('银行');
  });
});
