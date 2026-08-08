import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from 'src/test/test-utils';

import { IndustryRotationView } from '../view/industry-rotation-view';

vi.mock('../rotation-overview-cards', () => ({ RotationOverviewCards: () => null }));
vi.mock('../rotation-four-facet-card', () => ({ RotationFourFacetCard: () => null }));
vi.mock('../rotation-heatmap-chart', () => ({ RotationHeatmapChart: () => null }));
vi.mock('../rotation-momentum-chart', () => ({ RotationMomentumChart: () => null }));
vi.mock('../rotation-return-comparison-chart', () => ({
  RotationReturnComparisonChart: () => null,
}));
vi.mock('../rotation-flow-analysis-chart', () => ({ RotationFlowAnalysisChart: () => null }));
vi.mock('../rotation-valuation-chart', () => ({ RotationValuationChart: () => null }));
vi.mock('../rotation-detail-drawer', () => ({
  RotationDetailDrawer: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <button type="button" onClick={onClose}>
        关闭测试抽屉
      </button>
    ) : null,
}));

describe('IndustryRotationView focused sector', () => {
  it('跨 Tab 外部焦点只消费一次，Drawer 关闭后不会立即重开', async () => {
    const user = userEvent.setup();
    const onConsumed = vi.fn();
    renderWithProviders(
      <IndustryRotationView
        embedded
        focusedSector={{ dcTsCode: 'BK0475.DC', dcName: '银行' }}
        onFocusedSectorConsumed={onConsumed}
      />
    );

    const closeButton = await screen.findByRole('button', { name: '关闭测试抽屉' });
    expect(onConsumed).toHaveBeenCalledTimes(1);
    await user.click(closeButton);
    expect(screen.queryByRole('button', { name: '关闭测试抽屉' })).not.toBeInTheDocument();
  });
});
