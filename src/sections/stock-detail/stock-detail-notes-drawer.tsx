import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { StockDetailNotesTab } from './stock-detail-notes-tab';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  tsCode: string;
  stockName?: string;
  snapshotPrice?: number | null;
  snapshotTradeDate?: string | null;
  snapshotPctChg?: number | null;
  onClose: () => void;
};

export function StockDetailNotesDrawer({
  open,
  tsCode,
  stockName,
  snapshotPrice,
  snapshotTradeDate,
  snapshotPctChg,
  onClose,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 480 } } } }}
    >
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">我的研究</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {stockName ? `${stockName} · ${tsCode}` : tsCode}
          </Typography>
        </Box>
        <Tooltip title="关闭研究笔记抽屉">
          <IconButton aria-label="关闭研究笔记抽屉" onClick={onClose}>
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <StockDetailNotesTab
          tsCode={tsCode}
          stockName={stockName}
          snapshotPrice={snapshotPrice}
          snapshotTradeDate={snapshotTradeDate}
          snapshotPctChg={snapshotPctChg}
        />
      </Box>
    </Drawer>
  );
}
