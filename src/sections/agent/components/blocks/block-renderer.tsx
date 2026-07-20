import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

import { ChartBlock } from './chart-block';
import { MarkdownBlock } from './markdown-block';
import { DataTableBlock } from './data-table-block';
import { RiskNoticeBlock } from './risk-notice-block';
import { StockKlineBlock } from './stock-kline-block';
import { BlockErrorBoundary } from './block-error-boundary';
import { FinancialMetricsBlock } from './financial-metrics-block';
import { parseSupportedMessageBlock } from '../../lib/message-block-guards';

import type { AgentMessageEntity } from '../../state/agent-state.types';

export type BlockRenderContext = {
  messageId: string;
  runId?: string | null;
  streaming: boolean;
  richBlocksEnabled: boolean;
  citations: AgentMessageEntity['citations'];
};

type BlockRendererProps = {
  block: unknown;
  context: BlockRenderContext;
};

export function BlockRenderer({ block: input, context }: BlockRendererProps) {
  const parsed = parseSupportedMessageBlock(input);
  if (!parsed.ok) {
    return <Alert severity="warning">此内容块暂无法展示：{parsed.reason}。</Alert>;
  }

  const { block } = parsed;
  if (!context.richBlocksEnabled && block.type !== 'MARKDOWN') {
    return <Alert severity="info">富数据块灰度开关未开启，当前版本暂不展示此数据块。</Alert>;
  }

  let content: React.ReactNode;
  switch (block.type) {
    case 'MARKDOWN':
      content = <MarkdownBlock block={block} context={context} />;
      break;
    case 'TABLE':
      content = <DataTableBlock block={block} />;
      break;
    case 'CHART':
      content = <ChartBlock block={block} />;
      break;
    case 'KLINE':
      content = <StockKlineBlock block={block} />;
      break;
    case 'FINANCIAL_METRICS':
      content = <FinancialMetricsBlock block={block} />;
      break;
    case 'RISK_NOTICE':
      content = <RiskNoticeBlock block={block} />;
      break;
    default:
      content = <Alert severity="warning">此内容块类型暂不支持。</Alert>;
  }

  return (
    <BlockErrorBoundary blockId={block.blockId}>
      <Box
        component="section"
        data-block-type={block.type}
        sx={{ p: { xs: 1.5, md: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}
      >
        {content}
      </Box>
    </BlockErrorBoundary>
  );
}
