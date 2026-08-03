import { useSearchParams } from 'react-router-dom';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';

import { AnalysisChipTab } from './analysis/analysis-chip-tab';
import { AnalysisMarginTab } from './analysis/analysis-margin-tab';
import { AnalysisTimingTab } from './analysis/analysis-timing-tab';
import { AnalysisPatternTab } from './analysis/analysis-pattern-tab';
import { AnalysisTechnicalTab } from './analysis/analysis-technical-tab';
import { AnalysisInstitutionalTab } from './analysis/analysis-institutional-tab';
import { AnalysisMainMoneyFlowTab } from './analysis/analysis-main-money-flow-tab';
import { AnalysisRelativeStrengthTab } from './analysis/analysis-relative-strength-tab';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

const SUB_TABS = [
  { value: 'technical', label: '技术指标' },
  { value: 'timing', label: '择时信号' },
  { value: 'chip', label: '筹码分布' },
  { value: 'mainMoneyFlow', label: '主力资金' },
  { value: 'margin', label: '融资融券' },
  { value: 'relativeStrength', label: '相对强弱' },
  { value: 'pattern', label: '形态识别' },
  { value: 'institutional', label: '机构持仓' },
];

function isAnalysisSubTab(value: string | null): value is (typeof SUB_TABS)[number]['value'] {
  return SUB_TABS.some((tab) => tab.value === value);
}

export function StockDetailAnalysisTab({ tsCode }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const analysisParam = searchParams.get('analysis');
  const subTab = isAnalysisSubTab(analysisParam) ? analysisParam : 'technical';

  const handleSubTabChange = (_: unknown, nextSubTab: string | null) => {
    if (!nextSubTab || !isAnalysisSubTab(nextSubTab)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'analysis');
    nextParams.set('analysis', nextSubTab);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <Stack spacing={3}>
      <Card>
        <Tabs
          value={subTab}
          onChange={handleSubTabChange}
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
      {subTab === 'mainMoneyFlow' && <AnalysisMainMoneyFlowTab tsCode={tsCode} />}
      {subTab === 'margin' && <AnalysisMarginTab tsCode={tsCode} />}
      {subTab === 'relativeStrength' && <AnalysisRelativeStrengthTab tsCode={tsCode} />}
      {subTab === 'pattern' && <AnalysisPatternTab tsCode={tsCode} />}
      {subTab === 'institutional' && <AnalysisInstitutionalTab tsCode={tsCode} />}
    </Stack>
  );
}
