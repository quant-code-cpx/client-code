import type { FactorCondition } from 'src/api/factor';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { ExportButton } from 'src/components/export-button';

// ----------------------------------------------------------------------

type Props = {
  selectedCount: number;
  totalCount: number;
  conditionsSnapshot: FactorCondition[];
  exportParams: Record<string, unknown>;
  canSavePreset: boolean;
  onClearSelection: () => void;
  onAddToWatchlist: () => void;
  onSavePreset: () => void;
  onSaveStrategy: () => void;
  onQuickBacktest: () => void;
  onCreateSubscription: () => void;
};

export function ScreeningActionBar({
  selectedCount,
  totalCount,
  exportParams,
  canSavePreset,
  onClearSelection,
  onAddToWatchlist,
  onSavePreset,
  onSaveStrategy,
  onQuickBacktest,
  onCreateSubscription,
}: Props) {
  const hasSelection = selectedCount > 0;
  const targetCount = hasSelection ? selectedCount : totalCount;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 16,
        mt: 2,
        mb: 1,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: (t) => t.customShadows?.z16 ?? 4,
        border: 1,
        borderColor: 'divider',
        zIndex: 4,
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {hasSelection
            ? `已选 ${selectedCount} 只 / 共 ${totalCount}`
            : `未选中 — 动作将作用于全部 ${totalCount} 只候选`}
        </Typography>

        {hasSelection && (
          <Button size="small" variant="text" onClick={onClearSelection}>
            清空选择
          </Button>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            startIcon={<Iconify icon="solar:notebook-bookmark-bold" width={16} />}
            onClick={onAddToWatchlist}
            disabled={targetCount === 0}
          >
            加入自选股
          </Button>

          <ExportButton source="factor_screening" params={exportParams} />

          <Tooltip title="保存当前条件到本地预设">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:diskette-bold" width={16} />}
                onClick={onSavePreset}
                disabled={!canSavePreset}
              >
                保存预设
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="将当前条件 + 候选保存为策略雏形（依赖 BE-12 字段对齐）">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:star-bold" width={16} />}
                onClick={onSaveStrategy}
                disabled={targetCount === 0}
              >
                保存策略
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="基于当前条件发起快速回测（依赖回测面板）">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:test-tube-bold" width={16} />}
                onClick={onQuickBacktest}
                disabled={targetCount === 0}
              >
                快速回测
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="把当前条件保存为定时订阅（依赖 BE-11）">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:bell-bold" width={16} />}
                onClick={onCreateSubscription}
                disabled
              >
                创建订阅
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
