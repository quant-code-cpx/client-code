import type { StockDetailOverviewData } from 'src/api/stock';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import CardContent from '@mui/material/CardContent';

import { StockDetailCompanyTab } from './stock-detail-company-tab';
import { StockDetailDividendTab } from './stock-detail-dividend-tab';
import { StockDetailShareholdersTab } from './stock-detail-shareholders-tab';
import { StockDetailShareCapitalTab } from './stock-detail-share-capital-tab';

// ----------------------------------------------------------------------

type CompanySuiteTab = 'company' | 'shareholders' | 'share-capital' | 'dividend';

type Props = {
  tsCode: string;
  overview: StockDetailOverviewData | null;
  loading: boolean;
};

const COMPANY_TABS: { value: CompanySuiteTab; label: string }[] = [
  { value: 'company', label: '公司概况' },
  { value: 'shareholders', label: '股东' },
  { value: 'share-capital', label: '股本结构' },
  { value: 'dividend', label: '分红融资' },
];

export function StockDetailCompanySuiteTab({ tsCode, overview, loading }: Props) {
  const [activeTab, setActiveTab] = useState<CompanySuiteTab>('company');

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ pb: '12px !important' }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: CompanySuiteTab) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {COMPANY_TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {activeTab === 'company' && (
        <StockDetailCompanyTab tsCode={tsCode} overview={overview} loading={loading} />
      )}
      {activeTab === 'shareholders' && <StockDetailShareholdersTab tsCode={tsCode} />}
      {activeTab === 'share-capital' && <StockDetailShareCapitalTab tsCode={tsCode} />}
      {activeTab === 'dividend' && <StockDetailDividendTab tsCode={tsCode} />}
    </Stack>
  );
}
