import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fDateTime } from 'src/utils/format-time';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { AgentMemoryEditorDialog } from './agent-memory-editor-dialog';
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  type AgentMemory,
  formatMemoryJson,
  SENSITIVITY_LABELS,
  getMemorySourceLabel,
} from './agent-memory-model';

type AgentMemoryDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function AgentMemoryDrawer({ open, onClose }: AgentMemoryDrawerProps) {
  const [items, setItems] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMemory, setEditorMemory] = useState<AgentMemory | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<AgentMemory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await agentApi.listMemories({ cursor: null, limit: 100, includeInactive: false });
      setItems(response.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载长期记忆失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const handleSaved = useCallback((saved: AgentMemory) => {
    setItems((current) => [
      saved,
      ...current.filter(
        (item) =>
          !(
            item.memoryId === saved.memoryId ||
            (item.category === saved.category && item.key === saved.key)
          )
      ),
    ]);
    setEditorMemory(undefined);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await agentApi.deleteMemory({ memoryId: deleteTarget.memoryId });
      setItems((current) => current.filter((item) => item.memoryId !== deleteTarget.memoryId));
      setDeleteTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除长期记忆失败');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const editorOpen = editorMemory !== undefined;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 1, sm: 520 },
              color: 'text.primary',
              bgcolor: 'background.default',
              backgroundImage: 'none',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
            },
          },
        }}
      >
        <Box sx={{ px: 2.5, py: 2.25, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6">长期记忆</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              管理研究偏好、关注项与口径约束。
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            aria-label="保存长期记忆"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            onClick={() => setEditorMemory(null)}
          >
            新建记忆
          </Button>
          <Tooltip title="关闭长期记忆">
            <IconButton aria-label="关闭长期记忆" onClick={onClose}>
              <Iconify icon="solar:close-circle-bold" width={21} />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {!loading && items.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 1,
              px: 2.5,
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {[
              { label: '有效记忆', value: items.length },
              {
                label: '敏感项',
                value: items.filter((item) => item.sensitivity !== 'NORMAL').length,
              },
              {
                label: '设有期限',
                value: items.filter((item) => Boolean(item.expiresAt)).length,
              },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.25 }}
              >
                <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.25 }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}

        {error ? (
          <Alert severity="error" action={<Button onClick={load}>重试</Button>} sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        ) : null}

        <Scrollbar sx={{ flex: 1 }}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={164} />
              ))
            ) : items.length === 0 ? (
              <Box sx={{ textAlign: 'center', px: 2, py: 8 }}>
                <Iconify icon="solar:notebook-bookmark-bold" width={40} sx={{ color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body2">还没有长期记忆</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  仅保存你希望 Agent 在未来研究中沿用的信息。
                </Typography>
              </Box>
            ) : (
              items.map((memory) => (
                <Box
                  key={memory.memoryId}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    contentVisibility: 'auto',
                    containIntrinsicSize: 'auto 208px',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                        {CATEGORY_LABELS[memory.category]} · {STATUS_LABELS[memory.status]}
                      </Typography>
                      <Typography variant="subtitle2" noWrap>
                        {memory.key}
                      </Typography>
                    </Box>
                    <Chip size="small" label={SENSITIVITY_LABELS[memory.sensitivity]} variant="outlined" />
                  </Box>

                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      mt: 1,
                      p: 1,
                      maxHeight: 120,
                      overflow: 'auto',
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                  >
                    {formatMemoryJson(memory.value)}
                  </Box>

                  <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 1 }}>
                    {getMemorySourceLabel(memory)} · 更新于 {fDateTime(memory.updatedAt)}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                    {memory.expiresAt ? `到期：${fDateTime(memory.expiresAt)}` : '按默认保留策略'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                    <Button size="small" onClick={() => setEditorMemory(memory)}>
                      纠正
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(memory)}>
                      删除
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Scrollbar>
      </Drawer>

      <AgentMemoryEditorDialog
        open={editorOpen}
        memory={editorMemory ?? null}
        onClose={() => setEditorMemory(undefined)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除长期记忆"
        content={`删除「${deleteTarget?.key ?? ''}」后，新的 Agent Run 将不再使用它。`}
        submitting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="删除"
      />
    </>
  );
}
