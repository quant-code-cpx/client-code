import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';

import { AnalysisChipTab } from './analysis/analysis-chip-tab';
import { AnalysisMarginTab } from './analysis/analysis-margin-tab';
import { AnalysisTimingTab } from './analysis/analysis-timing-tab';
import { AnalysisTechnicalTab } from './analysis/analysis-technical-tab';
import { AnalysisRelativeStrengthTab } from './analysis/analysis-relative-strength-tab';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

const SUB_TABS = [
  { value: 'technical', label: '技术指标' },
  { value: 'timing', label: '择时信号' },
  { value: 'chip', label: '筹码分布' },
  { value: 'margin', label: '融资融券' },
  { value: 'relativeStrength', label: '相对强弱' },
];

export function StockDetailAnalysisTab({ tsCode }: Props) {
  const [subTab, setSubTab] = useState('technical');

  return (
    <Stack spacing={3}>
      <Card>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {SUB_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Card>

      {subTab === 'technical' && <AnalysisTechnicalTab tsCode={tsCode} />}
      {subTab === 'timing' && <AnalysisTimingTab tsCode={tsCode} />}
      {subTab === 'chip' && <AnalysisChipTab tsCode={tsCode} />}
      {subTab === 'margin' && <AnalysisMarginTab tsCode={tsCode} />}
      {subTab === 'relativeStrength' && <AnalysisRelativeStrengthTab tsCode={tsCode} />}
    </Stack>
  );
}
