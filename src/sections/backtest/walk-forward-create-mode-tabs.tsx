import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type WalkForwardCreateMode = 'WF_ROLLING' | 'WF_ANCHORED' | 'ROLLING';

type Props = {
  value: WalkForwardCreateMode;
  onChange: (value: WalkForwardCreateMode) => void;
};

export function WalkForwardCreateModeTabs({ value, onChange }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Tabs
        value={value}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="walk forward create mode tabs"
        onChange={(_, next: WalkForwardCreateMode) => onChange(next)}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab
          value="WF_ROLLING"
          icon={<Iconify icon="solar:restart-bold" width={18} />}
          iconPosition="start"
          label="滚动 WF"
        />
        <Tooltip title="后端 windowMode=ANCHORED 就绪后开放；当前先保留入口" placement="top">
          <span>
            <Tab
              disabled
              value="WF_ANCHORED"
              icon={<Iconify icon="solar:shield-warning-bold" width={18} />}
              iconPosition="start"
              label="锚定 WF"
            />
          </span>
        </Tooltip>
        <Tab
          value="ROLLING"
          icon={<Iconify icon="solar:history-bold" width={18} />}
          iconPosition="start"
          label="Rolling 窗口"
        />
      </Tabs>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        滚动 WF 用样本内/样本外切片验证稳健性；Rolling
        窗口复用独立后端端点，适合固定持有期滚动优化。
      </Typography>
    </Box>
  );
}
