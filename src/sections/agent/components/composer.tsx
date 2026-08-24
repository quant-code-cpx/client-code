import { useRef, useMemo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import {
  ChatComposer,
  ChatComposerToolbar,
  ChatComposerTextArea,
  ChatComposerSendButton,
  ChatComposerHelperText,
} from '@mui/x-chat/ChatComposer';

import { Iconify } from 'src/components/iconify';

const MAX_MESSAGE_LENGTH = 10_000;
const COMPOSER_FEATURES = { attachments: false } as const;

type ComposerProps = {
  value: string;
  recovered: boolean;
  isSending: boolean;
  isRunning: boolean;
  stopping: boolean;
  error: string | null;
  blockedReason?: string | null;
  onSubmit: () => void;
  onStop: () => void;
};

export function Composer({
  value,
  recovered,
  isSending,
  isRunning,
  stopping,
  error,
  blockedReason = null,
  onSubmit,
  onStop,
}: ComposerProps) {
  const composingRef = useRef(false);
  const trimmedLength = value.trim().length;
  const tooLong = value.length > MAX_MESSAGE_LENGTH;
  const canSubmit = trimmedLength > 0 && !tooLong && !isSending && !blockedReason;
  const helperText = useMemo(() => {
    if (tooLong) return `已超过 ${MAX_MESSAGE_LENGTH.toLocaleString()} 字限制`;
    if (blockedReason) return blockedReason;
    if (recovered && value.length > 0) return '已恢复未发送草稿';
    return 'Enter 发送 · Shift + Enter 换行';
  }, [blockedReason, recovered, tooLong, value.length]);

  return (
    <Box
      component="section"
      aria-label="研究问题输入区"
      sx={(theme) => ({
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: theme.vars.palette.background.default,
        px: { xs: 1.5, md: 3.25 },
        pt: 1.5,
        pb: `max(${theme.spacing(1.5)}, env(safe-area-inset-bottom))`,
      })}
    >
      {error ? (
        <Alert severity="warning" sx={{ maxWidth: 1080, mx: 'auto', mb: 1 }}>
          {error}
        </Alert>
      ) : null}
      <ChatComposer
        aria-label="发送研究问题"
        disabled={Boolean(blockedReason)}
        features={COMPOSER_FEATURES}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
        sx={{
          maxWidth: 1080,
          mx: 'auto',
          mb: 0,
          px: 2,
          pt: 1.5,
          pb: 0.875,
          gap: 0.75,
          borderColor: tooLong ? 'error.main' : 'divider',
          borderRadius: 1.75,
          bgcolor: 'background.paper',
          boxShadow: 'none',
          '&:focus-within:not([data-disabled])': {
            borderColor: tooLong ? 'error.main' : 'primary.main',
            boxShadow: 2,
          },
        }}
      >
        <ChatComposerTextArea
          maxRows={6}
          name="agent-prompt"
          autoComplete="off"
          placeholder="继续追问，或要求补充数据验证…"
          aria-label="研究问题"
          aria-describedby="agent-composer-helper agent-composer-count"
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !composingRef.current &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          sx={{
            minHeight: 52,
            p: 0,
            fontSize: '0.9375rem',
            lineHeight: 1.7,
          }}
        />
        <ChatComposerToolbar sx={{ minHeight: 44, gap: 1 }}>
          <ChatComposerHelperText
            id="agent-composer-helper"
            sx={{
              minWidth: 0,
              flex: 1,
              p: 0,
              color: tooLong ? 'error.main' : recovered ? 'info.main' : 'text.disabled',
            }}
          >
            {helperText}
          </ChatComposerHelperText>
          <Typography
            id="agent-composer-count"
            variant="caption"
            sx={{
              color: tooLong ? 'error.main' : 'text.disabled',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
          </Typography>
          {isRunning ? (
            <Tooltip title="停止研究">
              <span>
                <IconButton
                  color="warning"
                  aria-label="停止研究"
                  disabled={stopping}
                  onClick={onStop}
                >
                  <Iconify icon="solar:stop-circle-bold" width={22} />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title="发送">
              <span>
                <ChatComposerSendButton
                  disabled={!canSubmit}
                  aria-label="发送问题"
                  sx={{ width: 44, height: 44, borderRadius: 1 }}
                >
                  {isSending ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Iconify icon="solar:arrow-right-bold" width={20} />
                  )}
                </ChatComposerSendButton>
              </span>
            </Tooltip>
          )}
        </ChatComposerToolbar>
      </ChatComposer>
    </Box>
  );
}
