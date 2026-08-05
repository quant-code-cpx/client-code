import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Markdown, safeMarkdownUrl } from 'src/components/markdown/markdown';

import { BlockRenderer } from './blocks/block-renderer';

import type { AgentMessageEntity } from '../state/agent-state.types';

export type AgentReportCitation = {
  citationId: string;
  blockId: string;
  claimKey: string;
  title: string;
  canonicalUrl?: string | null;
  retrievedAt: string;
  conclusionLevel?: string;
  sourceType?: string;
  publisher?: string | null;
  locator?: object;
};

type AgentReportContentProps = {
  messageId: string;
  runId: string;
  contentText?: string | null;
  contentBlocks: unknown[];
  citations: AgentReportCitation[];
};

function blockCitations(citations: AgentReportCitation[]): AgentMessageEntity['citations'] {
  return citations.map((citation) => ({
    citationId: citation.citationId,
    blockId: citation.blockId,
    claimKey: citation.claimKey,
    title: citation.title,
    canonicalUrl: citation.canonicalUrl ?? null,
    retrievedAt: citation.retrievedAt,
    conclusionLevel: citation.conclusionLevel ?? 'FACT',
    sourceType: citation.sourceType ?? 'REPORT',
    publisher: citation.publisher ?? null,
    locator: citation.locator ?? {},
  })) as AgentMessageEntity['citations'];
}

export function AgentReportContent({
  messageId,
  runId,
  contentText,
  contentBlocks,
  citations,
}: AgentReportContentProps) {
  const renderCitations = blockCitations(citations);

  return (
    <Stack spacing={2}>
      {contentText ? <Markdown>{contentText}</Markdown> : null}

      {contentBlocks.length > 0 ? (
        <Stack spacing={1.5}>
          {contentBlocks.map((block, index) => (
            <BlockRenderer
              key={typeof block === 'object' && block !== null && 'blockId' in block ? String(block.blockId) : `${messageId}-${index}`}
              block={block}
              context={{
                messageId,
                runId,
                streaming: false,
                richBlocksEnabled: true,
                citations: renderCitations,
              }}
            />
          ))}
        </Stack>
      ) : null}

      {citations.length > 0 ? (
        <Box component="section" aria-label="报告引用来源">
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
            <Iconify icon="solar:document-text-bold" width={18} />
            <Typography variant="subtitle2">引用来源</Typography>
          </Stack>
          <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {citations.map((citation, index) => {
              const href = citation.canonicalUrl ? safeMarkdownUrl(citation.canonicalUrl) : '';
              return (
                <Box
                  component="li"
                  id={`citation-${citation.citationId}`}
                  key={citation.citationId}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    p: 1.25,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    [{index + 1}]
                  </Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    {href ? (
                      <Link href={href} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ fontWeight: 700 }}>
                        {citation.title}
                      </Link>
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {citation.title}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      {[citation.publisher, citation.sourceType, fDateTime(citation.retrievedAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
