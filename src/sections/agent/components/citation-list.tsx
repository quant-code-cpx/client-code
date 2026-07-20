import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { safeMarkdownUrl } from 'src/components/markdown/markdown';

import type { AgentMessageEntity } from '../state/agent-state.types';

type Citation = AgentMessageEntity['citations'][number];

type CitationListProps = {
  citations: Citation[];
};

function locatorText(locator: Citation['locator']): string | null {
  const parts = Object.entries(locator)
    .filter(([, value]) => ['string', 'number'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 80)}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) return null;

  return (
    <Box component="section" aria-label="引用来源" sx={{ mt: 2 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
        <Iconify icon="solar:document-text-bold" width={18} />
        <Typography variant="subtitle2">引用来源</Typography>
        <Label variant="soft" color="default">
          {citations.length}
        </Label>
      </Stack>
      <Stack component="ol" spacing={1} sx={{ p: 0, m: 0, listStyle: 'none' }}>
        {citations.map((citation, index) => {
          const safeUrl = citation.canonicalUrl ? safeMarkdownUrl(citation.canonicalUrl) : '';
          const locator = locatorText(citation.locator);
          return (
            <Box
              component="li"
              id={`citation-${citation.citationId}`}
              key={citation.citationId}
              sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Typography variant="caption" sx={{ minWidth: 20, color: 'text.disabled' }}>
                  [{index + 1}]
                </Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  {safeUrl ? (
                    <Link
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ fontWeight: 700 }}
                    >
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
                  {locator ? (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                      {locator}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
