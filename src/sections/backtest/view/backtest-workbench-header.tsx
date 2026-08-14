import type { Theme, SxProps } from '@mui/material/styles';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';

import { Iconify } from 'src/components/iconify';

import { BacktestRunningRunsBadge } from '../backtest-running-runs-badge';

// ----------------------------------------------------------------------

const HEADER_ACTION_BUTTON_SX: SxProps<Theme> = {
  height: 32,
  minHeight: 32,
  px: 1.5,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiButton-startIcon': {
    ml: 0,
    mr: 0.75,
    display: 'inline-flex',
    alignItems: 'center',
  },
};

interface BacktestWorkbenchHeaderProps {
  runningRefreshToken: number;
  onOpenDraft: () => void;
  onOpenRun: (runId: string) => void;
  onOpenWalkForward: () => void;
  onOpenComparison: () => void;
}

export function BacktestWorkbenchHeader({
  runningRefreshToken,
  onOpenDraft,
  onOpenRun,
  onOpenWalkForward,
  onOpenComparison,
}: BacktestWorkbenchHeaderProps) {
  const [advancedAnchor, setAdvancedAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={{
        mb: 4,
        display: 'flex',
        alignItems: 'flex-start',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4">回测工作台</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          配置策略参数，自动校验数据完备性，提交后可继续调参与追踪进度
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        useFlexGap
        sx={{
          mt: { xs: 0, md: 0.5 },
          minHeight: 32,
          flexShrink: 0,
          flexWrap: 'wrap',
          rowGap: 1,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:notebook-bookmark-bold" width={18} />}
          onClick={onOpenDraft}
          sx={HEADER_ACTION_BUTTON_SX}
        >
          草稿
        </Button>
        <BacktestRunningRunsBadge
          refreshToken={runningRefreshToken}
          onOpenRun={onOpenRun}
          buttonSx={HEADER_ACTION_BUTTON_SX}
        />
        <Divider orientation="vertical" flexItem sx={{ alignSelf: 'center', height: 24 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:menu-dots-bold" width={18} />}
          onClick={(event) => setAdvancedAnchor(event.currentTarget)}
          sx={HEADER_ACTION_BUTTON_SX}
        >
          进阶
        </Button>
      </Stack>
      <Menu
        open={Boolean(advancedAnchor)}
        anchorEl={advancedAnchor}
        onClose={() => setAdvancedAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setAdvancedAnchor(null);
            onOpenWalkForward();
          }}
        >
          <ListItemIcon>
            <Iconify icon="solar:shuffle-bold" width={18} />
          </ListItemIcon>
          Walk-Forward 验证
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAdvancedAnchor(null);
            onOpenComparison();
          }}
        >
          <ListItemIcon>
            <Iconify icon="solar:copy-bold" width={18} />
          </ListItemIcon>
          多策略对比
        </MenuItem>
      </Menu>
    </Box>
  );
}
