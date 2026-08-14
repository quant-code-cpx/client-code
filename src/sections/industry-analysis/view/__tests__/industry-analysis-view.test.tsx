import type { ReactNode } from 'react';
import type { HeatmapItem } from 'src/api/heatmap';
import type { IndustryDictMappingItem } from 'src/api/industry-dict';

import { screen } from '@testing-library/react';

import { buildIndustryMappingIndexes } from 'src/utils/industry-mapping';

import { renderWithProviders } from 'src/test/test-utils';

import { IndustryAnalysisView } from '../industry-analysis-view';

const hookMock = vi.hoisted(() => vi.fn());

vi.mock('src/hooks/use-industry-dict-mapping', () => ({
  useIndustryDictMapping: hookMock,
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ onChange }: { onChange: (value: { format: () => string } | null) => void }) => (
    <div>
      <button type="button" onClick={() => onChange({ format: () => '20260808' })}>
        选择 2026-08-08
      </button>
      <button type="button" onClick={() => onChange(null)}>
        清除日期
      </button>
    </div>
  ),
}));

vi.mock('src/sections/industry-analysis/heatmap/view/market-heatmap-view', () => ({
  MarketHeatmapView: ({
    tradeDate,
    refreshKey,
    embedded,
    onSectorSelected,
  }: {
    tradeDate?: string;
    refreshKey?: number;
    embedded: boolean;
    onSectorSelected: (item: HeatmapItem) => void;
  }) => (
    <section
      data-testid="heatmap-view"
      data-trade-date={tradeDate ?? ''}
      data-refresh-key={refreshKey}
      data-embedded={embedded}
    >
      <button
        type="button"
        onClick={() =>
          onSectorSelected({
            tsCode: '600000.SH',
            name: '浦发银行',
            groupName: '银行',
            industry: '银行',
            pctChg: 1,
            totalMv: 100,
            amount: 10,
            swCode: '801780.SI',
          })
        }
      >
        选中已映射行业
      </button>
      <button
        type="button"
        onClick={() =>
          onSectorSelected({
            tsCode: '000001.SZ',
            name: '未知股票',
            groupName: '未知行业',
            industry: '未知行业',
            pctChg: null,
            totalMv: null,
            amount: null,
          })
        }
      >
        选中未映射行业
      </button>
    </section>
  ),
}));

vi.mock('src/sections/industry-analysis/rotation/view/industry-rotation-view', () => ({
  IndustryRotationView: ({
    tradeDate,
    refreshKey,
    embedded,
    focusedSector,
    onFocusedSectorConsumed,
  }: {
    tradeDate?: string;
    refreshKey?: number;
    embedded: boolean;
    focusedSector?: { dcTsCode?: string; swName?: string; dcName?: string } | null;
    onFocusedSectorConsumed: () => void;
  }) => (
    <section
      data-testid="rotation-view"
      data-trade-date={tradeDate ?? ''}
      data-refresh-key={refreshKey}
      data-embedded={embedded}
      data-focused-code={focusedSector?.dcTsCode ?? ''}
      data-focused-name={focusedSector?.dcName ?? focusedSector?.swName ?? ''}
    >
      <button type="button" onClick={onFocusedSectorConsumed}>
        消费跨页焦点
      </button>
    </section>
  ),
}));

const mapping: IndustryDictMappingItem = {
  swCode: '801780.SI',
  swName: '银行',
  dcTsCode: 'BK0475.DC',
  dcBoardCode: 'BK0475',
  dcName: '银行板块',
  matchType: 'exact',
  confidence: 1,
};

describe('IndustryAnalysisView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMock.mockReturnValue({
      items: [mapping],
      indexes: buildIndustryMappingIndexes([mapping]),
      coverage: {
        total: 31,
        matched: 31,
        unmatched: 0,
        matchRate: 1,
        listedStockCount: 5000,
        listedStockMappedCount: 5000,
        listedStockMappedRate: 1,
      },
      status: 'success',
      refetch: vi.fn(),
    });
  });

  it('无效 tab 回退到轮动，并把 YYYYMMDD 日期和刷新序号传给当前面板', async () => {
    const { user } = renderWithProviders(<IndustryAnalysisView />, {
      initialEntries: ['/market/industry?tab=invalid'],
    });

    expect(screen.getByTestId('rotation-view')).toHaveAttribute('data-trade-date', '');
    expect(screen.getByText('轮动 · 周期强弱多维对比')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择 2026-08-08' }));
    expect(screen.getByTestId('rotation-view')).toHaveAttribute('data-trade-date', '20260808');

    await user.click(screen.getByRole('button', { name: '刷新' }));
    expect(screen.getByTestId('rotation-view')).toHaveAttribute('data-refresh-key', '1');

    await user.click(screen.getByRole('tab', { name: /全景热力图/ }));
    expect(screen.getByTestId('heatmap-view')).toHaveAttribute('data-trade-date', '20260808');
    expect(screen.getByTestId('heatmap-view')).toHaveAttribute('data-refresh-key', '1');

    await user.click(screen.getByRole('button', { name: '清除日期' }));
    expect(screen.getByTestId('heatmap-view')).toHaveAttribute('data-trade-date', '');
  });

  it('热力图行业按字典映射后下钻轮动，并在消费后清空一次性焦点', async () => {
    const { user } = renderWithProviders(<IndustryAnalysisView />, {
      initialEntries: ['/market/industry?tab=0'],
    });

    expect(screen.getByText('行业字典：申万 L1 → 东财行业板块，已匹配 31/31')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '选中已映射行业' }));

    const rotation = screen.getByTestId('rotation-view');
    expect(rotation).toHaveAttribute('data-focused-code', 'BK0475.DC');
    expect(rotation).toHaveAttribute('data-focused-name', '银行板块');

    await user.click(screen.getByRole('button', { name: '消费跨页焦点' }));
    expect(screen.getByTestId('rotation-view')).toHaveAttribute('data-focused-code', '');
  });

  it('字典失败且行业无法映射时保留热力图并给出明确降级提示', async () => {
    hookMock.mockReturnValue({
      items: [],
      indexes: null,
      coverage: null,
      status: 'error',
      refetch: vi.fn(),
    });
    const { user } = renderWithProviders(<IndustryAnalysisView />, {
      initialEntries: ['/market/industry?tab=0'],
    });

    expect(
      screen.getByText('行业字典暂不可用，跨 Tab 跳转将使用降级逻辑')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '选中未映射行业' }));

    expect(screen.getByTestId('heatmap-view')).toBeInTheDocument();
    expect(
      screen.getByText('该行业在轮动数据中暂未找到对应板块（行业字典差异）')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('rotation-view')).not.toBeInTheDocument();
  });
});
