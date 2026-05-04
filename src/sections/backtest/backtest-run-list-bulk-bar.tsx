import type { ReactElement } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface BacktestRunListBulkBarProps {
  selectedCount: number;
  onClear: () => void;
  onAddComparison: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onTag: () => void;
  backendActionsReady?: boolean;
}

function PendingTooltip({ children }: { children: ReactElement }) {
  return <Tooltip title="等待后端端点支持">{children}</Tooltip>;
}

export function BacktestRunListBulkBar({
  selectedCount,
  onClear,
  onAddComparison,
  onArchive,
  onDelete,
  onTag,
  backendActionsReady = false,
}: BacktestRunListBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        mx: 3,
        mb: 2,
        px: 2,
        py: 1,
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
        已选 {selectedCount} 项
      </Typography>

      <Button
        size="small"
        variant="contained"
        onClick={onAddComparison}
        startIcon={<Iconify icon="solar:chart-square-bold" width={16} />}
      >
        加入对比
      </Button>

      <PendingTooltip>
        <Box component="span">
          <Button
            size="small"
            variant="outlined"
            disabled={!backendActionsReady}
            onClick={onArchive}
            startIcon={<Iconify icon="solar:archive-bold" width={16} />}
          >
            归档
          </Button>
        </Box>
      </PendingTooltip>

      <PendingTooltip>
        <Box component="span">
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={!backendActionsReady}
            onClick={onDelete}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
          >
            删除
          </Button>
        </Box>
      </PendingTooltip>

      <PendingTooltip>
        <Box component="span">
          <Button
            size="small"
            variant="outlined"
            disabled={!backendActionsReady}
            onClick={onTag}
            startIcon={<Iconify icon="solar:tag-bold" width={16} />}
          >
            打标签
          </Button>
        </Box>
      </PendingTooltip>

      <Button size="small" variant="text" onClick={onClear}>
        取消
      </Button>
    </Paper>
  );
}
