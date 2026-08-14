import type { HeatmapItem } from 'src/api/heatmap';
import type { SectorFlowItem } from 'src/api/market';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { HeatmapSectorDetailDialog } from '../heatmap-sector-detail-dialog';

const sector: SectorFlowItem = {
  tsCode: 'BK0475.DC',
  tradeDate: '20260808',
  contentType: 'INDUSTRY',
  name: '银行',
  pctChange: 1,
  close: null,
  netAmount: 200_000_000,
  netAmountRate: 1,
  buyElgAmount: null,
  buyElgAmountRate: null,
  buyLgAmount: null,
  buyLgAmountRate: null,
  buyMdAmount: null,
  buyMdAmountRate: null,
  buySmAmount: null,
  buySmAmountRate: null,
  buySmAmountStock: null,
  rank: 1,
};

const stocks: HeatmapItem[] = [
  {
    tsCode: '000001.SZ',
    name: '平安银行',
    groupName: '银行',
    industry: '银行',
    pctChg: 1.2,
    totalMv: null,
    amount: 100_000,
  },
  {
    tsCode: '600000.SH',
    name: '浦发银行',
    groupName: '银行',
    industry: '银行',
    pctChg: -0.8,
    totalMv: null,
    amount: 50_000,
  },
];

describe('HeatmapSectorDetailDialog', () => {
  it('从已加载个股明细派生成交额与涨跌家数', () => {
    renderWithProviders(
      <HeatmapSectorDetailDialog
        open
        onClose={vi.fn()}
        sector={sector}
        stocks={stocks}
        stockFlows={[]}
      />
    );

    expect(screen.getByText('成交额').parentElement).toHaveTextContent('1.5亿');
    expect(screen.getByText('涨/跌家数').parentElement).toHaveTextContent('1↑ / 1↓');
  });

  it('明细仍在加载时不提前展示统计零值', () => {
    renderWithProviders(
      <HeatmapSectorDetailDialog
        open
        loading
        onClose={vi.fn()}
        sector={sector}
        stocks={stocks}
        stockFlows={[]}
      />
    );

    expect(screen.getByText('成交额').parentElement).toHaveTextContent('—');
    expect(screen.getByText('涨/跌家数').parentElement).toHaveTextContent('—');
  });
});
