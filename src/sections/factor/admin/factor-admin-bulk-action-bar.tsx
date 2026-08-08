import type { PrecomputeStatusItem } from 'src/api/factor';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ─── Types ────────────────────────────────────────────────────

type Props = {
  selected: PrecomputeStatusItem[];
  onPrecompute: (names: string[]) => void;
  onBackfill: (names: string[]) => void;
  onCopyNames: (names: string[]) => void;
  onClearSelection: () => void;
};

export function FactorAdminBulkActionBar({
  selected,
  onPrecompute,
  onBackfill,
  onCopyNames,
  onClearSelection,
}: Props) {
  if (selected.length === 0) return null;

  const names = selected.map((it) => it.factorName);

  const handleCopy = () => {
    navigator.clipboard.writeText(names.join(', ')).catch(() => {});
    onCopyNames(names);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        borderTop: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
      }}
    >
      <Chip label={`已选 ${selected.length} 个`} size="small" color="primary" variant="filled" />

      <Stack direction="row" spacing={1}>
        <Tooltip title="对选中因子触发预计算">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:play-circle-bold" />}
            onClick={() => onPrecompute(names)}
          >
            预计算
          </Button>
        </Tooltip>

        <Tooltip title="跳至回补 Tab 并注入选中因子">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:history-bold" />}
            onClick={() => onBackfill(names)}
          >
            回补
          </Button>
        </Tooltip>

        <Tooltip title="启用选中因子">
          <span>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<Iconify icon="solar:eye-bold" />}
              disabled
            >
              启用
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="禁用选中因子">
          <span>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<Iconify icon="solar:eye-closed-bold" />}
              disabled
            >
              禁用
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="复制因子标识到剪贴板">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:copy-bold" />}
            onClick={handleCopy}
          >
            复制
          </Button>
        </Tooltip>
      </Stack>

      <Typography
        variant="caption"
        sx={{ color: 'text.disabled' }}
      >
        服务端未开放启用/禁用
      </Typography>

      <Typography
        variant="caption"
        role="button"
        tabIndex={0}
        sx={{ color: 'text.secondary', cursor: 'pointer', ml: 'auto' }}
        onClick={onClearSelection}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onClearSelection();
        }}
      >
        取消选择
      </Typography>
    </Box>
  );
}
