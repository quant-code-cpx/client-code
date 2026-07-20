import type { LabelColor } from 'src/components/label/types';

import { memo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import type { AgentMessageEntity } from '../state/agent-state.types';

type MessageItemProps = {
  message: AgentMessageEntity;
  onRegenerate: (messageId: string) => void;
  onRetry: (message: AgentMessageEntity) => void;
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

function MessageItemComponent({ message, onRegenerate, onRetry }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'USER';
  const canRegenerate =
    message.role === 'ASSISTANT' &&
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(message.status);

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
            {isUser ? '你' : 'Agent'}
          </Typography>
          <Label color={statusColor(message.status)} variant="soft">
            {message.deliveryStatus === 'UNSENT' ? '未发送' : STATUS_LABELS[message.status]}
          </Label>
          <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.disabled' }}>
            {fDateTime(message.createdAt)}
          </Typography>
        </Stack>

        {message.contentText ? (
          <Typography
            variant="body1"
            component="div"
            sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.75 }}
          >
            {message.contentText}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
            {message.status === 'PENDING' ? '等待研究开始…' : '暂无可展示内容'}
          </Typography>
        )}

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
