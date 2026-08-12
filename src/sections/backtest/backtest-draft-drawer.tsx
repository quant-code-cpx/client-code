import type { StrategyDraft } from 'src/api/strategy-draft';

import { useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { BacktestDraftListItem } from './backtest-draft-list-item';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  autoSavedDraft?: StrategyDraft | null;
  onLoadDraft: (config: Record<string, unknown>, templateId: string) => void;
};

export function BacktestDraftDrawer({
  open,
  onClose,
  autoSavedDraft,
  onLoadDraft,
}: Props) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleLoad = (draft: StrategyDraft) => {
    const { strategyType, ...formFields } = draft.config as Record<string, unknown> & {
      strategyType?: string;
    };
    onLoadDraft(formFields, strategyType ?? 'SCREENING_ROTATION');
    setSnackbarOpen(true);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: 340 } } }}
      >
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
          <Tooltip title="关闭草稿抽屉">
            <IconButton size="small" aria-label="关闭草稿抽屉" onClick={onClose}>
              <Iconify icon="solar:close-circle-bold" width={20} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Draft list */}
        <Scrollbar sx={{ flex: 1 }}>
          <Alert severity="info" sx={{ m: 2, mb: 0 }}>
            服务端命名草稿能力尚未开放；当前仅保留本机自动草稿。
          </Alert>
          {!autoSavedDraft ? (
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
                编辑配置后会自动保存在当前浏览器
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              <BacktestDraftListItem
                draft={autoSavedDraft}
                onLoad={() => handleLoad(autoSavedDraft)}
              />
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
            aria-label="保存当前为新草稿（未开放）"
            disabled
          >
            保存当前为新草稿（未开放）
          </Button>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: '100%' }}
        >
          已恢复「上次编辑」
        </Alert>
      </Snackbar>
    </>
  );
}
