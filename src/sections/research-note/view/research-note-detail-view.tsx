import type { StockSearchItem } from 'src/api/stock';
import type { ResearchNote } from 'src/api/research-note';

import { useParams, useSearchParams } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { useAuth } from 'src/auth';
import { ApiError } from 'src/api/client';
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
import { ResearchNoteDetailHeader } from '../research-note-detail-header';

import type { AutosavePayload } from '../use-note-autosave';

// ----------------------------------------------------------------------

type ContentMode = 'edit' | 'preview';
type NoteLoadState = 'loading' | 'ready' | 'not-found' | 'invalid' | 'error';

function countWords(content: string): number {
  if (!content) return 0;
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishWords = (content.match(/[a-zA-Z0-9]+/g) ?? []).length;
  return chineseChars + englishWords;
}

function estimateReadingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 300));
}

export function ResearchNoteDetailView() {
  const { noteId } = useParams<{ noteId: string }>();
  const [searchParams] = useSearchParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const isNew = noteId === 'new';

  const [noteIdState, setNoteIdState] = useState<number | null>(isNew ? null : Number(noteId));

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [mode, setMode] = useState<ContentMode>(isNew ? 'edit' : 'preview');

  const [loadState, setLoadState] = useState<NoteLoadState>(isNew ? 'ready' : 'loading');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [originalNote, setOriginalNote] = useState<ResearchNote | null>(null);
  const loadAttemptRef = useRef(0);
  const loading = loadState === 'loading';
  const noteUnavailable = loadState === 'not-found' || loadState === 'invalid';
  const editingDisabled = !isNew && loadState !== 'ready';

  const loadExistingNote = useCallback(async () => {
    const attempt = loadAttemptRef.current + 1;
    loadAttemptRef.current = attempt;
    if (isNew) return;

    const id = Number(noteId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      if (attempt !== loadAttemptRef.current) return;
      setError('无效的笔记 ID');
      setLoadState('invalid');
      return;
    }

    setError('');
    setLoadState('loading');
    try {
      const note = await getNoteById(id);
      if (attempt !== loadAttemptRef.current) return;
      setTitle(note.title);
      setContent(note.content);
      setSelectedStock(stockItemFromCode(note.tsCode));
      setTags(note.tags);
      setIsPinned(note.isPinned);
      setOriginalNote(note);
      setLoadState('ready');
    } catch (err) {
      if (attempt !== loadAttemptRef.current) return;
      setError(err instanceof Error ? err.message : '加载笔记失败');
      setLoadState(err instanceof ApiError && err.status === 404 ? 'not-found' : 'error');
    }
  }, [isNew, noteId]);

  // 加载详情 / 应用模板
  useEffect(() => {
    if (!isNew) {
      void loadExistingNote();
    } else {
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
    }

    return () => {
      loadAttemptRef.current += 1;
    };
  }, [isNew, loadExistingNote, searchParams]);

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

  const handleRestoreDraft = useCallback((draft: AutosavePayload) => {
    setTitle(draft.title);
    setContent(draft.content);
    setSelectedStock(stockItemFromCode(draft.tsCode));
    setTags(draft.tags);
    setIsPinned(draft.isPinned);
    setMode('edit');
    setSnackbar('已恢复本地草稿');
  }, []);

  const autosave = useNoteAutosave({
    noteId: noteIdState,
    userId: userProfile?.id ?? null,
    initial: initialPayload,
    onCreated: handleAutoCreated,
    onRestore: handleRestoreDraft,
    enabled: !editingDisabled,
  });

  // schedule 触发
  useEffect(() => {
    if (editingDisabled) return;
    autosave.schedule({
      title,
      content,
      tsCode: selectedStock?.tsCode ?? null,
      tags,
      isPinned,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, selectedStock, tags, isPinned, editingDisabled]);

  // 快捷键：Cmd/Ctrl+S 立即保存；Cmd/Ctrl+E 切换预览
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (editingDisabled) return;
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
  }, [autosave, editingDisabled]);

  const handleDelete = async () => {
    if (editingDisabled) return;
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

  const wordCount = useMemo(() => countWords(content), [content]);
  const readingMinutes = useMemo(() => estimateReadingMinutes(wordCount), [wordCount]);

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
      {autosave.restorableDraft && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={0.5}>
              <Button color="inherit" size="small" onClick={autosave.restoreDraft}>
                恢复
              </Button>
              <Button color="inherit" size="small" onClick={autosave.discardDraft}>
                丢弃
              </Button>
            </Stack>
          }
        >
          发现未同步的本地草稿（{fDateTime(autosave.restorableDraft.savedAt)}）
        </Alert>
      )}

      <ResearchNoteDetailHeader
        title={title}
        isNew={isNew}
        isUnsavedNewNote={isNew && noteIdState === null}
        isPinned={isPinned}
        noteUnavailable={noteUnavailable}
        editingDisabled={editingDisabled}
        autosaveStatus={autosave.status}
        lastSavedAt={autosave.lastSavedAt}
        onBack={() => router.back()}
        onTogglePinned={() => setIsPinned(!isPinned)}
        onDelete={() => setDeleteDialogOpen(true)}
        onSave={() => void autosave.flush()}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            loadState === 'error' ? (
              <Button color="inherit" size="small" onClick={() => void loadExistingNote()}>
                重试
              </Button>
            ) : undefined
          }
          onClose={loadState === 'ready' ? () => setError('') : undefined}
        >
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
          disabled={editingDisabled}
        />

        <StockSearchAutocomplete
          label="关联股票（可选）"
          value={selectedStock}
          onChange={(item) => setSelectedStock(item)}
          sx={{ maxWidth: 320 }}
          disabled={editingDisabled}
        />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            标签
          </Typography>
          <ResearchNoteTagInput tags={tags} onChange={setTags} disabled={editingDisabled} />
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
          <ToggleButton value="edit" disabled={editingDisabled}>
            <Iconify icon="solar:pen-bold" width={16} sx={{ mr: 0.5 }} />
            编辑
          </ToggleButton>
          <ToggleButton value="preview" disabled={editingDisabled}>
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
          disabled={editingDisabled}
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
