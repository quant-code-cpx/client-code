import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { createNote, deleteNote, updateNote, getNoteById } from 'src/api/research-note';

import { Iconify } from 'src/components/iconify';

import { ResearchNoteEditor } from '../research-note-editor';
import { ResearchNotePreview } from '../research-note-preview';
import { ResearchNoteTagInput } from '../research-note-tag-input';

// ----------------------------------------------------------------------

type ContentMode = 'edit' | 'preview';

export function ResearchNoteDetailView() {
  const { noteId } = useParams<{ noteId: string }>();
  const router = useRouter();
  const isNew = noteId === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tsCode, setTsCode] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [mode, setMode] = useState<ContentMode>(isNew ? 'edit' : 'preview');

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (isNew) return;

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
        setTsCode(note.tsCode ?? '');
        setTags(note.tags);
        setIsPinned(note.isPinned);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载笔记失败');
      })
      .finally(() => setLoading(false));
  }, [noteId, isNew]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入笔记标题');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const note = await createNote({
          title: title.trim(),
          content,
          tsCode: tsCode.trim() || undefined,
          tags,
          isPinned,
        });
        router.push(`/research/notes/${note.id}`);
      } else {
        await updateNote({
          id: Number(noteId),
          title: title.trim(),
          content,
          tsCode: tsCode.trim() || null,
          tags,
          isPinned,
        });
        setSuccessMsg('保存成功');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await deleteNote(Number(noteId));
      router.push('/research/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="返回">
          <IconButton onClick={() => router.back()}>
            <Iconify icon="solar:arrow-left-bold" />
          </IconButton>
        </Tooltip>

        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {isNew ? '新建笔记' : (title || '笔记详情')}
        </Typography>

        <Tooltip title={isPinned ? '取消置顶' : '置顶'}>
          <IconButton onClick={() => setIsPinned(!isPinned)} color={isPinned ? 'warning' : 'default'}>
            <Iconify icon={isPinned ? 'solar:pin-bold' : 'solar:pin-linear'} />
          </IconButton>
        </Tooltip>

        {!isNew && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            删除
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:diskette-bold" />}
          onClick={handleSave}
          loading={saving}
        >
          保存
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Meta fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <TextField
          label="标题"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="笔记标题"
        />

        <TextField
          label="关联股票（可选）"
          value={tsCode}
          onChange={(e) => setTsCode(e.target.value)}
          placeholder="例如：000001.SZ"
          sx={{ maxWidth: 280 }}
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
          onChange={(_, v) => v && setMode(v)}
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
      </Box>

      {/* Content area */}
      {mode === 'edit' ? (
        <ResearchNoteEditor content={content} onChange={setContent} />
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
            <Typography color="text.disabled" sx={{ textAlign: 'center', py: 6 }}>
              暂无内容，切换到编辑模式开始写作
            </Typography>
          )}
        </Box>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>删除后无法恢复，确定要删除这篇笔记吗？</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg('')}
        message={successMsg}
      />
    </DashboardContent>
  );
}
