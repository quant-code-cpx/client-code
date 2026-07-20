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
  it('安全外链带隔离属性并展示定位信息', () => {
    renderWithProviders(<CitationList citations={[citation()]} />);

    const link = screen.getByRole('link', { name: '交易所公告' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/section: 财务数据/)).toBeInTheDocument();
  });

  it('危险 URL 降级为纯文本', () => {
    renderWithProviders(
      <CitationList citations={[citation({ canonicalUrl: 'javascript:alert(1)' })]} />
    );

    expect(screen.getByText('交易所公告')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '交易所公告' })).not.toBeInTheDocument();
  });
});
