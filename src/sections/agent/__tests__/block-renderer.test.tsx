import type { TableBlock } from 'src/types/agent/generated';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MESSAGE_BLOCK_FIXTURES } from 'src/types/agent/generated';

import { BlockRenderer } from '../components/blocks/block-renderer';
import { toCsvCell, formatFinanceValue } from '../lib/format-finance-value';
import { BlockErrorBoundary } from '../components/blocks/block-error-boundary';

vi.mock('src/components/chart/chart', () => ({
  Chart: ({ type }: { type: string }) => <div data-testid={`chart-${type}`} />,
}));

const context = {
  messageId: 'msg_test',
  runId: 'run_test',
  streaming: false,
  richBlocksEnabled: true,
  citations: [],
};

describe('BlockRenderer', () => {
  it('固定映射渲染全部 canonical block', () => {
    renderWithProviders(
      <>
        {MESSAGE_BLOCK_FIXTURES.map((block) => (
          <BlockRenderer key={block.blockId} block={block} context={context} />
        ))}
      </>
    );

    ['MARKDOWN', 'TABLE', 'CHART', 'KLINE', 'FINANCIAL_METRICS', 'RISK_NOTICE'].forEach(
      (type) => expect(document.querySelector(`[data-block-type="${type}"]`)).not.toBeNull()
    );
    expect(screen.getByText('研究结论')).toBeInTheDocument();
    expect(screen.getByText('内容仅供研究，不构成投资建议。')).toBeInTheDocument();
  });

  it('未知版本和超限块局部降级', () => {
    const table = MESSAGE_BLOCK_FIXTURES.find((block) => block.type === 'TABLE') as TableBlock;
    renderWithProviders(
      <>
        <BlockRenderer block={{ ...table, schemaVersion: 2 }} context={context} />
        <BlockRenderer
          block={{ ...table, rows: Array.from({ length: 201 }, (_, index) => ({ tsCode: `code_${index}` })) }}
          context={context}
        />
      </>
    );

    expect(screen.getByText(/版本未知或结构不合法/)).toBeInTheDocument();
    expect(screen.getByText(/表格行数超过展示上限/)).toBeInTheDocument();
  });

  it('单块异常不破坏后续内容', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const eventHandler = vi.fn();
    window.addEventListener('agent:block-render-error', eventHandler);
    function Bomb(): never {
      throw new Error('boom');
    }

    renderWithProviders(
      <>
        <BlockErrorBoundary blockId="broken"><Bomb /></BlockErrorBoundary>
        <div>后续内容</div>
      </>
    );

    expect(screen.getByText(/此数据块渲染失败/)).toBeInTheDocument();
    expect(screen.getByText('后续内容')).toBeInTheDocument();
    expect(eventHandler).toHaveBeenCalled();
    window.removeEventListener('agent:block-render-error', eventHandler);
    consoleSpy.mockRestore();
  });

  it('金融比例、null、真实 0 与 CSV 公式注入规则固定', () => {
    expect(formatFinanceValue(null, { unit: '元' })).toBe('—');
    expect(formatFinanceValue(0, { unit: '元' })).toBe('0 元');
    expect(formatFinanceValue(0.325, { scale: 'DECIMAL' })).toBe('32.5%');
    expect(formatFinanceValue(32.5, { scale: 'PERCENT' })).toBe('32.5%');
    expect(toCsvCell('=HYPERLINK("https://evil")')).toBe('"\'=HYPERLINK(""https://evil"")"');
  });
});
