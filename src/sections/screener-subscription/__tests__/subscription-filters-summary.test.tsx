import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SubscriptionFiltersSummary } from '../subscription-filters-summary';

// ----------------------------------------------------------------------

describe('SubscriptionFiltersSummary', () => {
  it('展示嵌套对象筛选条件时不裸显 [object Object]', () => {
    renderWithProviders(
      <SubscriptionFiltersSummary filters={{ pe: { max: 30 }, roe: { min: 15 } }} />
    );

    expect(screen.getByText('PE 最大值 30')).toBeInTheDocument();
    expect(screen.getByText('ROE 最小值 15')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object]/)).not.toBeInTheDocument();
  });

  it('展示数组条件时使用条件序号和条件内容', () => {
    renderWithProviders(
      <SubscriptionFiltersSummary
        filters={[
          { factorName: 'pe_ttm', operator: 'lt', value: 15 },
          { factorName: 'roe', operator: 'top_pct', percent: 20 },
        ]}
      />
    );

    expect(screen.getByText('条件 1 PE < 15')).toBeInTheDocument();
    expect(screen.getByText('条件 2 ROE 前 20%')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object]/)).not.toBeInTheDocument();
  });

  it('保留扁平筛选和排序摘要', () => {
    renderWithProviders(
      <SubscriptionFiltersSummary
        filters={{ industries: ['银行', '煤炭'], minPeTtm: 5, northboundOnly: true }}
        sortBy="pb"
        sortOrder="asc"
      />
    );

    expect(screen.getByText('行业 银行、煤炭')).toBeInTheDocument();
    expect(screen.getByText('PE ≥ 5')).toBeInTheDocument();
    expect(screen.getByText('仅北向资金 是')).toBeInTheDocument();
    expect(screen.getByText('排序：PB 升序')).toBeInTheDocument();
  });
});
