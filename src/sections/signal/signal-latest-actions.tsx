import type { LatestSignalResponse } from 'src/api/signal';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

import { Iconify } from 'src/components/iconify';

type Props = {
  data: LatestSignalResponse | null;
  onCopyOrders: () => void;
  onViewHistory: () => void;
};

export function SignalLatestActions({ data, onCopyOrders, onViewHistory }: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:copy-bold" width={16} />}
        onClick={onCopyOrders}
        disabled={!data || data.signals.length === 0}
      >
        复制委托清单
      </Button>
      <Tooltip title="后端 portfolio/sync-from-signal 接口待上线">
        <span>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:share-bold" width={16} />}
            disabled
          >
            推送至关联组合
          </Button>
        </span>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <Button
        variant="text"
        endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
        onClick={onViewHistory}
      >
        查看信号历史
      </Button>
    </Stack>
  );
}
