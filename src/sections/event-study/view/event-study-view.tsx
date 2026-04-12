import type { EventTypeItem } from 'src/api/event-study';

import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { getEventTypes } from 'src/api/event-study';
import { DashboardContent } from 'src/layouts/dashboard';

import { EventQueryTab } from '../event-query-tab';
import { SignalRulesTab } from '../signal-rules-tab';
import { EventAnalysisTab } from '../event-analysis-tab';
import { SignalHistoryTab } from '../signal-history-tab';

// ----------------------------------------------------------------------

type TabValue = 'query' | 'analysis' | 'rules' | 'history';

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'query', label: '事件查询' },
  { value: 'analysis', label: '事件分析' },
  { value: 'rules', label: '信号规则' },
  { value: 'history', label: '信号历史' },
];

// ----------------------------------------------------------------------

export function EventStudyView() {
  const [tab, setTab] = useState<TabValue>('query');
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchEventTypes = useCallback(async () => {
    setLoadingTypes(true);
    setLoadError('');
    try {
      const data = await getEventTypes();
      setEventTypes(data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载事件类型失败');
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 3 }}>
        事件驱动研究
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {loadingTypes ? (
        <Skeleton variant="rectangular" height={48} sx={{ mb: 3, borderRadius: 1 }} />
      ) : (
        <Tabs
          value={tab}
          onChange={(_, v: TabValue) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      )}

      <Box>
        {tab === 'query' && <EventQueryTab eventTypes={eventTypes} />}
        {tab === 'analysis' && <EventAnalysisTab eventTypes={eventTypes} />}
        {tab === 'rules' && <SignalRulesTab eventTypes={eventTypes} />}
        {tab === 'history' && <SignalHistoryTab />}
      </Box>
    </DashboardContent>
  );
}
