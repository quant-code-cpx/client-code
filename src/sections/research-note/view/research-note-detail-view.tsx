import type { StockSearchItem } from 'src/api/stock';
import type { ResearchNote } from 'src/api/research-note';

import { useParams, useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteNote, getNoteById } from 'src/api/research-note';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import {
  stockItemFromCode,
  StockSearchAutocomplete,
} from 'src/components/stock-search-autocomplete';

import { NOTE_TEMPLATES } from '../templates';
import { useNoteAutosave } from '../use-note-autosave';
import { ResearchNoteEditor } from '../research-note-editor';
import { ResearchNotePreview } from '../research-note-preview';
import { ResearchNoteTagInput } from '../research-note-tag-input';
import { countWords, downloadNoteAsMarkdown, estimateReadingMinutes } from '../note-export';

import type { AutosaveStatus, AutosavePayload } from '../use-note-autosave';

// ----------------------------------------------------------------------

type ContentMode = 'edit' | 'preview';

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

export function ResearchNoteDetailView() {
  const { noteId } = useParams<{ noteId: string }>();
  const [searchParams] = useSearchParams();
  const router = useRouter();
  const isNew = noteId === 'new';

  const [noteIdState, setNoteIdState] = useState<number | null>(isNew ? null : Number(noteId));

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [mode, setMode] = useState<ContentMode>(isNew ? 'edit' : 'preview');

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [originalNote, setOriginalNote] = useState<ResearchNote | null>(null);

  // 加载详情 / 应用模板
  useEffect(() => {
    if (!isNew) {
      const id = Number(noteId);
      if (Number.isNaN(id)) {
        setError('无效的笔记 ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      getNoteById(id)
        .then((note) => {
          setTitle(note.title);
          setContent(note.content);
          setSelectedStock(stockItemFromCode(note.tsCode));
          setTags(note.tags);
          setIsPinned(note.isPinned);
          setOriginalNote(note);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '加载笔记失败');
        })
        .finally(() => setLoading(false));
      return;
    }

    // 新建：根据 query 应用模板 + 预填股票
    const tplId = searchParams.get('template');
    if (tplId) {
      const tpl = NOTE_TEMPLATES.find((t) => t.id === tplId);
      if (tpl) setContent(tpl.content);
    }
    const presetCode = searchParams.get('tsCode');
    if (presetCode) {
      setSelectedStock(stockItemFromCode(presetCode));
    }
  }, [noteId, isNew, searchParams]);

  // autosave
  const initialPayload: AutosavePayload = useMemo(
    () => ({
      title,
      content,
      tsCode: selectedStock?.tsCode ?? null,
      tags,
      isPinned,
    }),
    // 仅在加载完成后建立 baseline；后续不重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, isNew, originalNote?.id]
  );

  const handleAutoCreated = useCallback((note: ResearchNote) => {
    setNoteIdState(note.id);
    setOriginalNote(note);
    // 静默替换 URL，不刷页面
    window.history.replaceState(null, '', `/research/notes/${note.id}`);
    setSnackbar('已自动保存为新笔记');
  }, []);

  const autosave = useNoteAutosave({
    noteId: noteIdState,
    initial: initialPayload,
    onCreated: handleAutoCreated,
    enabled: !loading,
  });

  // schedule 触发
  useEffect(() => {
    if (loading) return;
    autosave.schedule({
      title,
      content,
      tsCode: selectedStock?.tsCode ?? null,
      tags,
      isPinned,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, selectedStock, tags, isPinned, loading]);

  // 快捷键：Cmd/Ctrl+S 立即保存；Cmd/Ctrl+E 切换预览
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void autosave.flush();
      } else if (k === 'e') {
        e.preventDefault();
        setMode((m) => (m === 'edit' ? 'preview' : 'edit'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [autosave]);

  const handleDelete = async () => {
    if (noteIdState === null) {
      setDeleteDialogOpen(false);
      router.push('/research/notes');
      return;
    }
    setDeleting(true);
    try {
      await deleteNote(noteIdState);
      setDeleteDialogOpen(false);
      router.push('/research/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    const noteForExport: ResearchNote = originalNote
      ? { ...originalNote, title, content, tags, tsCode: selectedStock?.tsCode ?? null, isPinned }
      : {
          id: noteIdState ?? 0,
          title,
          content,
          tags,
          tsCode: selectedStock?.tsCode ?? null,
          isPinned,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    if (!noteForExport.title.trim()) {
      setError('请先填写标题再导出');
      return;
    }
    downloadNoteAsMarkdown(noteForExport);
  };

  const wordCount = useMemo(() => countWords(content), [content]);
  const readingMinutes = useMemo(() => estimateReadingMinutes(wordCount), [wordCount]);
  const statusInfo = STATUS_LABEL[autosave.status];

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mb: 2 }}
      >
        <Tooltip title="返回" arrow>
          <IconButton onClick={() => router.back()}>
            <Iconify icon="solar:arrow-left-bold" />
          </IconButton>
        </Tooltip>

        <Typography variant="h5" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
          {isNew && noteIdState === null ? '新建笔记' : title || '（未命名笔记）'}
        </Typography>

        <Chip
          size="small"
          label={
            statusInfo.text +
            (autosave.lastSavedAt && autosave.status === 'saved'
              ? ` · ${fDateTime(autosave.lastSavedAt)}`
              : '')
          }
          color={statusInfo.color}
          variant={autosave.status === 'idle' ? 'outlined' : 'filled'}
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
        />

        <Tooltip title={isPinned ? '取消置顶' : '置顶'} arrow>
          <IconButton
            onClick={() => setIsPinned(!isPinned)}
            color={isPinned ? 'warning' : 'default'}
          >
            <Iconify icon={isPinned ? 'solar:pin-bold' : 'solar:pin-linear'} />
          </IconButton>
        </Tooltip>

        <Tooltip title="导出 Markdown" arrow>
          <IconButton onClick={handleExport}>
            <Iconify icon="solar:download-bold" />
          </IconButton>
        </Tooltip>

        <Tooltip title="历史版本（即将上线）" arrow>
          <span>
            <IconButton disabled>
              <Iconify icon="solar:history-bold" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="AI 摘要（即将上线）" arrow>
          <span>
            <IconButton disabled>
              <Iconify icon="solar:pulse-2-bold-duotone" />
            </IconButton>
          </span>
        </Tooltip>

        {!isNew && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            删除
          </Button>
        )}

        <Button
          variant="contained"
          size="small"
          startIcon={<Iconify icon="solar:diskette-bold" />}
          onClick={() => void autosave.flush()}
          loading={autosave.status === 'saving'}
        >
          保存（⌘S）
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {autosave.errorMsg && autosave.status === 'error' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          自动保存失败：{autosave.errorMsg}（已暂存到本地草稿，恢复网络后将自动重试）
        </Alert>
      )}

      {/* Meta fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <TextField
          label="标题"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这篇笔记一个标题"
        />

        <StockSearchAutocomplete
          label="关联股票（可选）"
          value={selectedStock}
          onChange={(item) => setSelectedStock(item)}
          sx={{ maxWidth: 320 }}
        />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            标签
          </Typography>
          <ResearchNoteTagInput tags={tags} onChange={setTags} />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Content toggle */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          内容
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, v: ContentMode | null) => v && setMode(v)}
        >
          <ToggleButton value="edit">
            <Iconify icon="solar:pen-bold" width={16} sx={{ mr: 0.5 }} />
            编辑
          </ToggleButton>
          <ToggleButton value="preview">
            <Iconify icon="solar:eye-bold" width={16} sx={{ mr: 0.5 }} />
            预览
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
          ⌘E 切换 · ⌘S 保存
        </Typography>
      </Box>

      {/* Content area */}
      {mode === 'edit' ? (
        <ResearchNoteEditor
          content={content}
          onChange={setContent}
          onImagePaste={() => setSnackbar('图片上传功能待后端就绪')}
        />
      ) : (
        <Box
          sx={{
            p: 3,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: 300,
            bgcolor: 'background.paper',
          }}
        >
          {content ? (
            <ResearchNotePreview content={content} />
          ) : (
            <Typography color="text.disabled">暂无内容</Typography>
          )}
        </Box>
      )}

      {/* Footer meta */}
      <Box
        sx={{
          mt: 2,
          py: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          color: 'text.secondary',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption">字数 {wordCount.toLocaleString()}</Typography>
        <Typography variant="caption">阅读约 {readingMinutes} 分钟</Typography>
        {originalNote && (
          <>
            <Typography variant="caption">创建于 {fDateTime(originalNote.createdAt)}</Typography>
            <Typography variant="caption">更新于 {fDateTime(originalNote.updatedAt)}</Typography>
            {typeof originalNote.versionCount === 'number' && (
              <Typography variant="caption">修改 {originalNote.versionCount} 次</Typography>
            )}
          </>
        )}
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="删除确认"
        content={`确定删除「${title || '未命名笔记'}」吗？删除后将进入回收站，30 天内可恢复。（注：当前后端尚未支持回收站，本次操作为永久删除）`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        submitting={deleting}
        confirmColor="error"
        confirmLabel="删除"
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardContent>
  );
}
