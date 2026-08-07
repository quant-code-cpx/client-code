import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { safeMarkdownUrl } from 'src/components/markdown/markdown';

import {
  sourceTypeLabel,
  citationDisplayTitle,
  groupCitationSources,
} from '../lib/evidence-display';

import type { AgentMessageEntity } from '../state/agent-state.types';

type Citation = AgentMessageEntity['citations'][number];

type CitationListProps = {
  citations: Citation[];
  idPrefix?: string;
  variant?: 'inline' | 'rail';
};

type CitationItemsProps = Required<Pick<CitationListProps, 'citations' | 'idPrefix' | 'variant'>>;

function locatorText(locator: Citation['locator']): string | null {
  if (locator.section && typeof locator.paragraph === 'number') {
    return `报告位置：${locator.section}，第 ${locator.paragraph} 段`;
  }
  if (locator.section) return `报告位置：${locator.section}`;
  if (typeof locator.paragraph === 'number') return `报告位置：第 ${locator.paragraph} 段`;
  return locator.factId ? '已用于支撑本条研究结论' : null;
}

export function CitationItems({ citations, idPrefix, variant }: CitationItemsProps) {
  const rail = variant === 'rail';
  const groups = groupCitationSources(citations);

  return (
    <>
      {groups.map(({ primary: citation, citations: groupedCitations }, index) => {
        const safeUrl = citation.canonicalUrl ? safeMarkdownUrl(citation.canonicalUrl) : '';
        const locator = locatorText(citation.locator);
        return (
          <Box
            component="li"
            id={`${idPrefix}-${citation.citationId}`}
            key={citation.citationId}
            sx={(theme) => ({
              p: 1.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.25,
              bgcolor: rail ? theme.vars.palette.background.paper : 'transparent',
              ...(rail && {
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: theme.vars.palette.action.hover,
                },
              }),
            })}
          >
            {groupedCitations.slice(1).map((item) => (
              <Box
                aria-hidden="true"
                component="span"
                id={`${idPrefix}-${item.citationId}`}
                key={item.citationId}
                sx={{ position: 'absolute' }}
              />
            ))}
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
                    sx={{ fontWeight: 500 }}
                  >
                    {citationDisplayTitle(citation.title)}
                  </Link>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {citationDisplayTitle(citation.title)}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  {[citation.publisher, sourceTypeLabel(citation.sourceType), fDateTime(citation.retrievedAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
                {locator ? (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                    {locator}
                  </Typography>
                ) : null}
                {groupedCitations.length > 1 ? (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                    已用于支撑 {groupedCitations.length} 条研究结论
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>
        );
      })}
    </>
  );
}

export function CitationList({
  citations,
  idPrefix = 'citation',
  variant = 'inline',
}: CitationListProps) {
  if (citations.length === 0) return null;
  const sourceCount = groupCitationSources(citations).length;

  return (
    <Box component="section" aria-label="引用来源" sx={{ mt: variant === 'rail' ? 0 : 2 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
        <Iconify icon="solar:document-text-bold" width={18} />
        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
          引用来源
        </Typography>
        <Label variant="soft" color="default">
          {sourceCount}
        </Label>
      </Stack>
      <Stack component="ol" spacing={1} sx={{ p: 0, m: 0, listStyle: 'none' }}>
        <CitationItems citations={citations} idPrefix={idPrefix} variant={variant} />
      </Stack>
    </Box>
  );
}
