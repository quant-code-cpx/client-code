import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import type { AutosaveStatus } from './use-note-autosave';

const STATUS_LABEL: Record<
  AutosaveStatus,
  { text: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  idle: { text: '已同步', color: 'default' },
  dirty: { text: '未保存', color: 'warning' },
  saving: { text: '保存中…', color: 'info' },
  saved: { text: '已保存', color: 'success' },
  error: { text: '保存失败', color: 'error' },
  offline: { text: '离线', color: 'error' },
};

type ResearchNoteDetailHeaderProps = {
  title: string;
  isNew: boolean;
  isUnsavedNewNote: boolean;
  isPinned: boolean;
  noteUnavailable: boolean;
  editingDisabled: boolean;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
  onBack: () => void;
  onTogglePinned: () => void;
  onDelete: () => void;
  onSave: () => void;
};

export function ResearchNoteDetailHeader({
  title,
  isNew,
  isUnsavedNewNote,
  isPinned,
  noteUnavailable,
  editingDisabled,
  autosaveStatus,
  lastSavedAt,
  onBack,
  onTogglePinned,
  onDelete,
  onSave,
}: ResearchNoteDetailHeaderProps) {
  const statusInfo = STATUS_LABEL[autosaveStatus];

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ mb: 2 }}
    >
      <Tooltip title="返回" arrow>
        <IconButton aria-label="返回" onClick={onBack}>
          <Iconify icon="solar:arrow-left-bold" />
        </IconButton>
      </Tooltip>

      <Typography variant="h5" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
        {isUnsavedNewNote ? '新建笔记' : title || '（未命名笔记）'}
      </Typography>

      <Chip
        size="small"
        label={
          statusInfo.text +
          (lastSavedAt && autosaveStatus === 'saved' ? ` · ${fDateTime(lastSavedAt)}` : '')
        }
        color={statusInfo.color}
        variant={autosaveStatus === 'idle' ? 'outlined' : 'filled'}
        sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
      />

      <Tooltip
        title={
          noteUnavailable
            ? '笔记不可用'
            : editingDisabled
              ? '笔记尚未加载'
              : isPinned
                ? '取消置顶'
                : '置顶'
        }
        arrow
      >
        <span>
          <IconButton
            aria-label={isPinned ? '取消置顶' : '置顶'}
            onClick={onTogglePinned}
            color={isPinned ? 'warning' : 'default'}
            disabled={editingDisabled}
          >
            <Iconify icon={isPinned ? 'solar:pin-bold' : 'solar:pin-linear'} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="历史版本（即将上线）" arrow>
        <span>
          <IconButton aria-label="历史版本（即将上线）" disabled>
            <Iconify icon="solar:history-bold" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="AI 摘要（即将上线）" arrow>
        <span>
          <IconButton aria-label="AI 摘要（即将上线）" disabled>
            <Iconify icon="solar:pulse-2-bold-duotone" />
          </IconButton>
        </span>
      </Tooltip>

      {!isNew ? (
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          onClick={onDelete}
          disabled={editingDisabled}
        >
          删除
        </Button>
      ) : null}

      <Button
        variant="contained"
        size="small"
        startIcon={<Iconify icon="solar:diskette-bold" />}
        onClick={onSave}
        loading={autosaveStatus === 'saving'}
        disabled={editingDisabled}
      >
        保存（⌘S）
      </Button>
    </Stack>
  );
}
