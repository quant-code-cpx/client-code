import type { DataProvenance as DataProvenanceValue } from 'src/types/agent/generated';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { ChatMessageSources } from '@mui/x-chat/ChatMessageSources';

import { Iconify } from 'src/components/iconify';

import { CitationItems } from './citation-list';
import { DataProvenance } from './data-provenance';
import { parseSupportedMessageBlock } from '../lib/message-block-guards';

import type { AgentMessageEntity } from '../state/agent-state.types';

type EvidenceRailProps = {
  message: AgentMessageEntity;
  drawer?: boolean;
  onClose?: () => void;
};

function collectProvenance(message: AgentMessageEntity): DataProvenanceValue[] {
  const items = message.contentBlocks.flatMap((input) => {
    const parsed = parseSupportedMessageBlock(input);
    if (!parsed.ok || !('provenance' in parsed.block) || !parsed.block.provenance) return [];
    return [parsed.block.provenance];
  });
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function EvidenceRail({ message, drawer = false, onClose }: EvidenceRailProps) {
  const provenance = useMemo(() => collectProvenance(message), [message]);

  return (
    <Box
      component="aside"
      aria-label="证据面板"
      sx={{
        width: drawer ? 1 : 320,
        minWidth: drawer ? 0 : 320,
        minHeight: 0,
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        borderLeft: drawer ? 0 : 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ minHeight: 64, px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Iconify icon="solar:file-text-bold" width={19} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              引用与证据
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'text.disabled', letterSpacing: 0.7 }}
            >
              EVIDENCE LEDGER
            </Typography>
          </Box>
        </Stack>
        {onClose ? (
          <IconButton aria-label="关闭证据面板" onClick={onClose} sx={{ width: 44, height: 44 }}>
            <Iconify icon="solar:close-circle-bold" width={19} />
          </IconButton>
        ) : null}
      </Stack>

      <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            引用来源
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            与正文联动
          </Typography>
        </Stack>
        <ChatMessageSources
          label={`${message.citations.length} 条已关联引用`}
          sx={{
            mt: 0,
            gap: 1,
            '& .MuiChatMessageSources-label': {
              color: 'text.primary',
              fontWeight: 500,
            },
            '& .MuiChatMessageSources-list': { gap: 1 },
          }}
        >
          <CitationItems
            citations={message.citations}
            variant="rail"
            idPrefix="evidence-citation"
          />
        </ChatMessageSources>

        {provenance.length > 0 ? (
          <Box
            component="section"
            aria-label="数据口径"
            sx={{ mt: message.citations.length > 0 ? 3 : 0 }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
              <Iconify icon="solar:layers-bold" width={18} />
              <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                数据口径 / Provenance
              </Typography>
            </Stack>
            <Stack spacing={1.5} divider={<Divider flexItem />}>
              {provenance.map((item, index) => (
                <DataProvenance key={`${item.sourceType}-${index}`} provenance={item} />
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
