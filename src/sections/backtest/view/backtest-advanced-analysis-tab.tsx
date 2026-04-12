import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Divider from '@mui/material/Divider';

import { BacktestMonteCarloPanel } from '../backtest-monte-carlo-panel';
import { BacktestAttributionPanel } from '../backtest-attribution-panel';
import { BacktestCostSensitivityPanel } from '../backtest-cost-sensitivity-panel';
import { BacktestParamSensitivityPanel } from '../backtest-param-sensitivity-panel';

// ----------------------------------------------------------------------

type AdvancedTab = 'monte-carlo' | 'attribution' | 'cost' | 'param';

const ADVANCED_TABS: Array<{ value: AdvancedTab; label: string }> = [
  { value: 'monte-carlo', label: '蒙特卡洛模拟' },
  { value: 'attribution', label: '归因分析' },
  { value: 'cost', label: '成本敏感性' },
  { value: 'param', label: '参数扫描' },
];

interface BacktestAdvancedAnalysisTabProps {
  runId: string;
}

export function BacktestAdvancedAnalysisTab({ runId }: BacktestAdvancedAnalysisTabProps) {
  const [activeTab, setActiveTab] = useState<AdvancedTab>('monte-carlo');

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as AdvancedTab)}
        sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {ADVANCED_TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      <Divider />

      {activeTab === 'monte-carlo' && <BacktestMonteCarloPanel runId={runId} />}
      {activeTab === 'attribution' && <BacktestAttributionPanel runId={runId} />}
      {activeTab === 'cost' && <BacktestCostSensitivityPanel runId={runId} />}
      {activeTab === 'param' && <BacktestParamSensitivityPanel runId={runId} />}
    </Box>
  );
}
