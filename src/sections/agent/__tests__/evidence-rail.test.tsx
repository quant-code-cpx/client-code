import { vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { EvidenceRail } from '../components/evidence-rail';

import type { AgentMessageEntity } from '../state/agent-state.types';

const message: AgentMessageEntity = {
  messageId: 'msg_evidence',
  conversationId: 'cm_1',
  role: 'ASSISTANT',
  status: 'COMPLETED',
  contentText: '研究结论',
  contentBlocks: [
    {
      blockId: 'markdown_evidence',
      schemaVersion: 1,
      type: 'MARKDOWN',
      text: '研究正文',
      provenance: {
        sourceType: 'OFFICIAL',
        citationIds: ['ct_1'],
        asOf: { tradeDate: '2026-01-02', retrievedAt: '2026-01-03T08:00:00.000Z' },
        timezone: 'Asia/Shanghai',
        currency: 'CNY',
      },
    },
  ],
  version: 1,
  parentMessageId: null,
  modelName: null,
  run: null,
  citations: [
    {
      citationId: 'ct_1',
      blockId: 'markdown_evidence',
      claimKey: 'annual-report-2025',
      conclusionLevel: 'FACT',
      sourceType: 'OFFICIAL',
      title: '公司年度报告',
      canonicalUrl: 'https://example.com/report',
      publisher: '公司公告',
      retrievedAt: '2026-01-03T08:00:00.000Z',
      locator: { section: '经营情况讨论' },
    },
  ],
  createdAt: '2026-01-03T08:00:00.000Z',
  completedAt: '2026-01-03T08:00:01.000Z',
};

describe('EvidenceRail', () => {
  it('复用当前回答的引用和富块数据口径，不创建新数据源', () => {
    const { container } = renderWithProviders(<EvidenceRail message={message} />);

    expect(screen.getByLabelText('证据面板')).toBeInTheDocument();
    expect(container.querySelector('.MuiChatMessageSources-root')).toBeInTheDocument();
    expect(screen.getByText('公司年度报告')).toHaveAttribute('href', 'https://example.com/report');
    expect(screen.getByLabelText('数据口径')).toBeInTheDocument();
    expect(screen.getByText('交易日 2026-01-02')).toBeInTheDocument();
    expect(screen.getByText('币种 CNY')).toBeInTheDocument();
  });

  it('在 Drawer 模式保留关闭动作', async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(<EvidenceRail drawer message={message} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '关闭证据面板' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
