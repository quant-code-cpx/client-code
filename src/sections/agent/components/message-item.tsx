import type { LabelColor } from 'src/components/label/types';

import { varAlpha } from 'minimal-shared/utils';
import { memo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { fDateTime } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown/markdown';

import { CitationList } from './citation-list';
import { ThinkingPanel } from './thinking-panel';
import { BlockRenderer } from './blocks/block-renderer';
import { groupCitationSources } from '../lib/evidence-display';
import { parseSupportedMessageBlock } from '../lib/message-block-guards';

import type {
  AgentMessageEntity,
  AgentRunProjection,
  AgentMessageSiblingGroup,
} from '../state/agent-state.types';

type MessageItemProps = {
  message: AgentMessageEntity;
  run: AgentRunProjection | null;
  onRegenerate: (messageId: string) => void;
  onRetry: (message: AgentMessageEntity) => void;
  onSaveReport: (runId: string) => void;
  onContinue: () => void;
  onRetryFinalSnapshot: () => void;
  siblingGroup?: AgentMessageSiblingGroup;
  canMutateMessage?: boolean;
  branchChanging?: boolean;
  onViewBranch?: (messageId: string) => void;
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

function MessageItemComponent({
  message,
  run,
  onRegenerate,
  onRetry,
  onSaveReport,
  onContinue,
  onRetryFinalSnapshot,
  siblingGroup,
  canMutateMessage = true,
  branchChanging = false,
  onViewBranch = () => undefined,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'USER';
  const isAssistant = message.role === 'ASSISTANT';
  const roleLabel = isUser
    ? '研究命题'
    : isAssistant
      ? '研究助理'
      : message.role === 'TOOL'
        ? '工具记录'
        : '系统';
  const streaming = message.status === 'PENDING' || message.status === 'STREAMING';
  const matchingRun =
    isAssistant &&
    run &&
    (run.assistantMessageId === message.messageId || run.runId === message.run?.runId)
      ? run
      : null;
  const runId = message.run?.runId ?? matchingRun?.runId ?? null;
  const runStatusVersion = message.run?.statusVersion ?? matchingRun?.statusVersion;
  const hasMarkdownBlock = message.contentBlocks.some((input) => {
    const result = parseSupportedMessageBlock(input);
    return result.ok && result.block.type === 'MARKDOWN';
  });
  const canRegenerate =
    canMutateMessage &&
    message.role === 'ASSISTANT' &&
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(message.status);
  const canSaveReport =
    isAssistant &&
    message.status === 'COMPLETED' &&
    Boolean(message.run?.runId) &&
    message.citations.length > 0;
  const selectedSiblingVersion = siblingGroup?.versions.find(
    (version) => version.messageId === message.messageId
  );
  const citationSourceCount = groupCitationSources(message.citations).length;
  const failedModelMessage = run?.modelDiagnostics?.find((item) => item.status === 'FAILED')?.error
    ?.message;
  const failureReason =
    isAssistant && message.status === 'FAILED'
      ? (run?.errorMessage ??
        failedModelMessage ??
        message.run?.errorMessage ??
        '研究执行失败，暂未收到具体原因。请检查模型、连接和调用日志。')
      : null;
  const errorCode = run?.errorCode ?? message.run?.errorCode;
  const failureCode = errorCode != null ? `错误 ${errorCode} · ` : '';

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
      component="div"
      aria-label={isUser ? '你的消息' : 'Agent 回答'}
      sx={{
        width: 1,
        maxWidth: 1160,
        mx: 'auto',
        px: { xs: 2, md: 3.25 },
        py: { xs: 1.75, md: 2.25 },
      }}
    >
      <Box
        sx={(theme) => ({
          width: 1,
          maxWidth: isUser ? 760 : 1080,
          minWidth: 0,
          ml: isUser ? 'auto' : 0,
          ...(isUser && {
            px: 2.25,
            py: 1.75,
            borderRadius: '12px 12px 2px 12px',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
            border: `1px solid ${theme.vars.palette.divider}`,
          }),
          ...(isAssistant && {
            px: { xs: 2, md: 2.5 },
            pt: 2,
            pb: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: theme.vars.palette.background.paper,
          }),
          '&:hover .agent-message-actions, &:focus-within .agent-message-actions': {
            opacity: 1,
          },
        })}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{ mb: isUser ? 0.75 : 1.5, minHeight: 24 }}
        >
          {isAssistant ? (
            <Box
              sx={(theme) => ({
                width: 24,
                height: 24,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0.75,
                color: 'primary.main',
                bgcolor: theme.vars.palette.background.default,
              })}
            >
              <Iconify icon="solar:magic-stick-3-bold-duotone" width={15} />
            </Box>
          ) : null}
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {roleLabel}
          </Typography>
          {isAssistant && siblingGroup ? (
            <>
              <Label
                color={
                  selectedSiblingVersion?.isActive
                    ? 'success'
                    : selectedSiblingVersion?.status === 'PENDING' ||
                        selectedSiblingVersion?.status === 'STREAMING'
                      ? 'info'
                      : 'default'
                }
                variant="soft"
              >
                {selectedSiblingVersion?.isActive
                  ? `当前分支 · V${message.version}`
                  : selectedSiblingVersion?.status === 'PENDING' ||
                      selectedSiblingVersion?.status === 'STREAMING'
                    ? `生成中 · V${message.version}`
                    : `历史版本 · V${message.version}`}
              </Label>
              {siblingGroup.totalVersions > 1 ? (
                <FormControl size="small" sx={{ minWidth: 132 }}>
                  <Select
                    value={message.messageId}
                    disabled={branchChanging}
                    inputProps={{ 'aria-label': '回答版本' }}
                    onChange={(event) => onViewBranch(event.target.value)}
                    sx={{ height: 28, fontSize: '0.75rem' }}
                  >
                    {siblingGroup.versions.map((version) => (
                      <MenuItem key={version.messageId} value={version.messageId}>
                        V{version.version}
                        {version.isActive
                          ? ' · 当前分支'
                          : version.isDisplayed
                            ? ' · 正在查看'
                            : version.status === 'COMPLETED'
                              ? ' · 历史'
                              : ` · ${STATUS_LABELS[version.status]}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </>
          ) : null}
          {message.deliveryStatus === 'UNSENT' || message.status !== 'COMPLETED' ? (
            <Label color={statusColor(message.status)} variant="soft">
              {message.deliveryStatus === 'UNSENT' ? '未发送' : STATUS_LABELS[message.status]}
            </Label>
          ) : null}
          <Typography variant="caption" sx={{ ml: 'auto !important', color: 'text.disabled' }}>
            {fDateTime(message.createdAt)}
          </Typography>
        </Stack>

        {isAssistant ? (
          <Stack
            direction="row"
            spacing={2}
            alignItems="flex-start"
            justifyContent="space-between"
            sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 0.5,
                  color: 'primary.light',
                  fontWeight: 700,
                  letterSpacing: 1.05,
                }}
              >
                RESEARCH DOSSIER{message.modelName ? ` / ${message.modelName}` : ''}
              </Typography>
              <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
                研究结论
              </Typography>
            </Box>
            {message.citations.length > 0 ? (
              <Box
                sx={{
                  minWidth: 90,
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                  已关联引用
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.25, fontWeight: 500 }}>
                  {citationSourceCount} 项
                </Typography>
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {isAssistant && runId ? (
          <ThinkingPanel
            runId={runId}
            statusVersion={runStatusVersion}
            messageStatus={message.status}
            run={matchingRun}
            onContinue={onContinue}
          />
        ) : null}

        {matchingRun?.finalSnapshotError ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={onRetryFinalSnapshot}>
                重新加载
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {matchingRun.finalSnapshotError}
          </Alert>
        ) : null}

        {failureReason ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
              研究失败
            </Typography>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {failureCode}
              {failureReason}
            </Typography>
            {run?.retryable ? (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                此错误可重试；请修正配置后重新生成。
              </Typography>
            ) : null}
          </Alert>
        ) : null}

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
        ) : message.contentBlocks.length === 0 && !runId && !failureReason ? (
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

        <CitationList citations={message.citations} />

        <Stack
          className="agent-message-actions"
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={(theme) => ({
            mt: isAssistant ? 1.25 : 1,
            pt: isAssistant ? 1 : 0,
            borderTop: isAssistant ? 1 : 0,
            borderColor: 'divider',
            opacity: { xs: 1, md: 0.64 },
            transition: theme.transitions.create('opacity', {
              duration: theme.transitions.duration.short,
            }),
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          })}
        >
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
              <IconButton
                size="small"
                aria-label="保存研究报告"
                onClick={() => onSaveReport(message.run!.runId)}
              >
                <Iconify icon="solar:document-add-bold" width={17} />
              </IconButton>
            </Tooltip>
          ) : null}
          {message.deliveryStatus === 'UNSENT' && canMutateMessage ? (
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
