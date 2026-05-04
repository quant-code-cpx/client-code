import type { StrategyDraft } from 'src/api/strategy-draft';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { getDrafts, deleteDraft, getDraftById } from 'src/api/strategy-draft';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { BACKTEST_AUTOSAVE_ID } from './constants';
import { BacktestDraftListItem } from './backtest-draft-list-item';
import { BacktestDraftSaveDialog } from './backtest-draft-save-dialog';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  currentConfig: Record<string, unknown>;
  autoSavedDraft?: StrategyDraft | null;
  onLoadDraft: (config: Record<string, unknown>, templateId: string) => void;
};

export function BacktestDraftDrawer({
  open,
  onClose,
  currentConfig,
  autoSavedDraft,
  onLoadDraft,
}: Props) {
  const [drafts, setDrafts] = useState<StrategyDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDrafts();
      setDrafts(res.drafts);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadDrafts();
    }
  }, [open, loadDrafts]);

  const handleLoad = async (draft: StrategyDraft) => {
    try {
      if (draft.isAutoSave || draft.id === BACKTEST_AUTOSAVE_ID) {
        const { strategyType, ...formFields } = draft.config as Record<string, unknown> & {
          strategyType?: string;
        };
        onLoadDraft(
          formFields as Record<string, unknown>,
          (strategyType as string) ?? 'SCREENING_ROTATION'
        );
        setSnackbar({ open: true, message: '已恢复「上次编辑」', severity: 'success' });
        return;
      }

      if (typeof draft.id !== 'number') {
        throw new Error('草稿 ID 无效');
      }

      const full = await getDraftById(draft.id);
      const { strategyType, ...formFields } = full.config as Record<string, unknown> & {
        strategyType?: string;
      };
      onLoadDraft(
        formFields as Record<string, unknown>,
        (strategyType as string) ?? 'SCREENING_ROTATION'
      );
      setSnackbar({ open: true, message: `已加载草稿「${draft.name}」`, severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : '加载失败',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (draft: StrategyDraft) => {
    try {
      if (typeof draft.id !== 'number') return;
      await deleteDraft(draft.id);
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setSnackbar({ open: true, message: `已删除草稿「${draft.name}」`, severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : '删除失败',
        severity: 'error',
      });
    }
  };

  const handleSaveSuccess = (saved: StrategyDraft) => {
    setDrafts((prev) => [saved, ...prev]);
    setSaveDialogOpen(false);
    setSnackbar({ open: true, message: `草稿「${saved.name}」已保存`, severity: 'success' });
  };

  const visibleDrafts = autoSavedDraft
    ? [autoSavedDraft, ...drafts.filter((draft) => draft.id !== autoSavedDraft.id)]
    : drafts;

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 340 } }}>
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
            策略草稿
          </Typography>
          <IconButton size="small" aria-label="关闭草稿抽屉" onClick={onClose}>
            <Iconify icon="solar:close-circle-bold" width={20} />
          </IconButton>
        </Box>

        {/* Draft list */}
        <Scrollbar sx={{ flex: 1 }}>
          {loading ? (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={72} />
              ))}
            </Box>
          ) : visibleDrafts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Iconify
                icon="solar:notebook-bookmark-bold"
                width={40}
                sx={{ color: 'text.disabled', mb: 1.5 }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                暂无草稿
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                点击下方按钮保存当前配置
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {visibleDrafts.map((draft) => (
                <BacktestDraftListItem
                  key={draft.id}
                  draft={draft}
                  onLoad={() => handleLoad(draft)}
                  onDelete={draft.isAutoSave ? undefined : () => handleDelete(draft)}
                />
              ))}
            </List>
          )}
        </Scrollbar>

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Iconify icon="solar:diskette-bold" width={16} />}
            onClick={() => setSaveDialogOpen(true)}
          >
            保存当前为新草稿
          </Button>
        </Box>
      </Drawer>

      <BacktestDraftSaveDialog
        open={saveDialogOpen}
        config={currentConfig}
        onClose={() => setSaveDialogOpen(false)}
        onSuccess={handleSaveSuccess}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
