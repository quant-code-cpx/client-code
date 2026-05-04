import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import type { AnalysisRunType, AnalysisHistoryItem } from './use-analysis-history';

// ----------------------------------------------------------------------

const TYPE_LABEL: Record<AnalysisRunType, string> = {
  orthogonalize: '正交化',
  'fama-macbeth': 'Fama-MacBeth',
  optimization: '组合优化',
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: AnalysisHistoryItem[];
  onRestore: (item: AnalysisHistoryItem) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
};

export function HistoryDrawer({ open, onClose, items, onRestore, onClear, onRemove }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2 }}
      >
        <Typography variant="h6">运行历史</Typography>
        <Stack direction="row" spacing={1}>
          {items.length > 0 && (
            <Button size="small" color="inherit" onClick={onClear}>
              清空
            </Button>
          )}
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          仅本浏览器内最近 10 次（待 BE-6 上线后切换为账号级历史）
        </Typography>
      </Box>

      {items.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">还没有运行记录</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5} sx={{ px: 2, pb: 4 }}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: (t) => `1px solid ${t.palette.divider}`,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => onRestore(item)}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Label color="primary" variant="soft">
                    {TYPE_LABEL[item.type]}
                  </Label>
                  <Label color={item.status === 'success' ? 'success' : 'error'} variant="soft">
                    {item.status === 'success' ? '成功' : '失败'}
                  </Label>
                </Stack>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                </IconButton>
              </Stack>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {item.summary}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Drawer>
  );
}
