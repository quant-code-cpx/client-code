import type { LabelColor } from 'src/components/label/types';

import { memo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown/markdown';

import { CitationList } from './citation-list';
import { ToolCallList } from './tool-call-card';
import { BlockRenderer } from './blocks/block-renderer';
import { parseSupportedMessageBlock } from '../lib/message-block-guards';

import type { AgentMessageEntity } from '../state/agent-state.types';

type MessageItemProps = {
  message: AgentMessageEntity;
  onRegenerate: (messageId: string) => void;
  onRetry: (message: AgentMessageEntity) => void;
  onSaveReport: (runId: string) => void;
};

const STATUS_LABELS = {
  PENDING: '等待中',
  STREAMING: '生成中',
  COMPLETED: '已完成',
  FAILED: '失败',
  CANCELLED: '已停止',
} as const;

function statusColor(status: AgentMessageEntity['status']): LabelColor {
  if (status === 'FAILED') return 'error';
  if (status === 'CANCELLED') return 'warning';
  if (status === 'COMPLETED') return 'success';
  return 'info';
}

function MessageItemComponent({ message, onRegenerate, onRetry, onSaveReport }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'USER';
  const isAssistant = message.role === 'ASSISTANT';
  const roleLabel = isUser ? '你' : isAssistant ? 'Agent' : message.role === 'TOOL' ? 'Tool' : '系统';
  const streaming = message.status === 'PENDING' || message.status === 'STREAMING';
  const hasMarkdownBlock = message.contentBlocks.some((input) => {
    const result = parseSupportedMessageBlock(input);
    return result.ok && result.block.type === 'MARKDOWN';
  });
  const canRegenerate =
    message.role === 'ASSISTANT' &&
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(message.status);
  const canSaveReport = isAssistant && message.status === 'COMPLETED' && Boolean(message.run?.runId);

  const handleCopy = useCallback(async () => {
    if (!message.contentText) return;
    try {
      await navigator.clipboard.writeText(message.contentText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [message.contentText]);

  return (
    <Box
      component="article"
      aria-label={isUser ? '你的消息' : 'Agent 回答'}
      sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', px: { xs: 2, md: 4 }, py: 1.5 }}
    >
      <Box
        sx={(theme) => ({
          width: isUser ? 'min(78%, 680px)' : 'min(100%, 860px)',
          minWidth: 0,
          ...(isUser && {
            px: 2,
            py: 1.5,
            borderRadius: 1,
            bgcolor: theme.vars.palette.action.selected,
            border: `1px solid ${theme.vars.palette.divider}`,
          }),
        })}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75, minHeight: 24 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {roleLabel}
          </Typography>
          <Label color={statusColor(message.status)} variant="soft">
            {message.deliveryStatus === 'UNSENT' ? '未发送' : STATUS_LABELS[message.status]}
          </Label>
          <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.disabled' }}>
            {fDateTime(message.createdAt)}
          </Typography>
        </Stack>

        {message.contentText && (isUser || !hasMarkdownBlock) ? (
          isUser ? (
            <Typography
              variant="body1"
              component="div"
              sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.75 }}
            >
              {message.contentText}
            </Typography>
          ) : (
            <Markdown streaming={streaming}>{message.contentText}</Markdown>
          )
        ) : message.contentBlocks.length === 0 ? (
          <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
            {message.status === 'PENDING' ? '等待研究开始…' : '暂无可展示内容'}
          </Typography>
        ) : null}

        {isAssistant && !streaming && message.contentBlocks.length > 0 ? (
          <Stack spacing={1.5} sx={{ mt: message.contentText && !hasMarkdownBlock ? 1.5 : 0 }}>
            {message.contentBlocks.map((block, index) => (
              <BlockRenderer
                key={
                  typeof block.blockId === 'string'
                    ? block.blockId
                    : `${message.messageId}-block-${index}`
                }
                block={block}
                context={{
                  messageId: message.messageId,
                  runId: message.run?.runId,
                  streaming: false,
                  richBlocksEnabled: CONFIG.agentRichBlocksEnabled,
                  citations: message.citations,
                }}
              />
            ))}
          </Stack>
        ) : null}

        <ToolCallList
          runId={message.run?.runId}
          statusVersion={message.run?.statusVersion}
          enabled={isAssistant && CONFIG.agentRichBlocksEnabled}
        />
        <CitationList citations={message.citations} />

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
          {message.contentText ? (
            <Tooltip title={copied ? '已复制' : '复制'}>
              <IconButton size="small" aria-label="复制消息" onClick={handleCopy}>
                <Iconify icon="solar:copy-bold" width={16} />
              </IconButton>
            </Tooltip>
          ) : null}
          {canRegenerate ? (
            <Tooltip title="重新生成">
              <IconButton
                size="small"
                aria-label="重新生成回答"
                onClick={() => onRegenerate(message.messageId)}
              >
                <Iconify icon="solar:restart-bold" width={17} />
              </IconButton>
            </Tooltip>
          ) : null}
          {canSaveReport && message.run?.runId ? (
            <Tooltip title="保存研究报告">
              <IconButton size="small" aria-label="保存研究报告" onClick={() => onSaveReport(message.run!.runId)}>
                <Iconify icon="solar:document-add-bold" width={17} />
              </IconButton>
            </Tooltip>
          ) : null}
          {message.deliveryStatus === 'UNSENT' ? (
            <Button size="small" onClick={() => onRetry(message)}>
              重新发送
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}

export const MessageItem = memo(MessageItemComponent);
