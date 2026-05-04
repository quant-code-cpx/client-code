import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { CacheStatsTab } from './cache-stats-tab';
import { RetryQueueTab } from './retry-queue-tab';

// ----------------------------------------------------------------------

type Props = {
  isReadOnly: boolean;
  refreshKey: number;
};

const OPS_TABS = [
  { label: '缓存', value: 'cache' },
  { label: '重试队列', value: 'retry' },
] as const;

export function OpsTab({ isReadOnly, refreshKey }: Props) {
  const [currentTab, setCurrentTab] = useState<(typeof OPS_TABS)[number]['value']>('cache');

  return (
    <Box sx={{ mt: 3 }}>
      <Tabs
        value={currentTab}
        onChange={(_, value) => setCurrentTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="数据同步运维工具"
        sx={{ mb: 2 }}
      >
        {OPS_TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {currentTab === 'cache' && <CacheStatsTab isReadOnly={isReadOnly} refreshKey={refreshKey} />}
      {currentTab === 'retry' && <RetryQueueTab isReadOnly={isReadOnly} refreshKey={refreshKey} />}
    </Box>
  );
}
