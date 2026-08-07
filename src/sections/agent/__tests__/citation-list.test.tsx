import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { CitationList } from '../components/citation-list';

import type { AgentMessageEntity } from '../state/agent-state.types';

type Citation = AgentMessageEntity['citations'][number];

function citation(overrides: Partial<Citation> = {}): Citation {
  return {
    citationId: 'citation_1',
    blockId: 'block_1',
    claimKey: 'claim_1',
    conclusionLevel: 'FACT',
    sourceType: 'OFFICIAL',
    title: '交易所公告',
    canonicalUrl: 'https://example.com/report',
    publisher: '交易所',
    retrievedAt: '2026-07-20T00:00:00.000Z',
    locator: { section: '财务数据', paragraph: 3 },
    ...overrides,
  };
}

describe('CitationList', () => {
  it('安全外链带隔离属性，并将来源类型与定位信息翻成中文说明', () => {
    renderWithProviders(<CitationList citations={[citation()]} />);

    const link = screen.getByRole('link', { name: '交易所公告' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/官方资料/)).toBeInTheDocument();
    expect(screen.getByText('报告位置：财务数据，第 3 段')).toBeInTheDocument();
  });

  it('危险 URL 降级为纯文本', () => {
    renderWithProviders(
      <CitationList citations={[citation({ canonicalUrl: 'javascript:alert(1)' })]} />
    );

    expect(screen.getByText('交易所公告')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '交易所公告' })).not.toBeInTheDocument();
  });

  it('合并重复工具来源，并隐藏内部工具名和事实 ID', () => {
    renderWithProviders(
      <CitationList
        citations={[
          citation({
            citationId: 'citation_1',
            sourceType: 'DATABASE',
            title: 'get_stock_price_history',
            canonicalUrl: undefined,
            publisher: undefined,
            locator: { factId: 'fact_price_1' },
          }),
          citation({
            citationId: 'citation_2',
            sourceType: 'DATABASE',
            title: 'get_stock_price_history',
            canonicalUrl: undefined,
            publisher: undefined,
            locator: { factId: 'fact_price_2' },
          }),
        ]}
      />
    );

    expect(screen.getByText('个股历史行情')).toBeInTheDocument();
    expect(screen.getByText('内部市场数据库', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('已用于支撑本条研究结论')).toBeInTheDocument();
    expect(screen.getByText('已用于支撑 2 条研究结论')).toBeInTheDocument();
    expect(screen.queryByText('get_stock_price_history')).not.toBeInTheDocument();
    expect(screen.queryByText(/fact_price/)).not.toBeInTheDocument();
  });
});
