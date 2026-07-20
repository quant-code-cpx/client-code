import type { MarkdownBlock as MarkdownBlockValue } from 'src/types/agent/generated';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Markdown } from 'src/components/markdown/markdown';

import { DataProvenance } from '../data-provenance';

import type { BlockRenderContext } from './block-renderer';

export function MarkdownBlock({
  block,
  context,
}: {
  block: MarkdownBlockValue;
  context: BlockRenderContext;
}) {
  return (
    <Box>
      {block.title ? <Typography variant="subtitle1">{block.title}</Typography> : null}
      <Markdown
        streaming={context.streaming}
        citationResolver={(citationId) => {
          const citation = context.citations.find((item) => item.citationId === citationId);
          if (!citation) return null;
          return { href: citation.canonicalUrl ?? `#citation-${citationId}`, label: citation.title };
        }}
      >
        {block.text}
      </Markdown>
      {block.provenance ? <DataProvenance provenance={block.provenance} /> : null}
    </Box>
  );
}
