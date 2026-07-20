import { useRef, useMemo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

const MAX_MESSAGE_LENGTH = 10_000;

type ComposerProps = {
  value: string;
  recovered: boolean;
  isSending: boolean;
  isRunning: boolean;
  stopping: boolean;
  error: string | null;
  onChange: (value: string) => void;
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
  onChange,
  onSubmit,
  onStop,
}: ComposerProps) {
  const composingRef = useRef(false);
  const trimmedLength = value.trim().length;
  const tooLong = value.length > MAX_MESSAGE_LENGTH;
  const canSubmit = trimmedLength > 0 && !tooLong && !isSending;
  const helperText = useMemo(() => {
    if (tooLong) return `已超过 ${MAX_MESSAGE_LENGTH.toLocaleString()} 字限制`;
    if (recovered && value.length > 0) return '已恢复未发送草稿';
    return ' ';
  }, [recovered, tooLong, value.length]);

  return (
    <Box
      component="form"
      aria-label="发送研究问题"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
      sx={(theme) => ({
        borderTop: 1,
        borderColor: 'divider',
        px: { xs: 1.5, md: 3 },
        pt: 1.5,
        pb: `max(${theme.spacing(1.5)}, env(safe-area-inset-bottom))`,
      })}
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          value={value}
          name="agent-prompt"
          autoComplete="off"
          error={tooLong}
          helperText={helperText}
          placeholder="输入研究问题…"
          onChange={(event) => onChange(event.target.value)}
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
          slotProps={{
            htmlInput: { 'aria-label': '研究问题', 'aria-describedby': 'agent-composer-count' },
          }}
        />
        {isRunning ? (
          <Tooltip title="停止研究">
            <span>
              <IconButton
                color="warning"
                aria-label="停止研究"
                disabled={stopping}
                onClick={onStop}
                sx={{ width: 44, height: 44, mb: 3 }}
              >
                <Iconify icon="solar:stop-circle-bold" width={24} />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title="发送">
            <span>
              <IconButton
                type="submit"
                color="primary"
                disabled={!canSubmit}
                aria-label="发送问题"
                sx={{ width: 44, height: 44, mb: 3 }}
              >
                {isSending ? (
                  <CircularProgress size={20} />
                ) : (
                  <Iconify icon="solar:arrow-right-bold" width={22} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
      <Typography
        id="agent-composer-count"
        variant="caption"
        sx={{ display: 'block', mt: -2.5, mr: 7, textAlign: 'right', color: tooLong ? 'error.main' : 'text.disabled', pointerEvents: 'none' }}
      >
        {value.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
      </Typography>
    </Box>
  );
}
